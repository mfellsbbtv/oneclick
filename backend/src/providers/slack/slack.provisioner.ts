import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Provisioner, 
  ValidatedInput, 
  Plan, 
  Result,
  Action 
} from '../../common/interfaces/provisioner.interface';
import axios, { AxiosInstance } from 'axios';

export interface SlackInput {
  fullName: string;
  workEmail: string;
  userRole?: 'member' | 'admin';
  defaultChannels?: string[];
  userGroups?: string[];
  teamId?: string;
}

@Injectable()
export class SlackProvisioner implements Provisioner {
  private readonly logger = new Logger(SlackProvisioner.name);
  private scimClient: AxiosInstance;
  private apiClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    const scimToken = this.configService.get('SLACK_SCIM_TOKEN');
    const botToken = this.configService.get('SLACK_BOT_TOKEN');
    const workspaceId = this.configService.get('SLACK_WORKSPACE_ID');

    // SCIM API client for user provisioning
    this.scimClient = axios.create({
      baseURL: `https://api.slack.com/scim/v2/${workspaceId}`,
      headers: {
        'Authorization': `Bearer ${scimToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Regular API client for channel invitations
    this.apiClient = axios.create({
      baseURL: 'https://slack.com/api',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async validate(input: unknown): Promise<ValidatedInput> {
    const data = input as SlackInput;

    if (!data.fullName || !data.workEmail) {
      throw new Error('Full name and work email are required');
    }

    if (!data.workEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    const validatedData: SlackInput = {
      ...data,
      userRole: data.userRole || 'member',
      defaultChannels: data.defaultChannels || ['general'],
      userGroups: data.userGroups || [],
    };

    return {
      provider: 'slack',
      data: validatedData,
    };
  }

  async plan(input: ValidatedInput): Promise<Plan> {
    const data = input.data as SlackInput;
    const actions: Action[] = [];

    // Check if user already exists
    let userExists = false;
    try {
      const response = await this.scimClient.get('/Users', {
        params: {
          filter: `email eq "${data.workEmail}"`,
        },
      });
      userExists = response.data.totalResults > 0;
    } catch (error) {
      this.logger.debug(`User check failed: ${error.message}`);
    }

    if (!userExists) {
      actions.push({
        type: 'create',
        resource: 'user',
        details: `Create Slack user ${data.workEmail}`,
        required: true,
      });
    } else {
      actions.push({
        type: 'update',
        resource: 'user',
        details: `Update existing Slack user ${data.workEmail}`,
        required: false,
      });
    }

    // Add channel invitations
    if (data.defaultChannels && data.defaultChannels.length > 0) {
      actions.push({
        type: 'assign',
        resource: 'channels',
        details: `Invite to channels: ${data.defaultChannels.join(', ')}`,
        required: false,
      });
    }

    // Add user group assignments
    if (data.userGroups && data.userGroups.length > 0) {
      actions.push({
        type: 'assign',
        resource: 'user_groups',
        details: `Add to user groups: ${data.userGroups.join(', ')}`,
        required: false,
      });
    }

    return {
      provider: 'slack',
      actions,
      estimated_time: 20,
    };
  }

  async apply(input: ValidatedInput): Promise<Result> {
    const data = input.data as SlackInput;
    const errors: string[] = [];
    const warnings: string[] = [];
    const externalIds: Record<string, string> = {};
    const externalLinks: Record<string, string> = {};

    try {
      // Step 1: Create or update user via SCIM
      let slackUserId: string;
      let userCreated = false;

      try {
        // Check if user exists
        const existingUserResponse = await this.scimClient.get('/Users', {
          params: {
            filter: `email eq "${data.workEmail}"`,
          },
        });

        if (existingUserResponse.data.totalResults > 0) {
          // Update existing user
          const existingUser = existingUserResponse.data.Resources[0];
          slackUserId = existingUser.id;

          await this.scimClient.patch(`/Users/${slackUserId}`, {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: [
              {
                op: 'replace',
                path: 'name',
                value: {
                  givenName: data.fullName.split(' ')[0],
                  familyName: data.fullName.split(' ').slice(1).join(' ') || '',
                },
              },
              {
                op: 'replace',
                path: 'active',
                value: true,
              },
            ],
          });

          this.logger.log(`Updated existing Slack user: ${data.workEmail}`);
        } else {
          // Create new user
          const createResponse = await this.scimClient.post('/Users', {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: data.workEmail,
            name: {
              givenName: data.fullName.split(' ')[0],
              familyName: data.fullName.split(' ').slice(1).join(' ') || '',
            },
            emails: [
              {
                value: data.workEmail,
                type: 'work',
                primary: true,
              },
            ],
            active: true,
          });

          slackUserId = createResponse.data.id;
          userCreated = true;
          this.logger.log(`Created new Slack user: ${data.workEmail}`);
        }

        externalIds['slackUserId'] = slackUserId;
        externalLinks['profile'] = `https://app.slack.com/team/${slackUserId}`;

      } catch (error) {
        const errorMessage = `Failed to provision Slack user: ${error.response?.data?.detail || error.message}`;
        errors.push(errorMessage);
        this.logger.error(errorMessage);
        
        return {
          provider: 'slack',
          status: 'error',
          external_ids: externalIds,
          external_links: externalLinks,
          errors,
          metadata: {
            email: data.workEmail,
          },
        };
      }

      // Step 2: Invite to channels (if user was created)
      if (userCreated && data.defaultChannels && data.defaultChannels.length > 0) {
        for (const channel of data.defaultChannels) {
          try {
            // First, get the channel ID
            const channelResponse = await this.apiClient.post('/conversations.list', {
              types: 'public_channel',
            });

            const channelInfo = channelResponse.data.channels?.find(
              (ch: any) => ch.name === channel
            );

            if (channelInfo) {
              // Invite user to channel
              await this.apiClient.post('/conversations.invite', {
                channel: channelInfo.id,
                users: slackUserId,
              });
              
              this.logger.log(`Invited user to channel: ${channel}`);
            } else {
              warnings.push(`Channel not found: ${channel}`);
            }
          } catch (error) {
            warnings.push(`Failed to invite to channel ${channel}: ${error.message}`);
            this.logger.warn(`Failed to invite to channel ${channel}: ${error.message}`);
          }
        }
      }

      // Step 3: Add to user groups
      if (data.userGroups && data.userGroups.length > 0) {
        for (const groupName of data.userGroups) {
          try {
            // Get user groups
            const groupsResponse = await this.apiClient.post('/usergroups.list');
            const group = groupsResponse.data.usergroups?.find(
              (g: any) => g.name === groupName || g.handle === groupName
            );

            if (group) {
              // Get current users in the group
              const currentUsers = group.users || [];
              currentUsers.push(slackUserId);

              // Update group membership
              await this.apiClient.post('/usergroups.users.update', {
                usergroup: group.id,
                users: currentUsers,
              });

              this.logger.log(`Added user to group: ${groupName}`);
            } else {
              warnings.push(`User group not found: ${groupName}`);
            }
          } catch (error) {
            warnings.push(`Failed to add to group ${groupName}: ${error.message}`);
            this.logger.warn(`Failed to add to group ${groupName}: ${error.message}`);
          }
        }
      }

      return {
        provider: 'slack',
        status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'partial' : 'success',
        external_ids: externalIds,
        external_links: externalLinks,
        errors,
        warnings,
        metadata: {
          email: data.workEmail,
          role: data.userRole,
          channels: data.defaultChannels,
          groups: data.userGroups,
          created: userCreated,
        },
      };

    } catch (error) {
      this.logger.error(`Unexpected error in Slack provisioning: ${error.message}`);
      return {
        provider: 'slack',
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
}