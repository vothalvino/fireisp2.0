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
- 🎨 **Modern Web UI** - React-based responsive interface
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
   - Configure SSL (optional)
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

# Ports
HTTP_PORT=80
HTTPS_PORT=443
```

### SSL Configuration

SSL can be configured in two ways:

1. **During Setup Wizard** (Recommended)
   - Upload certificate and private key through the web interface

2. **Manual Configuration**
   - Place certificate files in `./ssl/` directory:
     - `cert.pem` - SSL certificate
     - `key.pem` - Private key
   - Restart containers: `docker-compose restart`

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

## Database Structure

The system includes organized tables for:

- **Users** - System administrators
- **Clients** - Customer database
- **Service Types** - Internet, IPTV, VoIP, etc.
- **Service Plans** - Speed and pricing plans
- **Client Services** - Active service subscriptions
- **RADIUS Tables** - Authentication and accounting
- **NAS** - Network Access Servers (Mikrotik routers)
- **Invoices & Payments** - Billing system

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

### Update Application
```bash
cd /opt/fireisp
git pull
docker-compose build
docker-compose up -d
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U fireisp fireisp > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U fireisp fireisp
```

## Troubleshooting

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
