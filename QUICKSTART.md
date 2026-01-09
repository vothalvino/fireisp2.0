# FireISP 2.0 - Quick Start Guide

## Installation (5 minutes)

### Option 1: Automated Installation (Recommended)

```bash
# Clone repository
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0

# Run installation script
sudo bash install.sh
```

### Option 2: Manual Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone and start
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0
cp .env.example .env
nano .env  # Edit with secure passwords
docker-compose up -d
```

## First Time Setup

1. **Access the application**
   ```
   http://your-server-ip
   ```

2. **Setup Wizard** (appears on first visit)
   - **Step 1**: Create root user
     - Username: admin
     - Email: your@email.com
     - Password: (min 8 characters)
   
   - **Step 2**: SSL Configuration (optional)
     - Skip for HTTP-only setup
     - **Let's Encrypt** (Recommended): Free automatic SSL
       - Requires: Domain name, DNS configured, port 80 open
       - See [LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md) if issues occur
     - **Manual**: Upload your own certificate and key
   
   - **Step 3**: Company Information
     - Company name
     - Contact details

3. **Login**
   - Use the credentials you created in Step 1

## Basic Workflow

### 1. Add a Client
```
Clients → Add Client
- Client Code: CLI001
- Company Name: Example Corp
- Contact Person: John Doe
- Email & Phone
- Address
```

### 2. Create Service Plans
```
Services → Service Plans → Add Plan
- Plan Name: 100Mbps Internet
- Type: Internet
- Download: 100 Mbps
- Upload: 50 Mbps
- Price: $50.00
- Billing: Monthly
```

### 3. Assign Service to Client
```
Services → Add Service
- Select Client
- Select Plan
- Username: cli001_user
- Password: secure_pass
- IP Address (optional)
- Set dates
```

### 4. Configure Mikrotik

In Mikrotik RouterOS:
```
/radius add service=ppp address=YOUR_FIREISP_IP secret=YOUR_RADIUS_SECRET
/ppp profile set default use-radius=yes
```

In FireISP:
```
RADIUS → Add NAS
- NAS Name: 192.168.1.1 (Mikrotik IP)
- Short Name: Main Router
- Type: mikrotik
- Secret: YOUR_RADIUS_SECRET
```

## Common Tasks

### View Active Sessions
```
Dashboard or RADIUS → Active Sessions
```

### Check User Bandwidth
```
RADIUS → Select username → View accounting data
```

### Backup Database
```bash
cd /opt/fireisp
./fireisp backup
# Backup saved to: backups/backup_YYYYMMDD_HHMMSS.sql
```

### Update FireISP
```bash
cd /opt/fireisp
sudo ./update.sh
```

**IMPORTANT**: After updating, always rebuild the Docker containers to ensure all dependencies are current:
```bash
cd /opt/fireisp
docker-compose build --no-cache
docker-compose up -d
```

For detailed update instructions, see [UPDATE.md](UPDATE.md)

### Check Version
```bash
cd /opt/fireisp
./fireisp version
```

### View Logs
```bash
cd /opt/fireisp
docker-compose logs -f backend
```

## Testing RADIUS

### From Mikrotik
```
/radius incoming print
```

### From Command Line
```bash
radtest username password YOUR_FIREISP_IP 0 YOUR_RADIUS_SECRET
```

## Troubleshooting

### Let's Encrypt SSL Issues?

**First, ensure Docker containers are built with latest dependencies:**
```bash
cd /opt/fireisp
docker-compose build --no-cache backend
docker-compose up -d
docker-compose logs backend | grep acme
```

See the comprehensive **[LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md)** guide.

Quick checks:
- Docker containers rebuilt with acme-client package
- Domain DNS A record points to server IP
- Port 80 is accessible from internet
- Firewall allows ports 80 and 443
- Use staging mode first: `echo "LETSENCRYPT_STAGING=true" >> /opt/fireisp/.env`

### Containers not starting?
```bash
docker-compose ps
docker-compose logs
```

### Can't login?
```bash
# Reset root password via database
docker-compose exec postgres psql -U fireisp
# Then run password reset queries
```

### RADIUS not working?
1. Check NAS configuration matches on both sides
2. Verify RADIUS_SECRET in .env
3. Check firewall: ports 1812, 1813 UDP must be open
4. View RADIUS logs: `docker-compose logs radius`

## Default Ports

- HTTP: 80
- HTTPS: 443
- RADIUS Auth: 1812/UDP
- RADIUS Acct: 1813/UDP

## Security Checklist

- [ ] Changed all passwords in .env
- [ ] Created strong root user password
- [ ] Configured SSL certificate
- [ ] Firewall configured
- [ ] Regular database backups scheduled
- [ ] RADIUS secret is complex

## Next Steps

1. Customize service types and plans
2. Import existing clients
3. Configure billing and invoicing
4. Set up monitoring and alerts
5. Train staff on the system

## Support

- Documentation: README.md
- Issues: https://github.com/vothalvino/fireisp2.0/issues

---

**Welcome to FireISP 2.0! 🚀**
