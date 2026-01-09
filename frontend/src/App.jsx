import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { setupService } from './services/api';
import SetupWizard from './pages/SetupWizard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDashboard from './pages/ClientDashboard';
import Services from './pages/Services';
import Radius from './pages/Radius';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  const [setupCompleted, setSetupCompleted] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await setupService.checkStatus();
      setSetupCompleted(response.data.setupCompleted);
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setSetupCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!setupCompleted) {
    return <SetupWizard onComplete={() => setSetupCompleted(true)} />;
  }

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDashboard />} />
          <Route path="services" element={<Services />} />
          <Route path="radius" element={<Radius />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="payments" element={<Payments />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
