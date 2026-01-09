# FireISP 2.0

Modern ISP Management System with Docker containerization, CRM functionality, multi-service support per client, and integrated FreeRADIUS server for Mikrotik compatibility.

## Features

- 🐳 **Docker Containerized** - Easy deployment with Docker Compose
- 🚀 **Easy Installation** - One-command installation script for Ubuntu 24.04
- 🗄️ **PostgreSQL Database** - Organized and scalable database structure
- 🔐 **Setup Wizard** - Initial configuration with root user creation and optional SSL setup
- 💼 **CRM System** - Complete customer relationship management
- 📦 **Multi-Service Support** - Manage multiple services per client (Internet, IPTV, VoIP, etc.)
- 🔌 **FreeRADIUS Integration** - Built-in RADIUS server with Mikrotik support
- 🎨 **Modern Web UI** - React-based responsive interface with full GUI coverage
- 💰 **Invoice Management** - Complete billing and payment tracking system
- 👥 **Multi-User Support** - User management with role-based access control
- ⚙️ **System Settings** - Web-based configuration for all system parameters
- 🔒 **Secure** - JWT authentication, optional SSL/HTTPS support

## Architecture

- **Backend**: Node.js with Express
- **Frontend**: React with Vite
- **Database**: PostgreSQL 16
- **RADIUS**: FreeRADIUS Server
- **Web Server**: Nginx
- **Containerization**: Docker & Docker Compose

## Quick Installation (Ubuntu 24.04)

### Prerequisites
- Ubuntu 24.04 Server
- Root or sudo access
- Minimum 2GB RAM
- 20GB disk space

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0
```

2. Run the installation script:
```bash
sudo bash install.sh
```

The script will:
- Install Docker and Docker Compose
- Set up the application in `/opt/fireisp`
- Generate secure passwords
- Build and start all containers
- Display the access URL

3. Access the application:
```
http://your-server-ip
```

4. Complete the setup wizard:
   - Create root user account
   - Configure SSL (optional):
     - **Let's Encrypt** (Recommended): Automatic free SSL certificate
     - **Manual Upload**: Use your own SSL certificate
   - Enter company information

## Manual Installation

If you prefer manual installation:

1. Install Docker and Docker Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin
```

2. Clone and configure:
```bash
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0
cp .env.example .env
```

3. Edit `.env` file with secure passwords:
```bash
nano .env
```

4. Create required directories:
```bash
mkdir -p uploads ssl database/init radius
```

5. Build and start:
```bash
docker-compose up -d
```

## Configuration

### Environment Variables

Edit `.env` file to configure:

```env
# Database
DB_PASSWORD=your_secure_password

# RADIUS
RADIUS_SECRET=your_radius_secret

# Application
JWT_SECRET=your_jwt_secret

# Let's Encrypt (optional)
LETSENCRYPT_STAGING=false  # Set to true for testing to avoid rate limits

# Ports
HTTP_PORT=80
HTTPS_PORT=443
```

### SSL Configuration

SSL can be configured in three ways:

1. **During Setup Wizard - Let's Encrypt** (Recommended)
   - Automatically obtains a free SSL certificate from Let's Encrypt
   - Requires a valid domain name pointing to your server
   - Provide domain name and email address in the setup wizard
   - Certificate is automatically validated and configured
   - For testing: Set `LETSENCRYPT_STAGING=true` in `.env` to use staging environment and avoid rate limits

2. **During Setup Wizard - Manual Upload**
   - Upload your own certificate and private key through the web interface
   - Useful if you already have a commercial SSL certificate

3. **Manual Configuration**
   - Place certificate files in `./ssl/` directory:
     - `cert.pem` - SSL certificate
     - `key.pem` - Private key
   - Restart containers: `docker-compose restart`

**Let's Encrypt Requirements:**
- Domain name must be publicly accessible and point to your server's IP
- Port 80 must be open for HTTP-01 challenge validation
- Valid email address for certificate expiration notifications

## Mikrotik Integration

### Configure RADIUS on Mikrotik

1. Go to **RADIUS** menu in Mikrotik
2. Add new RADIUS server:
   - **Service**: hotspot, ppp (as needed)
   - **Address**: Your FireISP server IP
   - **Secret**: Same as RADIUS_SECRET in .env
   - **Authentication Port**: 1812
   - **Accounting Port**: 1813

3. Test connection from Mikrotik:
```
/radius incoming print
```

### Add NAS Device in FireISP

1. Login to FireISP web interface
2. Go to **RADIUS** section
3. Click **Add NAS**
4. Enter Mikrotik details:
   - **NAS Name**: Mikrotik router IP
   - **Short Name**: Friendly name
   - **Type**: mikrotik
   - **Secret**: Same as configured in Mikrotik
   - **Description**: Location or purpose

## Usage

### Managing Clients

1. Navigate to **Clients** section
2. Click **Add Client**
3. Fill in client information:
   - Client code (unique identifier)
   - Company name
   - Contact person
   - Contact details
   - Address information

### Managing Services

1. Go to **Services** section
2. View or create **Service Plans**:
   - Plan name
   - Service type (Internet, IPTV, VoIP, etc.)
   - Speed limits
   - Pricing

3. Assign services to clients:
   - Select client
   - Choose service plan
   - Set username/password for RADIUS
   - Configure IP address (optional)
   - Set activation and expiration dates

### Monitoring RADIUS

1. Go to **RADIUS** section
2. View:
   - Active sessions
   - NAS devices
   - User statistics
   - Bandwidth usage

### Managing Invoices

1. Navigate to **Invoices** section
2. Click **Create Invoice**
3. Fill in invoice details:
   - Invoice number
   - Select client
   - Issue and due dates
   - Add line items (services)
4. System automatically calculates:
   - Subtotal
   - Tax (10%)
   - Total amount
5. Record payments:
   - Click on invoice
   - Add payment with amount and method
   - Invoice status auto-updates when fully paid

### Managing Users

1. Go to **Users** section
2. Click **Add User**
3. Create user account:
   - Username and email
   - Password
   - Role (User or Admin)
4. Manage existing users:
   - Edit user details
   - Change passwords
   - Activate/deactivate accounts
   - Delete users

### System Settings

1. Navigate to **Settings** section
2. Configure:
   - Company information
   - SSL/HTTPS settings
   - RADIUS configuration
   - Email settings (SMTP)
   - Application preferences
3. Click **Save Settings** to apply changes

## Database Structure

The system includes organized tables for:

- **Users** - System administrators with role-based access
- **Clients** - Customer database with full contact information
- **Service Types** - Internet, IPTV, VoIP, Hosting, etc.
- **Service Plans** - Speed and pricing plans per service type
- **Client Services** - Active service subscriptions (many per client)
- **RADIUS Tables** - Authentication (radcheck, radreply) and accounting (radacct)
- **NAS** - Network Access Servers (Mikrotik routers)
- **Invoices** - Invoice headers with client and dates
- **Invoice Items** - Line items for each invoice
- **Payments** - Payment records linked to invoices
- **System Settings** - Key-value configuration store

**Total:** 13+ tables with full web GUI access for all operations.

## Management Commands

### View Logs
```bash
cd /opt/fireisp
docker-compose logs -f
```

### Restart Services
```bash
docker-compose restart
```

### Stop Services
```bash
docker-compose stop
```

### Start Services
```bash
docker-compose start
```

## Updating FireISP

FireISP provides an automated update system for easy upgrades.

### Quick Update (Recommended)

For the easiest update experience:

```bash
cd /opt/fireisp
sudo ./update.sh
```

The update script will:
- Check for available updates
- Create an automatic backup
- Apply database migrations
- Rebuild containers
- Restart services
- Verify the update

### Check for Updates

```bash
cd /opt/fireisp
./fireisp update --check
```

### Manual Update

If you prefer to update manually:

```bash
cd /opt/fireisp
./fireisp backup          # Create backup first
git pull                  # Pull latest changes
docker-compose build      # Rebuild containers
docker-compose up -d      # Restart services
```

### Rollback

If something goes wrong:

```bash
cd /opt/fireisp
sudo ./update.sh --rollback
```

**For detailed update instructions, troubleshooting, and version-specific notes, see [UPDATE.md](UPDATE.md)**

### Check Your Version

```bash
cat /opt/fireisp/VERSION
# or
./fireisp version
```

## Backup and Restore

### Backup Database
```bash
cd /opt/fireisp
./fireisp backup
# Backup saved to: backups/backup_YYYYMMDD_HHMMSS.sql
```

### Restore from Backup
```bash
cd /opt/fireisp
./fireisp restore backups/backup_YYYYMMDD_HHMMSS.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U fireisp fireisp
```

## Documentation

- **[UPDATE.md](UPDATE.md)** - Comprehensive update guide with troubleshooting
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide
- **[MIKROTIK.md](MIKROTIK.md)** - Mikrotik integration guide
- **[LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md)** - Let's Encrypt troubleshooting and debugging
- **[LETSENCRYPT_TESTING.md](LETSENCRYPT_TESTING.md)** - Let's Encrypt integration testing guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[RELEASE_PROCESS.md](RELEASE_PROCESS.md)** - For maintainers: release procedures

## Troubleshooting

### Let's Encrypt SSL Certificate Issues

If you're having trouble configuring Let's Encrypt SSL certificates, see the comprehensive **[LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md)** guide which covers:

- Prerequisites checklist (domain, DNS, ports, firewall)
- Common error messages and solutions
- Step-by-step debugging procedures
- Manual certificate installation fallback options
- Testing and validation tools

**Quick checklist before attempting Let's Encrypt:**
- [ ] Domain is registered and DNS A record points to server's public IP
- [ ] Port 80 is open and accessible from the internet
- [ ] Port 443 is open for HTTPS traffic
- [ ] No firewall blocking incoming connections
- [ ] DNS has propagated (wait 5-60 minutes after changes)

For detailed troubleshooting steps, see [LETSENCRYPT_TROUBLESHOOTING.md](LETSENCRYPT_TROUBLESHOOTING.md).

### GUI Shows "Connection Refused" Error

If you see an error message like "La página ha rechazado la conexión" (connection refused) when trying to access the GUI:

1. **Check if all containers are running:**
   ```bash
   cd /opt/fireisp
   docker-compose ps
   ```
   All containers should show "Up" status.

2. **Restart the containers:**
   ```bash
   docker-compose restart
   ```

3. **Check backend logs for errors:**
   ```bash
   docker-compose logs backend
   ```

4. **Verify the nginx proxy configuration is correct:**
   The nginx configuration should proxy `/api/` requests to `http://backend:3000/` (not `http://backend:3000/api/`).

5. **Clear browser cache:**
   Sometimes browser cache can cause connection issues. Clear your browser cache and try again.

### Check Container Status
```bash
docker-compose ps
```

### View Specific Container Logs
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs radius
docker-compose logs postgres
```

### Restart Single Container
```bash
docker-compose restart backend
```

### Access Database
```bash
docker-compose exec postgres psql -U fireisp
```

### Test RADIUS Server
```bash
docker-compose exec radius radtest username password localhost 0 testing123
```

## Port Configuration

Default ports:
- **HTTP**: 80
- **HTTPS**: 443
- **RADIUS Auth**: 1812/UDP
- **RADIUS Acct**: 1813/UDP

To change ports, edit `.env` file and restart containers.

## Security Notes

1. Change all default passwords in `.env`
2. Use strong passwords for root user
3. Enable SSL for production
4. Keep RADIUS_SECRET secure
5. Regularly backup database
6. Keep system updated

## Support

For issues and support:
- GitHub Issues: https://github.com/vothalvino/fireisp2.0/issues
- Documentation: Check this README

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
