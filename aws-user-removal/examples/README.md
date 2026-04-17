# AWS User Removal - Examples

This directory contains example configurations for deploying and scheduling the aws-user-removal tool.

## Cron Setup

### Using the Helper Script

```bash
# Make the script executable
chmod +x cron-setup.sh

# Add a cron job to disable user access at 2 AM daily
./cron-setup.sh add john.doe

# List all scheduled jobs
./cron-setup.sh list

# Remove a scheduled job
./cron-setup.sh remove john.doe
```

### Manual Cron Configuration

Add to your crontab:

```bash
# Disable access at 2 AM UTC every day
0 2 * * * /opt/aws-user-removal/aws-user-removal disable -u john.doe -a prod,staging --force >> /var/log/aws-user-removal/disable.log 2>&1
```

Edit crontab:
```bash
crontab -e
```

View current cron jobs:
```bash
crontab -l
```

## Systemd Timer Setup

### Installation

1. Copy service and timer files to systemd directory:

```bash
sudo cp aws-user-removal.service /etc/systemd/system/
sudo cp aws-user-removal.timer /etc/systemd/system/
```

2. Edit the service file to set your username and accounts:

```bash
sudo nano /etc/systemd/system/aws-user-removal.service
```

Update these lines:
```ini
Environment="USERNAME=john.doe"
Environment="ACCOUNTS=prod,staging,dev"
```

3. Create the aws-user-removal user and group:

```bash
sudo useradd -r -s /bin/false aws-user-removal
```

4. Set up AWS credentials for the service user:

```bash
sudo -u aws-user-removal aws configure --profile prod
```

5. Reload systemd and enable the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable aws-user-removal.timer
sudo systemctl start aws-user-removal.timer
```

### Managing the Timer

Check timer status:
```bash
sudo systemctl status aws-user-removal.timer
```

View timer schedule:
```bash
sudo systemctl list-timers aws-user-removal.timer
```

View service logs:
```bash
sudo journalctl -u aws-user-removal.service -f
```

Stop the timer:
```bash
sudo systemctl stop aws-user-removal.timer
```

## Deployment Checklist

- [ ] Binary installed at `/opt/aws-user-removal/aws-user-removal`
- [ ] Binary is executable: `chmod +x /opt/aws-user-removal/aws-user-removal`
- [ ] AWS profiles configured with appropriate credentials
- [ ] Log directory created: `mkdir -p /var/log/aws-user-removal`
- [ ] Log directory permissions set: `chmod 755 /var/log/aws-user-removal`
- [ ] Cron job or systemd timer configured
- [ ] Test run with `--dry-run` flag
- [ ] Monitoring/alerting configured for failures

## Testing

### Test with Dry-Run

```bash
/opt/aws-user-removal/aws-user-removal disable -u testuser -a dev --dry-run
```

### Test Cron Timing

```bash
# Run the cron job manually to verify it works
/opt/aws-user-removal/aws-user-removal disable -u testuser -a dev --force
```

### Check Logs

```bash
# For cron
tail -f /var/log/aws-user-removal/disable.log

# For systemd
sudo journalctl -u aws-user-removal.service -f
```

## Troubleshooting

### Cron Job Not Running

1. Verify cron is running:
```bash
sudo systemctl status cron
```

2. Check cron logs:
```bash
sudo grep CRON /var/log/syslog
```

3. Verify AWS credentials are accessible to the cron user

### Systemd Timer Not Running

1. Check timer status:
```bash
sudo systemctl status aws-user-removal.timer
```

2. Check service logs:
```bash
sudo journalctl -u aws-user-removal.service
```

3. Verify the aws-user-removal user has AWS credentials configured

### AWS Permission Errors

Ensure the AWS profile has these permissions:
- `iam:GetUser`
- `iam:ListAccessKeys`
- `iam:DeleteAccessKey`
- `iam:GetLoginProfile`
- `iam:DeleteLoginProfile`

## Security Best Practices

1. **Restrict Binary Permissions**:
```bash
sudo chmod 755 /opt/aws-user-removal/aws-user-removal
```

2. **Restrict Log Directory**:
```bash
sudo chmod 700 /var/log/aws-user-removal
```

3. **Use IAM Roles** (if running on EC2):
- Attach an IAM role with minimal required permissions
- No need to store credentials in files

4. **Audit Logging**:
- Monitor `/var/log/aws-user-removal/` for changes
- Set up CloudWatch alarms for failures

5. **Credential Management**:
- Use AWS SSO or temporary credentials when possible
- Rotate credentials regularly
- Never commit credentials to version control

## Monitoring

### CloudWatch Integration

Consider sending logs to CloudWatch:

```bash
# Install CloudWatch Logs agent
sudo apt-get install awslogs

# Configure to send /var/log/aws-user-removal/* to CloudWatch
```

### Alerting

Set up alerts for:
- Failed user disabling operations
- Unexpected errors in logs
- Timer/cron job failures

## Manual User Removal

After the scheduled disable period, manually remove the user:

```bash
# Preview what will be removed
/opt/aws-user-removal/aws-user-removal remove -u john.doe -a prod,staging --dry-run

# Remove the user
/opt/aws-user-removal/aws-user-removal remove -u john.doe -a prod,staging
```

