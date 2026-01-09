import { useState, useEffect } from 'react';
import { serviceService, clientService } from '../services/api';
import { Package, Plus, Edit, Trash2, FileText } from 'lucide-react';

function Services() {
  const [services, setServices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
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
    notes: '',
    noExpiration: true,
    billingDayOfMonth: '',
    daysUntilDue: '',
    recurringBillingEnabled: true,
    useDefaultBilling: true
  });
  const [planFormData, setPlanFormData] = useState({
    serviceTypeId: '',
    name: '',
    description: '',
    downloadSpeed: '',
    uploadSpeed: '',
    price: '',
    billingCycle: 'monthly'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, plansRes, clientsRes, typesRes] = await Promise.all([
        serviceService.getClientServices(),
        serviceService.getPlans(),
        clientService.getAll({ limit: 1000 }),
        serviceService.getTypes()
      ]);
      setServices(servicesRes.data);
      setPlans(plansRes.data);
      setClients(clientsRes.data.clients);
      setServiceTypes(typesRes.data);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'noExpiration') {
      setFormData(prev => ({ 
        ...prev, 
        noExpiration: checked,
        expirationDate: checked ? '' : prev.expirationDate
      }));
    } else if (type === 'checkbox' && name === 'recurringBillingEnabled') {
      setFormData(prev => ({ ...prev, recurringBillingEnabled: checked }));
    } else if (type === 'checkbox' && name === 'useDefaultBilling') {
      setFormData(prev => ({ 
        ...prev, 
        useDefaultBilling: checked,
        billingDayOfMonth: checked ? '' : prev.billingDayOfMonth,
        daysUntilDue: checked ? '' : prev.daysUntilDue
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePlanInputChange = (e) => {
    const { name, value } = e.target;
    setPlanFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await serviceService.createPlan(planFormData);
      alert('Service plan created successfully');
      setShowPlanForm(false);
      resetPlanForm();
      loadData();
    } catch (error) {
      console.error('Failed to create service plan:', error);
      alert(error.response?.data?.error?.message || 'Failed to create service plan');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = { ...formData };
      // If no expiration is selected, set expirationDate to null/empty
      if (formData.noExpiration) {
        submitData.expirationDate = null;
      }
      // If using default billing, clear custom billing fields
      if (formData.useDefaultBilling) {
        submitData.billingDayOfMonth = null;
        submitData.daysUntilDue = null;
      }
      
      if (selectedService) {
        await serviceService.updateClientService(selectedService.id, { ...submitData, status: selectedService.status });
        alert('Service updated successfully');
      } else {
        await serviceService.createClientService(submitData);
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
    const hasCustomBilling = service.billing_day_of_month !== null || service.days_until_due !== null;
    setFormData({
      clientId: service.client_id,
      servicePlanId: service.service_plan_id,
      username: service.username,
      password: service.password || '',
      ipAddress: service.ip_address || '',
      macAddress: service.mac_address || '',
      activationDate: service.activation_date || new Date().toISOString().split('T')[0],
      expirationDate: service.expiration_date || '',
      notes: service.notes || '',
      noExpiration: !service.expiration_date || service.expiration_date === '',
      billingDayOfMonth: service.billing_day_of_month || '',
      daysUntilDue: service.days_until_due || '',
      recurringBillingEnabled: service.recurring_billing_enabled !== false,
      useDefaultBilling: !hasCustomBilling
    });
    setShowForm(true);
  };

  const handleGenerateRecurringInvoices = async () => {
    if (!confirm('Generate recurring invoices for all active services? This will create invoices for services that are due for billing.')) return;
    
    setGeneratingInvoices(true);
    try {
      const response = await serviceService.generateRecurringInvoices();
      const result = response.data;
      
      if (result.invoices && result.invoices.length > 0) {
        const invoiceList = result.invoices.map(inv => 
          `${inv.invoiceNumber} - ${inv.clientName} - $${inv.amount}`
        ).join('\n');
        alert(`${result.message}\n\nInvoices created:\n${invoiceList}`);
      } else {
        alert(result.message || 'No invoices were generated. All services may already be up to date.');
      }
      
      loadData();
    } catch (error) {
      console.error('Failed to generate recurring invoices:', error);
      alert(error.response?.data?.error?.message || 'Failed to generate recurring invoices');
    } finally {
      setGeneratingInvoices(false);
    }
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
      notes: '',
      noExpiration: true,
      billingDayOfMonth: '',
      daysUntilDue: '',
      recurringBillingEnabled: true,
      useDefaultBilling: true
    });
  };

  const resetPlanForm = () => {
    setPlanFormData({
      serviceTypeId: '',
      name: '',
      description: '',
      downloadSpeed: '',
      uploadSpeed: '',
      price: '',
      billingCycle: 'monthly'
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (showPlanForm) {
    return (
      <div>
        <div className="page-header">
          <h1><Package size={32} /> Create Service Plan</h1>
          <button className="btn" onClick={() => {
            setShowPlanForm(false);
            resetPlanForm();
          }}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={handlePlanSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Service Type *</label>
                <select
                  name="serviceTypeId"
                  value={planFormData.serviceTypeId}
                  onChange={handlePlanInputChange}
                  required
                >
                  <option value="">Select Service Type</option>
                  {serviceTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Plan Name *</label>
                <input
                  type="text"
                  name="name"
                  value={planFormData.name}
                  onChange={handlePlanInputChange}
                  required
                  placeholder="e.g., Basic 10Mbps"
                />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={planFormData.description}
                  onChange={handlePlanInputChange}
                  rows="3"
                  placeholder="Plan description..."
                />
              </div>
              
              <div>
                <label>Download Speed *</label>
                <input
                  type="text"
                  name="downloadSpeed"
                  value={planFormData.downloadSpeed}
                  onChange={handlePlanInputChange}
                  required
                  placeholder="e.g., 10 Mbps"
                />
              </div>
              
              <div>
                <label>Upload Speed *</label>
                <input
                  type="text"
                  name="uploadSpeed"
                  value={planFormData.uploadSpeed}
                  onChange={handlePlanInputChange}
                  required
                  placeholder="e.g., 5 Mbps"
                />
              </div>
              
              <div>
                <label>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={planFormData.price}
                  onChange={handlePlanInputChange}
                  required
                  placeholder="e.g., 29.99"
                />
              </div>
              
              <div>
                <label>Billing Cycle *</label>
                <select
                  name="billingCycle"
                  value={planFormData.billingCycle}
                  onChange={handlePlanInputChange}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowPlanForm(false);
                resetPlanForm();
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <input
                    type="checkbox"
                    name="noExpiration"
                    checked={formData.noExpiration}
                    onChange={handleInputChange}
                    id="noExpirationCheckbox"
                  />
                  <label htmlFor="noExpirationCheckbox" style={{ margin: 0, fontWeight: 'normal' }}>
                    No Expiration (Indefinite)
                  </label>
                </div>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                  disabled={formData.noExpiration}
                  style={{ opacity: formData.noExpiration ? 0.5 : 1 }}
                />
              </div>

              {/* Recurring Billing Configuration Section */}
              <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Recurring Billing Configuration</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    name="recurringBillingEnabled"
                    checked={formData.recurringBillingEnabled}
                    onChange={handleInputChange}
                    id="recurringBillingCheckbox"
                  />
                  <label htmlFor="recurringBillingCheckbox" style={{ margin: 0, fontWeight: 'normal' }}>
                    Enable automatic recurring invoices for this service
                  </label>
                </div>

                {formData.recurringBillingEnabled && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                      <input
                        type="checkbox"
                        name="useDefaultBilling"
                        checked={formData.useDefaultBilling}
                        onChange={handleInputChange}
                        id="useDefaultBillingCheckbox"
                      />
                      <label htmlFor="useDefaultBillingCheckbox" style={{ margin: 0, fontWeight: 'normal' }}>
                        Use company default billing settings
                      </label>
                    </div>

                    {!formData.useDefaultBilling && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                        <div>
                          <label>Custom Billing Day (1-28)</label>
                          <input
                            type="number"
                            name="billingDayOfMonth"
                            min="1"
                            max="28"
                            value={formData.billingDayOfMonth}
                            onChange={handleInputChange}
                            placeholder="e.g., 1"
                          />
                          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            Day of month to generate invoices for this service
                          </p>
                        </div>
                        
                        <div>
                          <label>Custom Days Until Due</label>
                          <input
                            type="number"
                            name="daysUntilDue"
                            min="1"
                            max="90"
                            value={formData.daysUntilDue}
                            onChange={handleInputChange}
                            placeholder="e.g., 15"
                          />
                          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            Number of days until invoice payment is due
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleGenerateRecurringInvoices}
            disabled={generatingInvoices}
            title="Generate recurring invoices for active services"
          >
            <FileText size={20} /> {generatingInvoices ? 'Generating...' : 'Generate Invoices'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Add Service
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Service Plans ({plans.length})</h3>
          <button className="btn btn-primary" onClick={() => setShowPlanForm(true)}>
            <Plus size={20} /> Add Plan
          </button>
        </div>
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
                  <td>{service.expiration_date ? new Date(service.expiration_date).toLocaleDateString() : 'Indefinite'}</td>
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
