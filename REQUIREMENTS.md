# System Requirements

## Minimum Requirements

### Server Hardware
- **CPU**: 2 cores / 2 vCPU
- **RAM**: 2 GB
- **Storage**: 20 GB
- **Network**: 100 Mbps

### Software
- **OS**: Ubuntu 24.04 LTS (recommended)
  - Also compatible with: Ubuntu 22.04, Debian 11+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

## Recommended Requirements

### For Small ISP (< 100 clients)
- **CPU**: 4 cores / 4 vCPU
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Network**: 1 Gbps

### For Medium ISP (100-500 clients)
- **CPU**: 8 cores / 8 vCPU
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps
- **Database**: Consider separate PostgreSQL server

### For Large ISP (500+ clients)
- **CPU**: 16+ cores
- **RAM**: 16+ GB
- **Storage**: 200+ GB SSD (RAID recommended)
- **Network**: 10 Gbps
- **Architecture**: 
  - Separate database server
  - Load-balanced web servers
  - Dedicated RADIUS servers
  - Redis for caching

## Network Requirements

### Ports (must be open)
- **80/TCP**: HTTP (can redirect to HTTPS)
- **443/TCP**: HTTPS (optional, recommended)
- **1812/UDP**: RADIUS Authentication
- **1813/UDP**: RADIUS Accounting

### Firewall Rules
```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow RADIUS (from Mikrotik IPs only)
sudo ufw allow from MIKROTIK_IP to any port 1812 proto udp
sudo ufw allow from MIKROTIK_IP to any port 1813 proto udp

# Enable firewall
sudo ufw enable
```

## Browser Requirements

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Opera 76+

### Not Supported
- Internet Explorer (any version)
- Chrome < 90
- Firefox < 88

## Database Storage Estimates

### Per Client (average)
- Client record: ~2 KB
- Service records (3 services): ~6 KB
- RADIUS accounting (per month): ~500 KB
- **Total per client per month**: ~508 KB

### Estimates
- 100 clients: ~50 MB/month
- 500 clients: ~250 MB/month
- 1000 clients: ~500 MB/month

### Recommendations
- Keep 12 months of accounting data
- Archive older data
- Regular database maintenance

## Performance Benchmarks

### API Response Times (target)
- Authentication: < 100ms
- Client list: < 200ms
- Dashboard stats: < 300ms
- RADIUS auth: < 50ms

### Concurrent Users
- Minimum setup: 10 concurrent users
- Recommended setup: 50+ concurrent users
- Large setup: 100+ concurrent users

## Scaling Guidelines

### Vertical Scaling
Increase server resources:
1. Add more CPU cores
2. Increase RAM
3. Upgrade to faster SSD
4. Increase network bandwidth

### Horizontal Scaling
Multiple servers:
1. **Database Server**: Dedicated PostgreSQL
2. **RADIUS Servers**: Multiple for redundancy
3. **Web Servers**: Load balanced
4. **Cache Layer**: Redis/Memcached

### High Availability Setup
```
                    [Load Balancer]
                          |
         +----------------+----------------+
         |                |                |
    [Web Server 1]   [Web Server 2]   [Web Server 3]
         |                |                |
         +----------------+----------------+
                          |
                   [Database Master]
                          |
                   [Database Replica]
                          
    [RADIUS 1]      [RADIUS 2]      [RADIUS 3]
         |                |                |
         +----------------+----------------+
                          |
                   [Database Cluster]
```

## Backup Requirements

### Daily Backups
- Database: Full backup
- Uploads: Incremental
- Configuration: Full backup

### Storage Needs
- Keep 7 daily backups
- Keep 4 weekly backups
- Keep 12 monthly backups

### Backup Size Estimates
- Database: 100 MB per 1000 clients
- Configuration: < 1 MB
- Uploads: varies

## Security Requirements

### SSL Certificate
- Valid SSL certificate (Let's Encrypt or commercial)
- Auto-renewal setup
- Strong cipher suites

### Updates
- OS security updates: Weekly
- Docker images: Monthly
- Application updates: As released

### Monitoring
- Uptime monitoring
- Performance monitoring
- Security monitoring
- Log aggregation

## Compatibility

### Mikrotik RouterOS
- Version 6.40+
- Version 7.x (all versions)
- PPPoE server
- Hotspot
- RADIUS client support

### Database
- PostgreSQL 12+
- PostgreSQL 16 (recommended)

### Docker
- Docker Engine 20.10+
- Docker Compose 2.0+
- Docker Compose Plugin supported

## Development Requirements

### For Developers
- Node.js 20+
- npm 9+
- Git
- Text editor/IDE
- Docker Desktop (for testing)

### Development Machine
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 20 GB free
- **OS**: Linux, macOS, or Windows with WSL2

## Cloud Deployment

### Recommended Cloud Providers
- **AWS**: t3.medium or larger
- **DigitalOcean**: $12/month droplet or higher
- **Linode**: 4GB or higher
- **Google Cloud**: e2-medium or larger
- **Azure**: B2s or larger

### Cost Estimates (Monthly)
- Small setup: $10-20
- Medium setup: $40-80
- Large setup: $150+

## Notes

1. **Start small**: Begin with minimum requirements
2. **Monitor**: Track performance and resource usage
3. **Scale gradually**: Upgrade as needed
4. **Plan ahead**: Consider growth
5. **Backup regularly**: Don't lose data
6. **Test thoroughly**: Before production deployment

## Support Matrix

| Component | Version | Status |
|-----------|---------|--------|
| Ubuntu 24.04 | LTS | ✅ Fully Supported |
| Ubuntu 22.04 | LTS | ✅ Supported |
| Ubuntu 20.04 | LTS | ⚠️ Compatible |
| Debian 11+ | Stable | ✅ Supported |
| PostgreSQL 16 | Latest | ✅ Recommended |
| PostgreSQL 14-15 | - | ✅ Supported |
| PostgreSQL 12-13 | - | ⚠️ Compatible |
| Docker 24+ | Latest | ✅ Recommended |
| Docker 20.10+ | - | ✅ Supported |
| Mikrotik 7.x | Latest | ✅ Fully Supported |
| Mikrotik 6.40+ | - | ✅ Supported |

Legend:
- ✅ Fully tested and supported
- ⚠️ Should work but not tested
- ❌ Not supported
