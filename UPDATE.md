# FireISP Update Guide

This guide provides comprehensive instructions for updating your FireISP installation to the latest version.

## Table of Contents

- [Before You Update](#before-you-update)
- [Quick Update (Recommended)](#quick-update-recommended)
- [Manual Update](#manual-update)
- [Version-Specific Updates](#version-specific-updates)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)

## Before You Update

### Prerequisites Checklist

Before updating, ensure you:

- [ ] Have root or sudo access
- [ ] Know your current FireISP version (check `/opt/fireisp/VERSION`)
- [ ] Have at least 5GB of free disk space
- [ ] Can afford a few minutes of downtime
- [ ] Have noted any custom configurations

### Check Current Version

```bash
cat /opt/fireisp/VERSION
```

### Backup Your System

**IMPORTANT:** Always create a backup before updating!

```bash
# Navigate to installation directory
cd /opt/fireisp

# Run the backup command
./fireisp backup

# This creates a backup file named: backup_YYYYMMDD_HHMMSS.sql
# The file is saved in /opt/fireisp directory
```

**Optional:** Backup the entire installation directory:

```bash
sudo tar -czf /tmp/fireisp-backup-$(date +%Y%m%d).tar.gz /opt/fireisp
```

## Quick Update (Recommended)

The quickest way to update FireISP is using the built-in update script:

```bash
cd /opt/fireisp
sudo ./update.sh
```

The update script will:
1. Check your current version
2. Create an automatic backup
3. Download the latest version
4. Run any necessary database migrations
5. Rebuild Docker containers
6. Restart all services
7. Verify the update was successful
8. Show you the new version

### What the Update Script Does

The automated update process:
- Backs up your database automatically
- Checks for breaking changes
- Applies database migrations in the correct order
- Preserves your `.env` configuration
- Maintains your SSL certificates
- Keeps your uploaded files and data
- Performs health checks after update
- Provides rollback option if something goes wrong

## Manual Update

If you prefer to update manually or the automated script fails:

### Step 1: Backup

```bash
cd /opt/fireisp
./fireisp backup
```

### Step 2: Stop Services

```bash
docker-compose stop
```

### Step 3: Pull Latest Changes

```bash
git fetch --tags
git pull origin main
```

### Step 4: Check for Migrations

```bash
# List available migrations
ls -la database/migrations/

# Check which migrations need to be applied
# Compare against your current version
```

### Step 5: Run Database Migrations

```bash
# Apply migrations in order (if any exist for your version)
docker-compose up -d postgres

# Wait for postgres to be ready
sleep 10

# Run each migration (example)
# docker-compose exec -T postgres psql -U fireisp fireisp < database/migrations/001_migration_name.sql
```

### Step 6: Update Environment File (if needed)

```bash
# Check if new environment variables were added
diff .env.example .env

# Add any missing variables to your .env file
nano .env
```

### Step 7: Rebuild Containers

```bash
docker-compose build --no-cache
```

### Step 8: Start Services

```bash
docker-compose up -d
```

### Step 9: Verify Update

```bash
# Check all containers are running
docker-compose ps

# Check logs for errors
docker-compose logs --tail=50

# Verify version
cat VERSION

# Test the application
curl -I http://localhost
```

## Version-Specific Updates

### Updating from 1.x to 2.0.0

Version 2.0.0 was a complete rewrite. Direct updates from 1.x are not supported.
Please perform a fresh installation and migrate your data manually.

### Updating to versions with Let's Encrypt support

If you're updating to a version that includes Let's Encrypt support, see [UPGRADE_LETSENCRYPT.md](UPGRADE_LETSENCRYPT.md) for specific instructions.

### Future Version Updates

When updating between 2.x versions, always check the [CHANGELOG.md](CHANGELOG.md) for:
- Breaking changes
- New features
- Required manual steps
- Database schema changes

## Rollback Procedure

If something goes wrong during the update:

### Option 1: Use Automated Rollback

If you used the update script and it failed:

```bash
cd /opt/fireisp
./update.sh --rollback
```

### Option 2: Manual Rollback

```bash
cd /opt/fireisp

# Stop services
docker-compose down

# Checkout previous version
git fetch --tags
git checkout v2.0.0  # Replace with your previous version tag

# Rebuild containers
docker-compose build

# Start services
docker-compose up -d

# Restore database if needed
./fireisp restore backup_YYYYMMDD_HHMMSS.sql
```

### Option 3: Full System Restore

If you created a full backup:

```bash
# Stop and remove containers
cd /opt/fireisp
docker-compose down

# Restore installation directory
sudo rm -rf /opt/fireisp
sudo tar -xzf /tmp/fireisp-backup-YYYYMMDD.tar.gz -C /

# Start services
cd /opt/fireisp
docker-compose up -d
```

## Update Best Practices

1. **Schedule Updates During Maintenance Windows**
   - Plan updates during low-traffic periods
   - Notify users of planned maintenance

2. **Test Updates in Staging First**
   - If possible, test updates in a non-production environment
   - Verify all functionality before updating production

3. **Keep Backups**
   - Maintain multiple backup copies
   - Store backups in a different location
   - Test backup restoration periodically

4. **Monitor After Updates**
   - Watch logs for errors: `docker-compose logs -f`
   - Check service status: `docker-compose ps`
   - Verify key functionality through the web interface

5. **Read Release Notes**
   - Always check [CHANGELOG.md](CHANGELOG.md) before updating
   - Look for breaking changes or manual steps required

## Troubleshooting

### Update Script Fails

```bash
# Check update script logs
cat /opt/fireisp/update.log

# Try manual update instead
# Follow the manual update steps above
```

### Containers Won't Start

```bash
# Check container status
docker-compose ps

# View logs for specific container
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Try rebuilding without cache
docker-compose build --no-cache
docker-compose up -d
```

### Database Migration Errors

```bash
# Check postgres logs
docker-compose logs postgres

# Verify database connectivity
docker-compose exec postgres psql -U fireisp -c "SELECT version();"

# List applied migrations (if migration tracking is implemented)
docker-compose exec postgres psql -U fireisp -c "SELECT * FROM schema_migrations;"

# If migration fails halfway, you may need to restore from backup
```

### Permission Errors

```bash
# Fix ownership of installation directory
sudo chown -R root:root /opt/fireisp

# Fix .env file permissions
sudo chmod 600 /opt/fireisp/.env

# Fix SSL certificate permissions
sudo chmod 600 /opt/fireisp/ssl/*.pem
```

### Port Conflicts

```bash
# Check if ports are already in use
sudo netstat -tlnp | grep -E ':(80|443|1812|1813)'

# Change ports in .env file
nano /opt/fireisp/.env

# Restart services
docker-compose down
docker-compose up -d
```

### "Connection Refused" After Update

```bash
# Wait for all services to start (can take 30-60 seconds)
sleep 30

# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Restart all services
docker-compose restart
```

### Application Not Accessible

```bash
# Verify nginx is running
docker-compose ps frontend

# Check nginx logs
docker-compose logs frontend

# Test backend directly
curl http://localhost:3000/api/health

# Restart nginx
docker-compose restart frontend
```

## Getting Help

If you encounter issues during update:

1. **Check Documentation**
   - [README.md](README.md) - General documentation
   - [CHANGELOG.md](CHANGELOG.md) - Version changes
   - [TROUBLESHOOTING.md](README.md#troubleshooting) - Common issues

2. **Review Logs**
   ```bash
   docker-compose logs -f
   ```

3. **GitHub Issues**
   - Check existing issues: https://github.com/vothalvino/fireisp2.0/issues
   - Open a new issue with:
     - Your current version
     - Target version
     - Error messages
     - Steps you've tried

4. **Community Support**
   - Check the project's GitHub Discussions
   - Review closed issues for similar problems

## Maintenance Schedule

We recommend checking for updates:
- **Critical Security Updates**: As soon as announced
- **Regular Updates**: Monthly
- **Major Releases**: Review carefully before updating

Subscribe to the repository's releases to be notified:
https://github.com/vothalvino/fireisp2.0/releases

## Automated Update Checks

To enable automated update notifications:

```bash
# Add to crontab
sudo crontab -e

# Check for updates weekly (every Monday at 9 AM)
0 9 * * 1 cd /opt/fireisp && git fetch && git log HEAD..origin/main --oneline | mail -s "FireISP Updates Available" admin@yourdomain.com
```

---

**Note:** Always maintain recent backups and test updates in a non-production environment when possible.
