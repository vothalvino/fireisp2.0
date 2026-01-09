import { useState, useEffect } from 'react';
import { invoiceService, clientService } from '../services/api';
import { FileText, Plus, Eye, Trash2, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const [invoicesRes, clientsRes] = await Promise.all([
        invoiceService.getAll(params),
        clientService.getAll({ limit: 1000 })
      ]);
      setInvoices(invoicesRes.data.invoices);
      setClients(clientsRes.data.clients);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index][field] = value;
      
      if (field === 'quantity' || field === 'unitPrice') {
        items[index].total = items[index].quantity * items[index].unitPrice;
      }
      
      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;
      
      return {
        ...prev,
        items,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2)
      };
    });
  };

  const removeItem = (index) => {
    setFormData(prev => {
      const items = prev.items.filter((_, i) => i !== index);
      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;
      
      return {
        ...prev,
        items,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2)
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedInvoice) {
        await invoiceService.update(selectedInvoice.id, formData);
        alert('Invoice updated successfully');
      } else {
        await invoiceService.create(formData);
        alert('Invoice created successfully');
      }
      
      setShowForm(false);
      setSelectedInvoice(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert('Failed to save invoice');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await invoiceService.delete(id);
      alert('Invoice deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.client_id,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      notes: invoice.notes || '',
      items: []
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      clientId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: '',
      items: []
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'orange',
      paid: 'green',
      overdue: 'red',
      cancelled: 'gray'
    };
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        backgroundColor: colors[status] || 'gray',
        color: 'white'
      }}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (showForm) {
    return (
      <div>
        <div className="page-header">
          <h1><FileText size={32} /> {selectedInvoice ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <button className="btn" onClick={() => {
            setShowForm(false);
            setSelectedInvoice(null);
            resetForm();
          }}>Cancel</button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label>Invoice Number *</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
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
                <label>Issue Date *</label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label>Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <h3>Invoice Items</h3>
            <button type="button" className="btn btn-secondary mb-2" onClick={addItem}>
              <Plus size={16} /> Add Item
            </button>

            {formData.items.map((item, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto', 
                gap: '10px', 
                marginBottom: '10px',
                alignItems: 'end'
              }}>
                <div>
                  <label>Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Service description"
                    required
                  />
                </div>
                
                <div>
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label>Unit Price</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label>Total</label>
                  <input
                    type="number"
                    value={item.total}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                </div>
                
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeItem(index)}
                  style={{ marginBottom: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p><strong>Subtotal:</strong> ${formData.subtotal}</p>
                  <p><strong>Tax (10%):</strong> ${formData.tax}</p>
                  <p style={{ fontSize: '18px' }}><strong>Total:</strong> ${formData.total}</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional notes..."
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false);
                setSelectedInvoice(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {selectedInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><FileText size={32} /> Invoices</h1>
          <p>Manage billing and invoices</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={() => navigate('/payments')}>
            <DollarSign size={20} /> Register Payment
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`btn ${filter === 'pending' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`btn ${filter === 'paid' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('paid')}
          >
            Paid
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Invoices ({invoices.length})</h3>
        {invoices.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{invoice.company_name}</td>
                  <td>{new Date(invoice.issue_date).toLocaleDateString()}</td>
                  <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                  <td>${parseFloat(invoice.total).toFixed(2)}</td>
                  <td>{getStatusBadge(invoice.status)}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleEdit(invoice)}
                      title="Edit"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(invoice.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No invoices found</p>
        )}
      </div>
    </div>
  );
}

export default Invoices;
