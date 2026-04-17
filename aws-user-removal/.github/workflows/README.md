# GitHub Actions Workflows

## Build and Release Workflow

**File:** `build-release.yml`

### Trigger

Automatically triggered when a git tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### What It Does

1. **Build Stage**
   - Builds for all supported platforms:
     - Linux (AMD64, ARM64)
     - macOS (AMD64, ARM64)
     - Windows (AMD64)
   - Optimizes binaries with `-ldflags="-s -w"`
   - Uploads artifacts for each platform

2. **Release Stage**
   - Downloads all build artifacts
   - Packages binaries:
     - Linux/macOS: `.tar.gz` format
     - Windows: `.zip` format
   - Creates GitHub release with all binaries

### Supported Platforms

| OS | Architecture | Binary Name |
|---|---|---|
| Linux | AMD64 | `aws-user-removal-linux-amd64` |
| Linux | ARM64 | `aws-user-removal-linux-arm64` |
| macOS | AMD64 | `aws-user-removal-darwin-amd64` |
| macOS | ARM64 | `aws-user-removal-darwin-arm64` |
| Windows | AMD64 | `aws-user-removal-windows-amd64.exe` |

### Release Assets

Each release includes:
- `aws-user-removal-linux-amd64.tar.gz`
- `aws-user-removal-linux-arm64.tar.gz`
- `aws-user-removal-darwin-amd64.tar.gz`
- `aws-user-removal-darwin-arm64.tar.gz`
- `aws-user-removal-windows-amd64.zip`

### Usage

#### Creating a Release

1. Tag the commit:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. GitHub Actions automatically:
   - Builds for all platforms
   - Creates a release
   - Uploads binaries

3. Release appears on GitHub Releases page

#### Downloading Binaries

```bash
# Download for your platform
wget https://github.com/bbtv/rhei-iac-tools/releases/download/v1.0.0/aws-user-removal-linux-amd64.tar.gz
tar -xzf aws-user-removal-linux-amd64.tar.gz
chmod +x aws-user-removal
```

### Environment

- **Go Version:** 1.21
- **Runner:** ubuntu-latest
- **Build Time:** ~2-3 minutes

### Troubleshooting

#### Build Fails

1. Check Go version compatibility
2. Verify all dependencies are available
3. Check for syntax errors: `go build ./...`

#### Release Not Created

1. Verify tag was pushed: `git push origin v1.0.0`
2. Check GitHub Actions logs
3. Ensure repository has write permissions

#### Artifacts Not Uploaded

1. Check workflow logs for errors
2. Verify disk space on runner
3. Check artifact upload permissions

### Customization

To modify the workflow:

1. Edit `.github/workflows/build-release.yml`
2. Supported customizations:
   - Add/remove platforms
   - Change Go version
   - Modify build flags
   - Change release asset format

Example: Add a new platform

```yaml
- goos: freebsd
  goarch: amd64
```

### Security

- Uses official GitHub Actions
- No secrets required for public releases
- Binaries are stripped (`-s -w` flags)
- No credentials stored in workflow

### Performance

- Parallel builds for different platforms
- Typical build time: 2-3 minutes
- Artifacts cached between jobs

### Future Enhancements

- [ ] Add code signing
- [ ] Add checksums (SHA256)
- [ ] Add release notes generation
- [ ] Add Docker image builds
- [ ] Add Homebrew formula

