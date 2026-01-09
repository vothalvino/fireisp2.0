# Testing Guide for Certbot Integration

## Prerequisites for Testing

### Environment Setup
1. Ubuntu server with Docker and Docker Compose
2. FireISP 2.0 repository cloned
3. Valid domain name pointing to server
4. Ports 80 and 443 accessible from internet
5. DNS properly configured and propagated

### Build Updated Containers
```bash
cd /home/runner/work/fireisp2.0/fireisp2.0
docker compose build --no-cache frontend backend
docker compose up -d
```

## Test Plan

### Test 1: Certbot Availability Check

**Objective**: Verify certbot is installed and detectable

**Steps**:
1. Access Settings page after login
2. Navigate to SSL Configuration section
3. Check for certbot status indicator

**Expected Result**:
- Status box shows "✓ Available" with version number
- Nginx plugin status shows "✓"
- Option "Certbot (nginx plugin)" is selectable

**API Test**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/settings/ssl/certbot-check
```

**Expected Response**:
```json
{
  "available": true,
  "version": "certbot 2.x.x",
  "nginxPlugin": true
}
```

### Test 2: Setup Wizard Integration

**Objective**: Verify certbot option appears during setup

**Steps**:
1. Reset setup: `UPDATE system_settings SET value = 'false' WHERE key = 'setup_completed'`
2. Access setup wizard
3. Complete Step 1 (Root User)
4. Reach Step 2 (SSL Configuration)
5. Enable SSL checkbox
6. Check SSL Method dropdown

**Expected Result**:
- Dropdown shows three options:
  - Let's Encrypt (acme-client)
  - Certbot (nginx plugin)
  - Manual Certificate Upload
- Certbot option is enabled (not disabled)
- Help text explains certbot method

### Test 3: Certificate Acquisition (Dry Run)

**Objective**: Test certbot execution without actually obtaining certificate

**Setup**:
```bash
# Modify code temporarily to add dry-run flag
# Or test with staging environment
export LETSENCRYPT_STAGING=true
```

**Steps**:
1. Navigate to Settings → SSL Configuration
2. Enable SSL checkbox
3. Select "Certbot (nginx plugin)"
4. Enter valid domain (e.g., test.example.com)
5. Enter valid email
6. Click "Configure with Certbot"
7. Confirm dialog

**Expected Result**:
- Backend logs show certbot execution
- No errors in docker logs
- Success message displayed
- Database updated with ssl_method='certbot'

**Verify**:
```bash
docker compose logs backend | grep -i certbot
docker compose logs frontend | grep -i certbot
```

### Test 4: Certificate Acquisition (Production)

**Objective**: Obtain real SSL certificate

**Prerequisites**:
- Valid domain pointing to server
- DNS fully propagated
- Ports 80 and 443 accessible
- No rate limit issues

**Steps**:
1. Navigate to Settings → SSL Configuration
2. Enable SSL and select Certbot
3. Enter production domain
4. Enter contact email
5. Click "Configure with Certbot"
6. Wait 1-2 minutes

**Expected Result**:
- Certificate acquired successfully
- Nginx automatically configured
- HTTPS accessible at https://your-domain.com
- Certificate stored in /etc/letsencrypt/

**Verify Certificate**:
```bash
# Check certificate
docker exec fireisp-frontend certbot certificates

# Test HTTPS
curl -I https://your-domain.com

# Verify nginx config
docker exec fireisp-frontend nginx -t
```

### Test 5: Error Handling - Invalid Domain

**Objective**: Verify proper error handling

**Steps**:
1. Navigate to Settings → SSL Configuration
2. Select Certbot method
3. Enter invalid domain (e.g., "localhost" or "192.168.1.1")
4. Click Configure

**Expected Result**:
- Error message: "Invalid domain format"
- No backend execution
- User can retry with correct domain

### Test 6: Error Handling - DNS Issues

**Objective**: Test DNS failure scenario

**Steps**:
1. Use domain that doesn't point to server
2. Attempt certificate acquisition

**Expected Result**:
- Descriptive error message about DNS
- Troubleshooting steps displayed:
  - Verify DNS A record
  - Wait for propagation
  - Test with nslookup
  - Check dnschecker.org

### Test 7: Error Handling - Port Not Open

**Objective**: Test challenge validation failure

**Setup**:
```bash
# Block port 80
sudo ufw deny 80/tcp
```

**Steps**:
1. Attempt certificate acquisition

**Expected Result**:
- Error about challenge validation
- Troubleshooting steps about ports
- Instructions to open ports 80 and 443

**Cleanup**:
```bash
sudo ufw allow 80/tcp
```

### Test 8: Certificate Renewal

**Objective**: Verify renewal functionality

**Prerequisites**:
- Existing certificate installed

**API Test**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/settings/ssl/certbot-renew
```

**Expected Result**:
- Renewal executes successfully
- Returns status and output
- Certificate validity extended

**Verify**:
```bash
docker exec fireisp-frontend certbot certificates
```

### Test 9: Setup Wizard with Certbot

**Objective**: Complete full setup with certbot

**Steps**:
1. Fresh installation or reset setup
2. Create root user (Step 1)
3. Enable SSL in Step 2
4. Select Certbot method
5. Enter valid domain and email
6. Complete setup

**Expected Result**:
- Certificate acquired during setup
- Setup completes successfully
- System immediately has HTTPS
- Can access via https://domain.com

### Test 10: Container Name Configuration

**Objective**: Verify environment variable works

**Setup**:
```bash
# Add to .env or docker-compose.yml
FRONTEND_CONTAINER_NAME=custom-frontend-name
```

**Steps**:
1. Update container name in docker-compose.yml
2. Restart containers
3. Attempt certbot configuration

**Expected Result**:
- Backend correctly identifies custom container name
- Certbot executes in correct container
- No hardcoded container name issues

### Test 11: Timeout Configuration

**Objective**: Verify timeout is configurable

**Setup**:
```bash
# Add to .env
CERTBOT_TIMEOUT_MS=60000
```

**Steps**:
1. Start containers with timeout set
2. Monitor long-running certbot operation

**Expected Result**:
- Timeout applied as configured
- Operations respect timeout value

### Test 12: Multiple Domains

**Objective**: Verify support for adding multiple domains

**Steps**:
1. Acquire certificate for first domain via UI
2. Run docker exec for additional domains:
```bash
docker exec fireisp-frontend certbot --nginx \
  -d domain2.com -d www.domain2.com \
  --non-interactive --agree-tos --email admin@example.com
```

**Expected Result**:
- Multiple certificates managed
- Each domain configured in nginx
- All domains accessible via HTTPS

## Integration Tests

### Test I1: Frontend-Backend Communication

**Verify**:
1. API endpoints respond correctly
2. Frontend handles success responses
3. Frontend displays error messages
4. Loading states work properly

### Test I2: Database Updates

**Verify**:
```sql
SELECT * FROM system_settings WHERE key IN (
  'ssl_enabled',
  'ssl_method',
  'letsencrypt_domain',
  'letsencrypt_email'
);
```

**Expected**:
- ssl_enabled = 'true'
- ssl_method = 'certbot'
- letsencrypt_domain = entered domain
- letsencrypt_email = entered email

### Test I3: Container Communication

**Verify**:
```bash
# Backend can execute in frontend
docker exec fireisp-backend docker exec fireisp-frontend echo "test"

# Backend has docker CLI
docker exec fireisp-backend which docker

# Backend has socket access
docker exec fireisp-backend ls -la /var/run/docker.sock
```

## Regression Tests

### R1: Existing acme-client Method Still Works

**Steps**:
1. Select "Let's Encrypt (acme-client)"
2. Configure SSL

**Expected**: Works as before

### R2: Manual Upload Still Works

**Steps**:
1. Select "Manual Certificate Upload"
2. Upload certificate and key

**Expected**: Works as before

### R3: Skip SSL Option Still Works

**Steps**:
1. Leave SSL unchecked during setup

**Expected**: Setup completes without SSL

## Performance Tests

### P1: Response Time

**Test**: Measure API response times
- certbot-check: < 2 seconds
- certbot configure: < 120 seconds
- certbot-renew: < 60 seconds

### P2: Container Resource Usage

**Monitor**:
```bash
docker stats fireisp-frontend fireisp-backend
```

**Expected**: No significant memory leaks or CPU spikes

## Security Tests

### S1: Input Validation

**Test**: Inject special characters in domain/email
- SQL injection attempts
- Command injection attempts
- XSS attempts

**Expected**: All rejected with proper errors

### S2: Authentication

**Test**: Access endpoints without token
```bash
curl http://localhost:3000/api/settings/ssl/certbot-check
```

**Expected**: 401 Unauthorized

### S3: Container Isolation

**Verify**:
- Backend can only execute in frontend container
- No access to host system
- No access to other containers

## Documentation Tests

### D1: README Accuracy

**Verify**:
- All documented features work
- Commands execute successfully
- Links are valid

### D2: CERTBOT_GUIDE Accuracy

**Verify**:
- Step-by-step instructions work
- Troubleshooting steps are helpful
- Examples are correct

## Known Limitations

1. Requires Docker socket access (security consideration)
2. Frontend container must be running
3. Initial setup requires container rebuild
4. Certbot not available on Windows containers
5. Rate limits from Let's Encrypt (5 per week per domain)

## Rollback Procedure

If issues occur:

```bash
# Revert to previous version
git revert HEAD~4..HEAD

# Rebuild containers
docker compose build --no-cache
docker compose up -d

# Or switch SSL method
# Use Settings page to select different method
```

## Success Criteria

Implementation is successful when:

- ✅ Certbot available check works
- ✅ Certificate acquisition succeeds
- ✅ Nginx automatically configured
- ✅ HTTPS accessible
- ✅ Both Setup Wizard and Settings work
- ✅ Error messages are helpful
- ✅ Documentation is clear
- ✅ No regression in existing features
- ✅ Security validated
- ✅ Performance acceptable

## Reporting Issues

When reporting test failures, include:

1. Test name and number
2. Steps performed
3. Expected vs actual result
4. Backend logs: `docker compose logs backend`
5. Frontend logs: `docker compose logs frontend`
6. Certbot output: `docker exec fireisp-frontend certbot --version`
7. Environment details: OS, Docker version, domain setup

## Test Completion Checklist

- [ ] All functional tests passed
- [ ] Integration tests passed
- [ ] Regression tests passed
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Documentation accurate
- [ ] Known limitations documented
- [ ] Rollback procedure tested
