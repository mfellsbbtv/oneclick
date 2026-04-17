package cmd

import (
	"context"

	"github.com/spf13/cobra"
)

var (
	username    string
	accounts    []string
	dryRun      bool
	force       bool
	disableOnly bool
	tagDate     string
)

var rootCmd = &cobra.Command{
	Use:   "aws-user-removal",
	Short: "Manage AWS IAM user access and removal",
	Long: `AWS User Removal Tool

This tool helps manage AWS IAM user access by:
1. Disabling access keys
2. Removing console login
3. Optionally removing all permissions and deleting the user

Use the --disable-only flag to disable access without removing the user.
This is ideal for scheduled cron jobs that disable access at a specific time,
followed by manual user removal later.`,
	Version: "1.0.0",
}

func Execute(ctx context.Context) error {
	return rootCmd.ExecuteContext(ctx)
}

func init() {
	rootCmd.AddCommand(removeCmd)
	rootCmd.AddCommand(disableCmd)
	rootCmd.AddCommand(autoCmd)

	rootCmd.PersistentFlags().StringVarP(&username, "username", "u", "", "IAM username to manage (optional for auto command)")
	rootCmd.PersistentFlags().StringSliceVarP(&accounts, "accounts", "a", []string{}, "Comma-separated list of AWS profile names (required)")
	rootCmd.PersistentFlags().BoolVarP(&dryRun, "dry-run", "d", false, "Show what would be done without making changes")
	rootCmd.PersistentFlags().BoolVarP(&force, "force", "f", false, "Skip confirmation prompts")
	rootCmd.PersistentFlags().StringVarP(&tagDate, "tag-before", "t", "", "Tag user with remove-after=DATE before removal (YYYYMMDD format)")

	rootCmd.MarkPersistentFlagRequired("accounts")
}
