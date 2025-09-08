import { Injectable } from '@nestjs/common';
import { Provisioner, ValidatedInput, Plan, Result } from '../../common/interfaces/provisioner.interface';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

export interface GoogleWorkspaceInput {
  fullName: string;
  workEmail: string;
  primaryOrgUnit?: string;
  initialPasswordPolicy?: 'auto' | 'manual';
  licenseSku?: string;
}

@Injectable()
export class GoogleWorkspaceProvisioner implements Provisioner {
  private admin;
  private licensing;

  constructor(private configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      keyFile: this.configService.get('GOOGLE_CREDENTIALS_JSON'),
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.user',
        'https://www.googleapis.com/auth/apps.licensing',
      ],
    });

    this.admin = google.admin({ version: 'directory_v1', auth });
    this.licensing = google.licensing({ version: 'v1', auth });
  }

  async validate(input: unknown): Promise<ValidatedInput> {
    const data = input as GoogleWorkspaceInput;
    
    if (!data.fullName || !data.workEmail) {
      throw new Error('Full name and work email are required');
    }

    if (!data.workEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    return {
      provider: 'google-workspace',
      data: {
        ...data,
        primaryOrgUnit: data.primaryOrgUnit || '/',
        initialPasswordPolicy: data.initialPasswordPolicy || 'auto',
        licenseSku: data.licenseSku || 'Google-Apps-For-Business',
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
          },
        });
      } catch (error) {
        // Create new user
        const password = data.initialPasswordPolicy === 'auto' 
          ? this.generatePassword() 
          : 'ChangeMe123!';

        const newUser = await this.admin.users.insert({
          requestBody: {
            primaryEmail: data.workEmail,
            name: {
              givenName: data.fullName.split(' ')[0],
              familyName: data.fullName.split(' ').slice(1).join(' ') || 'User',
            },
            password,
            changePasswordAtNextLogin: true,
            orgUnitPath: data.primaryOrgUnit,
          },
        });
        userId = newUser.data.id;
      }

      externalIds['userId'] = userId;

      // Assign license
      try {
        await this.licensing.licenseAssignments.insert({
          productId: data.licenseSku.split('-')[0],
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