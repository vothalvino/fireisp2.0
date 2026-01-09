import { useState, useEffect } from 'react';
import { setupService } from '../services/api';
import { CheckCircle, Lock, Settings, AlertCircle, Info } from 'lucide-react';
import './SetupWizard.css';

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupStatus, setSetupStatus] = useState(null);
  
  const [rootUser, setRootUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const [sslConfig, setSslConfig] = useState({
    enabled: false,
    method: 'letsencrypt', // 'letsencrypt' or 'manual'
    certificate: '',
    privateKey: '',
    domain: '',
    email: '',
  });

  // Check setup status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await setupService.checkStatus();
        setSetupStatus(response.data);
      } catch (error) {
        console.error('Failed to check setup status:', error);
      }
    };
    checkStatus();
  }, []);

  const [companyInfo, setCompanyInfo] = useState({
    companyName: 'FireISP',
    companyEmail: '',
    companyPhone: '',
  });

  const handleRootUserSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rootUser.password !== rootUser.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await setupService.createRootUser({
        username: rootUser.username,
        email: rootUser.email,
        password: rootUser.password,
        fullName: rootUser.fullName,
      });
      
      localStorage.setItem('token', response.data.token);
      setStep(2);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleSSLSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await setupService.configureSSL(sslConfig);
      setStep(3);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to configure SSL');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await setupService.complete(companyInfo);
      onComplete();
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>FireISP 2.0 Setup</h1>
          <p>Welcome! Let's configure your ISP management system</p>
        </div>

        <div className="setup-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">{step > 1 ? <CheckCircle size={20} /> : '1'}</div>
            <span>Root User</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">{step > 2 ? <CheckCircle size={20} /> : '2'}</div>
            <span>SSL Config</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Company Info</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleRootUserSubmit} className="setup-form">
            <h2>Create Root User Account</h2>
            <p className="form-description">This will be the main administrator account</p>
            
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                required
                value={rootUser.username}
                onChange={(e) => setRootUser({ ...rootUser, username: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                value={rootUser.email}
                onChange={(e) => setRootUser({ ...rootUser, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                value={rootUser.fullName}
                onChange={(e) => setRootUser({ ...rootUser, fullName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                minLength="8"
                value={rootUser.password}
                onChange={(e) => setRootUser({ ...rootUser, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                required
                value={rootUser.confirmPassword}
                onChange={(e) => setRootUser({ ...rootUser, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSSLSubmit} className="setup-form">
            <h2><Lock size={24} /> SSL Configuration</h2>
            <p className="form-description">Configure HTTPS for secure connections (optional)</p>
            
            {/* Info box about SSL */}
            <div className="info-box">
              <Info size={20} />
              <div>
                <strong>SSL is optional during setup.</strong> You can skip this step and configure SSL later in the Settings page. 
                The application will work with HTTP, and you can add HTTPS when you're ready.
              </div>
            </div>

            {/* Let's Encrypt availability warning */}
            {setupStatus?.letsEncryptAvailable === false && (
              <div className="warning-box">
                <AlertCircle size={20} />
                <div>
                  <strong>Let's Encrypt is not available.</strong> The required acme-client package is not installed. 
                  To enable Let's Encrypt, rebuild your Docker containers:
                  <pre>docker compose build --no-cache backend && docker compose up -d</pre>
                  You can skip SSL now and configure it later after rebuilding.
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sslConfig.enabled}
                  onChange={(e) => setSslConfig({ ...sslConfig, enabled: e.target.checked })}
                />
                <span>Enable SSL/HTTPS</span>
              </label>
            </div>

            {sslConfig.enabled && (
              <>
                {(() => {
                  const isLetsEncryptUnavailable = setupStatus && !setupStatus.letsEncryptAvailable;
                  const isCertbotAvailable = setupStatus && setupStatus.certbotAvailable;
                  return (
                    <div className="form-group">
                      <label className="form-label">SSL Method</label>
                      <select
                        value={sslConfig.method}
                        onChange={(e) => setSslConfig({ ...sslConfig, method: e.target.value })}
                        className="form-select"
                      >
                        <option value="letsencrypt" disabled={isLetsEncryptUnavailable}>
                          Let's Encrypt (Automatic - acme-client){isLetsEncryptUnavailable ? ' - Not Available' : ''}
                        </option>
                        <option value="certbot" disabled={!isCertbotAvailable}>
                          Certbot (nginx plugin){!isCertbotAvailable ? ' - Not Installed' : ''}
                        </option>
                        <option value="manual">Manual Certificate Upload</option>
                      </select>
                      <p className="form-help">
                        {sslConfig.method === 'letsencrypt' 
                          ? "Let's Encrypt with acme-client will automatically obtain and configure a free SSL certificate for your domain."
                          : sslConfig.method === 'certbot'
                          ? "Certbot with nginx plugin will automatically obtain and configure a free SSL certificate for your domain."
                          : "Upload your own SSL certificate and private key in PEM format."}
                      </p>
                    </div>
                  );
                })()}

                {(sslConfig.method === 'letsencrypt' || sslConfig.method === 'certbot') ? (
                  <>
                    {/* Let's Encrypt / Certbot Requirements */}
                    <div className="requirements-box">
                      <strong>Before proceeding, ensure:</strong>
                      <ul>
                        <li>✓ You have a registered domain name</li>
                        <li>✓ DNS A record points to this server's public IP address</li>
                        <li>✓ Port 80 is open and accessible from the internet</li>
                        <li>✓ Port 443 is open for HTTPS traffic</li>
                        <li>✓ DNS has propagated (wait 5-60 minutes after DNS changes)</li>
                      </ul>
                      <p><strong>If you're not sure, skip this step and configure SSL later.</strong></p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Domain Name</label>
                      <input
                        type="text"
                        required
                        placeholder="example.com or subdomain.example.com"
                        value={sslConfig.domain}
                        onChange={(e) => setSslConfig({ ...sslConfig, domain: e.target.value })}
                      />
                      <p className="form-help">
                        Enter your fully qualified domain name (e.g., fireisp.example.com). 
                        Do NOT use localhost, IP addresses, or .local domains.
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@example.com"
                        value={sslConfig.email}
                        onChange={(e) => setSslConfig({ ...sslConfig, email: e.target.value })}
                      />
                      <p className="form-help">
                        Email for Let's Encrypt certificate expiration notifications.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">SSL Certificate</label>
                      <textarea
                        rows="6"
                        required
                        placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                        value={sslConfig.certificate}
                        onChange={(e) => setSslConfig({ ...sslConfig, certificate: e.target.value })}
                      />
                      <p className="form-help">
                        Paste your SSL certificate in PEM format (including BEGIN and END lines).
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Private Key</label>
                      <textarea
                        rows="6"
                        required
                        placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                        value={sslConfig.privateKey}
                        onChange={(e) => setSslConfig({ ...sslConfig, privateKey: e.target.value })}
                      />
                      <p className="form-help">
                        Paste your private key in PEM format (including BEGIN and END lines).
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Configuring...' : sslConfig.enabled ? 'Configure SSL & Continue' : 'Skip SSL Setup'}
              </button>
            </div>
            
            {!sslConfig.enabled && (
              <p className="skip-note">
                <Info size={16} /> You can configure SSL later in Settings → System Settings
              </p>
            )}
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCompleteSetup} className="setup-form">
            <h2><Settings size={24} /> Company Information</h2>
            <p className="form-description">Enter your company details</p>
            
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                required
                value={companyInfo.companyName}
                onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Email</label>
              <input
                type="email"
                value={companyInfo.companyEmail}
                onChange={(e) => setCompanyInfo({ ...companyInfo, companyEmail: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Phone</label>
              <input
                type="tel"
                value={companyInfo.companyPhone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, companyPhone: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Completing...' : 'Complete Setup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;
