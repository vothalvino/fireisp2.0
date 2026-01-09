const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const setupRoutes = require('./src/routes/setup');
const authRoutes = require('./src/routes/auth');
const clientRoutes = require('./src/routes/clients');
const serviceRoutes = require('./src/routes/services');
const radiusRoutes = require('./src/routes/radius');
const dashboardRoutes = require('./src/routes/dashboard');
const invoiceRoutes = require('./src/routes/invoices');
const userRoutes = require('./src/routes/users');
const settingsRoutes = require('./src/routes/settings');
const ticketRoutes = require('./src/routes/tickets');
const documentRoutes = require('./src/routes/documents');
const paymentRoutes = require('./src/routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/radius', radiusRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not Found' } });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`FireISP Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Verify critical dependencies
    try {
        const acmeVersion = require('acme-client/package.json').version;
        console.log(`[System Health] acme-client v${acmeVersion} is available - Let's Encrypt functionality enabled`);
    } catch (err) {
        console.error('═'.repeat(80));
        console.error('[System Health] WARNING: acme-client package is NOT installed!');
        console.error('[System Health] Let\'s Encrypt SSL certificate functionality will NOT work.');
        console.error('[System Health] To fix this, rebuild the Docker containers:');
        console.error('[System Health]   docker compose build --no-cache backend');
        console.error('[System Health]   docker compose up -d');
        console.error('═'.repeat(80));
    }
});

module.exports = app;
