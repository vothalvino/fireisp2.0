# Release Process for FireISP Maintainers

This document outlines the release process for FireISP to ensure consistent, reliable releases that users can easily update to.

## Table of Contents

- [Versioning](#versioning)
- [Release Checklist](#release-checklist)
- [Creating a Release](#creating-a-release)
- [Hotfix Releases](#hotfix-releases)
- [Post-Release Tasks](#post-release-tasks)

## Versioning

FireISP follows [Semantic Versioning](https://semver.org/) (SemVer):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Incompatible API changes or major architectural changes
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, backward-compatible

Examples:
- `2.0.0` - Major rewrite with breaking changes
- `2.1.0` - Added new features (e.g., Let's Encrypt support)
- `2.1.1` - Bug fixes (e.g., fixed nginx configuration)

## Release Checklist

Before creating a release, ensure:

### Code Quality
- [ ] All tests pass (if test suite exists)
- [ ] Code review completed for all changes
- [ ] No critical security vulnerabilities
- [ ] Documentation is up to date
- [ ] CHANGELOG.md is updated

### Database
- [ ] Database migrations are created (if needed)
- [ ] Migrations are tested and idempotent
- [ ] Migration rollback procedures documented
- [ ] Migrations numbered sequentially

### Dependencies
- [ ] All dependencies are up to date (or pinned for stability)
- [ ] No known vulnerabilities in dependencies
- [ ] Docker base images are current

### Documentation
- [ ] README.md reflects new features/changes
- [ ] UPDATE.md includes version-specific instructions (if needed)
- [ ] CHANGELOG.md has all changes documented
- [ ] Configuration examples are current

### Testing
- [ ] Tested on clean Ubuntu 24.04 installation
- [ ] Upgrade tested from previous version
- [ ] Rollback tested
- [ ] All major features verified working

## Creating a Release

### 1. Prepare the Release

```bash
# Ensure you're on the main branch and up to date
git checkout main
git pull origin main

# Create a release branch
git checkout -b release/v2.x.x
```

### 2. Update Version Information

Update version in all necessary files:

```bash
# Update VERSION file
echo "2.x.x" > VERSION

# Update package.json files
sed -i 's/"version": ".*"/"version": "2.x.x"/' backend/package.json
sed -i 's/"version": ".*"/"version": "2.x.x"/' frontend/package.json

# Commit version changes
git add VERSION backend/package.json frontend/package.json
git commit -m "Bump version to 2.x.x"
```

### 3. Update CHANGELOG

Edit `CHANGELOG.md`:

```markdown
## [2.x.x] - YYYY-MM-DD

### Added
- New feature descriptions

### Changed
- Changed functionality descriptions

### Fixed
- Bug fix descriptions

### Security
- Security fix descriptions (if any)

### Breaking Changes
- Any breaking changes (if MAJOR version)
```

Commit the changelog:

```bash
git add CHANGELOG.md
git commit -m "Update CHANGELOG for v2.x.x"
```

### 4. Create Database Migrations (if needed)

If database changes are required:

```bash
# Create migration file
cat > database/migrations/00X_description.sql << 'EOF'
-- Migration: 00X - Description
-- Date: YYYY-MM-DD

BEGIN;

-- Your migration SQL here

COMMIT;

-- Rollback:
-- Instructions for rollback
EOF

# Test migration
docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/00X_description.sql

# Commit migration
git add database/migrations/00X_description.sql
git commit -m "Add migration for [feature/fix]"
```

### 5. Test the Release

```bash
# Build and test
docker-compose build
docker-compose up -d

# Run manual tests
# - Test installation on fresh Ubuntu 24.04
# - Test update from previous version
# - Test key features
# - Test rollback procedure

# Check logs for errors
docker-compose logs
```

### 6. Create Pull Request

```bash
# Push release branch
git push origin release/v2.x.x

# Create PR on GitHub:
# - Title: "Release v2.x.x"
# - Description: Include CHANGELOG content
# - Request review from team
```

### 7. Merge and Tag

After PR approval:

```bash
# Merge to main
git checkout main
git pull origin main

# Create and push tag
git tag -a v2.x.x -m "Release v2.x.x"
git push origin v2.x.x
```

### 8. Create GitHub Release

1. Go to https://github.com/vothalvino/fireisp2.0/releases
2. Click "Draft a new release"
3. Select the tag: `v2.x.x`
4. Release title: `FireISP v2.x.x`
5. Description:
   - Copy content from CHANGELOG.md for this version
   - Add installation instructions
   - Add update instructions with link to UPDATE.md
   - Highlight any breaking changes or special instructions

Example release description:

```markdown
# FireISP v2.x.x

## What's New

[Copy from CHANGELOG]

## Installation

For new installations:
```bash
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0
git checkout v2.x.x
sudo bash install.sh
```

## Updating

For existing installations, see [UPDATE.md](https://github.com/vothalvino/fireisp2.0/blob/main/UPDATE.md)

Quick update:
```bash
cd /opt/fireisp
sudo ./update.sh
```

## Breaking Changes

[List any breaking changes if MAJOR version]

## Full Changelog

[Link to compare with previous version]
```

6. Attach any assets if needed (e.g., compiled binaries)
7. Check "Set as the latest release"
8. Click "Publish release"

## Hotfix Releases

For critical bug fixes or security issues:

### 1. Create Hotfix Branch

```bash
# Branch from latest release tag
git checkout -b hotfix/v2.x.y v2.x.x

# Make the fix
git add .
git commit -m "Fix critical issue: description"

# Update version (increment PATCH)
echo "2.x.y" > VERSION
git add VERSION backend/package.json frontend/package.json
git commit -m "Bump version to 2.x.y"

# Update CHANGELOG
# Add hotfix entry to CHANGELOG.md
git add CHANGELOG.md
git commit -m "Update CHANGELOG for v2.x.y hotfix"
```

### 2. Test Thoroughly

Even though it's a hotfix, test:
- The fix works as intended
- No regressions introduced
- Update process works

### 3. Release

```bash
# Create PR
git push origin hotfix/v2.x.y

# After approval, merge to main
git checkout main
git merge hotfix/v2.x.y

# Tag and push
git tag -a v2.x.y -m "Hotfix v2.x.y"
git push origin main
git push origin v2.x.y

# Create GitHub release as described above
```

### 4. Notify Users

For critical security fixes:
- Create GitHub issue pinned to repository
- Update README with security notice
- Consider email notification to known users

## Post-Release Tasks

After releasing:

### 1. Update Documentation

- [ ] Ensure README.md points to latest version
- [ ] Update any external documentation
- [ ] Update Docker Hub description if applicable

### 2. Monitor Issues

- [ ] Watch for update issues
- [ ] Respond to bug reports promptly
- [ ] Check Docker container logs for common errors

### 3. Announce Release

- [ ] Create announcement in GitHub Discussions
- [ ] Post on social media (if applicable)
- [ ] Notify contributors

### 4. Plan Next Release

- [ ] Review open issues
- [ ] Update project roadmap
- [ ] Create milestone for next version

## Release Schedule

Recommended release schedule:

- **Major releases**: As needed for significant changes
- **Minor releases**: Monthly or when significant features are ready
- **Patch releases**: As needed for bug fixes
- **Security releases**: Immediately when vulnerabilities are discovered

## Version Support

- **Current version**: Full support
- **Previous minor version**: Security fixes only for 3 months
- **Older versions**: No support

Example:
- v2.3.x - Full support
- v2.2.x - Security fixes only (for 3 months after v2.3.0)
- v2.1.x and older - No support

## Emergency Procedures

### Critical Security Vulnerability

1. **Do not disclose publicly** until fix is ready
2. Create private hotfix branch
3. Develop and test fix
4. Prepare security advisory
5. Release hotfix
6. Publish security advisory with CVE if applicable
7. Notify users through all channels

### Broken Release

If a release is found to be broken:

1. Immediately create hotfix or revert
2. Update GitHub release with warning
3. Create new patch release ASAP
4. Document what went wrong and how to prevent

## Tools and Automation

Consider implementing:

- Automated version bumping scripts
- Automated CHANGELOG generation from commits
- CI/CD pipeline for releases
- Automated testing before release
- Automated Docker image building
- Release notification automation

## Checklist Template

Copy this for each release:

```markdown
## Release v2.x.x Checklist

### Pre-Release
- [ ] All features merged to main
- [ ] Tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] VERSION file updated
- [ ] package.json versions updated
- [ ] Migrations created and tested
- [ ] Release notes drafted

### Testing
- [ ] Fresh install tested
- [ ] Update from previous version tested
- [ ] Rollback tested
- [ ] Major features verified
- [ ] Docker containers build successfully

### Release
- [ ] Release branch created
- [ ] PR created and approved
- [ ] Merged to main
- [ ] Git tag created and pushed
- [ ] GitHub release created
- [ ] Release notes published

### Post-Release
- [ ] Announcements made
- [ ] Monitoring for issues
- [ ] Documentation sites updated
- [ ] Next version planned
```

## Questions?

For questions about the release process:
- Open an issue on GitHub
- Contact the maintainers
- Review previous releases for examples
