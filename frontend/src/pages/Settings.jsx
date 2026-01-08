import { useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import { Settings as SettingsIcon, Save } from 'lucide-react';

function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsService.getAll();
      const settingsMap = {};
      response.data.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Failed to load settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value
      }));
      
      await settingsService.bulkUpdate({ settings: settingsArray });
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1><SettingsIcon size={32} /> System Settings</h1>
        <p>Configure application settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Company Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label>Company Name</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
              />
            </div>
            
            <div>
              <label>Company Email</label>
              <input
                type="email"
                value={settings.company_email || ''}
                onChange={(e) => handleInputChange('company_email', e.target.value)}
              />
            </div>
            
            <div>
              <label>Company Phone</label>
              <input
                type="tel"
                value={settings.company_phone || ''}
                onChange={(e) => handleInputChange('company_phone', e.target.value)}
              />
            </div>
            
            <div>
              <label>Company Address</label>
              <input
                type="text"
                value={settings.company_address || ''}
                onChange={(e) => handleInputChange('company_address', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>SSL Configuration</h3>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={settings.ssl_enabled === 'true'}
                onChange={(e) => handleInputChange('ssl_enabled', e.target.checked ? 'true' : 'false')}
              />
              Enable SSL/HTTPS
            </label>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Note: SSL certificates must be placed in the ssl/ directory and containers restarted for SSL to work.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>RADIUS Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label>RADIUS Secret</label>
              <input
                type="text"
                value={settings.radius_secret || ''}
                onChange={(e) => handleInputChange('radius_secret', e.target.value)}
                placeholder="Enter RADIUS secret"
              />
            </div>
            
            <div>
              <label>Authentication Port</label>
              <input
                type="number"
                value={settings.radius_auth_port || '1812'}
                onChange={(e) => handleInputChange('radius_auth_port', e.target.value)}
              />
            </div>
            
            <div>
              <label>Accounting Port</label>
              <input
                type="number"
                value={settings.radius_acct_port || '1813'}
                onChange={(e) => handleInputChange('radius_acct_port', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Application Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label>Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.session_timeout || '60'}
                onChange={(e) => handleInputChange('session_timeout', e.target.value)}
              />
            </div>
            
            <div>
              <label>Default Timezone</label>
              <input
                type="text"
                value={settings.timezone || 'UTC'}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                placeholder="UTC"
              />
            </div>
            
            <div>
              <label>Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || '$'}
                onChange={(e) => handleInputChange('currency_symbol', e.target.value)}
                placeholder="$"
              />
            </div>
            
            <div>
              <label>Date Format</label>
              <select
                value={settings.date_format || 'YYYY-MM-DD'}
                onChange={(e) => handleInputChange('date_format', e.target.value)}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Email Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label>SMTP Host</label>
              <input
                type="text"
                value={settings.smtp_host || ''}
                onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            
            <div>
              <label>SMTP Port</label>
              <input
                type="number"
                value={settings.smtp_port || '587'}
                onChange={(e) => handleInputChange('smtp_port', e.target.value)}
              />
            </div>
            
            <div>
              <label>SMTP Username</label>
              <input
                type="text"
                value={settings.smtp_username || ''}
                onChange={(e) => handleInputChange('smtp_username', e.target.value)}
              />
            </div>
            
            <div>
              <label>SMTP Password</label>
              <input
                type="password"
                value={settings.smtp_password || ''}
                onChange={(e) => handleInputChange('smtp_password', e.target.value)}
              />
            </div>
            
            <div>
              <label>From Email</label>
              <input
                type="email"
                value={settings.from_email || ''}
                onChange={(e) => handleInputChange('from_email', e.target.value)}
                placeholder="noreply@company.com"
              />
            </div>
            
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px' }}>
                <input
                  type="checkbox"
                  checked={settings.smtp_tls === 'true'}
                  onChange={(e) => handleInputChange('smtp_tls', e.target.checked ? 'true' : 'false')}
                />
                Use TLS
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            <Save size={20} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
