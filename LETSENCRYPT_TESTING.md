# Let's Encrypt Integration Testing Guide

## Overview
This guide provides instructions for testing the Let's Encrypt integration in the FireISP setup wizard.

## Prerequisites

### For Production Testing
- A public domain name (e.g., fireisp.example.com)
- DNS A record pointing to your server's public IP
- Port 80 accessible from the internet (for HTTP-01 challenge)
- Server with public IP address

### For Staging Testing (Recommended for Development)
- Same requirements as production
- Set `LETSENCRYPT_STAGING=true` in `.env` file
- Staging certificates won't be trusted by browsers but validate the process

## Testing Steps

### 1. Initial Setup

1. Clone and install FireISP:
   ```bash
   git clone https://github.com/vothalvino/fireisp2.0.git
   cd fireisp2.0
   sudo bash install.sh
   ```

2. Configure staging environment (optional but recommended for testing):
   ```bash
   cd /opt/fireisp
   echo "LETSENCRYPT_STAGING=true" >> .env
   docker-compose restart backend
   ```

### 2. DNS Configuration

1. Create an A record for your domain:
   ```
   Type: A
   Name: fireisp (or subdomain of your choice)
   Value: YOUR_SERVER_PUBLIC_IP
   TTL: 300 (or default)
   ```

2. Verify DNS propagation:
   ```bash
   nslookup fireisp.example.com
   # Should return your server's IP
   ```

### 3. Access Setup Wizard

1. Open browser and navigate to: `http://YOUR_SERVER_IP`

2. Complete Step 1: Create root user
   - Enter username, email, password, and full name
   - Click "Continue"

3. Complete Step 2: SSL Configuration
   - Check "Enable SSL/HTTPS"
   - Select "Let's Encrypt (Automatic)" from dropdown
   - Enter your domain name (e.g., `fireisp.example.com`)
   - Enter your email address
   - Click "Save & Continue"

### 4. Monitor Certificate Acquisition

Watch the backend logs for certificate generation:
```bash
cd /opt/fireisp
docker-compose logs -f backend
```

Expected log output:
```
Using Let's Encrypt staging environment for testing (if staging enabled)
[acme-client] Creating account...
[acme-client] Requesting certificate...
[acme-client] HTTP-01 challenge created
[acme-client] Challenge validated
[acme-client] Certificate issued
```

### 5. Verify Certificate Installation

1. Check certificate files:
   ```bash
   cd /opt/fireisp
   ls -la ssl/
   # Should show cert.pem and key.pem
   ```

2. View certificate details:
   ```bash
   openssl x509 -in ssl/cert.pem -text -noout
   ```

3. Check database settings:
   ```bash
   docker-compose exec postgres psql -U fireisp -c \
     "SELECT key, value FROM system_settings WHERE key LIKE 'ssl%' OR key LIKE 'letsencrypt%';"
   ```

### 6. Test HTTPS Access

1. Restart nginx to load new certificate:
   ```bash
   docker-compose restart frontend
   ```

2. Access via HTTPS:
   ```
   https://fireisp.example.com
   ```

3. For staging certificates, you'll see a browser warning (expected):
   - Certificate will be issued by "Fake LE Intermediate X1"
   - Click "Advanced" and proceed anyway for testing
   - This confirms the certificate was obtained successfully

## Troubleshooting

### Challenge Validation Fails

1. Check port 80 is accessible:
   ```bash
   curl http://YOUR_DOMAIN/.well-known/acme-challenge/test
   ```

2. Verify nginx is serving challenge directory:
   ```bash
   docker-compose exec frontend ls -la /etc/nginx/ssl/.well-known/acme-challenge/
   ```

3. Check firewall rules:
   ```bash
   sudo ufw status
   # Port 80 should be allowed
   ```

### DNS Issues

1. Verify DNS resolution from server:
   ```bash
   dig @8.8.8.8 fireisp.example.com
   ```

2. Check from multiple locations:
   - Use online DNS checker: https://dnschecker.org
   - DNS propagation can take 5-60 minutes

### Rate Limiting

Let's Encrypt has rate limits:
- **Staging**: Very high limits, suitable for testing
- **Production**: 50 certificates per domain per week

If you hit rate limits:
1. Use staging environment: `LETSENCRYPT_STAGING=true`
2. Wait for rate limit to reset (weekly)
3. Use a different domain/subdomain

### Certificate Not Loading

1. Check nginx error logs:
   ```bash
   docker-compose logs frontend
   ```

2. Verify certificate permissions:
   ```bash
   ls -la ssl/
   # Files should be readable by nginx
   ```

3. Restart containers:
   ```bash
   docker-compose restart
   ```

## Testing Checklist

- [ ] DNS A record configured and propagated
- [ ] Port 80 accessible from internet
- [ ] LETSENCRYPT_STAGING=true set for testing
- [ ] Setup wizard accessible via HTTP
- [ ] Root user created successfully
- [ ] Let's Encrypt option selected
- [ ] Domain and email entered
- [ ] Certificate obtained without errors
- [ ] cert.pem and key.pem created in ssl/
- [ ] Database settings updated correctly
- [ ] HTTPS site accessible (with staging warning)
- [ ] Setup wizard marked as completed

## Production Deployment

Once testing is successful:

1. Clear staging certificates:
   ```bash
   cd /opt/fireisp
   rm ssl/cert.pem ssl/key.pem
   ```

2. Remove staging flag:
   ```bash
   sed -i '/LETSENCRYPT_STAGING/d' .env
   ```

3. Reset setup flag in database:
   ```bash
   docker-compose exec postgres psql -U fireisp -c \
     "UPDATE system_settings SET value='false' WHERE key='setup_completed';"
   ```

4. Restart application:
   ```bash
   docker-compose restart
   ```

5. Run setup wizard again with production settings

## Future Enhancements

- Automatic certificate renewal (cron job)
- Certificate expiration notifications
- Support for wildcard certificates
- DNS-01 challenge support for private networks

## Support

For issues or questions:
- GitHub Issues: https://github.com/vothalvino/fireisp2.0/issues
- Documentation: README.md
