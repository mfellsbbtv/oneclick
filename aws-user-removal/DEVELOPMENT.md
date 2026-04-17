# Development Guide

## Project Structure

```
aws-user-removal/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── go.sum                  # Dependency checksums
├── README.md               # User documentation
├── DEVELOPMENT.md          # This file
├── .github/
│   └── workflows/
│       └── build-release.yml  # GitHub Actions CI/CD
├── cmd/
│   ├── root.go            # Root command and CLI setup
│   ├── disable.go         # Disable command implementation
│   ├── remove.go          # Remove command implementation
│   └── helpers.go         # Shared helper functions
└── internal/
    ├── logger/
    │   └── logger.go      # Colored logging utilities
    └── iam/
        ├── client.go      # AWS IAM client initialization
        └── operations.go  # IAM operations (disable, remove, etc.)
```

## Building

### Prerequisites

- Go 1.21 or later
- AWS SDK v2 for Go

### Build Commands

```bash
# Build for current platform
go build -o aws-user-removal .

# Build for specific platform
GOOS=linux GOARCH=amd64 go build -o aws-user-removal-linux-amd64 .
GOOS=darwin GOARCH=arm64 go build -o aws-user-removal-darwin-arm64 .
GOOS=windows GOARCH=amd64 go build -o aws-user-removal-windows-amd64.exe .

# Build with optimizations
go build -ldflags="-s -w" -o aws-user-removal .
```

## Dependencies

- `github.com/aws/aws-sdk-go-v2`: AWS SDK for Go v2
- `github.com/spf13/cobra`: CLI framework
- `github.com/fatih/color`: Colored terminal output

## Architecture

### Command Structure

The application uses Cobra for CLI management with two main commands:

1. **disable**: Disables user access (keys + console login)
2. **remove**: Completely removes user (all permissions + user deletion)

### IAM Client

The `internal/iam` package provides:
- `Client`: Wraps AWS IAM client with profile support
- Operations: Individual functions for each IAM action

### Logging

The `internal/logger` package provides:
- Colored output (Info, Success, Warning, Error)
- Automatic timestamps
- Consistent formatting

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

### AWS Profile Setup for Testing

```bash
# Create test profiles
aws configure --profile test-prod
aws configure --profile test-staging

# Verify profiles work
aws --profile test-prod iam list-users
```

## Code Style

- Follow Go conventions (gofmt, golint)
- Use meaningful variable names
- Add comments for exported functions
- Keep functions focused and testable

## Adding New Features

### Adding a New IAM Operation

1. Add function to `internal/iam/operations.go`:
```go
func (c *Client) NewOperation(ctx context.Context, username string, dryRun bool) error {
    c.log.Info(fmt.Sprintf("[%s] Performing operation", c.profile))
    // Implementation
    return nil
}
```

2. Call from appropriate command in `cmd/disable.go` or `cmd/remove.go`

3. Add logging for each step

### Adding a New Command

1. Create new file in `cmd/` directory
2. Define command with `cobra.Command`
3. Register in `cmd/root.go` with `rootCmd.AddCommand()`

## Deployment

### GitHub Actions

The workflow in `.github/workflows/build-release.yml`:
- Triggers on git tags (v*)
- Builds for all supported platforms
- Creates GitHub release with binaries

### Manual Release

```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically build and release
```

## Troubleshooting

### Build Issues

```bash
# Clean build cache
go clean -cache

# Update dependencies
go get -u ./...

# Verify dependencies
go mod verify
```

### AWS SDK Issues

- Ensure AWS credentials are configured
- Check IAM permissions
- Verify AWS profile names match configuration

## Performance Considerations

- Operations are sequential per account (safe for IAM)
- Multiple accounts are processed sequentially
- Consider rate limiting for large-scale operations
- Logging is synchronous (acceptable for this use case)

## Security

- No credentials stored in code
- Uses AWS SDK credential chain
- Requires explicit confirmation for destructive operations
- Supports dry-run for safety
- All operations logged with timestamps

## Future Enhancements

- [ ] Parallel account processing
- [ ] Configuration file support
- [ ] Audit logging to S3
- [ ] Slack notifications
- [ ] Batch operations from CSV
- [ ] User recovery/restoration

