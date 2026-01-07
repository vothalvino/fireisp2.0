import { useState, useEffect } from 'react';
import { radiusService } from '../services/api';
import { Radio, Plus, Activity } from 'lucide-react';

function Radius() {
  const [nasDevices, setNasDevices] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [nasRes, sessionsRes, statsRes] = await Promise.all([
        radiusService.getNAS(),
        radiusService.getSessions(),
        radiusService.getStats(),
      ]);
      setNasDevices(nasRes.data);
      setSessions(sessionsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load RADIUS data:', error);
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
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1><Radio size={32} /> RADIUS Server</h1>
        <p>Manage authentication and accounting</p>
      </div>

      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Activity size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Sessions</p>
            <h2 className="stat-value">{stats?.activeSessions || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Radio size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Users</p>
            <h2 className="stat-value">{stats?.totalUsers || 0}</h2>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3>NAS Devices (Mikrotik Routers)</h3>
          <button className="btn btn-primary">
            <Plus size={20} /> Add NAS
          </button>
        </div>
        {nasDevices.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>NAS Name</th>
                <th>Short Name</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {nasDevices.map((nas) => (
                <tr key={nas.id}>
                  <td>{nas.nasname}</td>
                  <td>{nas.shortname}</td>
                  <td>
                    <span className="badge badge-info">{nas.type}</span>
                  </td>
                  <td>{nas.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No NAS devices configured. Add your Mikrotik routers here.</p>
        )}
      </div>

      <div className="card">
        <h3>Active Sessions ({sessions.length})</h3>
        {sessions.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>NAS IP</th>
                <th>Framed IP</th>
                <th>Session Start</th>
                <th>Input</th>
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr key={index}>
                  <td>{session.username}</td>
                  <td>{session.nasipaddress}</td>
                  <td>{session.framedipaddress || '-'}</td>
                  <td>{new Date(session.acctstarttime).toLocaleString()}</td>
                  <td>{formatBytes(session.acctinputoctets)}</td>
                  <td>{formatBytes(session.acctoutputoctets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No active sessions</p>
        )}
      </div>
    </div>
  );
}

export default Radius;
