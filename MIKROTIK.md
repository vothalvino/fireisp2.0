# Mikrotik Integration Guide for FireISP 2.0

This guide shows how to integrate Mikrotik RouterOS with FireISP 2.0 RADIUS server.

## Prerequisites

- FireISP 2.0 installed and running
- Mikrotik RouterOS device (any version 6.x or 7.x)
- Network connectivity between Mikrotik and FireISP server
- RADIUS ports (1812, 1813 UDP) open in firewall

## Step 1: Configure RADIUS in Mikrotik

### Using Winbox/WebFig

1. Go to **RADIUS** menu
2. Click **Add (+)**
3. Configure:
   - **Service**: Select services to authenticate (hotspot, ppp, dhcp, etc.)
   - **Address**: IP address of FireISP server
   - **Secret**: Your RADIUS_SECRET (from FireISP .env file)
   - **Authentication Port**: 1812
   - **Accounting**: ✓ (checked)
   - **Accounting Port**: 1813
4. Click **OK**

### Using Terminal

```bash
/radius add \
  service=ppp \
  address=YOUR_FIREISP_IP \
  secret=YOUR_RADIUS_SECRET \
  authentication-port=1812 \
  accounting-port=1813
```

## Step 2: Configure PPP Profile (for PPPoE/PPTP/L2TP)

### Using Winbox/WebFig

1. Go to **PPP** → **Profiles**
2. Select or create a profile
3. Configure:
   - **Use RADIUS**: ✓ Yes
   - **Use RADIUS Accounting**: ✓ Yes

### Using Terminal

```bash
/ppp profile set default \
  use-radius=yes
```

Or create a new profile:

```bash
/ppp profile add \
  name=fireisp-profile \
  use-radius=yes \
  local-address=10.0.0.1 \
  remote-address=10.0.0.2-10.0.0.254
```

## Step 3: Configure Hotspot (Optional)

If using Mikrotik Hotspot:

```bash
/ip hotspot profile set default \
  use-radius=yes

/ip hotspot user profile set default \
  use-radius=yes
```

## Step 4: Add NAS in FireISP

1. Login to FireISP web interface
2. Go to **RADIUS** section
3. Click **Add NAS**
4. Fill in details:
   - **NAS Name**: Mikrotik IP address (e.g., 192.168.1.1)
   - **Short Name**: Friendly name (e.g., Main-Gateway)
   - **Type**: mikrotik
   - **Secret**: Same as configured in Mikrotik
   - **Description**: Location or purpose
5. Click **Save**

## Step 5: Create Test User

In FireISP:

1. Go to **Clients** → Add a test client
2. Go to **Services** → Assign a service
   - Username: testuser
   - Password: testpass123
   - Select appropriate plan

## Step 6: Test Connection

### Method 1: Mikrotik Terminal

```bash
/radius incoming print
```

You should see incoming RADIUS requests.

### Method 2: Create PPP User

In Mikrotik:
```bash
/ppp secret add \
  name=testuser \
  password=testpass123 \
  profile=default
```

Try connecting with a PPPoE client.

### Method 3: Test from Linux

```bash
radtest testuser testpass123 YOUR_FIREISP_IP 0 YOUR_RADIUS_SECRET
```

## Troubleshooting

### 1. Authentication Fails

**Check RADIUS configuration:**
```bash
/radius print detail
```

**Check RADIUS incoming:**
```bash
/radius incoming monitor
```

**Common issues:**
- Wrong IP address
- Incorrect secret
- Firewall blocking UDP ports 1812, 1813
- User doesn't exist in FireISP

### 2. Users Can Connect but No Accounting

**Verify accounting is enabled:**
```bash
/radius print
```

Look for `accounting=yes`

**Enable if needed:**
```bash
/radius set 0 accounting=yes
```

### 3. Check Mikrotik Logs

```bash
/log print where topics~"radius"
```

### 4. Check FireISP RADIUS Logs

```bash
docker-compose logs radius
```

## Advanced Configuration

### Speed Limiting via RADIUS

FireISP automatically sends speed limits to Mikrotik. Configure in service plan:
- Download Speed: 100M
- Upload Speed: 50M

Mikrotik will receive these as RADIUS attributes.

### Custom RADIUS Attributes

For advanced configurations, you can add custom attributes in FireISP database:

```sql
INSERT INTO radreply (username, attribute, op, value)
VALUES ('testuser', 'Mikrotik-Rate-Limit', '=', '100M/50M');
```

### Multiple NAS Devices

You can add multiple Mikrotik routers:

1. Each router gets its own NAS entry in FireISP
2. Use same or different secrets
3. All routers can authenticate against same user database

### Hotspot with MAC Authentication

```bash
/ip hotspot user profile set default \
  use-radius=yes \
  mac-auth=yes
```

Then add MAC addresses to FireISP as usernames.

## PPPoE Example Configuration

Complete PPPoE setup on Mikrotik:

```bash
# Create PPPoE server
/interface pppoe-server server
add service-name=fireisp interface=ether2 disabled=no

# Create IP pool
/ip pool add name=pppoe-pool ranges=10.0.0.2-10.0.0.254

# Configure profile
/ppp profile add \
  name=fireisp-pppoe \
  use-radius=yes \
  local-address=10.0.0.1 \
  remote-address=pppoe-pool

# Configure RADIUS
/radius add \
  service=ppp \
  address=YOUR_FIREISP_IP \
  secret=YOUR_RADIUS_SECRET

# PPPoE server settings
/interface pppoe-server server set \
  default-profile=fireisp-pppoe
```

## Security Best Practices

1. **Use strong RADIUS secret**
   - Minimum 20 characters
   - Mix of letters, numbers, symbols

2. **Restrict RADIUS access**
   ```bash
   /ip firewall filter add \
     chain=input \
     protocol=udp \
     port=1812-1813 \
     src-address=!YOUR_FIREISP_IP \
     action=drop
   ```

3. **Monitor failed attempts**
   ```bash
   /log print where message~"authentication failed"
   ```

4. **Regular backups**
   ```bash
   /system backup save name=backup-$(date +%Y%m%d)
   ```

## Monitoring

### View Active Sessions in Mikrotik

```bash
/ppp active print
```

### View Active Sessions in FireISP

Go to **RADIUS** → **Active Sessions**

### View User Statistics

In FireISP:
1. Go to **RADIUS** → **Sessions**
2. Search for specific username
3. View bandwidth usage history

## Support

For issues:
- Check Mikrotik logs: `/log print`
- Check FireISP RADIUS logs: `docker-compose logs radius`
- Verify network connectivity: `ping YOUR_FIREISP_IP`
- Test RADIUS: `radtest` command

## References

- Mikrotik RADIUS: https://wiki.mikrotik.com/wiki/Manual:RADIUS
- FireISP Documentation: README.md
- FreeRADIUS: https://freeradius.org/

---

**Happy networking! 🚀**
