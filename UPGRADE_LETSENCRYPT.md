# Upgrading to Let's Encrypt Support

This guide helps existing FireISP installations upgrade to support Let's Encrypt SSL certificates.

## For New Installations

If you're installing FireISP for the first time, simply follow the standard installation process. Let's Encrypt support is included by default.

## For Existing Installations

If you already have FireISP installed and want to add Let's Encrypt support:

### Step 1: Update Code

```bash
cd /opt/fireisp  # Or your installation directory
git pull origin main
```

### Step 2: Update Database Schema

Run the migration script to add new database fields:

```bash
docker-compose exec postgres psql -U fireisp fireisp < database/migrations/add_letsencrypt_settings.sql
```

Or manually:

```bash
docker-compose exec postgres psql -U fireisp
```

Then run:

```sql
INSERT INTO system_settings (key, value, description) 
VALUES 
    ('ssl_method', '', 'SSL certificate method: letsencrypt or manual'),
    ('letsencrypt_domain', '', 'Domain name for Let''s Encrypt certificate'),
    ('letsencrypt_email', '', 'Email address for Let''s Encrypt notifications')
ON CONFLICT (key) DO NOTHING;
```

### Step 3: Install Backend Dependencies

```bash
docker-compose build backend
```

This will install the new `acme-client` package.

### Step 4: Update Configuration (Optional)

Add Let's Encrypt staging support to your `.env` file:

```bash
echo "LETSENCRYPT_STAGING=false" >> .env
```

Set to `true` for testing to avoid rate limits.

### Step 5: Restart Services

```bash
docker-compose down
docker-compose up -d
```

### Step 6: Configure Let's Encrypt

You have two options to configure Let's Encrypt:

#### Option A: Via Settings Page (If Available)

Future versions may include Let's Encrypt configuration in the Settings page.

#### Option B: Via API (Current Method)

You can obtain a Let's Encrypt certificate via API:

```bash
curl -X POST http://localhost/api/setup/ssl \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "enabled": true,
    "method": "letsencrypt",
    "domain": "fireisp.example.com",
    "email": "admin@example.com"
  }'
```

**Note**: This requires the setup to not be completed. If your setup is already complete, you'll need to manually set up Let's Encrypt or wait for the settings page implementation.

### Manual Let's Encrypt Setup (Alternative)

If you can't use the API method, you can manually obtain a certificate:

1. Install certbot:
   ```bash
   sudo apt install certbot
   ```

2. Stop nginx temporarily:
   ```bash
   docker-compose stop frontend
   ```

3. Obtain certificate:
   ```bash
   sudo certbot certonly --standalone -d fireisp.example.com
   ```

4. Copy certificates to FireISP:
   ```bash
   sudo cp /etc/letsencrypt/live/fireisp.example.com/fullchain.pem /opt/fireisp/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/fireisp.example.com/privkey.pem /opt/fireisp/ssl/key.pem
   sudo chown -R root:root /opt/fireisp/ssl/
   ```

5. Update database:
   ```bash
   docker-compose exec postgres psql -U fireisp -c \
     "UPDATE system_settings SET value='true' WHERE key='ssl_enabled';"
   docker-compose exec postgres psql -U fireisp -c \
     "UPDATE system_settings SET value='manual' WHERE key='ssl_method';"
   ```

6. Restart services:
   ```bash
   docker-compose start frontend
   ```

## Verification

After upgrade, verify the changes:

1. Check database:
   ```bash
   docker-compose exec postgres psql -U fireisp -c \
     "SELECT key, description FROM system_settings WHERE key LIKE '%letsencrypt%' OR key = 'ssl_method';"
   ```

2. Check backend dependencies:
   ```bash
   docker-compose exec backend npm list acme-client
   ```

3. Check nginx config:
   ```bash
   docker-compose exec frontend cat /etc/nginx/nginx.conf | grep -A 3 "well-known"
   ```

Expected output should include:
```
location /.well-known/acme-challenge/ {
    alias /etc/nginx/ssl/.well-known/acme-challenge/;
    try_files $uri =404;
}
```

## Rollback

If you encounter issues and need to rollback:

```bash
cd /opt/fireisp
git reset --hard PREVIOUS_COMMIT_HASH
docker-compose build
docker-compose down
docker-compose up -d
```

## Support

For issues during upgrade:
- GitHub Issues: https://github.com/vothalvino/fireisp2.0/issues
- Check logs: `docker-compose logs -f`
