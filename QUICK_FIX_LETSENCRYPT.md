# Quick Fix: Let's Encrypt Still Failing

## TL;DR - 3 Commands to Fix It

```bash
cd /opt/fireisp
docker compose build --no-cache backend
docker compose up -d
```

That's it! Your Let's Encrypt should now work.

## Why This Works

The `acme-client` package needed for Let's Encrypt was added to the codebase, but your Docker container was built before it was added. Rebuilding the container installs the package.

## How to Verify It Worked

Check the backend logs:
```bash
docker compose logs backend | grep acme
```

You should see:
```
[System Health] acme-client v5.4.0 is available - Let's Encrypt functionality enabled
```

## If You Still Have Issues

After rebuilding, if Let's Encrypt still doesn't work, the problem is different. See:
- [LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md) - Full troubleshooting guide
- [LETSENCRYPT_REBUILD_FIX.md](LETSENCRYPT_REBUILD_FIX.md) - Detailed rebuild instructions

## What Changed

We added:
1. **Health checks** - Server warns you if acme-client is missing
2. **Better error messages** - Clear instructions when things go wrong
3. **Documentation** - Comprehensive guides to help you

## Prevention

After every `git pull`, always rebuild:
```bash
docker compose build --no-cache
docker compose up -d
```

Or use the update script which does this automatically:
```bash
sudo ./update.sh
```

---

**The Let's Encrypt code itself is working correctly. You just need to rebuild your containers.**
