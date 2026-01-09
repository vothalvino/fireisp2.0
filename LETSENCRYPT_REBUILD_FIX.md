# Let's Encrypt: Rebuild Fix for "Still Failing" Issues

## Problem

If Let's Encrypt is still failing after previous fixes were applied, the most common cause is that your Docker containers are running with outdated dependencies. Specifically, the `acme-client` npm package may not be installed in your running container.

## Why This Happens

Docker containers are built once and then reused. When code changes are pulled from git (like the Let's Encrypt fixes in PR #21), the container needs to be **rebuilt** to include new dependencies or code changes. Simply restarting containers (`docker-compose restart` or `docker-compose up -d`) does NOT rebuild them.

## The Solution: Rebuild Docker Containers

### Step 1: Rebuild the Backend Container

The backend container contains the `acme-client` package needed for Let's Encrypt. Rebuild it with:

```bash
cd /opt/fireisp  # Or your installation directory
docker-compose build --no-cache backend
```

The `--no-cache` flag ensures Docker doesn't use cached layers and installs all dependencies fresh.

### Step 2: Restart All Services

```bash
docker-compose up -d
```

### Step 3: Verify the Fix

Check that `acme-client` is now available:

```bash
docker-compose logs backend | grep -i acme
```

You should see a message like:
```
[System Health] acme-client v5.4.0 is available - Let's Encrypt functionality enabled
```

If you see a WARNING instead, the package is still not installed. Try the full rebuild below.

### Step 4: Test Let's Encrypt Status

Check the setup status endpoint:

```bash
curl http://localhost/api/setup/status
```

The response should include:
```json
{
  "setupCompleted": false,
  "sslEnabled": false,
  "letsEncryptAvailable": true,
  "acmeClientVersion": "5.4.0"
}
```

`letsEncryptAvailable` should be `true`.

## Full Rebuild (If Simple Rebuild Fails)

If the above steps don't work, try a complete rebuild:

```bash
cd /opt/fireisp
docker-compose down                      # Stop and remove containers
docker-compose build --no-cache          # Rebuild ALL containers
docker-compose up -d                     # Start containers
docker-compose logs backend | grep acme  # Verify
```

## Verify Installation Locally

To double-check the package is in your codebase:

```bash
cd /opt/fireisp/backend
cat package.json | grep acme-client
```

Should show:
```json
"acme-client": "^5.3.1"
```

## Understanding Docker Build Process

The Dockerfile for the backend uses these steps:

1. `COPY backend/package*.json ./` - Copies package files
2. `RUN npm ci` - Installs dependencies from package-lock.json
3. `COPY backend/ ./` - Copies source code

If `acme-client` is in package.json but not in the running container, it means the container was built before the package was added or there was a build cache issue.

## After Rebuilding

Once rebuilt, you can proceed with Let's Encrypt configuration:

1. **Access the setup wizard** at `http://your-domain.com`
2. **Step through the wizard** to Step 2 (SSL Configuration)
3. **Select "Let's Encrypt"**
4. **Enter your domain and email**
5. **Ensure prerequisites are met:**
   - Domain DNS points to server IP
   - Port 80 is accessible from internet
   - Firewall allows ports 80 and 443

For detailed troubleshooting of the Let's Encrypt process itself, see [LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md).

## Prevention

To avoid this issue in the future:

### After Every Git Pull

```bash
cd /opt/fireisp
git pull
docker-compose build --no-cache  # Always rebuild
docker-compose up -d
```

### After Every Update

```bash
cd /opt/fireisp
sudo ./update.sh  # The update script includes rebuild
```

The `update.sh` script automatically rebuilds containers, so using it is the safest update method.

## Common Mistakes

❌ **DON'T do this:**
```bash
git pull
docker-compose up -d  # Missing the build step!
```

✅ **DO this:**
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

❌ **DON'T do this:**
```bash
docker-compose build  # Without --no-cache, may use cached layers
```

✅ **DO this:**
```bash
docker-compose build --no-cache  # Forces fresh build
```

## Still Having Issues?

If rebuilding doesn't fix the problem, check:

1. **Git status** - Ensure you're on the latest commit:
   ```bash
   cd /opt/fireisp
   git status
   git log --oneline -5
   ```

2. **Package files** - Verify package.json and package-lock.json include acme-client:
   ```bash
   cd /opt/fireisp/backend
   grep acme-client package.json package-lock.json
   ```

3. **Build logs** - Check for errors during build:
   ```bash
   docker-compose build --no-cache backend 2>&1 | tee build.log
   ```

4. **Network issues** - If npm can't download packages, check internet connectivity:
   ```bash
   docker-compose build backend 2>&1 | grep -i "error"
   ```

## Summary

**Let's Encrypt failures are most commonly caused by running outdated Docker containers without the acme-client package.**

**The fix is simple: Rebuild your containers.**

```bash
cd /opt/fireisp
docker-compose build --no-cache backend
docker-compose up -d
docker-compose logs backend | grep acme  # Verify success
```

Then proceed with Let's Encrypt configuration as normal.
