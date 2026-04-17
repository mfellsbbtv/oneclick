package iam

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/bbtv/rhei-iac-tools/aws-user-removal/internal/logger"
)

type Client struct {
	iamClient *iam.Client
	profile   string
	log       *logger.Logger
}

func NewClient(ctx context.Context, profile string) (*Client, error) {
	log := logger.New()

	cfg, err := config.LoadDefaultConfig(ctx, config.WithSharedConfigProfile(profile))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config for profile %s: %w", profile, err)
	}

	return &Client{
		iamClient: iam.NewFromConfig(cfg),
		profile:   profile,
		log:       log,
	}, nil
}

func (c *Client) UserExists(ctx context.Context, username string) (bool, error) {
	_, err := c.iamClient.GetUser(ctx, &iam.GetUserInput{UserName: &username})
	if err != nil {
		// User not found is not an error for our purposes
		if err.Error() == "NoSuchEntity" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// UserTagInfo contains user information and tag details
type UserTagInfo struct {
	Username  string
	TagKey    string
	TagValue  string
	Operation string // "disable" or "remove"
}

// ListUsersByTag lists all IAM users and filters by disable-after or remove-after tags
func (c *Client) ListUsersByTag(ctx context.Context) ([]UserTagInfo, error) {
	c.log.Info(fmt.Sprintf("[%s] Listing all IAM users", c.profile))

	var users []UserTagInfo
	paginator := iam.NewListUsersPaginator(c.iamClient, &iam.ListUsersInput{})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list users: %w", err)
		}

		for _, user := range page.Users {
			// Get tags for this user
			tagsOutput, err := c.iamClient.ListUserTags(ctx, &iam.ListUserTagsInput{UserName: user.UserName})
			if err != nil {
				c.log.Warning(fmt.Sprintf("[%s] Failed to get tags for user %s: %v", c.profile, *user.UserName, err))
				continue
			}

			// Check for disable-after or remove-after tags
			for _, tag := range tagsOutput.Tags {
				if tag.Key != nil && tag.Value != nil {
					if *tag.Key == "disable-after" {
						users = append(users, UserTagInfo{
							Username:  *user.UserName,
							TagKey:    *tag.Key,
							TagValue:  *tag.Value,
							Operation: "disable",
						})
					} else if *tag.Key == "remove-after" {
						users = append(users, UserTagInfo{
							Username:  *user.UserName,
							TagKey:    *tag.Key,
							TagValue:  *tag.Value,
							Operation: "remove",
						})
					}
				}
			}
		}
	}

	return users, nil
}
