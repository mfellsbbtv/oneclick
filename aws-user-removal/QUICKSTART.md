# Quick Start Guide

Get up and running with aws-user-removal in 5 minutes.

## 1. Download or Build

### Option A: Download Pre-built Binary

```bash
# Download from releases
wget https://github.com/bbtv/rhei-iac-tools/releases/download/v1.0.0/aws-user-removal-linux-amd64
chmod +x aws-user-removal-linux-amd64
```

### Option B: Build from Source

```bash
git clone https://github.com/bbtv/rhei-iac-tools.git
cd rhei-iac-tools/aws/aws-user-removal
go build -o aws-user-removal .
```

## 2. Configure AWS Credentials

```bash
# Configure AWS profiles
aws configure --profile prod
aws configure --profile staging

# Verify profiles work
aws --profile prod iam list-users
```

## 3. Test with Dry-Run

```bash
# Preview what would happen (no changes made)
./aws-user-removal disable -u john.doe -a prod,staging --dry-run
```

## 4. Disable User Access

```bash
# Disable access (requires confirmation)
./aws-user-removal disable -u john.doe -a prod,staging

# Or skip confirmation for automation
./aws-user-removal disable -u john.doe -a prod,staging --force
```

## 5. Schedule with Cron (Optional)

```bash
# Add to crontab to run daily at 2 AM
0 2 * * * /path/to/aws-user-removal disable -u john.doe -a prod,staging --force >> /var/log/aws-user-removal.log 2>&1
```

## 6. Remove User Later

```bash
# When ready to permanently remove the user
./aws-user-removal remove -u john.doe -a prod,staging
```

## Common Commands

```bash
# Show help
./aws-user-removal --help
./aws-user-removal disable --help
./aws-user-removal remove --help

# Disable access (requires confirmation)
./aws-user-removal disable -u username -a prod,staging

# Disable access (no confirmation, for automation)
./aws-user-removal disable -u username -a prod,staging --force

# Preview removal
./aws-user-removal remove -u username -a prod,staging --dry-run

# Remove user
./aws-user-removal remove -u username -a prod,staging

# Remove with tag
./aws-user-removal remove -u username -a prod,staging -t 20251120
```

## Typical Workflow

### Day 1: Schedule Disable
```bash
# Set up cron job to disable access at 2 AM daily
0 2 * * * /opt/aws-user-removal/aws-user-removal disable -u john.doe -a prod,staging --force
```

### Day N: Manual Removal
```bash
# When ready to remove the user
./aws-user-removal remove -u john.doe -a prod,staging --dry-run  # Preview
./aws-user-removal remove -u john.doe -a prod,staging            # Remove
```

## Troubleshooting

### "User does not exist"
- User may already be deleted
- Check the username spelling
- Verify the AWS profile is correct

### "Permission denied"
- Ensure AWS credentials are configured
- Verify IAM permissions
- Check AWS profile: `aws --profile prod iam list-users`

### "NoSuchEntity" errors
- These are expected when resources don't exist
- The tool handles them gracefully and continues

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- See [examples/README.md](./examples/README.md) for deployment options
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details

## Support

For issues or questions:
1. Check the README.md documentation
2. Review examples in the examples/ directory
3. Run with `--dry-run` to preview changes
4. Check logs for detailed error messages

