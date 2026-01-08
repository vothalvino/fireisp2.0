import { useState, useEffect } from 'react';
import { radiusService } from '../services/api';
import { Radio, Plus, Activity, Edit, Trash2 } from 'lucide-react';

function Radius() {
  const [nasDevices, setNasDevices] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedNas, setSelectedNas] = useState(null);
  const [formData, setFormData] = useState({
    nasname: '',
    shortname: '',
    type: 'mikrotik',
    secret: '',
    description: ''
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedNas) {
        await radiusService.updateNAS(selectedNas.id, formData);
        alert('NAS device updated successfully');
      } else {
        await radiusService.addNAS(formData);
        alert('NAS device added successfully');
      }
      
      setShowForm(false);
      setSelectedNas(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save NAS device:', error);
      alert(error.response?.data?.error?.message || 'Failed to save NAS device');
    }
  };

  const handleEdit = (nas) => {
    setSelectedNas(nas);
    setFormData({
      nasname: nas.nasname,
      shortname: nas.shortname,
      type: nas.type || 'mikrotik',
      secret: nas.secret || '',
      description: nas.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this NAS device?')) return;
    
    try {
      await radiusService.deleteNAS(id);
      alert('NAS device deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete NAS device:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete NAS device');
    }
  };

  const resetForm = () => {
    setFormData({
      nasname: '',
      shortname: '',
      type: 'mikrotik',
      secret: '',
      description: ''
    });
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

  if (showForm) {
    return (
      <div>
        <div className="page-header">
          <h1><Radio size={32} /> {selectedNas ? 'Edit NAS Device' : 'Add NAS Device'}</h1>
          <button className="btn" onClick={() => {
            setShowForm(false);
            setSelectedNas(null);
            resetForm();
          }}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <div>
              <label>NAS Name (IP Address) *</label>
              <input
                type="text"
                name="nasname"
                value={formData.nasname}
                onChange={handleInputChange}
                placeholder="e.g., 192.168.1.1"
                required
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                The IP address or hostname of your Mikrotik router
              </small>
            </div>
            
            <div>
              <label>Short Name *</label>
              <input
                type="text"
                name="shortname"
                value={formData.shortname}
                onChange={handleInputChange}
                placeholder="e.g., mikrotik1"
                required
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                A short identifier for this device
              </small>
            </div>
            
            <div>
              <label>Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="mikrotik">Mikrotik</option>
                <option value="cisco">Cisco</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label>RADIUS Secret *</label>
              <input
                type="password"
                name="secret"
                value={formData.secret}
                onChange={handleInputChange}
                placeholder="Enter RADIUS shared secret"
                required
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                Must match the RADIUS secret configured on your Mikrotik router
              </small>
            </div>
            
            <div>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Optional description..."
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false);
                setSelectedNas(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {selectedNas ? 'Update NAS Device' : 'Add NAS Device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
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
                <th>Actions</th>
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
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleEdit(nas)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(nas.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
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
