package cmd

import (
	"context"
	"fmt"

	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/iam"
	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/logger"
	"github.com/spf13/cobra"
)

var removeCmd = &cobra.Command{
	Use:   "remove",
	Short: "Completely remove AWS IAM user",
	Long: `Completely remove an AWS IAM user from specified accounts.

This command:
1. Deletes all access keys
2. Removes console login profile
3. Detaches all managed policies
4. Deletes all inline policies
5. Removes from all groups
6. Deactivates and deletes MFA devices
7. Optionally tags before deletion
8. Finally deletes the user

This is a destructive operation and cannot be undone.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return runRemove(cmd.Context())
	},
}

func runRemove(ctx context.Context) error {
	log := logger.New()

	if err := validateInputs(); err != nil {
		return err
	}

	if tagDate != "" {
		if err := validateDateFormat(tagDate); err != nil {
			return err
		}
	}

	log.Info("Starting AWS User Removal Operation")
	log.Info(fmt.Sprintf("User: %s", username))
	log.Info(fmt.Sprintf("Accounts: %v", accounts))
	log.Info(fmt.Sprintf("Dry Run: %v", dryRun))
	if tagDate != "" {
		log.Info(fmt.Sprintf("Tag Date: %s", tagDate))
	}

	if !force && !dryRun {
		if !confirmAction("PERMANENTLY DELETE") {
			log.Info("Operation cancelled by user")
			return nil
		}
	}

	for _, account := range accounts {
		log.Info(fmt.Sprintf("============================================"))
		log.Info(fmt.Sprintf("Processing account: %s", account))

		client, err := iam.NewClient(ctx, account)
		if err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to create IAM client: %v", account, err))
			continue
		}

		// Check if user exists
		exists, err := client.UserExists(ctx, username)
		if err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to check user existence: %v", account, err))
			continue
		}

		if !exists {
			log.Warning(fmt.Sprintf("[%s] User %s does not exist, skipping", account, username))
			continue
		}

		log.Info(fmt.Sprintf("[%s] User %s found, proceeding with removal", account, username))

		// Remove all access and permissions
		if err := client.DisableAccessKeys(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to disable access keys: %v", account, err))
		}

		if err := client.RemoveConsoleAccess(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to remove console access: %v", account, err))
		}

		if err := client.DetachManagedPolicies(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to detach managed policies: %v", account, err))
		}

		if err := client.DeleteInlinePolicies(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to delete inline policies: %v", account, err))
		}

		if err := client.RemoveFromGroups(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to remove from groups: %v", account, err))
		}

		if err := client.RemoveMFADevices(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to remove MFA devices: %v", account, err))
		}

		// Tag if requested
		if tagDate != "" {
			if err := client.TagUser(ctx, username, tagDate, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to tag user: %v", account, err))
			}
		}

		// Delete the user
		if err := client.DeleteUser(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to delete user: %v", account, err))
		}

		log.Success(fmt.Sprintf("[%s] User %s removal completed", account, username))
		log.Info(fmt.Sprintf("============================================"))
	}

	if dryRun {
		log.Info("DRY RUN COMPLETED - No changes were made")
	} else {
		log.Success("USER REMOVAL COMPLETED SUCCESSFULLY")
	}

	return nil
}

func init() {
	removeCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show what would be done without making changes")
	removeCmd.Flags().BoolVar(&force, "force", false, "Skip confirmation prompts")
	removeCmd.Flags().StringVar(&tagDate, "tag-before", "", "Tag user with remove-after=DATE before removal (YYYYMMDD format)")
	removeCmd.MarkFlagRequired("username")
}
