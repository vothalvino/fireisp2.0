# FireISP Quick Reference Card

## Update Commands

### Check Your Version
```bash
cat /opt/fireisp/VERSION
# or
./fireisp version
```

### Update FireISP
```bash
cd /opt/fireisp
sudo ./update.sh
```

### Check for Updates (without applying)
```bash
./update.sh --check
```

### Rollback to Previous Version
```bash
sudo ./update.sh --rollback
```

## Backup Commands

### Create Backup
```bash
cd /opt/fireisp
./fireisp backup
```
Backup saved to: `backups/backup_YYYYMMDD_HHMMSS.sql`

### Restore from Backup
```bash
./fireisp restore backups/backup_YYYYMMDD_HHMMSS.sql
```

## Service Management

### Start Services
```bash
cd /opt/fireisp
docker-compose start
# or
./fireisp start
```

### Stop Services
```bash
docker-compose stop
# or
./fireisp stop
```

### Restart Services
```bash
docker-compose restart
# or
./fireisp restart
```

### Check Status
```bash
docker-compose ps
# or
./fireisp status
```

## Viewing Logs

### All Logs
```bash
cd /opt/fireisp
docker-compose logs -f
```

### Specific Container
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs radius
```

### Using fireisp CLI
```bash
./fireisp logs -f           # Follow all logs
./fireisp logs --tail=100   # Last 100 lines
```

## Update Process

### Normal Update (Recommended)
1. Navigate to installation directory:
   ```bash
   cd /opt/fireisp
   ```

2. Run update script:
   ```bash
   sudo ./update.sh
   ```

3. Wait for completion (2-5 minutes)

4. Verify application is working

### If Update Fails
1. Check logs:
   ```bash
   cat /opt/fireisp/update.log
   ```

2. Rollback:
   ```bash
   sudo ./update.sh --rollback
   ```

3. Report issue on GitHub with log contents

## Emergency Procedures

### Application Not Responding
```bash
cd /opt/fireisp
docker-compose restart
```

### Database Issues
```bash
# View database logs
docker-compose logs postgres

# Access database
docker-compose exec postgres psql -U fireisp
```

### Container Not Starting
```bash
# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs
```

### Restore from Backup
```bash
cd /opt/fireisp
./fireisp stop
./fireisp restore backups/backup_YYYYMMDD_HHMMSS.sql
./fireisp start
```

## Important File Locations

```
/opt/fireisp/
├── VERSION                    # Current version
├── update.sh                  # Update script
├── fireisp                    # CLI management tool
├── .env                       # Configuration
├── docker-compose.yml         # Container config
├── backups/                   # Database backups
│   └── backup_*.sql
├── uploads/                   # User uploads
├── ssl/                       # SSL certificates
└── database/
    └── migrations/            # Database migrations
```

## Documentation

- **UPDATE.md** - Complete update guide
- **README.md** - General documentation
- **QUICKSTART.md** - Quick start guide
- **TROUBLESHOOTING** - See README.md troubleshooting section

## Getting Help

1. **Check Documentation**
   - README.md
   - UPDATE.md
   - QUICKSTART.md

2. **Review Logs**
   ```bash
   docker-compose logs -f
   cat /opt/fireisp/update.log
   ```

3. **GitHub Issues**
   https://github.com/vothalvino/fireisp2.0/issues

## Best Practices

✅ **DO:**
- Create backups before major changes
- Check for updates regularly
- Read CHANGELOG.md before updating
- Test updates in staging if possible
- Keep .env file secure

❌ **DON'T:**
- Update without backing up first
- Skip reading update notes
- Modify files during update
- Force push or hard reset
- Share .env file publicly

## Update Schedule Recommendation

- **Security Updates**: Immediately
- **Regular Updates**: Monthly
- **Backup Schedule**: Before every update + weekly

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't access web interface | `docker-compose restart` |
| Database error | Check logs, restore backup |
| Update failed | Run `./update.sh --rollback` |
| Container not starting | `docker-compose build --no-cache` |
| Port conflict | Edit .env, change ports |
| Disk full | Clean old backups, check logs |

## Useful One-Liners

```bash
# Full system status
cd /opt/fireisp && docker-compose ps && cat VERSION

# Quick update check
cd /opt/fireisp && ./update.sh --check

# Emergency restart
cd /opt/fireisp && docker-compose restart && docker-compose ps

# View last 50 log lines from all containers
cd /opt/fireisp && docker-compose logs --tail=50

# Create backup and show location
cd /opt/fireisp && ./fireisp backup && ls -lht backups/ | head -2

# Check if updates are available
cd /opt/fireisp && git fetch && git log HEAD..origin/main --oneline
```

---

**Keep this reference handy for quick access to common commands!**

For detailed information, always refer to UPDATE.md and README.md.
