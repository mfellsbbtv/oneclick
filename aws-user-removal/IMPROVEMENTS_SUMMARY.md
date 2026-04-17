# AWS User Removal - Improvements Summary

## Overview

Two major improvements have been implemented to enhance the aws-user-removal tool:

1. **Access Key Deactivation** - Changed disable command to deactivate keys instead of deleting them
2. **Automatic User Discovery** - New auto command for tag-based user discovery and processing

---

## Improvement 1: Access Key Deactivation

### What Changed

The `disable` command now **deactivates** access keys instead of permanently deleting them.

### Why This Matters

- **Reversible**: Keys can be re-enabled if needed
- **Safer**: Prevents accidental permanent loss of credentials
- **Audit Trail**: Maintains key history for compliance
- **Recovery**: Allows restoration if access was disabled by mistake

### Implementation Details

**File Modified:** `internal/iam/operations.go`

**Before:**
```go
_, err := c.iamClient.DeleteAccessKey(ctx, &iam.DeleteAccessKeyInput{
    UserName:    &username,
    AccessKeyId: key.AccessKeyId,
})
```

**After:**
```go
_, err := c.iamClient.UpdateAccessKey(ctx, &iam.UpdateAccessKeyInput{
    UserName:    &username,
    AccessKeyId: key.AccessKeyId,
    Status:      types.StatusTypeInactive,
})
```

### Logging Changes

- Dry-run: `[DRY-RUN] Would deactivate access key: AKIAXXXXXXXX`
- Actual: `Deactivating access key: AKIAXXXXXXXX`
- Success: `Access key deactivated: AKIAXXXXXXXX`

### Usage

```bash
# Disable access (deactivates keys, removes console login)
./aws-user-removal disable -u username -a prod,staging

# Preview changes
./aws-user-removal disable -u username -a prod,staging --dry-run
```

### Note on Remove Command

The `remove` command still **deletes** access keys permanently as part of complete user removal. This is intentional - when removing a user entirely, keys should be deleted.

---

## Improvement 2: Automatic User Discovery via Tags

### What Changed

New `auto` command that automatically discovers and processes IAM users based on tags.

### Why This Matters

- **Automation**: No need to manually specify usernames
- **Scheduled**: Perfect for cron jobs that run periodically
- **Flexible**: Different operations based on tag type
- **Timezone-Aware**: Handles different timezones correctly

### How It Works

#### Tag-Based Discovery

The tool searches for IAM users with these tags:

| Tag Key | Operation | Meaning |
|---------|-----------|---------|
| `disable-after` | Disable | Deactivate keys and console login |
| `remove-after` | Remove | Completely remove the user |

#### Tag Value Format

Format: `YYYYMMDDHHMM` (12 characters)

Examples:
- `202510252130` = October 25, 2025 at 21:30 (9:30 PM)
- `202511011200` = November 1, 2025 at 12:00 (noon)
- `202512312359` = December 31, 2025 at 23:59 (11:59 PM)

#### Processing Logic

1. List all IAM users in specified accounts
2. Filter users with `disable-after` or `remove-after` tags
3. Parse tag value (YYYYMMDDHHMM format)
4. Check if current time >= tag time
5. If yes, perform the corresponding operation
6. If no, skip the user (not yet time)

### Implementation Details

**Files Modified:**
- `cmd/root.go` - Made username optional, added auto command
- `cmd/disable.go` - Added username requirement
- `cmd/remove.go` - Added username requirement
- `internal/iam/client.go` - Added ListUsersByTag method

**Files Created:**
- `cmd/auto.go` - New auto command implementation

### Key Features

#### Timezone Support

The `--tz` flag allows specifying timezone offset for tag time comparison:

```bash
# Default (PST, UTC-8)
./aws-user-removal auto -a prod,staging --dry-run

# Eastern Time (UTC-5)
./aws-user-removal auto -a prod,staging --tz -05 --dry-run

# India Standard Time (UTC+5:30)
./aws-user-removal auto -a prod,staging --tz +05:30 --dry-run

# UTC
./aws-user-removal auto -a prod,staging --tz +00 --dry-run
```

#### Dry-Run Mode

Preview which users would be processed:

```bash
./aws-user-removal auto -a prod,staging --dry-run
```

Output shows:
- Users found with tags
- Tag values and operation types
- Whether tag time has been reached
- What would be done (without making changes)

#### Force Mode

Skip confirmation prompts (useful for automation):

```bash
./aws-user-removal auto -a prod,staging --force
```

### Usage Examples

#### Basic Usage

```bash
# Discover and process users based on tags
./aws-user-removal auto -a prod,staging

# Preview changes
./aws-user-removal auto -a prod,staging --dry-run

# Skip confirmation prompts
./aws-user-removal auto -a prod,staging --force
```

#### With Timezone

```bash
# Process users in Eastern Time
./aws-user-removal auto -a prod,staging --tz -05

# Process users in India Standard Time
./aws-user-removal auto -a prod,staging --tz +05:30

# Process users in UTC
./aws-user-removal auto -a prod,staging --tz +00
```

#### In Cron Jobs

```bash
# Run every 15 minutes, process users whose time has passed
*/15 * * * * /opt/aws-user-removal/aws-user-removal auto -a prod,staging --force >> /var/log/aws-user-removal/auto.log 2>&1

# Run hourly with timezone
0 * * * * /opt/aws-user-removal/aws-user-removal auto -a prod,staging --tz -05 --force >> /var/log/aws-user-removal/auto.log 2>&1
```

### Setting Tags on Users

#### Using AWS CLI

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

#### Using AWS Console

1. Go to IAM → Users
2. Select user
3. Click "Tags" tab
4. Add tag:
   - Key: `disable-after` or `remove-after`
   - Value: `YYYYMMDDHHMM` format

### Logging Output

The auto command provides detailed logging:

```
[INFO] Starting AWS User Auto-Discovery Operation
[INFO] Accounts: [prod staging]
[INFO] Timezone: -08
[INFO] Dry Run: true
[INFO] ============================================
[INFO] Processing account: prod
[INFO] [prod] Listing all IAM users
[INFO] [prod] Found 3 users with tags
[INFO] [prod] Processing user john.doe (tag: disable-after=202510252130, operation: disable)
[INFO] [prod] [DRY-RUN] Would deactivate access key: AKIAXXXXXXXX
[INFO] [prod] [DRY-RUN] Would delete console login profile
[SUCCESS] [prod] User john.doe access disabled successfully
```

### Error Handling

The tool gracefully handles:

- Invalid tag formats (logs warning, skips user)
- Missing tags (skips user)
- API errors (logs error, continues with next user)
- Timezone parsing errors (returns error with details)

---

## Command Reference

### Disable Command (Updated)

```bash
./aws-user-removal disable [flags]

Flags:
  -u, --username string    IAM username to manage (required)
  -a, --accounts strings   AWS profile names (required)
  -d, --dry-run           Show what would be done
  -f, --force             Skip confirmation prompts
```

### Remove Command (Updated)

```bash
./aws-user-removal remove [flags]

Flags:
  -u, --username string    IAM username to manage (required)
  -a, --accounts strings   AWS profile names (required)
  -d, --dry-run           Show what would be done
  -f, --force             Skip confirmation prompts
  -t, --tag-before string Tag user before removal (YYYYMMDD format)
```

### Auto Command (New)

```bash
./aws-user-removal auto [flags]

Flags:
  -a, --accounts strings   AWS profile names (required)
  --tz string             Timezone offset (default: -08)
  -d, --dry-run           Show what would be done
  -f, --force             Skip confirmation prompts
```

---

## Workflow Examples

### Example 1: Scheduled Disable

**Goal:** Disable user access at 9:30 PM PST on Oct 25, 2025

**Steps:**

1. Tag the user:
```bash
aws iam tag-user --user-name john.doe --tags Key=disable-after,Value=202510252130
```

2. Set up cron job:
```bash
*/15 * * * * /opt/aws-user-removal/aws-user-removal auto -a prod,staging --force
```

3. At 9:30 PM PST on Oct 25, the next cron run will:
   - Discover john.doe with disable-after tag
   - Check if current time >= 2025-10-25 21:30
   - Deactivate all access keys
   - Remove console login
   - Log the operation

### Example 2: Scheduled Removal

**Goal:** Remove user completely at 12:00 PM UTC on Nov 1, 2025

**Steps:**

1. Tag the user:
```bash
aws iam tag-user --user-name jane.smith --tags Key=remove-after,Value=202511011200
```

2. Set up cron job with UTC timezone:
```bash
0 * * * * /opt/aws-user-removal/aws-user-removal auto -a prod,staging --tz +00 --force
```

3. At 12:00 PM UTC on Nov 1, the next cron run will:
   - Discover jane.smith with remove-after tag
   - Check if current time >= 2025-11-01 12:00 UTC
   - Delete all access keys
   - Remove console login
   - Detach all policies
   - Remove from groups
   - Delete MFA devices
   - Delete the user
   - Log the operation

### Example 3: Manual Disable (Existing Behavior)

```bash
# Still works as before
./aws-user-removal disable -u john.doe -a prod,staging
```

### Example 4: Manual Remove (Existing Behavior)

```bash
# Still works as before
./aws-user-removal remove -u jane.smith -a prod,staging
```

---

## Testing

### Test 1: Disable Command with Deactivation

```bash
./aws-user-removal disable -u rdocini -a rhei-labs --dry-run
```

Expected output:
```
[INFO] [rhei-labs] Checking access keys for user rdocini
[INFO] [rhei-labs] [DRY-RUN] Would deactivate access key: AKIAXXXXXXXX
```

### Test 2: Auto Command Discovery

```bash
./aws-user-removal auto -a rhei-labs --dry-run
```

Expected output:
```
[INFO] [rhei-labs] Listing all IAM users
[INFO] [rhei-labs] No users found with disable-after or remove-after tags
```

(Or shows users if tags exist)

### Test 3: Timezone Parsing

```bash
./aws-user-removal auto -a rhei-labs --tz -05 --dry-run
```

Should work with various timezone formats:
- `-08` (PST)
- `+05:30` (IST)
- `+00` (UTC)

---

## Backward Compatibility

✅ **Fully backward compatible**

- Existing `disable` command works unchanged (just deactivates instead of deletes)
- Existing `remove` command works unchanged
- Manual username specification still works
- All existing flags and options work as before

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| `disable` command | Deactivates keys instead of deleting | Keys can be re-enabled |
| `remove` command | Still deletes keys (no change) | Complete removal still works |
| `auto` command | New command for tag-based discovery | Enables automation |
| Username flag | Now optional (required for disable/remove) | Auto command doesn't need it |
| IAM client | Added ListUsersByTag method | Supports tag discovery |

---

## Next Steps

1. **Deploy** the updated binary to production
2. **Test** with your AWS accounts
3. **Set up cron jobs** for automated user management
4. **Tag users** as needed for scheduled operations
5. **Monitor logs** for successful operations

---

## Support

For issues or questions:
- Check the help: `./aws-user-removal auto --help`
- Review logs for detailed operation information
- Test with `--dry-run` before running actual operations

