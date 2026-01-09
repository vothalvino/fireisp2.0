# Let's Encrypt Troubleshooting Guide

This guide helps diagnose and fix common issues when configuring Let's Encrypt SSL certificates in FireISP.

## IMPORTANT: First Step

**If you recently updated FireISP or are experiencing Let's Encrypt failures, rebuild your Docker containers first:**

```bash
cd /opt/fireisp  # Or your installation directory
docker-compose build --no-cache backend
docker-compose up -d
```

This ensures the `acme-client` package is properly installed. Check the backend logs after restart:

```bash
docker-compose logs backend | grep -i acme
```

You should see: `[System Health] acme-client vX.X.X is available - Let's Encrypt functionality enabled`

If you see a WARNING message instead, the acme-client is not installed and Let's Encrypt will not work.

## Prerequisites Checklist

Before attempting Let's Encrypt configuration, ensure ALL of the following are met:

### 1. Docker Container Status
- [ ] Docker containers have been built/rebuilt recently
- [ ] Backend logs show acme-client is available
- [ ] No error messages about missing packages on startup

### 2. Domain Configuration
- [ ] You have a registered domain name (e.g., `fireisp.example.com`)
- [ ] DNS A record is configured and points to your server's **public IP address**
- [ ] DNS has propagated (wait 5-60 minutes after DNS changes)
- [ ] Domain resolves correctly from external networks

### 3. Network Configuration
- [ ] Server has a **public IP address** (not behind NAT without port forwarding)
- [ ] Port 80 is **open and accessible** from the internet
- [ ] Port 443 is **open and accessible** from the internet (for HTTPS)
- [ ] Firewall allows incoming traffic on ports 80 and 443
- [ ] No other service is using port 80 (Apache, other web servers, etc.)

### 4. FireISP Configuration
- [ ] FireISP is installed and running
- [ ] You can access the setup wizard via HTTP
- [ ] Setup is not yet completed (first-time setup)

## Common Issues and Solutions

### Issue 0: "acme-client package is missing" or "Let's Encrypt functionality is not available"

**Cause**: The Docker container was not built with the acme-client package, or you're running an old container image.

**Solutions**:

1. **Rebuild the backend container** (REQUIRED):
   ```bash
   cd /opt/fireisp
   docker-compose build --no-cache backend
   docker-compose up -d
   ```

2. **Verify the package is installed**:
   ```bash
   docker-compose logs backend | grep -i "acme-client"
   ```
   
   Expected output: `[System Health] acme-client v5.4.0 is available`

3. **Check the setup status endpoint**:
   ```bash
   curl http://localhost/api/setup/status
   ```
   
   Should include: `"letsEncryptAvailable": true`

### Issue 1: "Challenge validation failed" or "Invalid response"

**Cause**: Let's Encrypt cannot access your server on port 80 to validate domain ownership.

**Solutions**:

1. **Verify port 80 is accessible from the internet**:
   ```bash
   # From an external machine or service (e.g., https://www.canyouseeme.org/):
   curl http://your-domain.com/.well-known/acme-challenge/test
   ```

2. **Check firewall rules**:
   ```bash
   # Ubuntu/Debian with UFW:
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   
   # CentOS/RHEL with firewalld:
   sudo firewall-cmd --list-all
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

3. **Check if port 80 is already in use**:
   ```bash
   sudo netstat -tlnp | grep :80
   sudo lsof -i :80
   ```

4. **Verify nginx is running and serving the challenge directory**:
   ```bash
   cd /opt/fireisp
   docker-compose ps frontend
   docker-compose logs frontend | tail -20
   ```

5. **Test ACME challenge directory accessibility**:
   ```bash
   # Create a test file
   cd /opt/fireisp
   mkdir -p ssl/.well-known/acme-challenge
   echo "test" > ssl/.well-known/acme-challenge/test
   
   # Try to access it from the server
   curl http://localhost/.well-known/acme-challenge/test
   
   # Try from external (replace with your domain)
   curl http://your-domain.com/.well-known/acme-challenge/test
   
   # Clean up
   rm ssl/.well-known/acme-challenge/test
   ```

### Issue 2: "DNS resolution failed" or "Domain not found"

**Cause**: DNS is not properly configured or hasn't propagated.

**Solutions**:

1. **Verify DNS configuration**:
   ```bash
   # Check from your server
   nslookup your-domain.com
   dig your-domain.com
   
   # Check from Google's DNS
   nslookup your-domain.com 8.8.8.8
   dig @8.8.8.8 your-domain.com
   ```

2. **Wait for DNS propagation**:
   - DNS changes can take 5-60 minutes to propagate
   - Use online tools like https://dnschecker.org to verify global propagation

3. **Ensure A record points to correct IP**:
   ```bash
   # Get your server's public IP
   curl ifconfig.me
   
   # Verify DNS points to this IP
   dig your-domain.com +short
   ```

### Issue 3: "Rate limit exceeded"

**Cause**: Let's Encrypt has rate limits (50 certificates per domain per week).

**Solutions**:

1. **Use staging environment for testing**:
   ```bash
   cd /opt/fireisp
   echo "LETSENCRYPT_STAGING=true" >> .env
   docker-compose restart backend
   ```

2. **Wait for rate limit to reset** (weekly reset)

3. **Use a different subdomain**:
   - Each subdomain has its own rate limit
   - Example: `app.example.com`, `portal.example.com`, etc.

### Issue 4: "Connection refused" or "Timeout"

**Cause**: Network connectivity issues or firewall blocking connections.

**Solutions**:

1. **Check if server is behind NAT**:
   - Ensure port forwarding is configured on your router
   - Forward ports 80 and 443 to your server's local IP

2. **Verify no IP blocking**:
   - Check if your hosting provider blocks incoming HTTP/HTTPS
   - Some VPS providers require you to enable ports in their control panel

3. **Test basic HTTP connectivity**:
   ```bash
   # From external machine
   telnet your-domain.com 80
   nc -zv your-domain.com 80
   ```

### Issue 5: "Invalid domain format"

**Cause**: Domain name doesn't meet requirements.

**Solutions**:

1. **Use proper domain format**:
   - Valid: `example.com`, `sub.example.com`, `app.my-domain.com`
   - Invalid: `localhost`, `192.168.1.1`, `example`, `example.local`

2. **Domain must be public**:
   - Cannot be private/internal domain (`.local`, `.internal`, etc.)
   - Must be a publicly registered domain

### Issue 6: Challenge files not accessible

**Cause**: File permissions or volume mounting issues.

**Solutions**:

1. **Check SSL directory permissions**:
   ```bash
   cd /opt/fireisp
   ls -la ssl/
   ls -la ssl/.well-known/
   ls -la ssl/.well-known/acme-challenge/
   ```

2. **Verify volume mounts in docker-compose**:
   ```bash
   docker-compose config | grep -A 5 "volumes"
   ```

3. **Recreate containers with proper mounts**:
   ```bash
   cd /opt/fireisp
   docker-compose down
   docker-compose up -d
   ```

## Debugging Steps

### Step 1: Enable Detailed Logging

1. **View backend logs in real-time**:
   ```bash
   cd /opt/fireisp
   docker-compose logs -f backend
   ```

2. **View nginx logs**:
   ```bash
   docker-compose logs -f frontend
   
   # Or access logs inside container
   docker-compose exec frontend tail -f /var/log/nginx/access.log
   docker-compose exec frontend tail -f /var/log/nginx/error.log
   docker-compose exec frontend tail -f /var/log/nginx/acme-challenge.log
   ```

### Step 2: Test Let's Encrypt Flow Manually

1. **Create test challenge file**:
   ```bash
   cd /opt/fireisp
   mkdir -p ssl/.well-known/acme-challenge
   echo "test-content" > ssl/.well-known/acme-challenge/test-token
   chmod 644 ssl/.well-known/acme-challenge/test-token
   ```

2. **Test from inside nginx container**:
   ```bash
   docker-compose exec frontend cat /etc/nginx/ssl/.well-known/acme-challenge/test-token
   docker-compose exec frontend wget -O- http://localhost/.well-known/acme-challenge/test-token
   ```

3. **Test from your server**:
   ```bash
   curl http://localhost/.well-known/acme-challenge/test-token
   curl http://your-domain.com/.well-known/acme-challenge/test-token
   ```

4. **Test from external source**:
   - Use online tool: https://reqbin.com/
   - Or from another machine: `curl http://your-domain.com/.well-known/acme-challenge/test-token`

### Step 3: Use Staging Environment

Always test with staging first to avoid rate limits:

```bash
cd /opt/fireisp
echo "LETSENCRYPT_STAGING=true" >> .env
docker-compose restart backend

# Run setup wizard and attempt Let's Encrypt
# If successful, remove staging and try production:

sed -i '/LETSENCRYPT_STAGING/d' .env
docker-compose restart backend
```

## Manual Certificate Installation (Fallback)

If Let's Encrypt continues to fail, you can manually obtain and install certificates:

### Option 1: Using Certbot

```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Stop FireISP temporarily
cd /opt/fireisp
docker-compose stop

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to FireISP
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/fireisp/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/fireisp/ssl/key.pem
sudo chown -R $USER:$USER /opt/fireisp/ssl/

# Restart FireISP
docker-compose start
```

### Option 2: Upload Custom Certificate

1. Obtain certificate from your provider
2. In setup wizard, select "Manual (Upload Certificate)"
3. Upload your certificate and private key files

## Additional Resources

- **Let's Encrypt Documentation**: https://letsencrypt.org/docs/
- **Challenge Types**: https://letsencrypt.org/docs/challenge-types/
- **Rate Limits**: https://letsencrypt.org/docs/rate-limits/
- **Test Port Accessibility**: https://www.canyouseeme.org/
- **Check DNS Propagation**: https://dnschecker.org/

## Getting Help

If you've tried all solutions and still can't configure Let's Encrypt:

1. **Collect diagnostic information**:
   ```bash
   cd /opt/fireisp
   
   # System info
   uname -a
   docker --version
   docker-compose --version
   
   # Network info
   curl ifconfig.me
   
   # DNS info
   nslookup your-domain.com
   
   # Logs
   docker-compose logs backend | tail -100 > backend-logs.txt
   docker-compose logs frontend | tail -100 > frontend-logs.txt
   
   # Firewall status
   sudo ufw status > firewall-status.txt
   ```

2. **Create GitHub issue** with:
   - Description of your setup (OS, Docker version, domain registrar)
   - Steps you've taken
   - Error messages from logs
   - Diagnostic information collected above

3. **Post in discussions**: https://github.com/vothalvino/fireisp2.0/discussions

## Prevention Tips

- **Always use staging first** when testing
- **Verify DNS before attempting** certificate acquisition
- **Check firewall rules** before starting setup
- **Keep logs** for troubleshooting
- **Document your setup** for future reference
