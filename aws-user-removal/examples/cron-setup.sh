#!/bin/bash
# Example cron setup for aws-user-removal
# This script demonstrates how to set up automated user access disabling

set -euo pipefail

# Configuration
TOOL_PATH="/opt/aws-user-removal/aws-user-removal"
LOG_DIR="/var/log/aws-user-removal"
LOG_FILE="${LOG_DIR}/disable.log"
ACCOUNTS="prod,staging,dev"
DISABLE_HOUR="02"  # 2 AM UTC
DISABLE_MINUTE="00"

# Create log directory
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"

# Function to add cron job
add_cron_job() {
    local username=$1
    local cron_entry="$DISABLE_MINUTE $DISABLE_HOUR * * * $TOOL_PATH disable -u $username -a $ACCOUNTS --force >> $LOG_FILE 2>&1"
    
    # Check if job already exists
    if crontab -l 2>/dev/null | grep -q "$username"; then
        echo "Cron job for $username already exists"
        return 1
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    echo "Added cron job for $username"
    return 0
}

# Function to remove cron job
remove_cron_job() {
    local username=$1
    
    if ! crontab -l 2>/dev/null | grep -q "$username"; then
        echo "No cron job found for $username"
        return 1
    fi
    
    crontab -l 2>/dev/null | grep -v "$username" | crontab -
    echo "Removed cron job for $username"
    return 0
}

# Function to list cron jobs
list_cron_jobs() {
    echo "Current aws-user-removal cron jobs:"
    crontab -l 2>/dev/null | grep "aws-user-removal" || echo "No jobs found"
}

# Main
case "${1:-help}" in
    add)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 add <username>"
            exit 1
        fi
        add_cron_job "$2"
        ;;
    remove)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 remove <username>"
            exit 1
        fi
        remove_cron_job "$2"
        ;;
    list)
        list_cron_jobs
        ;;
    *)
        echo "Usage: $0 {add|remove|list} [username]"
        echo ""
        echo "Examples:"
        echo "  $0 add john.doe          # Add cron job to disable john.doe at 2 AM daily"
        echo "  $0 remove john.doe       # Remove cron job for john.doe"
        echo "  $0 list                  # List all aws-user-removal cron jobs"
        exit 1
        ;;
esac

