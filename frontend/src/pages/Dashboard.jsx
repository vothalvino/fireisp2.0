import { useState, useEffect } from 'react';
import { dashboardService, radiusService } from '../services/api';
import { Users, Package, Radio, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [radiusStats, setRadiusStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, radiusData] = await Promise.all([
        dashboardService.getStats(),
        radiusService.getStats(),
      ]);
      setStats(dashboardData.data);
      setRadiusStats(radiusData.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to FireISP Management System</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Clients</p>
            <h2 className="stat-value">{stats?.totalClients || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Package size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Services</p>
            <h2 className="stat-value">{stats?.totalServices || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Radio size={24} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Sessions</p>
            <h2 className="stat-value">{radiusStats?.activeSessions || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fecaca' }}>
            <DollarSign size={24} color="#ef4444" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Invoices</p>
            <h2 className="stat-value">${stats?.pendingInvoices?.total?.toFixed(2) || '0.00'}</h2>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3><TrendingUp size={20} /> Today's Bandwidth Usage</h3>
          <div className="bandwidth-stats">
            <div className="bandwidth-item">
              <span className="bandwidth-label">Download</span>
              <span className="bandwidth-value">{formatBytes(radiusStats?.todayUsage?.input || 0)}</span>
            </div>
            <div className="bandwidth-item">
              <span className="bandwidth-label">Upload</span>
              <span className="bandwidth-value">{formatBytes(radiusStats?.todayUsage?.output || 0)}</span>
            </div>
            <div className="bandwidth-item">
              <span className="bandwidth-label">Total</span>
              <span className="bandwidth-value">{formatBytes(radiusStats?.todayUsage?.total || 0)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3><AlertCircle size={20} /> Services Expiring Soon</h3>
          {stats?.expiringServices?.length > 0 ? (
            <div className="expiring-services">
              {stats.expiringServices.map((service) => (
                <div key={service.id} className="expiring-item">
                  <div>
                    <p className="client-name">{service.company_name}</p>
                    <p className="client-code">{service.client_code}</p>
                  </div>
                  <span className="badge badge-warning">
                    {new Date(service.expiration_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No services expiring soon</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3><Users size={20} /> Recent Clients</h3>
        {stats?.recentClients?.length > 0 ? (
          <div className="recent-clients">
            <table>
              <thead>
                <tr>
                  <th>Client Code</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentClients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.client_code}</td>
                    <td>{client.company_name}</td>
                    <td>{client.contact_person}</td>
                    <td>
                      <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
                        {client.status}
                      </span>
                    </td>
                    <td>{new Date(client.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No clients yet</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
