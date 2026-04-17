package cmd

import (
	"context"
	"fmt"

	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/iam"
	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/logger"
	"github.com/spf13/cobra"
)

var disableCmd = &cobra.Command{
	Use:   "disable",
	Short: "Disable user access (keys and console login only)",
	Long: `Disable user access without removing the user.

This command:
1. Deletes all access keys
2. Removes console login profile

The user account remains intact and can be manually removed later.
Perfect for scheduled cron jobs that disable access at a specific time.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return runDisable(cmd.Context())
	},
}

func runDisable(ctx context.Context) error {
	log := logger.New()

	if err := validateInputs(); err != nil {
		return err
	}

	log.Info("Starting AWS User Disable Operation")
	log.Info(fmt.Sprintf("User: %s", username))
	log.Info(fmt.Sprintf("Accounts: %v", accounts))
	log.Info(fmt.Sprintf("Dry Run: %v", dryRun))

	if !force && !dryRun {
		if !confirmAction("disable access for") {
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

		log.Info(fmt.Sprintf("[%s] User %s found, proceeding with disable", account, username))

		// Disable access keys
		if err := client.DisableAccessKeys(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to disable access keys: %v", account, err))
		}

		// Remove console access
		if err := client.RemoveConsoleAccess(ctx, username, dryRun); err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to remove console access: %v", account, err))
		}

		log.Success(fmt.Sprintf("[%s] User %s access disabled successfully", account, username))
		log.Info(fmt.Sprintf("============================================"))
	}

	if dryRun {
		log.Info("DRY RUN COMPLETED - No changes were made")
	} else {
		log.Success("USER DISABLE COMPLETED SUCCESSFULLY")
	}

	return nil
}

func init() {
	disableCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show what would be done without making changes")
	disableCmd.Flags().BoolVar(&force, "force", false, "Skip confirmation prompts")
	disableCmd.MarkFlagRequired("username")
}
