package iam

import (
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/aws/aws-sdk-go-v2/service/iam/types"
)

func (c *Client) DisableAccessKeys(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking access keys for user %s", c.profile, username))

	output, err := c.iamClient.ListAccessKeys(ctx, &iam.ListAccessKeysInput{UserName: &username})
	if err != nil {
		return fmt.Errorf("failed to list access keys: %w", err)
	}

	if len(output.AccessKeyMetadata) == 0 {
		c.log.Info(fmt.Sprintf("[%s] No access keys found for user %s", c.profile, username))
		return nil
	}

	for _, key := range output.AccessKeyMetadata {
		if dryRun {
			c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would deactivate access key: %s", c.profile, *key.AccessKeyId))
		} else {
			c.log.Info(fmt.Sprintf("[%s] Deactivating access key: %s", c.profile, *key.AccessKeyId))
			_, err := c.iamClient.UpdateAccessKey(ctx, &iam.UpdateAccessKeyInput{
				UserName:    &username,
				AccessKeyId: key.AccessKeyId,
				Status:      types.StatusTypeInactive,
			})
			if err != nil {
				return fmt.Errorf("failed to deactivate access key %s: %w", *key.AccessKeyId, err)
			}
			c.log.Success(fmt.Sprintf("[%s] Access key deactivated: %s", c.profile, *key.AccessKeyId))
		}
	}

	return nil
}

func (c *Client) DeleteAccessKeys(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking access keys for user %s", c.profile, username))

	output, err := c.iamClient.ListAccessKeys(ctx, &iam.ListAccessKeysInput{UserName: &username})
	if err != nil {
		return fmt.Errorf("failed to list access keys: %w", err)
	}

	if len(output.AccessKeyMetadata) == 0 {
		c.log.Info(fmt.Sprintf("[%s] No access keys found for user %s", c.profile, username))
		return nil
	}

	for _, key := range output.AccessKeyMetadata {
		if dryRun {
			c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would delete access key: %s", c.profile, *key.AccessKeyId))
		} else {
			c.log.Info(fmt.Sprintf("[%s] Deleting access key: %s", c.profile, *key.AccessKeyId))
			_, err := c.iamClient.DeleteAccessKey(ctx, &iam.DeleteAccessKeyInput{
				UserName:    &username,
				AccessKeyId: key.AccessKeyId,
			})
			if err != nil {
				return fmt.Errorf("failed to delete access key %s: %w", *key.AccessKeyId, err)
			}
			c.log.Success(fmt.Sprintf("[%s] Access key deleted: %s", c.profile, *key.AccessKeyId))
		}
	}

	return nil
}

func (c *Client) RemoveConsoleAccess(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking console login profile for user %s", c.profile, username))

	_, err := c.iamClient.GetLoginProfile(ctx, &iam.GetLoginProfileInput{UserName: &username})
	if err != nil {
		if strings.Contains(err.Error(), "NoSuchEntity") {
			c.log.Info(fmt.Sprintf("[%s] No console login profile found for user %s", c.profile, username))
			return nil
		}
		return fmt.Errorf("failed to get login profile: %w", err)
	}

	if dryRun {
		c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would delete console login profile", c.profile))
	} else {
		c.log.Info(fmt.Sprintf("[%s] Deleting console login profile", c.profile))
		_, err := c.iamClient.DeleteLoginProfile(ctx, &iam.DeleteLoginProfileInput{UserName: &username})
		if err != nil {
			return fmt.Errorf("failed to delete login profile: %w", err)
		}
		c.log.Success(fmt.Sprintf("[%s] Console login profile deleted", c.profile))
	}

	return nil
}

func (c *Client) DetachManagedPolicies(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking managed policies for user %s", c.profile, username))

	output, err := c.iamClient.ListAttachedUserPolicies(ctx, &iam.ListAttachedUserPoliciesInput{UserName: &username})
	if err != nil {
		return fmt.Errorf("failed to list attached policies: %w", err)
	}

	if len(output.AttachedPolicies) == 0 {
		c.log.Info(fmt.Sprintf("[%s] No managed policies attached to user %s", c.profile, username))
		return nil
	}

	for _, policy := range output.AttachedPolicies {
		if dryRun {
			c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would detach managed policy: %s", c.profile, *policy.PolicyArn))
		} else {
			c.log.Info(fmt.Sprintf("[%s] Detaching managed policy: %s", c.profile, *policy.PolicyArn))
			_, err := c.iamClient.DetachUserPolicy(ctx, &iam.DetachUserPolicyInput{
				UserName:  &username,
				PolicyArn: policy.PolicyArn,
			})
			if err != nil {
				return fmt.Errorf("failed to detach policy %s: %w", *policy.PolicyArn, err)
			}
			c.log.Success(fmt.Sprintf("[%s] Managed policy detached: %s", c.profile, *policy.PolicyArn))
		}
	}

	return nil
}

func (c *Client) DeleteInlinePolicies(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking inline policies for user %s", c.profile, username))

	output, err := c.iamClient.ListUserPolicies(ctx, &iam.ListUserPoliciesInput{UserName: &username})
	if err != nil {
		return fmt.Errorf("failed to list user policies: %w", err)
	}

	if len(output.PolicyNames) == 0 {
		c.log.Info(fmt.Sprintf("[%s] No inline policies found for user %s", c.profile, username))
		return nil
	}

	for _, policyName := range output.PolicyNames {
		if dryRun {
			c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would delete inline policy: %s", c.profile, policyName))
		} else {
			c.log.Info(fmt.Sprintf("[%s] Deleting inline policy: %s", c.profile, policyName))
			_, err := c.iamClient.DeleteUserPolicy(ctx, &iam.DeleteUserPolicyInput{
				UserName:   &username,
				PolicyName: &policyName,
			})
			if err != nil {
				return fmt.Errorf("failed to delete policy %s: %w", policyName, err)
			}
			c.log.Success(fmt.Sprintf("[%s] Inline policy deleted: %s", c.profile, policyName))
		}
	}

	return nil
}

func (c *Client) RemoveFromGroups(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking group memberships for user %s", c.profile, username))

	output, err := c.iamClient.ListGroupsForUser(ctx, &iam.ListGroupsForUserInput{UserName: &username})
	if err != nil {
		return fmt.Errorf("failed to list groups for user: %w", err)
	}

	if len(output.Groups) == 0 {
		c.log.Info(fmt.Sprintf("[%s] User %s is not member of any groups", c.profile, username))
		return nil
	}

	for _, group := range output.Groups {
		if dryRun {
			c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would remove user from group: %s", c.profile, *group.GroupName))
		} else {
			c.log.Info(fmt.Sprintf("[%s] Removing user from group: %s", c.profile, *group.GroupName))
			_, err := c.iamClient.RemoveUserFromGroup(ctx, &iam.RemoveUserFromGroupInput{
				UserName:  &username,
				GroupName: group.GroupName,
			})
			if err != nil {
				return fmt.Errorf("failed to remove user from group %s: %w", *group.GroupName, err)
			}
			c.log.Success(fmt.Sprintf("[%s] User removed from group: %s", c.profile, *group.GroupName))
		}
	}

	return nil
}

func (c *Client) RemoveMFADevices(ctx context.Context, username string, dryRun bool) error {
	c.log.Info(fmt.Sprintf("[%s] Checking MFA devices for user %s", c.profile, username))

	output, err := c.iamClient.ListMFADevices(ctx, &iam.ListMFADevicesInput{UserName: &username})
	if err != nil {
		return fmt.Errorf("failed to list MFA devices: %w", err)
	}

	if len(output.MFADevices) == 0 {
		c.log.Info(fmt.Sprintf("[%s] No MFA devices found for user %s", c.profile, username))
		return nil
	}

	for _, device := range output.MFADevices {
		if dryRun {
			c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would deactivate and delete MFA device: %s", c.profile, *device.SerialNumber))
		} else {
			c.log.Info(fmt.Sprintf("[%s] Deactivating MFA device: %s", c.profile, *device.SerialNumber))
			_, err := c.iamClient.DeactivateMFADevice(ctx, &iam.DeactivateMFADeviceInput{
				UserName:     &username,
				SerialNumber: device.SerialNumber,
			})
			if err != nil {
				return fmt.Errorf("failed to deactivate MFA device %s: %w", *device.SerialNumber, err)
			}

			// Only try to delete virtual MFA devices
			if strings.Contains(*device.SerialNumber, ":mfa/") {
				c.log.Info(fmt.Sprintf("[%s] Deleting virtual MFA device: %s", c.profile, *device.SerialNumber))
				_, err := c.iamClient.DeleteVirtualMFADevice(ctx, &iam.DeleteVirtualMFADeviceInput{
					SerialNumber: device.SerialNumber,
				})
				if err != nil {
					return fmt.Errorf("failed to delete virtual MFA device %s: %w", *device.SerialNumber, err)
				}
			}

			c.log.Success(fmt.Sprintf("[%s] MFA device removed: %s", c.profile, *device.SerialNumber))
		}
	}

	return nil
}

func (c *Client) TagUser(ctx context.Context, username, deleteDate string, dryRun bool) error {
	if dryRun {
		c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would tag user with remove-after=%s", c.profile, deleteDate))
	} else {
		c.log.Info(fmt.Sprintf("[%s] Tagging user with remove-after=%s", c.profile, deleteDate))
		_, err := c.iamClient.TagUser(ctx, &iam.TagUserInput{
			UserName: &username,
			Tags: []types.Tag{
				{
					Key:   stringPtr("remove-after"),
					Value: stringPtr(deleteDate),
				},
			},
		})
		if err != nil {
			return fmt.Errorf("failed to tag user: %w", err)
		}
		c.log.Success(fmt.Sprintf("[%s] User tagged with remove-after=%s", c.profile, deleteDate))
	}

	return nil
}

func (c *Client) DeleteUser(ctx context.Context, username string, dryRun bool) error {
	if dryRun {
		c.log.Info(fmt.Sprintf("[%s] [DRY-RUN] Would delete user: %s", c.profile, username))
	} else {
		c.log.Info(fmt.Sprintf("[%s] Deleting user: %s", c.profile, username))
		_, err := c.iamClient.DeleteUser(ctx, &iam.DeleteUserInput{UserName: &username})
		if err != nil {
			return fmt.Errorf("failed to delete user: %w", err)
		}
		c.log.Success(fmt.Sprintf("[%s] User deleted: %s", c.profile, username))
	}

	return nil
}

func stringPtr(s string) *string {
	return &s
}
