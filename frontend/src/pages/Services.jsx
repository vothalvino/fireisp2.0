import { useState, useEffect } from 'react';
import { serviceService, clientService } from '../services/api';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';

function Services() {
  const [services, setServices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    clientId: '',
    servicePlanId: '',
    username: '',
    password: '',
    ipAddress: '',
    macAddress: '',
    activationDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, plansRes, clientsRes] = await Promise.all([
        serviceService.getClientServices(),
        serviceService.getPlans(),
        clientService.getAll({ limit: 1000 })
      ]);
      setServices(servicesRes.data);
      setPlans(plansRes.data);
      setClients(clientsRes.data.clients);
    } catch (error) {
      console.error('Failed to load services:', error);
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
      if (selectedService) {
        await serviceService.updateClientService(selectedService.id, { ...formData, status: selectedService.status });
        alert('Service updated successfully');
      } else {
        await serviceService.createClientService(formData);
        alert('Service created successfully');
      }
      
      setShowForm(false);
      setSelectedService(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save service:', error);
      alert(error.response?.data?.error?.message || 'Failed to save service');
    }
  };

  const handleEdit = (service) => {
    setSelectedService(service);
    setFormData({
      clientId: service.client_id,
      servicePlanId: service.service_plan_id,
      username: service.username,
      password: service.password || '',
      ipAddress: service.ip_address || '',
      macAddress: service.mac_address || '',
      activationDate: service.activation_date || new Date().toISOString().split('T')[0],
      expirationDate: service.expiration_date || '',
      notes: service.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await serviceService.deleteClientService(id);
      alert('Service deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete service');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      servicePlanId: '',
      username: '',
      password: '',
      ipAddress: '',
      macAddress: '',
      activationDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      notes: ''
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (showForm) {
    return (
      <div>
        <div className="page-header">
          <h1><Package size={32} /> {selectedService ? 'Edit Service' : 'Create Service'}</h1>
          <button className="btn" onClick={() => {
            setShowForm(false);
            setSelectedService(null);
            resetForm();
          }}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label>Client *</label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} ({client.client_code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label>Service Plan *</label>
                <select
                  name="servicePlanId"
                  value={formData.servicePlanId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price}/{plan.billing_cycle}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!selectedService}
                />
              </div>
              
              <div>
                <label>IP Address</label>
                <input
                  type="text"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleInputChange}
                  placeholder="e.g., 192.168.1.100"
                />
              </div>
              
              <div>
                <label>MAC Address</label>
                <input
                  type="text"
                  name="macAddress"
                  value={formData.macAddress}
                  onChange={handleInputChange}
                  placeholder="e.g., 00:11:22:33:44:55"
                />
              </div>
              
              <div>
                <label>Activation Date *</label>
                <input
                  type="date"
                  name="activationDate"
                  value={formData.activationDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label>Expiration Date</label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false);
                setSelectedService(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {selectedService ? 'Update Service' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1><Package size={32} /> Services</h1>
          <p>Manage client services and plans</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
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
                <th>Actions</th>
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
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleEdit(service)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(service.id)}
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
          <p className="no-data">No client services yet</p>
        )}
      </div>
    </div>
  );
}

export default Services;
