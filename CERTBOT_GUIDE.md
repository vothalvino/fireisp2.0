# Certbot SSL Configuration Guide

FireISP 2.0 now supports SSL certificate configuration using Certbot with the nginx plugin. This provides an automated way to obtain and configure Let's Encrypt SSL certificates directly from the Web GUI.

## What is Certbot?

Certbot is the official Let's Encrypt client that can automatically:
- Obtain SSL certificates from Let's Encrypt
- Configure nginx to use the certificates
- Set up automatic certificate renewal

## Available SSL Methods

FireISP 2.0 supports three SSL configuration methods:

1. **Let's Encrypt (acme-client)** - Uses the acme-client Node.js package
2. **Certbot (nginx plugin)** - Uses certbot with automatic nginx configuration (NEW)
3. **Manual Certificate Upload** - Upload your own SSL certificate files

## Certbot vs acme-client

Both methods obtain free SSL certificates from Let's Encrypt, but with different approaches:

| Feature | Certbot | acme-client |
|---------|---------|-------------|
| Implementation | System command | Node.js package |
| Nginx config | Automatic | Manual |
| Renewal | Built-in cron | Custom logic |
| Dependencies | Requires certbot install | Included in backend |

## Prerequisites

Before using Certbot for SSL configuration:

- ✅ Registered domain name (e.g., fireisp.example.com)
- ✅ DNS A record pointing to your server's public IP address
- ✅ DNS propagation completed (wait 5-60 minutes after DNS changes)
- ✅ Port 80 open and accessible from the internet
- ✅ Port 443 open for HTTPS traffic
- ✅ Certbot installed in the frontend container (handled automatically)

## How It Works

### Architecture

1. **Frontend Container**: Runs nginx and has certbot installed
2. **Backend Container**: Has Docker CLI and can execute commands in frontend container
3. **Docker Socket**: Backend has access to Docker socket for cross-container execution

When you configure SSL with certbot:

```
Web GUI → Backend API → Docker Exec → Certbot in Frontend Container → Nginx Configuration
```

### What Certbot Does

1. Validates domain ownership using HTTP-01 challenge
2. Requests SSL certificate from Let's Encrypt
3. Automatically configures nginx with the certificate
4. Sets up certificate auto-renewal

## Using Certbot in Setup Wizard

### Step 1: Access Setup Wizard

When setting up FireISP for the first time, you'll reach the SSL Configuration step.

### Step 2: Enable SSL

Check the "Enable SSL/HTTPS" checkbox.

### Step 3: Select Certbot Method

From the SSL Method dropdown, select:
- **Certbot (nginx plugin)** - If available
- Shows as "Not Installed" if certbot is not in the container

### Step 4: Enter Domain and Email

- **Domain Name**: Your fully qualified domain name (e.g., fireisp.example.com)
  - Must be a valid domain, not localhost or IP address
  - Must point to your server's public IP
- **Email Address**: Email for certificate expiration notifications

### Step 5: Configure SSL

Click "Configure SSL & Continue" to start the process.

The setup wizard will:
1. Validate your inputs
2. Execute certbot in the frontend container
3. Obtain and install SSL certificate
4. Configure nginx automatically
5. Update system settings

## Using Certbot in Settings Page

You can also configure SSL after setup is complete.

### Step 1: Navigate to Settings

Log in to FireISP and go to **Settings** → **System Settings**.

### Step 2: SSL Configuration Section

Find the "SSL Configuration" section.

### Step 3: Enable SSL and Select Method

1. Check "Enable SSL/HTTPS"
2. Select "Certbot (nginx plugin)" from SSL Method dropdown

### Step 4: Certbot Configuration Panel

A blue panel will appear with:
- **Certbot Status**: Shows if certbot is available
- **Domain Name**: Enter your domain
- **Email Address**: Enter your email
- **Configure with Certbot**: Button to start the process

### Step 5: Click Configure

Click "Configure with Certbot" button.
- Confirm the action in the dialog
- Wait 1-2 minutes for completion
- Certificate will be obtained and configured automatically

## Certificate Renewal

Certbot certificates are valid for 90 days and should be renewed before expiration.

### Automatic Renewal (Recommended)

Set up a cron job on your host system:

```bash
# Add to crontab (crontab -e)
0 0 * * * docker exec fireisp-frontend certbot renew --nginx --non-interactive
```

This runs daily and renews certificates within 30 days of expiration.

### Manual Renewal via API

You can also trigger renewal from the backend API:

```bash
curl -X POST http://your-server/api/settings/ssl/certbot-renew \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Certbot Not Available

**Issue**: Certbot option shows "Not Installed"

**Solution**: Rebuild the frontend container:
```bash
docker compose build --no-cache frontend
docker compose up -d
```

### DNS Resolution Failed

**Issue**: "DNS resolution failed" error during certificate acquisition

**Solutions**:
1. Verify DNS A record: `nslookup your-domain.com`
2. Check if DNS points to correct IP: `curl ifconfig.me`
3. Wait for DNS propagation (5-60 minutes)
4. Test globally: https://dnschecker.org

### Challenge Validation Failed

**Issue**: "Challenge validation failed" error

**Solutions**:
1. Open port 80: `sudo ufw allow 80/tcp`
2. Open port 443: `sudo ufw allow 443/tcp`
3. Verify nginx is running: `docker ps | grep frontend`
4. Test HTTP access: `curl http://your-domain.com`

### Rate Limit Reached

**Issue**: "Let's Encrypt rate limit reached"

**Solutions**:
1. Wait for rate limit reset (weekly)
2. Use a different subdomain
3. See: https://letsencrypt.org/docs/rate-limits/

### Connection Timeout

**Issue**: Connection timeout during certificate acquisition

**Solutions**:
1. Check firewall: `sudo ufw status`
2. Verify server is accessible from internet
3. If behind NAT, configure port forwarding (80, 443)
4. Check hosting provider network settings

### Docker Socket Permission Denied

**Issue**: Backend cannot execute docker commands

**Solution**: Backend container needs Docker socket access (automatically configured in docker-compose.yml)

## Comparison with Other Methods

### When to Use Certbot

✅ Use Certbot when:
- You want automatic nginx configuration
- You prefer system-level tools
- You want standard Let's Encrypt client
- You're familiar with certbot

### When to Use acme-client

✅ Use acme-client when:
- You prefer Node.js-based solutions
- You want all dependencies in code
- You need custom certificate handling
- Certbot is not available

### When to Use Manual Upload

✅ Use Manual Upload when:
- You already have SSL certificates
- Using certificates from another provider
- Need wildcard or extended validation certificates
- Let's Encrypt is not suitable for your use case

## Security Considerations

### Docker Socket Access

The backend container has access to the Docker socket to execute certbot commands. This is required for the feature but should be considered:

- Backend can execute commands in frontend container only
- Used only for SSL certificate management
- Limited to certbot-related operations
- No access to other containers or host system

### Certificate Storage

SSL certificates are stored in:
- Frontend container: `/etc/letsencrypt/` (managed by certbot)
- Shared volume: `./ssl/` (for nginx configuration)

Certificates are automatically secured by file permissions.

## Advanced Usage

### Dry Run Mode

Test certificate acquisition without actually obtaining a certificate:

```javascript
// Via API
{
  "domain": "example.com",
  "email": "admin@example.com",
  "dryRun": true
}
```

This validates your configuration without hitting rate limits.

### Multiple Domains

To add SSL for multiple domains, run certbot separately for each:

```bash
docker exec fireisp-frontend certbot --nginx \
  -d domain1.com -d www.domain1.com \
  --non-interactive --agree-tos --email admin@example.com
```

## Support

If you encounter issues:

1. **Check Logs**:
   ```bash
   docker compose logs backend | tail -50
   docker compose logs frontend | tail -50
   ```

2. **Verify Certbot Status**:
   ```bash
   docker exec fireisp-frontend certbot --version
   docker exec fireisp-frontend certbot certificates
   ```

3. **Test Domain Access**:
   ```bash
   curl http://your-domain.com
   nslookup your-domain.com
   ```

4. **Get Help**:
   - GitHub Issues: https://github.com/vothalvino/fireisp2.0/issues
   - Include error messages and logs
   - Mention SSL method (certbot) being used

## Summary

Certbot integration provides a powerful, automated way to obtain and manage SSL certificates:

- ✅ Fully integrated in Web GUI
- ✅ Works in both Setup Wizard and Settings
- ✅ Automatic nginx configuration
- ✅ Built-in certificate renewal
- ✅ Standard Let's Encrypt client
- ✅ No manual configuration needed

Choose the SSL method that best fits your needs and experience level. All three methods are fully supported and maintained.
