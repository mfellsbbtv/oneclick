# AWS User Removal Tool

A secure, production-ready Go application for managing AWS IAM user access and removal across multiple accounts.

## Features

- **Tag-based auto-discovery**: Automatically process users based on `disable-after` or `remove-after` tags
- **Two-stage removal process**: Disable access first, remove user later
- **Disable-only mode**: Perfect for scheduled cron jobs that disable access at specific times
- **Multi-account support**: Manage users across multiple AWS accounts in a single operation
- **Dry-run mode**: Preview changes before applying them
- **Comprehensive logging**: Colored, timestamped output for easy tracking
- **Safety confirmations**: Prevent accidental user deletion with confirmation prompts
- **MFA device handling**: Properly deactivates and removes MFA devices
- **Inline and managed policies**: Handles both policy types

## Quick Start

### Prerequisites

- Go 1.21+ (for building from source)
- AWS CLI configured with appropriate profiles
- IAM permissions to manage users in target accounts

### Installation

#### Option 1: Download Pre-built Binary

Download the latest release for your platform from the [Releases](https://github.com/bbtv/rhei-iac-tools/releases) page.

Supported platforms:
- Linux (AMD64, ARM64)
- macOS (AMD64, ARM64)
- Windows (AMD64)

#### Option 2: Build from Source

```bash
cd aws/aws-user-removal
go build -o aws-user-removal .
```

## Usage

### Auto-Discovery Mode (Recommended for Automation)

Automatically discover and process users based on tags:

```bash
./aws-user-removal auto -a prod,staging
```

This command will:
- Find all users with `disable-after` or `remove-after` tags
- Process users whose scheduled time has passed
- Perform the appropriate operation (disable or remove)

**📖 See [TAGGING_GUIDE.md](./TAGGING_GUIDE.md) for complete tagging instructions**

### Disable User Access (Manual)

Disable all access keys and console login without removing the user:

```bash
./aws-user-removal disable -u username -a prod,staging
```

This is ideal for scheduled cron jobs:

```bash
# Disable access at 2 AM daily
0 2 * * * /path/to/aws-user-removal disable -u username -a prod,staging --force
```

### Remove User Completely

Completely remove a user from specified accounts:

```bash
./aws-user-removal remove -u username -a prod,staging
```

### Common Options

- `-u, --username STRING`: IAM username to manage (required for `disable` and `remove` commands)
- `-a, --accounts LIST`: Comma-separated AWS profile names (required)
- `-d, --dry-run`: Preview changes without applying them
- `-f, --force`: Skip confirmation prompts (useful for automation)
- `-t, --tag-before DATE`: Tag user with remove-after=DATE before removal (YYYYMMDD format)
- `--tz OFFSET`: Timezone offset for auto command (e.g., `-08`, `+00`, `+05:30`, default: `-08`)

### Examples

#### Auto-discover and process tagged users
```bash
# Preview what would be processed
./aws-user-removal auto -a prod,staging --dry-run

# Process users (with confirmation)
./aws-user-removal auto -a prod,staging

# Process users without confirmation (for cron)
./aws-user-removal auto -a prod,staging --force

# Process with specific timezone
./aws-user-removal auto -a prod,staging --tz +00 --force
```

#### Disable access with confirmation
```bash
./aws-user-removal disable -u john.doe -a prod,staging
```

#### Disable access without confirmation (for cron)
```bash
./aws-user-removal disable -u john.doe -a prod,staging --force
```

#### Preview what would be removed
```bash
./aws-user-removal remove -u john.doe -a prod,staging --dry-run
```

#### Remove user with tag
```bash
./aws-user-removal remove -u john.doe -a prod,staging -t 20251120
```

#### Remove from multiple accounts
```bash
./aws-user-removal remove -u john.doe -a prod,staging,dev,qa
```

## Workflow: Tag-Based Automation (Recommended)

### Step 1: Tag Users for Processing

Tag users with `disable-after` or `remove-after` tags:

```bash
# Tag user for disabling at specific time
aws iam tag-user \
  --user-name john.doe \
  --tags Key=disable-after,Value=202510252130

# Tag user for removal at specific time
aws iam tag-user \
  --user-name jane.smith \
  --tags Key=remove-after,Value=202511011200
```

**📖 See [TAGGING_GUIDE.md](./TAGGING_GUIDE.md) for complete tagging instructions**

### Step 2: Schedule Auto-Discovery (Cron)

Add to crontab to automatically process tagged users:

```bash
# Run every 15 minutes to check for users to process
*/15 * * * * /path/to/aws-user-removal auto -a prod,staging --force >> /var/log/aws-user-removal.log 2>&1
```

## Alternative Workflow: Manual Operations

### Step 1: Schedule Disable (Cron)

Add to crontab to disable access at a specific time:

```bash
# Disable access at 2 AM every day
0 2 * * * /path/to/aws-user-removal disable -u username -a prod,staging --force >> /var/log/aws-user-removal.log 2>&1
```

### Step 2: Manual Removal

When ready to permanently remove the user:

```bash
# Preview what will be removed
./aws-user-removal remove -u username -a prod,staging --dry-run

# Remove the user
./aws-user-removal remove -u username -a prod,staging
```

## AWS Profile Configuration

Ensure your AWS profiles are configured with appropriate permissions. The tool requires:

- `iam:GetUser`
- `iam:ListAccessKeys`
- `iam:DeleteAccessKey`
- `iam:GetLoginProfile`
- `iam:DeleteLoginProfile`
- `iam:ListAttachedUserPolicies`
- `iam:DetachUserPolicy`
- `iam:ListUserPolicies`
- `iam:DeleteUserPolicy`
- `iam:ListGroupsForUser`
- `iam:RemoveUserFromGroup`
- `iam:ListMFADevices`
- `iam:DeactivateMFADevice`
- `iam:DeleteVirtualMFADevice`
- `iam:TagUser`
- `iam:DeleteUser`

## Output

The tool provides colored, timestamped output:

```
[INFO] 2025-10-24 14:30:45 - Starting AWS User Disable Operation
[INFO] 2025-10-24 14:30:45 - User: john.doe
[INFO] 2025-10-24 14:30:45 - Accounts: [prod staging]
[INFO] 2025-10-24 14:30:46 - [prod] User john.doe found, proceeding with disable
[INFO] 2025-10-24 14:30:46 - [prod] Checking access keys for user john.doe
[SUCCESS] 2025-10-24 14:30:46 - [prod] Access key deleted: AKIAIOSFODNN7EXAMPLE
[SUCCESS] 2025-10-24 14:30:47 - [prod] Console login profile deleted
[SUCCESS] 2025-10-24 14:30:47 - [prod] User john.doe access disabled successfully
```

## Safety Features

1. **Confirmation Prompts**: Requires typing "DELETE" to confirm destructive operations
2. **Dry-run Mode**: Preview all changes before applying
3. **Force Flag**: For automation, explicitly opt-in to skip confirmations
4. **Detailed Logging**: Every action is logged with timestamps
5. **Error Handling**: Continues processing other accounts if one fails

## Troubleshooting

### "User does not exist"
The user may already be deleted or doesn't exist in that account. The tool will skip and continue.

### "NoSuchEntity" errors
These are expected when the resource doesn't exist (e.g., no login profile). The tool handles these gracefully.

### AWS credential errors
Ensure your AWS profiles are configured correctly:
```bash
aws configure --profile prod
```

### Permission denied errors
Verify the IAM role/user has the required permissions listed above.

## Documentation

- **[TAGGING_GUIDE.md](./TAGGING_GUIDE.md)** - Complete guide for tagging users for automated processing
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Building, testing, and contributing
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[examples/](./examples/)** - Deployment examples (systemd, cron)

## License

Internal use only - BBTV Infrastructure Team

