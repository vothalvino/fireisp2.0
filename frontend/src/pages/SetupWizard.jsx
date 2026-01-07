import { useState } from 'react';
import { setupService } from '../services/api';
import { CheckCircle, Lock, Settings } from 'lucide-react';
import './SetupWizard.css';

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [rootUser, setRootUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const [sslConfig, setSslConfig] = useState({
    enabled: false,
    certificate: '',
    privateKey: '',
  });

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
                <div className="form-group">
                  <label className="form-label">SSL Certificate</label>
                  <textarea
                    rows="6"
                    placeholder="Paste your SSL certificate (PEM format)"
                    value={sslConfig.certificate}
                    onChange={(e) => setSslConfig({ ...sslConfig, certificate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Private Key</label>
                  <textarea
                    rows="6"
                    placeholder="Paste your private key (PEM format)"
                    value={sslConfig.privateKey}
                    onChange={(e) => setSslConfig({ ...sslConfig, privateKey: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Configuring...' : sslConfig.enabled ? 'Save & Continue' : 'Skip'}
              </button>
            </div>
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
