# AWS User Removal Tool - Project Summary

## Overview

A production-ready Go application for managing AWS IAM user access and removal across multiple accounts. Designed for security teams to safely disable user access on a schedule and manually remove users later.

## Key Features

✅ **Two-Stage Removal Process**
- Stage 1: Disable access (keys + console login) via cron
- Stage 2: Complete removal (all permissions + user deletion) manually

✅ **Cron-Friendly**
- Perfect for scheduled access disabling at specific times
- Supports both cron and systemd timers
- Force flag for automation without prompts

✅ **Multi-Account Support**
- Manage users across multiple AWS accounts in one operation
- Parallel account processing ready

✅ **Safety Features**
- Dry-run mode to preview changes
- Confirmation prompts for destructive operations
- Comprehensive logging with timestamps
- Graceful error handling

✅ **Production Ready**
- AWS SDK v2 for Go
- Cobra CLI framework
- Colored, structured logging
- GitHub Actions CI/CD for multi-platform builds

## Project Structure

```
aws-user-removal/
├── main.go                          # Entry point
├── go.mod                           # Go module definition
├── Makefile                         # Build automation
├── README.md                        # User documentation
├── QUICKSTART.md                    # 5-minute quick start
├── DEVELOPMENT.md                   # Technical documentation
├── PROJECT_SUMMARY.md               # This file
├── .gitignore                       # Git ignore rules
├── .github/
│   └── workflows/
│       └── build-release.yml        # GitHub Actions CI/CD
├── cmd/
│   ├── root.go                      # Root command & CLI setup
│   ├── disable.go                   # Disable command
│   ├── remove.go                    # Remove command
│   └── helpers.go                   # Shared utilities
├── internal/
│   ├── logger/
│   │   └── logger.go                # Colored logging
│   └── iam/
│       ├── client.go                # AWS IAM client
│       └── operations.go            # IAM operations
└── examples/
    ├── README.md                    # Deployment guide
    ├── cron-setup.sh                # Cron helper script
    ├── aws-user-removal.service     # Systemd service
    └── aws-user-removal.timer       # Systemd timer
```

## Commands

### Disable Command
Disables user access without removing the user account.

```bash
./aws-user-removal disable -u username -a prod,staging [--dry-run] [--force]
```

**Operations:**
1. Deletes all access keys
2. Removes console login profile

**Use Case:** Scheduled cron jobs that disable access at specific times

### Remove Command
Completely removes a user from specified accounts.

```bash
./aws-user-removal remove -u username -a prod,staging [--dry-run] [--force] [--tag-before DATE]
```

**Operations:**
1. Deletes all access keys
2. Removes console login profile
3. Detaches all managed policies
4. Deletes all inline policies
5. Removes from all groups
6. Deactivates and deletes MFA devices
7. Optionally tags before deletion
8. Deletes the user

**Use Case:** Manual user removal after disable period

## Typical Workflow

### Day 1: Schedule Disable
```bash
# Add cron job to disable access at 2 AM daily
0 2 * * * /opt/aws-user-removal/aws-user-removal disable -u john.doe -a prod,staging --force
```

### Day N: Manual Removal
```bash
# Preview what will be removed
./aws-user-removal remove -u john.doe -a prod,staging --dry-run

# Remove the user
./aws-user-removal remove -u john.doe -a prod,staging
```

## Technology Stack

- **Language:** Go 1.21+
- **AWS SDK:** aws-sdk-go-v2
- **CLI Framework:** Cobra
- **Logging:** fatih/color
- **CI/CD:** GitHub Actions
- **Build:** Make

## Building

### Prerequisites
- Go 1.21 or later
- AWS CLI configured with appropriate profiles

### Build Commands

```bash
# Build for current platform
make build

# Build for all platforms
make build-all

# Build for specific platform
make build-linux
make build-darwin
make build-windows

# Clean build artifacts
make clean
```

### Output
- Linux: `aws-user-removal-linux-amd64`, `aws-user-removal-linux-arm64`
- macOS: `aws-user-removal-darwin-amd64`, `aws-user-removal-darwin-arm64`
- Windows: `aws-user-removal-windows-amd64.exe`

## Deployment

### Installation

1. Download binary from releases or build from source
2. Place in `/opt/aws-user-removal/` or preferred location
3. Make executable: `chmod +x aws-user-removal`

### Configuration

1. Configure AWS profiles:
```bash
aws configure --profile prod
aws configure --profile staging
```

2. Create log directory:
```bash
mkdir -p /var/log/aws-user-removal
chmod 755 /var/log/aws-user-removal
```

### Scheduling

**Option 1: Cron**
```bash
0 2 * * * /opt/aws-user-removal/aws-user-removal disable -u username -a prod,staging --force >> /var/log/aws-user-removal/disable.log 2>&1
```

**Option 2: Systemd Timer**
See `examples/aws-user-removal.service` and `examples/aws-user-removal.timer`

## Security Considerations

✅ **No Credentials in Code**
- Uses AWS SDK credential chain
- Supports IAM roles on EC2

✅ **Explicit Confirmations**
- Requires typing "DELETE" for destructive operations
- Force flag for automation (explicit opt-in)

✅ **Dry-Run Mode**
- Preview all changes before applying
- Safe for testing

✅ **Comprehensive Logging**
- All operations logged with timestamps
- Errors logged to stderr

✅ **Minimal Permissions**
- Only requires IAM permissions for specific operations
- No access to other AWS services

## AWS Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetUser",
        "iam:ListAccessKeys",
        "iam:DeleteAccessKey",
        "iam:GetLoginProfile",
        "iam:DeleteLoginProfile",
        "iam:ListAttachedUserPolicies",
        "iam:DetachUserPolicy",
        "iam:ListUserPolicies",
        "iam:DeleteUserPolicy",
        "iam:ListGroupsForUser",
        "iam:RemoveUserFromGroup",
        "iam:ListMFADevices",
        "iam:DeactivateMFADevice",
        "iam:DeleteVirtualMFADevice",
        "iam:TagUser",
        "iam:DeleteUser"
      ],
      "Resource": "arn:aws:iam::*:user/*"
    }
  ]
}
```

## CI/CD Pipeline

GitHub Actions workflow automatically:
1. Builds for all supported platforms on git tag
2. Creates release with binaries
3. Supports both AMD64 and ARM64 architectures

**Trigger:** Push git tag (e.g., `git tag v1.0.0 && git push origin v1.0.0`)

## Documentation

- **README.md** - Complete user documentation
- **QUICKSTART.md** - 5-minute quick start guide
- **DEVELOPMENT.md** - Technical development guide
- **examples/README.md** - Deployment and scheduling guide
- **PROJECT_SUMMARY.md** - This file

## Testing

### Manual Testing

```bash
# Test disable with dry-run
./aws-user-removal disable -u testuser -a dev --dry-run

# Test remove with dry-run
./aws-user-removal remove -u testuser -a dev --dry-run

# Test with invalid inputs
./aws-user-removal disable -u testuser  # Missing accounts
./aws-user-removal disable -a dev       # Missing username
```

### AWS Profile Setup

```bash
aws configure --profile test-prod
aws configure --profile test-staging
aws --profile test-prod iam list-users
```

## Performance

- Sequential processing per account (safe for IAM)
- Suitable for small to medium-scale operations
- No rate limiting issues with AWS IAM API

## Future Enhancements

- [ ] Parallel account processing
- [ ] Configuration file support
- [ ] Audit logging to S3
- [ ] Slack/email notifications
- [ ] Batch operations from CSV
- [ ] User recovery/restoration
- [ ] Comprehensive test suite

## Maintenance

### Dependencies
```bash
go mod tidy      # Clean up dependencies
go mod verify    # Verify dependencies
go get -u ./...  # Update dependencies
```

### Code Quality
```bash
make fmt         # Format code
make vet         # Run vet
make lint        # Run linter (requires golangci-lint)
```

## Support & Troubleshooting

See README.md for:
- Common commands
- Troubleshooting guide
- AWS profile configuration
- Permission requirements
- Output examples

## License

Internal use only - BBTV Infrastructure Team

## Version

Current: 1.0.0
Release Date: 2025-10-24

## Author

Infrastructure Automation Team

