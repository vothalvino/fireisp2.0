# Creating Your First Release

This guide helps you create the first tagged release for FireISP, enabling users to easily track and update to specific versions.

## Why Create a Release?

Creating a release tag:
- Allows users to install specific versions
- Enables the update system to track version changes
- Provides a clear history of the software evolution
- Makes it easier to rollback if needed
- Shows professionalism and good software engineering practices

## Current Status

Your repository has version 2.0.0 defined in the VERSION file but no corresponding git tag. Let's fix that!

## Quick Start - Creating v2.0.0 Release

### Step 1: Ensure You're on Main Branch

```bash
cd /opt/fireisp  # Or your repository location
git checkout main
git pull origin main
```

### Step 2: Verify Everything is Ready

```bash
# Check the version
cat VERSION
# Should show: 2.0.0

# Ensure CHANGELOG is up to date
cat CHANGELOG.md | head -20

# Make sure everything is committed
git status
# Should show: "nothing to commit, working tree clean"
```

### Step 3: Create the Tag

```bash
# Create an annotated tag (recommended)
git tag -a v2.0.0 -m "Release v2.0.0 - Initial stable release with update system"

# Push the tag to GitHub
git push origin v2.0.0
```

### Step 4: Create GitHub Release

1. Go to: https://github.com/vothalvino/fireisp2.0/releases
2. Click "Draft a new release"
3. Choose the tag: `v2.0.0`
4. Release title: `FireISP v2.0.0`
5. Description (copy and adapt):

```markdown
# FireISP v2.0.0 - Initial Stable Release

## Overview

FireISP 2.0 is a complete ISP management system with Docker containerization, CRM functionality, multi-service support, and integrated FreeRADIUS server for Mikrotik compatibility.

## What's New in 2.0.0

### Features
- 🐳 Docker containerized deployment
- 🚀 One-command installation for Ubuntu 24.04
- 💼 Complete CRM system
- 📦 Multi-service support per client
- 🔌 FreeRADIUS integration with Mikrotik support
- 🎨 Modern React-based web UI
- 💰 Invoice management and payment tracking
- 👥 Multi-user support with role-based access
- 🔒 SSL/HTTPS support with Let's Encrypt integration
- **NEW** Comprehensive update system with automatic migrations

### Update System (New)
- Automated update script with backup and rollback
- Database migration framework
- Version tracking
- Health checks after updates
- Comprehensive documentation

## Installation

### New Installations

```bash
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0
git checkout v2.0.0
sudo bash install.sh
```

Then access: `http://your-server-ip` and complete the setup wizard.

### System Requirements
- Ubuntu 24.04 Server (recommended)
- 2GB RAM minimum
- 20GB disk space
- Docker and Docker Compose (installed by script)

## Updating

If you have an existing FireISP installation, see [UPDATE.md](https://github.com/vothalvino/fireisp2.0/blob/main/UPDATE.md) for upgrade instructions.

Quick update:
```bash
cd /opt/fireisp
sudo ./update.sh
```

## Documentation

- [README.md](https://github.com/vothalvino/fireisp2.0/blob/main/README.md) - Main documentation
- [UPDATE.md](https://github.com/vothalvino/fireisp2.0/blob/main/UPDATE.md) - Update guide
- [QUICKSTART.md](https://github.com/vothalvino/fireisp2.0/blob/main/QUICKSTART.md) - Quick start guide
- [MIKROTIK.md](https://github.com/vothalvino/fireisp2.0/blob/main/MIKROTIK.md) - Mikrotik integration
- [CHANGELOG.md](https://github.com/vothalvino/fireisp2.0/blob/main/CHANGELOG.md) - Full changelog

## Security

- JWT authentication
- Password hashing with bcrypt
- SQL injection prevention
- Optional SSL/TLS encryption
- Regular security updates recommended

## Support

- GitHub Issues: https://github.com/vothalvino/fireisp2.0/issues
- Documentation: See links above

## Contributors

Thank you to all contributors who made this release possible!

## License

MIT License - See [LICENSE](https://github.com/vothalvino/fireisp2.0/blob/main/LICENSE) file
```

6. Check "Set as the latest release"
7. Click "Publish release"

## Verification

After creating the release:

```bash
# List all tags
git tag -l

# Show tag details
git show v2.0.0

# Verify on GitHub
# Visit: https://github.com/vothalvino/fireisp2.0/releases
```

## Next Steps

### 1. Update CHANGELOG

When you publish the release, update CHANGELOG.md to include the release date:

```bash
# Edit CHANGELOG.md
nano CHANGELOG.md

# Change:
# ## [2.0.0] - 2024-01-07
# To:
# ## [2.0.0] - 2024-01-08  (use actual date)

git add CHANGELOG.md
git commit -m "Update CHANGELOG with release date"
git push origin main
```

### 2. Announce the Release

- Post in GitHub Discussions
- Update your website
- Notify existing users
- Share on social media

### 3. Plan Next Release

Create a milestone for v2.1.0:
1. Go to: https://github.com/vothalvino/fireisp2.0/milestones
2. Click "New milestone"
3. Title: `v2.1.0`
4. Due date: (optional)
5. Description: Features planned for 2.1.0

## Future Releases

For future releases (2.0.1, 2.1.0, etc.), follow the detailed process in [RELEASE_PROCESS.md](RELEASE_PROCESS.md).

### Quick Reference for Future Releases:

```bash
# Update VERSION file
echo "2.x.x" > VERSION

# Update package.json files
sed -i 's/"version": ".*"/"version": "2.x.x"/' backend/package.json
sed -i 's/"version": ".*"/"version": "2.x.x"/' frontend/package.json

# Update CHANGELOG.md
# Add new version section

# Commit changes
git add VERSION backend/package.json frontend/package.json CHANGELOG.md
git commit -m "Bump version to 2.x.x"
git push origin main

# Create and push tag
git tag -a v2.x.x -m "Release v2.x.x"
git push origin v2.x.x

# Create GitHub release (as described above)
```

## Troubleshooting

### Tag Already Exists

If the tag already exists locally:

```bash
# Delete local tag
git tag -d v2.0.0

# Delete remote tag (if it exists)
git push origin :refs/tags/v2.0.0

# Recreate the tag
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0
```

### Wrong Commit Tagged

If you tagged the wrong commit:

```bash
# Delete the tag
git tag -d v2.0.0
git push origin :refs/tags/v2.0.0

# Checkout the correct commit
git checkout <correct-commit-hash>

# Create the tag
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0

# Return to main
git checkout main
```

### Need to Update Release on GitHub

If you need to edit the GitHub release:
1. Go to: https://github.com/vothalvino/fireisp2.0/releases
2. Find your release
3. Click "Edit release"
4. Make changes
5. Click "Update release"

## Semantic Versioning Guide

Remember:
- **MAJOR** (2.x.x → 3.0.0): Breaking changes
- **MINOR** (2.0.x → 2.1.0): New features, backward-compatible
- **PATCH** (2.0.0 → 2.0.1): Bug fixes, backward-compatible

## Questions?

For questions about releases:
- See [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for detailed procedures
- Check GitHub's documentation on releases
- Open an issue for help

---

**Ready to create your first release? Follow the steps above!** 🚀
