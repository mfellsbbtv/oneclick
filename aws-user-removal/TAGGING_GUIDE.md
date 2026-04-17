# IAM User Tagging Guide

This guide explains how to tag IAM users for automated processing by the AWS User Removal Tool.

## Overview

The AWS User Removal Tool can automatically discover and process IAM users based on tags. This enables scheduled, hands-off user access management across multiple AWS accounts.

## Supported Tags

The tool recognizes two types of tags:

| Tag Key | Operation | Description |
|---------|-----------|-------------|
| `disable-after` | Disable | Deactivates all access keys and console login (user remains in IAM) |
| `remove-after` | Remove | Completely removes the user from IAM (includes all cleanup) |

## Tag Value Format

**Format:** `YYYYMMDDHHMM` (exactly 12 characters)

- `YYYY` - 4-digit year
- `MM` - 2-digit month (01-12)
- `DD` - 2-digit day (01-31)
- `HH` - 2-digit hour in 24-hour format (00-23)
- `MM` - 2-digit minute (00-59)

### Examples

| Tag Value | Meaning |
|-----------|---------|
| `202510252130` | October 25, 2025 at 21:30 (9:30 PM) |
| `202511011200` | November 1, 2025 at 12:00 (noon) |
| `202512312359` | December 31, 2025 at 23:59 (11:59 PM) |
| `202601010000` | January 1, 2026 at 00:00 (midnight) |

## How to Tag Users

### Using AWS CLI

#### Tag for Disabling Access

```bash
# Disable user access at specific time
aws iam tag-user \
  --user-name john.doe \
  --tags Key=disable-after,Value=202510252130
```

#### Tag for Complete Removal

```bash
# Remove user completely at specific time
aws iam tag-user \
  --user-name jane.smith \
  --tags Key=remove-after,Value=202511011200
```

#### Tag with Specific AWS Profile

```bash
# Tag user in specific account
aws iam tag-user \
  --profile prod \
  --user-name john.doe \
  --tags Key=disable-after,Value=202510252130
```

### Using AWS Console

1. Navigate to **IAM** → **Users**
2. Select the user you want to tag
3. Go to the **Tags** tab
4. Click **Manage tags**
5. Click **Add tag**
6. Enter:
   - **Key:** `disable-after` or `remove-after`
   - **Value:** Date/time in `YYYYMMDDHHMM` format
7. Click **Save changes**

### Using Terraform

```hcl
resource "aws_iam_user" "example" {
  name = "john.doe"

  tags = {
    disable-after = "202510252130"
  }
}
```

### Using AWS SDK (Python/Boto3)

```python
import boto3

iam = boto3.client('iam')

# Tag user for disabling
iam.tag_user(
    UserName='john.doe',
    Tags=[
        {
            'Key': 'disable-after',
            'Value': '202510252130'
        }
    ]
)

# Tag user for removal
iam.tag_user(
    UserName='jane.smith',
    Tags=[
        {
            'Key': 'remove-after',
            'Value': '202511011200'
        }
    ]
)
```

## Timezone Considerations

### Default Timezone

By default, the tool assumes **PST (UTC-8)** timezone for tag values.

### Specifying Timezone

Use the `--tz` flag to specify a different timezone:

```bash
# UTC timezone
./aws-user-removal auto -a prod,staging --tz +00

# EST (UTC-5)
./aws-user-removal auto -a prod,staging --tz -05

# BRT (UTC-3)
./aws-user-removal auto -a prod,staging --tz -03

# IST (UTC+5:30)
./aws-user-removal auto -a prod,staging --tz +05:30
```

### Timezone Format

- **Negative offset:** `-08` (PST), `-05` (EST), `-03` (BRT)
- **Positive offset:** `+00` (UTC), `+05:30` (IST)
- **With minutes:** `+05:30`, `-03:30`

## Workflow Examples

### Example 1: Disable User Access at Specific Time

**Scenario:** Contractor's access should be disabled at 5:00 PM PST on October 31, 2025

**Steps:**

1. **Tag the user:**
   ```bash
   aws iam tag-user \
     --user-name contractor.john \
     --tags Key=disable-after,Value=202510311700
   ```

2. **Set up cron job** (runs every 15 minutes):
   ```bash
   */15 * * * * /opt/aws-user-removal/aws-user-removal auto -a prod,staging --force >> /var/log/aws-user-removal.log 2>&1
   ```

3. **What happens:**
   - At 5:00 PM PST on Oct 31, the next cron run will:
     - Discover `contractor.john` with `disable-after` tag
     - Deactivate all access keys
     - Remove console login
     - Log the operation

### Example 2: Remove User Completely

**Scenario:** Temporary employee should be removed at midnight UTC on November 1, 2025

**Steps:**

1. **Tag the user:**
   ```bash
   aws iam tag-user \
     --user-name temp.employee \
     --tags Key=remove-after,Value=202511010000
   ```

2. **Set up cron job with UTC timezone:**
   ```bash
   0 * * * * /opt/aws-user-removal/aws-user-removal auto -a prod,staging --tz +00 --force >> /var/log/aws-user-removal.log 2>&1
   ```

3. **What happens:**
   - At midnight UTC on Nov 1, the next cron run will:
     - Discover `temp.employee` with `remove-after` tag
     - Delete all access keys
     - Remove console login
     - Detach all policies
     - Remove from all groups
     - Delete MFA devices
     - Delete the user
     - Log the operation

### Example 3: Two-Stage Process

**Scenario:** Disable access immediately, remove user later

**Steps:**

1. **Tag for immediate disable:**
   ```bash
   # Use current or past time to trigger immediately
   aws iam tag-user \
     --user-name john.doe \
     --tags Key=disable-after,Value=202510240000
   ```

2. **Wait for cron to disable access** (or run manually):
   ```bash
   ./aws-user-removal auto -a prod,staging --force
   ```

3. **Later, tag for removal:**
   ```bash
   # Remove 30 days later
   aws iam tag-user \
     --user-name john.doe \
     --tags Key=remove-after,Value=202511230000
   ```

## Verifying Tags

### List User Tags (AWS CLI)

```bash
# View all tags for a user
aws iam list-user-tags --user-name john.doe

# View tags in specific account
aws iam list-user-tags --profile prod --user-name john.doe
```

### Check Tag Format

```bash
# Verify tag exists and has correct format
aws iam list-user-tags --user-name john.doe --query 'Tags[?Key==`disable-after`].Value' --output text
```

## Removing Tags

If you need to cancel a scheduled operation:

```bash
# Remove the tag
aws iam untag-user \
  --user-name john.doe \
  --tag-keys disable-after

# Or remove remove-after tag
aws iam untag-user \
  --user-name jane.smith \
  --tag-keys remove-after
```

## Best Practices

1. **Use descriptive tag values:** Always use the full 12-character format
2. **Verify timezone:** Ensure you're using the correct timezone offset
3. **Test with dry-run:** Use `--dry-run` flag to preview operations
4. **Monitor logs:** Check logs regularly to ensure operations are running as expected
5. **Document tags:** Keep a record of which users are tagged and why
6. **Set reminders:** Set calendar reminders before scheduled operations
7. **Use disable first:** Consider disabling access before complete removal
8. **Verify after operation:** Check that the operation completed successfully

## Troubleshooting

### Tag Not Being Processed

**Problem:** User has tag but isn't being processed

**Solutions:**
- Verify tag format is exactly 12 characters (`YYYYMMDDHHMM`)
- Check that current time >= tag time
- Verify timezone offset is correct
- Check logs for parsing errors
- Ensure cron job is running

### Wrong Timezone

**Problem:** User processed at wrong time

**Solutions:**
- Verify `--tz` flag matches your intended timezone
- Remember: tag value is in the timezone specified by `--tz`
- Use UTC (`--tz +00`) to avoid timezone confusion

### Tag Value Format Error

**Problem:** "Invalid tag format" error in logs

**Solutions:**
- Ensure tag value is exactly 12 characters
- Use only digits (no spaces, dashes, or colons)
- Verify month (01-12), day (01-31), hour (00-23), minute (00-59)

## Security Considerations

1. **IAM Permissions:** Ensure only authorized users can tag IAM users
2. **Audit Trail:** All tagging operations are logged in CloudTrail
3. **Review Tags:** Regularly review tags to prevent unauthorized scheduling
4. **Least Privilege:** Grant `iam:TagUser` permission only to trusted roles
5. **Monitoring:** Set up CloudWatch alarms for unexpected tag changes

## Related Documentation

- [README.md](./README.md) - Main documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [examples/](./examples/) - Deployment examples

