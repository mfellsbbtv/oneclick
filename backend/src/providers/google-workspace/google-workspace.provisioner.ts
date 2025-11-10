import { Injectable } from '@nestjs/common';
import { Provisioner, ValidatedInput, Plan, Result } from '../../common/interfaces/provisioner.interface';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

export interface GoogleWorkspaceInput {
  fullName: string;
  workEmail: string;
  primaryOrgUnit?: string;
  passwordMode?: 'auto' | 'custom';
  customPassword?: string;
  changePasswordAtNextLogin?: boolean;
  licenseSku?: string;
}

@Injectable()
export class GoogleWorkspaceProvisioner implements Provisioner {
  private admin;
  private licensing;

  constructor(private configService: ConfigService) {
    const credentialsPath = this.configService.get('GOOGLE_CREDENTIALS_JSON') || '/home/mfells/Projects/oneclick/google-credentials.json';
    const adminEmail = this.configService.get('GOOGLE_ADMIN_DELEGATED_USER') || 'mfells@broadbandtvcorp.com';
    
    // Load credentials for direct JWT authentication
    const credentials = require(credentialsPath);
    
    // Create JWT clients with proper impersonation
    const adminAuth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
      subject: adminEmail,
    });

    const licensingAuth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/apps.licensing'],
      subject: adminEmail,
    });

    this.admin = google.admin({ version: 'directory_v1', auth: adminAuth });
    this.licensing = google.licensing({ version: 'v1', auth: licensingAuth });
  }

  async validate(input: unknown): Promise<ValidatedInput> {
    const data = input as GoogleWorkspaceInput;
    
    if (!data.fullName || !data.workEmail) {
      throw new Error('Full name and work email are required');
    }

    if (!data.workEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    // Validate custom password if provided
    if (data.passwordMode === 'custom') {
      if (!data.customPassword) {
        throw new Error('Custom password is required when password mode is set to custom');
      }
      if (data.customPassword.length < 8) {
        throw new Error('Custom password must be at least 8 characters long');
      }
    }

    return {
      provider: 'google-workspace',
      data: {
        ...data,
        primaryOrgUnit: data.primaryOrgUnit || '/',
        passwordMode: data.passwordMode || 'auto',
        changePasswordAtNextLogin: data.changePasswordAtNextLogin !== undefined ? data.changePasswordAtNextLogin : false,
        licenseSku: data.licenseSku || '1010020026', // Enterprise Standard
      },
    };
  }

  async plan(input: ValidatedInput): Promise<Plan> {
    const data = input.data as GoogleWorkspaceInput;
    
    // Check if user already exists
    let userExists = false;
    try {
      const response = await this.admin.users.get({
        userKey: data.workEmail,
      });
      userExists = !!response.data;
    } catch (error) {
      // User doesn't exist, which is expected
    }

    const actions = [];
    
    if (!userExists) {
      actions.push({
        type: 'create',
        resource: 'user',
        details: `Create user ${data.workEmail} in org unit ${data.primaryOrgUnit}`,
      });
    } else {
      actions.push({
        type: 'update',
        resource: 'user',
        details: `Update existing user ${data.workEmail}`,
      });
    }

    actions.push({
      type: 'assign',
      resource: 'license',
      details: `Assign ${data.licenseSku} license to ${data.workEmail}`,
    });

    return {
      provider: 'google-workspace',
      actions,
      estimated_time: 30,
    };
  }

  async apply(input: ValidatedInput): Promise<Result> {
    const data = input.data as GoogleWorkspaceInput;
    const errors = [];
    const externalIds = {};

    try {
      // Determine password to use (for both create and update scenarios)
      const password = data.passwordMode === 'custom' && data.customPassword
        ? data.customPassword
        : this.generatePassword();

      // Store the password that will be used
      externalIds['password'] = password;

      // Create or update user
      let userId;
      try {
        const existingUser = await this.admin.users.get({
          userKey: data.workEmail,
        });
        userId = existingUser.data.id;
        
        // Update existing user
        await this.admin.users.update({
          userKey: data.workEmail,
          requestBody: {
            name: {
              givenName: data.fullName.split(' ')[0],
              familyName: data.fullName.split(' ').slice(1).join(' ') || 'User',
            },
            orgUnitPath: data.primaryOrgUnit,
            // Note: Password updates for existing users require different API calls
          },
        });
      } catch (error) {
        // Create new user
        const newUser = await this.admin.users.insert({
          requestBody: {
            primaryEmail: data.workEmail,
            name: {
              givenName: data.fullName.split(' ')[0],
              familyName: data.fullName.split(' ').slice(1).join(' ') || 'User',
            },
            password,
            changePasswordAtNextLogin: data.changePasswordAtNextLogin,
            orgUnitPath: data.primaryOrgUnit,
          },
        });
        userId = newUser.data.id;
      }

      externalIds['userId'] = userId;

      // Assign license
      try {
        await this.licensing.licenseAssignments.insert({
          productId: 'Google-Apps',
          skuId: data.licenseSku,
          requestBody: {
            userId: data.workEmail,
          },
        });
      } catch (error) {
        errors.push(`Failed to assign license: ${error.message}`);
      }

      return {
        provider: 'google-workspace',
        status: errors.length > 0 ? 'partial' : 'success',
        external_ids: externalIds,
        errors,
        metadata: {
          email: data.workEmail,
          orgUnit: data.primaryOrgUnit,
          license: data.licenseSku,
          passwordMode: data.passwordMode,
          changePasswordAtNextLogin: data.changePasswordAtNextLogin,
          customPasswordUsed: data.passwordMode === 'custom',
          passwordUsed: externalIds['password'], // Include the actual password used
        },
      };
    } catch (error) {
      return {
        provider: 'google-workspace',
        status: 'error',
        external_ids: externalIds,
        errors: [error.message],
        metadata: {},
      };
    }
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}