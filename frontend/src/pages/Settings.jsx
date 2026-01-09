import { useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import { Settings as SettingsIcon, Save, Shield, AlertCircle } from 'lucide-react';

function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);
  const [certbotStatus, setCertbotStatus] = useState(null);
  const [certbotLoading, setCertbotLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    checkCertbotStatus();
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

  const checkCertbotStatus = async () => {
    try {
      const response = await settingsService.checkCertbot();
      setCertbotStatus(response.data);
    } catch (error) {
      console.error('Failed to check certbot status:', error);
      setCertbotStatus({ available: false });
    }
  };

  const handleCertbotConfigure = async () => {
    if (!settings.letsencrypt_domain || !settings.letsencrypt_email) {
      alert('Please enter domain and email before configuring certbot');
      return;
    }

    if (!window.confirm('This will configure SSL certificate using certbot. The process may take a few minutes. Continue?')) {
      return;
    }

    setCertbotLoading(true);
    try {
      const response = await settingsService.configureCertbot({
        domain: settings.letsencrypt_domain,
        email: settings.letsencrypt_email,
        dryRun: false
      });
      alert(response.data.message || 'Certificate configured successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Failed to configure certbot:', error);
      alert(error.response?.data?.error?.message || 'Failed to configure certificate');
    } finally {
      setCertbotLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSectionSubmit = async (e, sectionName, settingKeys) => {
    e.preventDefault();
    setSavingSection(sectionName);
    
    try {
      const settingsArray = settingKeys
        .filter(key => key in settings)
        .map(key => ({
          key,
          value: settings[key]
        }));
      
      await settingsService.bulkUpdate({ settings: settingsArray });
      alert(`${sectionName} saved successfully`);
    } catch (error) {
      console.error(`Failed to save ${sectionName}:`, error);
      alert(`Failed to save ${sectionName}`);
    } finally {
      setSavingSection(null);
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

      {/* Company Information Section */}
      <form onSubmit={(e) => handleSectionSubmit(e, 'Company Information', ['company_name', 'company_email', 'company_phone', 'company_address'])}>
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Company Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={savingSection === 'Company Information'}
            >
              <Save size={20} /> {savingSection === 'Company Information' ? 'Saving...' : 'Save Company Information'}
            </button>
          </div>
        </div>
      </form>

      {/* SSL Configuration Section */}
      <form onSubmit={(e) => handleSectionSubmit(e, 'SSL Configuration', ['ssl_enabled', 'ssl_method', 'letsencrypt_domain', 'letsencrypt_email'])}>
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>SSL Configuration</h3>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <input
                type="checkbox"
                checked={settings.ssl_enabled === 'true'}
                onChange={(e) => handleInputChange('ssl_enabled', e.target.checked ? 'true' : 'false')}
              />
              Enable SSL/HTTPS
            </label>

            {settings.ssl_enabled === 'true' && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label>SSL Method</label>
                  <select
                    value={settings.ssl_method || 'letsencrypt'}
                    onChange={(e) => handleInputChange('ssl_method', e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd',
                      width: '100%',
                      fontSize: '14px'
                    }}
                  >
                    <option value="letsencrypt">Let's Encrypt (acme-client)</option>
                    <option value="certbot" disabled={!certbotStatus?.available}>
                      Certbot (nginx plugin){!certbotStatus?.available ? ' - Not Installed' : ''}
                    </option>
                    <option value="manual">Manual Certificate Upload</option>
                  </select>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    {settings.ssl_method === 'manual' 
                      ? "Upload your own SSL certificate and private key in PEM format."
                      : settings.ssl_method === 'certbot'
                      ? "Certbot will automatically obtain and configure a free SSL certificate using the nginx plugin."
                      : "Let's Encrypt with acme-client will automatically obtain and configure a free SSL certificate for your domain."}
                  </p>
                  
                  {/* Certbot status indicator */}
                  {certbotStatus && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      backgroundColor: certbotStatus.available ? '#e8f5e9' : '#fff3e0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>Certbot Status:</strong> {certbotStatus.available ? '✓ Available' : '✗ Not Installed'}
                      {certbotStatus.version && <span> ({certbotStatus.version})</span>}
                      {certbotStatus.nginxPlugin !== undefined && (
                        <span> | Nginx Plugin: {certbotStatus.nginxPlugin ? '✓' : '✗'}</span>
                      )}
                      {!certbotStatus.available && (
                        <div style={{ marginTop: '5px', color: '#666' }}>
                          To install: <code>apt install certbot python3-certbot-nginx</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {settings.ssl_method === 'certbot' && (
                  <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Shield size={20} color="#1976d2" />
                      <strong>Certbot Configuration</strong>
                    </div>
                    <p style={{ fontSize: '14px', marginBottom: '15px', color: '#555' }}>
                      Certbot will automatically obtain and install SSL certificates from Let's Encrypt 
                      and configure nginx for you. Enter your domain and email below, then click "Configure with Certbot".
                    </p>
                    <div style={{ marginBottom: '10px' }}>
                      <label>Domain Name</label>
                      <input
                        type="text"
                        value={settings.letsencrypt_domain || ''}
                        onChange={(e) => handleInputChange('letsencrypt_domain', e.target.value)}
                        placeholder="example.com"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Email Address</label>
                      <input
                        type="email"
                        value={settings.letsencrypt_email || ''}
                        onChange={(e) => handleInputChange('letsencrypt_email', e.target.value)}
                        placeholder="admin@example.com"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={handleCertbotConfigure}
                      disabled={certbotLoading || !certbotStatus?.available}
                      className="btn btn-primary"
                      style={{ marginTop: '10px' }}
                    >
                      {certbotLoading ? 'Configuring...' : 'Configure with Certbot'}
                    </button>
                  </div>
                )}

                {settings.ssl_method === 'letsencrypt' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                    <div>
                      <label>Domain Name</label>
                      <input
                        type="text"
                        value={settings.letsencrypt_domain || ''}
                        onChange={(e) => handleInputChange('letsencrypt_domain', e.target.value)}
                        placeholder="example.com"
                      />
                      <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                        Enter your domain name (e.g., fireisp.example.com). Make sure this domain points to this server's IP address.
                      </p>
                    </div>

                    <div>
                      <label>Email Address</label>
                      <input
                        type="email"
                        value={settings.letsencrypt_email || ''}
                        onChange={(e) => handleInputChange('letsencrypt_email', e.target.value)}
                        placeholder="admin@example.com"
                      />
                      <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                        Email for Let's Encrypt certificate expiration notifications.
                      </p>
                    </div>
                  </div>
                )}

                {settings.ssl_method === 'manual' && (
                  <div>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      Note: For manual certificates, place your cert.pem and key.pem files in the ssl/ directory and restart containers.
                    </p>
                  </div>
                )}
              </div>
            )}

            {settings.ssl_enabled !== 'true' && (
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                Enable SSL to configure HTTPS for secure connections.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={savingSection === 'SSL Configuration'}
            >
              <Save size={20} /> {savingSection === 'SSL Configuration' ? 'Saving...' : 'Save SSL Configuration'}
            </button>
          </div>
        </div>
      </form>

      {/* RADIUS Configuration Section */}
      <form onSubmit={(e) => handleSectionSubmit(e, 'RADIUS Configuration', ['radius_secret', 'radius_auth_port', 'radius_acct_port'])}>
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>RADIUS Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={savingSection === 'RADIUS Configuration'}
            >
              <Save size={20} /> {savingSection === 'RADIUS Configuration' ? 'Saving...' : 'Save RADIUS Configuration'}
            </button>
          </div>
        </div>
      </form>

      {/* Application Settings Section */}
      <form onSubmit={(e) => handleSectionSubmit(e, 'Application Settings', ['session_timeout', 'timezone', 'currency_symbol', 'date_format'])}>
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Application Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={savingSection === 'Application Settings'}
            >
              <Save size={20} /> {savingSection === 'Application Settings' ? 'Saving...' : 'Save Application Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* Email Configuration Section */}
      <form onSubmit={(e) => handleSectionSubmit(e, 'Email Configuration', ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'from_email', 'smtp_tls'])}>
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Email Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={savingSection === 'Email Configuration'}
            >
              <Save size={20} /> {savingSection === 'Email Configuration' ? 'Saving...' : 'Save Email Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Settings;
