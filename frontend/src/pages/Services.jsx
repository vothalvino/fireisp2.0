import { useState, useEffect } from 'react';
import { serviceService } from '../services/api';
import { Package, Plus } from 'lucide-react';

function Services() {
  const [services, setServices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, plansRes] = await Promise.all([
        serviceService.getClientServices(),
        serviceService.getPlans(),
      ]);
      setServices(servicesRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1><Package size={32} /> Services</h1>
          <p>Manage client services and plans</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} /> Add Service
        </button>
      </div>

      <div className="card mb-4">
        <h3>Service Plans ({plans.length})</h3>
        {plans.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Type</th>
                <th>Download Speed</th>
                <th>Upload Speed</th>
                <th>Price</th>
                <th>Billing Cycle</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.service_type_name}</td>
                  <td>{plan.download_speed}</td>
                  <td>{plan.upload_speed}</td>
                  <td>${plan.price}</td>
                  <td>{plan.billing_cycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No service plans configured</p>
        )}
      </div>

      <div className="card">
        <h3>Client Services ({services.length})</h3>
        {services.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Username</th>
                <th>Plan</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.company_name}</td>
                  <td>{service.username}</td>
                  <td>{service.plan_name}</td>
                  <td>{service.ip_address || '-'}</td>
                  <td>
                    <span className={`badge badge-${service.status === 'active' ? 'success' : 'warning'}`}>
                      {service.status}
                    </span>
                  </td>
                  <td>{service.expiration_date ? new Date(service.expiration_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No client services yet</p>
        )}
      </div>
    </div>
  );
}

export default Services;
