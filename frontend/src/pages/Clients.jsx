import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientService } from '../services/api';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';

function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    clientCode: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    taxId: '',
    notes: '',
    clientType: 'company'
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await clientService.getAll();
      setClients(response.data.clients);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Clear contactPerson when switching to personal client type
      if (name === 'clientType' && value === 'personal') {
        updated.contactPerson = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedClient) {
        await clientService.update(selectedClient.id, { ...formData, status: selectedClient.status });
        alert('Client updated successfully');
      } else {
        await clientService.create(formData);
        alert('Client created successfully');
      }
      
      setShowForm(false);
      setSelectedClient(null);
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Failed to save client:', error);
      alert(error.response?.data?.error?.message || 'Failed to save client');
    }
  };

  const handleEdit = (client, e) => {
    e.stopPropagation(); // Prevent row click when editing
    setSelectedClient(client);
    setFormData({
      clientCode: client.client_code,
      companyName: client.company_name,
      contactPerson: client.contact_person,
      email: client.email,
      phone: client.phone || '',
      mobile: client.mobile || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      postalCode: client.postal_code || '',
      country: client.country || '',
      taxId: client.tax_id || '',
      notes: client.notes || '',
      clientType: client.client_type || 'company'
    });
    setShowForm(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent row click when deleting
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      await clientService.delete(id);
      alert('Client deleted successfully');
      loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete client');
    }
  };

  const resetForm = () => {
    setFormData({
      clientCode: '',
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      taxId: '',
      notes: '',
      clientType: 'company'
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (showForm) {
    return (
      <div>
        <div className="page-header">
          <h1><Users size={32} /> {selectedClient ? 'Edit Client' : 'Create Client'}</h1>
          <button className="btn" onClick={() => {
            setShowForm(false);
            setSelectedClient(null);
            resetForm();
          }}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label>Client Code *</label>
                <input
                  type="text"
                  name="clientCode"
                  value={formData.clientCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label>Client Type *</label>
                <select
                  name="clientType"
                  value={formData.clientType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="company">Company</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              
              <div>
                <label>{formData.clientType === 'personal' ? 'Full Name *' : 'Company Name *'}</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {formData.clientType === 'company' && (
                <div>
                  <label>Contact Person *</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    required={formData.clientType === 'company'}
                  />
                </div>
              )}
              
              <div>
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label>Mobile</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label>Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Tax ID</label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
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
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false);
                setSelectedClient(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {selectedClient ? 'Update Client' : 'Create Client'}
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
          <h1><Users size={32} /> Clients</h1>
          <p>Manage your customer base</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Add Client
        </button>
      </div>

      <div className="card">
        {clients.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Client Code</th>
                <th>Type</th>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Services</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr 
                  key={client.id}
                  className="clickable-row"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <td>{client.client_code}</td>
                  <td>
                    <span className={`badge badge-${(client.client_type || 'company') === 'company' ? 'info' : 'secondary'}`}>
                      {client.client_type || 'company'}
                    </span>
                  </td>
                  <td>{client.company_name}</td>
                  <td>{(client.client_type || 'company') === 'company' ? client.contact_person : 'N/A'}</td>
                  <td>{client.email}</td>
                  <td>{client.phone}</td>
                  <td>{client.service_count}</td>
                  <td>
                    <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
                      {client.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => handleEdit(client, e)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => handleDelete(client.id, e)}
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
          <p className="no-data">No clients yet. Add your first client to get started.</p>
        )}
      </div>
    </div>
  );
}

export default Clients;
