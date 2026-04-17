package cmd

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/iam"
	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/logger"
	"github.com/spf13/cobra"
)

var (
	timezone string
)

var autoCmd = &cobra.Command{
	Use:   "auto",
	Short: "Automatically process users based on IAM tags",
	Long: `Automatically discover and process IAM users based on tags.

This command discovers users with the following tags:
- disable-after: Triggers the disable operation
- remove-after: Triggers the remove operation

Tag value format: YYYYMMDDHHMM (e.g., 202510252130 = Oct 25, 2025 at 21:30)

Only users where current time >= tag time are processed.
Perfect for scheduled cron jobs that automatically manage user access.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return runAuto(cmd.Context())
	},
}

func runAuto(ctx context.Context) error {
	log := logger.New()

	if err := validateAutoInputs(); err != nil {
		return err
	}

	log.Info("Starting AWS User Auto-Discovery Operation")
	log.Info(fmt.Sprintf("Accounts: %v", accounts))
	log.Info(fmt.Sprintf("Timezone: UTC%s", timezone))
	log.Info(fmt.Sprintf("Dry Run: %v", dryRun))

	if !force && !dryRun {
		if !confirmAction("auto-process users based on tags") {
			log.Info("Operation cancelled by user")
			return nil
		}
	}

	// Parse timezone offset
	tzOffset, err := parseTimezoneOffset(timezone)
	if err != nil {
		return fmt.Errorf("invalid timezone format: %w", err)
	}

	// Get current time in UTC
	now := time.Now().UTC()

	for _, account := range accounts {
		log.Info(fmt.Sprintf("============================================"))
		log.Info(fmt.Sprintf("Processing account: %s", account))

		client, err := iam.NewClient(ctx, account)
		if err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to create IAM client: %v", account, err))
			continue
		}

		// List users with tags
		taggedUsers, err := client.ListUsersByTag(ctx)
		if err != nil {
			log.Error(fmt.Sprintf("[%s] Failed to list users by tag: %v", account, err))
			continue
		}

		if len(taggedUsers) == 0 {
			log.Info(fmt.Sprintf("[%s] No users found with disable-after or remove-after tags", account))
			continue
		}

		log.Info(fmt.Sprintf("[%s] Found %d users with tags", account, len(taggedUsers)))

		// Separate users by operation type
		var usersToDelete []iam.UserTagInfo
		var usersToDisable []iam.UserTagInfo

		for _, userInfo := range taggedUsers {
			// Parse tag value (YYYYMMDDHHMM format) and convert to UTC
			tagTime, err := parseTagTime(userInfo.TagValue, tzOffset)
			if err != nil {
				log.Warning(fmt.Sprintf("[%s] Invalid tag format for user %s (tag: %s=%s): %v",
					account, userInfo.Username, userInfo.TagKey, userInfo.TagValue, err))
				continue
			}

			// Check if current time >= tag time (both in UTC)
			if now.Before(tagTime) {
				log.Info(fmt.Sprintf("[%s] User %s tag time not reached yet (tag: %s UTC, current: %s UTC)",
					account, userInfo.Username, tagTime.Format("2006-01-02 15:04"), now.Format("2006-01-02 15:04")))
				continue
			}

			// Categorize users by operation
			if userInfo.Operation == "remove" {
				usersToDelete = append(usersToDelete, userInfo)
			} else if userInfo.Operation == "disable" {
				usersToDisable = append(usersToDisable, userInfo)
			}
		}

		// Process deletions first
		for _, userInfo := range usersToDelete {
			log.Info(fmt.Sprintf("[%s] Processing user %s (tag: %s=%s, operation: remove)",
				account, userInfo.Username, userInfo.TagKey, userInfo.TagValue))

			// Remove all access and permissions
			if err := client.DeleteAccessKeys(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to delete access keys for %s: %v", account, userInfo.Username, err))
				continue
			}

			if err := client.RemoveConsoleAccess(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to remove console access for %s: %v", account, userInfo.Username, err))
				continue
			}

			if err := client.DetachManagedPolicies(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to detach managed policies for %s: %v", account, userInfo.Username, err))
				continue
			}

			if err := client.DeleteInlinePolicies(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to delete inline policies for %s: %v", account, userInfo.Username, err))
				continue
			}

			if err := client.RemoveFromGroups(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to remove from groups for %s: %v", account, userInfo.Username, err))
				continue
			}

			if err := client.RemoveMFADevices(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to remove MFA devices for %s: %v", account, userInfo.Username, err))
				continue
			}

			// Delete the user
			if err := client.DeleteUser(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to delete user %s: %v", account, userInfo.Username, err))
				continue
			}

			log.Success(fmt.Sprintf("[%s] User %s removal completed", account, userInfo.Username))
		}

		// After processing deletions, refresh the user list to get only disable-after users
		if len(usersToDelete) > 0 && len(usersToDisable) == 0 {
			log.Info(fmt.Sprintf("[%s] Refreshing user list after deletions", account))
			taggedUsers, err = client.ListUsersByTag(ctx)
			if err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to refresh user list: %v", account, err))
				continue
			}

			// Re-filter for disable-after users only
			usersToDisable = nil
			for _, userInfo := range taggedUsers {
				if userInfo.Operation == "disable" {
					// Parse tag value (YYYYMMDDHHMM format) and convert to UTC
					tagTime, err := parseTagTime(userInfo.TagValue, tzOffset)
					if err != nil {
						log.Warning(fmt.Sprintf("[%s] Invalid tag format for user %s (tag: %s=%s): %v",
							account, userInfo.Username, userInfo.TagKey, userInfo.TagValue, err))
						continue
					}

					// Check if current time >= tag time (both in UTC)
					if now.Before(tagTime) {
						log.Info(fmt.Sprintf("[%s] User %s tag time not reached yet (tag: %s UTC, current: %s UTC)",
							account, userInfo.Username, tagTime.Format("2006-01-02 15:04"), now.Format("2006-01-02 15:04")))
						continue
					}

					usersToDisable = append(usersToDisable, userInfo)
				}
			}

			if len(usersToDisable) > 0 {
				log.Info(fmt.Sprintf("[%s] Found %d users with disable-after tags after deletions", account, len(usersToDisable)))
			}
		}

		// Process disables second
		for _, userInfo := range usersToDisable {
			log.Info(fmt.Sprintf("[%s] Processing user %s (tag: %s=%s, operation: disable)",
				account, userInfo.Username, userInfo.TagKey, userInfo.TagValue))

			// Check if user still exists (might have been deleted in the remove phase)
			if !dryRun {
				exists, err := client.UserExists(ctx, userInfo.Username)
				if err != nil {
					log.Error(fmt.Sprintf("[%s] Failed to check if user %s exists: %v", account, userInfo.Username, err))
					continue
				}
				if !exists {
					log.Warning(fmt.Sprintf("[%s] User %s no longer exists (was deleted in remove phase)", account, userInfo.Username))
					continue
				}
			}

			if err := client.DisableAccessKeys(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to disable access keys for %s: %v", account, userInfo.Username, err))
				continue
			}

			if err := client.RemoveConsoleAccess(ctx, userInfo.Username, dryRun); err != nil {
				log.Error(fmt.Sprintf("[%s] Failed to remove console access for %s: %v", account, userInfo.Username, err))
				continue
			}

			log.Success(fmt.Sprintf("[%s] User %s access disabled successfully", account, userInfo.Username))
		}

		log.Info(fmt.Sprintf("============================================"))
	}

	if dryRun {
		log.Info("DRY RUN COMPLETED - No changes were made")
	} else {
		log.Success("AUTO-DISCOVERY OPERATION COMPLETED SUCCESSFULLY")
	}

	return nil
}

// parseTagTime parses YYYYMMDDHHMM format to time.Time in UTC
// tzOffset is the timezone offset of the tag value (e.g., -8 for PST, -3 for BRT)
// The function converts the tag time from the specified timezone to UTC
func parseTagTime(tagValue string, tzOffset float64) (time.Time, error) {
	if len(tagValue) != 12 {
		return time.Time{}, fmt.Errorf("tag value must be 12 characters (YYYYMMDDHHMM), got %d", len(tagValue))
	}

	year, err := strconv.Atoi(tagValue[0:4])
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid year: %w", err)
	}

	month, err := strconv.Atoi(tagValue[4:6])
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid month: %w", err)
	}

	day, err := strconv.Atoi(tagValue[6:8])
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid day: %w", err)
	}

	hour, err := strconv.Atoi(tagValue[8:10])
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid hour: %w", err)
	}

	minute, err := strconv.Atoi(tagValue[10:12])
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid minute: %w", err)
	}

	// Parse tag time as if it's in the specified timezone
	tagTimeInTZ := time.Date(year, time.Month(month), day, hour, minute, 0, 0, time.UTC)

	// Convert from the specified timezone to UTC
	// If tag is in UTC-3 (tzOffset = -3), we need to add 3 hours to get UTC
	// If tag is in UTC+5 (tzOffset = +5), we need to subtract 5 hours to get UTC
	utcTime := tagTimeInTZ.Add(time.Duration(-tzOffset) * time.Hour)

	return utcTime, nil
}

// parseTimezoneOffset parses timezone offset string (e.g., "-08", "+05:30")
func parseTimezoneOffset(tz string) (float64, error) {
	if tz == "" {
		return -8, nil // Default to PST
	}

	// Handle format like "-08" or "+05:30"
	var sign float64 = 1
	if tz[0] == '-' {
		sign = -1
		tz = tz[1:]
	} else if tz[0] == '+' {
		tz = tz[1:]
	}

	// Check if it contains colon (e.g., "05:30")
	if len(tz) > 2 && tz[2:3] == ":" {
		hours, err := strconv.ParseFloat(tz[0:2], 64)
		if err != nil {
			return 0, fmt.Errorf("invalid timezone hours: %w", err)
		}
		minutes, err := strconv.ParseFloat(tz[3:5], 64)
		if err != nil {
			return 0, fmt.Errorf("invalid timezone minutes: %w", err)
		}
		return sign * (hours + minutes/60), nil
	}

	// Simple format like "08"
	hours, err := strconv.ParseFloat(tz, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid timezone: %w", err)
	}

	return sign * hours, nil
}

// validateAutoInputs validates inputs for auto command
func validateAutoInputs() error {
	if len(accounts) == 0 {
		return fmt.Errorf("accounts flag is required")
	}
	return nil
}

func init() {
	autoCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show what would be done without making changes")
	autoCmd.Flags().BoolVar(&force, "force", false, "Skip confirmation prompts")
	autoCmd.Flags().StringVar(&timezone, "tz", "-08", "Timezone offset for tag time comparison (e.g., -08, +05:30, default: -08)")
}
