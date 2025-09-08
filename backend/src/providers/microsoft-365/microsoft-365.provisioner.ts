import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Provisioner, 
  ValidatedInput, 
  Plan, 
  Result,
  Action 
} from '../../common/interfaces/provisioner.interface';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import 'isomorphic-fetch';

export interface Microsoft365Input {
  fullName: string;
  workEmail: string;
  usageLocation?: string;
  licenseSKUs?: string[];
  servicePlans?: string[];
  tempPassword?: string;
  requirePasswordChange?: boolean;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
}

@Injectable()
export class Microsoft365Provisioner implements Provisioner {
  private readonly logger = new Logger(Microsoft365Provisioner.name);
  private graphClient: Client;
  private tenantId: string;

  constructor(private configService: ConfigService) {
    this.tenantId = this.configService.get('MS_GRAPH_TENANT_ID');
    const clientId = this.configService.get('MS_GRAPH_CLIENT_ID');
    const clientSecret = this.configService.get('MS_GRAPH_CLIENT_SECRET');

    // Create credential for app-only auth
    const credential = new ClientSecretCredential(
      this.tenantId,
      clientId,
      clientSecret
    );

    // Initialize Graph client
    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token.token;
        },
      },
    });
  }

  async validate(input: unknown): Promise<ValidatedInput> {
    const data = input as Microsoft365Input;

    if (!data.fullName || !data.workEmail) {
      throw new Error('Full name and work email are required');
    }

    if (!data.workEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    // Validate usage location (required for license assignment)
    const validUsageLocations = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'IN'];
    const usageLocation = data.usageLocation || 'US';
    
    if (!validUsageLocations.includes(usageLocation)) {
      throw new Error(`Invalid usage location. Must be one of: ${validUsageLocations.join(', ')}`);
    }

    const validatedData: Microsoft365Input = {
      ...data,
      usageLocation,
      licenseSKUs: data.licenseSKUs || [],
      servicePlans: data.servicePlans || [],
      requirePasswordChange: data.requirePasswordChange !== false,
      tempPassword: data.tempPassword || this.generateSecurePassword(),
    };

    return {
      provider: 'microsoft-365',
      data: validatedData,
    };
  }

  async plan(input: ValidatedInput): Promise<Plan> {
    const data = input.data as Microsoft365Input;
    const actions: Action[] = [];

    // Check if user already exists
    let userExists = false;
    try {
      const users = await this.graphClient
        .api('/users')
        .filter(`mail eq '${data.workEmail}' or userPrincipalName eq '${data.workEmail}'`)
        .get();
      
      userExists = users.value && users.value.length > 0;
    } catch (error) {
      this.logger.debug(`User check failed: ${error.message}`);
    }

    if (!userExists) {
      actions.push({
        type: 'create',
        resource: 'user',
        details: `Create Microsoft 365 user ${data.workEmail}`,
        required: true,
      });
    } else {
      actions.push({
        type: 'update',
        resource: 'user',
        details: `Update existing Microsoft 365 user ${data.workEmail}`,
        required: false,
      });
    }

    // Add license assignment actions
    if (data.licenseSKUs && data.licenseSKUs.length > 0) {
      for (const sku of data.licenseSKUs) {
        actions.push({
          type: 'assign',
          resource: 'license',
          details: `Assign license: ${sku}`,
          required: true,
        });
      }
    }

    // Add service plan actions
    if (data.servicePlans && data.servicePlans.length > 0) {
      actions.push({
        type: 'assign',
        resource: 'service_plans',
        details: `Enable service plans: ${data.servicePlans.join(', ')}`,
        required: false,
      });
    }

    return {
      provider: 'microsoft-365',
      actions,
      estimated_time: 45, // MS Graph can be slower
    };
  }

  async apply(input: ValidatedInput): Promise<Result> {
    const data = input.data as Microsoft365Input;
    const errors: string[] = [];
    const warnings: string[] = [];
    const externalIds: Record<string, string> = {};
    const externalLinks: Record<string, string> = {};

    try {
      // Step 1: Create or update user
      let userId: string;
      let userPrincipalName: string;
      let userCreated = false;

      try {
        // Check if user exists
        const existingUsers = await this.graphClient
          .api('/users')
          .filter(`mail eq '${data.workEmail}' or userPrincipalName eq '${data.workEmail}'`)
          .get();

        if (existingUsers.value && existingUsers.value.length > 0) {
          // Update existing user
          const existingUser = existingUsers.value[0];
          userId = existingUser.id;
          userPrincipalName = existingUser.userPrincipalName;

          const updateData: any = {
            displayName: data.fullName,
            givenName: data.fullName.split(' ')[0],
            surname: data.fullName.split(' ').slice(1).join(' ') || '',
            usageLocation: data.usageLocation,
          };

          if (data.department) updateData.department = data.department;
          if (data.jobTitle) updateData.jobTitle = data.jobTitle;
          if (data.officeLocation) updateData.officeLocation = data.officeLocation;

          await this.graphClient
            .api(`/users/${userId}`)
            .update(updateData);

          this.logger.log(`Updated existing Microsoft 365 user: ${data.workEmail}`);
        } else {
          // Create new user
          const domain = data.workEmail.split('@')[1];
          const mailNickname = data.workEmail.split('@')[0];
          userPrincipalName = data.workEmail;

          const createData: any = {
            accountEnabled: true,
            displayName: data.fullName,
            givenName: data.fullName.split(' ')[0],
            surname: data.fullName.split(' ').slice(1).join(' ') || '',
            mailNickname: mailNickname,
            userPrincipalName: userPrincipalName,
            mail: data.workEmail,
            usageLocation: data.usageLocation,
            passwordProfile: {
              forceChangePasswordNextSignIn: data.requirePasswordChange,
              password: data.tempPassword,
            },
          };

          if (data.department) createData.department = data.department;
          if (data.jobTitle) createData.jobTitle = data.jobTitle;
          if (data.officeLocation) createData.officeLocation = data.officeLocation;

          const newUser = await this.graphClient
            .api('/users')
            .post(createData);

          userId = newUser.id;
          userCreated = true;
          this.logger.log(`Created new Microsoft 365 user: ${data.workEmail}`);
        }

        externalIds['userId'] = userId;
        externalIds['userPrincipalName'] = userPrincipalName;
        externalLinks['profile'] = `https://portal.office.com/adminportal/home#/users/:/UserDetails/${userId}`;
        externalLinks['outlook'] = `https://outlook.office.com/`;

      } catch (error) {
        const errorMessage = `Failed to provision Microsoft 365 user: ${error.message}`;
        errors.push(errorMessage);
        this.logger.error(errorMessage);
        
        return {
          provider: 'microsoft-365',
          status: 'error',
          external_ids: externalIds,
          external_links: externalLinks,
          errors,
          metadata: {
            email: data.workEmail,
          },
        };
      }

      // Step 2: Assign licenses
      if (data.licenseSKUs && data.licenseSKUs.length > 0) {
        try {
          // Get available licenses
          const subscribedSkus = await this.graphClient
            .api('/subscribedSkus')
            .get();

          const licensesToAssign = [];
          const licensesToRemove = [];

          for (const requestedSku of data.licenseSKUs) {
            const availableSku = subscribedSkus.value.find(
              (sku: any) => sku.skuPartNumber === requestedSku || sku.skuId === requestedSku
            );

            if (availableSku) {
              // Check if licenses are available
              const available = availableSku.prepaidUnits.enabled - availableSku.consumedUnits;
              if (available > 0) {
                licensesToAssign.push({
                  disabledPlans: [], // Enable all plans by default
                  skuId: availableSku.skuId,
                });
              } else {
                warnings.push(`No available licenses for SKU: ${requestedSku}`);
              }
            } else {
              warnings.push(`License SKU not found: ${requestedSku}`);
            }
          }

          if (licensesToAssign.length > 0) {
            await this.graphClient
              .api(`/users/${userId}/assignLicense`)
              .post({
                addLicenses: licensesToAssign,
                removeLicenses: licensesToRemove,
              });

            this.logger.log(`Assigned ${licensesToAssign.length} licenses to user`);
          }

        } catch (error) {
          const errorMessage = `Failed to assign licenses: ${error.message}`;
          errors.push(errorMessage);
          this.logger.error(errorMessage);
        }
      }

      // Step 3: Add to groups (if specified)
      // This would be implemented based on specific requirements

      // Step 4: Send welcome email (optional)
      if (userCreated) {
        try {
          // You could send a welcome email here using Graph API
          // await this.sendWelcomeEmail(userPrincipalName, data.tempPassword);
          externalLinks['firstLogin'] = `https://portal.office.com/`;
        } catch (error) {
          warnings.push(`Failed to send welcome email: ${error.message}`);
        }
      }

      return {
        provider: 'microsoft-365',
        status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'partial' : 'success',
        external_ids: externalIds,
        external_links: externalLinks,
        errors,
        warnings,
        metadata: {
          email: data.workEmail,
          userPrincipalName,
          usageLocation: data.usageLocation,
          licenses: data.licenseSKUs,
          created: userCreated,
          tempPassword: userCreated ? data.tempPassword : undefined,
        },
      };

    } catch (error) {
      this.logger.error(`Unexpected error in Microsoft 365 provisioning: ${error.message}`);
      return {
        provider: 'microsoft-365',
        status: 'error',
        external_ids: externalIds,
        external_links: externalLinks,
        errors: [`Unexpected error: ${error.message}`],
        metadata: {
          email: data.workEmail,
        },
      };
    }
  }

  private generateSecurePassword(): string {
    const length = 16;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}