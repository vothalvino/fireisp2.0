import { useState, useEffect } from 'react';
import { paymentService, clientService } from '../services/api';
import { DollarSign, Plus, Eye, CreditCard } from 'lucide-react';

function Payments() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [clientCredit, setClientCredit] = useState(0);
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientData(selectedClient);
    }
  }, [selectedClient]);

  useEffect(() => {
    // Auto-calculate total from selected invoices
    const total = Object.keys(selectedInvoices)
      .filter(id => selectedInvoices[id].selected)
      .reduce((sum, id) => {
        const amount = parseFloat(selectedInvoices[id].amount || 0);
        return sum + amount;
      }, 0);
    
    const currentAmount = parseFloat(formData.amount);
    if (!formData.amount || currentAmount === 0 || isNaN(currentAmount)) {
      setFormData(prev => ({ ...prev, amount: total.toFixed(2) }));
    }
  }, [selectedInvoices]);

  const loadClients = async () => {
    try {
      const res = await clientService.getAll({ limit: 1000 });
      setClients(res.data.clients);
    } catch (error) {
      console.error('Failed to load clients:', error);
      alert('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async (clientId) => {
    try {
      const [invoicesRes, creditRes] = await Promise.all([
        paymentService.getUnpaidInvoices(clientId),
        paymentService.getClientCredit(clientId)
      ]);
      
      setUnpaidInvoices(invoicesRes.data);
      setClientCredit(creditRes.data.creditBalance);
      
      // Initialize selected invoices with all invoices selected by default
      const selected = {};
      invoicesRes.data.forEach(invoice => {
        selected[invoice.id] = {
          selected: true,
          amount: parseFloat(invoice.amount_due).toFixed(2)
        };
      });
      setSelectedInvoices(selected);
    } catch (error) {
      console.error('Failed to load client data:', error);
      alert('Failed to load client data');
    }
  };

  const handleClientSelect = (e) => {
    const clientId = e.target.value;
    setFormData(prev => ({ ...prev, clientId }));
    setSelectedClient(clientId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => ({
      ...prev,
      [invoiceId]: {
        ...prev[invoiceId],
        selected: !prev[invoiceId].selected
      }
    }));
  };

  const updateInvoiceAmount = (invoiceId, amount) => {
    setSelectedInvoices(prev => ({
      ...prev,
      [invoiceId]: {
        ...prev[invoiceId],
        amount: amount
      }
    }));
  };

  const calculateTotals = () => {
    const selectedTotal = Object.keys(selectedInvoices)
      .filter(id => selectedInvoices[id].selected)
      .reduce((sum, id) => {
        return sum + parseFloat(selectedInvoices[id].amount || 0);
      }, 0);
    
    const paymentAmount = parseFloat(formData.amount || 0);
    const creditAmount = Math.max(0, paymentAmount - selectedTotal);
    
    return {
      selectedTotal: selectedTotal.toFixed(2),
      paymentAmount: paymentAmount.toFixed(2),
      creditAmount: creditAmount.toFixed(2),
      newCreditBalance: (clientCredit + creditAmount).toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const totals = calculateTotals();
    const paymentAmount = parseFloat(formData.amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Payment amount must be a valid number greater than zero');
      return;
    }
    
    // Build invoice allocations from selected invoices
    const invoiceAllocations = Object.keys(selectedInvoices)
      .filter(id => selectedInvoices[id].selected)
      .map(id => {
        const amount = parseFloat(selectedInvoices[id].amount || 0);
        return {
          invoiceId: id,
          amount: isNaN(amount) ? 0 : amount
        };
      })
      .filter(allocation => allocation.amount > 0); // Only include valid positive amounts
    
    try {
      const paymentData = {
        ...formData,
        amount: paymentAmount,
        invoiceAllocations: invoiceAllocations.length > 0 ? invoiceAllocations : undefined
      };
      
      const response = await paymentService.registerPayment(paymentData);
      
      let message = `Payment of $${paymentAmount.toFixed(2)} registered successfully!\n`;
      message += `Amount allocated to invoices: $${response.data.totalAllocated.toFixed(2)}\n`;
      
      if (response.data.creditAdded > 0) {
        message += `Credit added: $${response.data.creditAdded.toFixed(2)}\n`;
        message += `New credit balance: $${response.data.currentCredit.toFixed(2)}`;
      }
      
      alert(message);
      
      // Reset form
      setShowForm(false);
      setSelectedClient(null);
      setUnpaidInvoices([]);
      setSelectedInvoices({});
      setFormData({
        clientId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        transactionId: '',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to register payment:', error);
      alert('Failed to register payment: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (showForm) {
    const totals = calculateTotals();
    
    return (
      <div>
        <div className="page-header">
          <h1><DollarSign size={32} /> Register Payment</h1>
          <button className="btn" onClick={() => {
            setShowForm(false);
            setSelectedClient(null);
            setUnpaidInvoices([]);
            setSelectedInvoices({});
          }}>Cancel</button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label>Client *</label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleClientSelect}
                  required
                  disabled={selectedClient}
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
                <label>Payment Date *</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label>Payment Method *</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="mobile_payment">Mobile Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label>Transaction ID</label>
                <input
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleInputChange}
                  placeholder="Optional reference number"
                />
              </div>
            </div>

            {selectedClient && (
              <>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>
                    <CreditCard size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Current Credit Balance: ${clientCredit.toFixed(2)}
                  </h4>
                </div>

                {unpaidInvoices.length > 0 ? (
                  <>
                    <h3>Unpaid Invoices</h3>
                    <p style={{ color: '#666', marginBottom: '15px' }}>
                      Select invoices to pay and adjust amounts if needed. Unselect invoices that should not be paid.
                    </p>
                    
                    <div style={{ marginBottom: '20px' }}>
                      {unpaidInvoices.map(invoice => (
                        <div 
                          key={invoice.id}
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'auto 2fr 1fr 1fr', 
                            gap: '15px',
                            padding: '12px',
                            marginBottom: '10px',
                            backgroundColor: selectedInvoices[invoice.id]?.selected ? '#f0fdf4' : '#f9fafb',
                            border: selectedInvoices[invoice.id]?.selected ? '2px solid #22c55e' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            alignItems: 'center'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedInvoices[invoice.id]?.selected || false}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          
                          <div>
                            <div style={{ fontWeight: 'bold' }}>Invoice #{invoice.invoice_number}</div>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              Due: {new Date(invoice.due_date).toLocaleDateString()} | 
                              Status: <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                backgroundColor: invoice.status === 'pending' ? '#fef3c7' : '#fecaca',
                                color: '#000',
                                fontSize: '12px'
                              }}>{invoice.status}</span>
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', color: '#666' }}>Amount Due</div>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                              ${parseFloat(invoice.amount_due).toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '12px', color: '#666' }}>Pay Amount</label>
                            <input
                              type="number"
                              value={selectedInvoices[invoice.id]?.amount || ''}
                              onChange={(e) => updateInvoiceAmount(invoice.id, e.target.value)}
                              min="0"
                              max={invoice.amount_due}
                              step="0.01"
                              disabled={!selectedInvoices[invoice.id]?.selected}
                              style={{ 
                                width: '100%',
                                backgroundColor: selectedInvoices[invoice.id]?.selected ? 'white' : '#f5f5f5'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: 0, color: '#666' }}>
                      No unpaid invoices. Payment will be added as credit.
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '20px' }}>
                  <label>Payment Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Enter payment amount"
                    style={{ fontSize: '18px', fontWeight: 'bold' }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    You can edit this amount. The default is the sum of selected invoices.
                  </p>
                </div>

                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '8px',
                  border: '2px solid #fbbf24'
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Payment Summary</h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Selected Invoices Total:</span>
                      <strong>${totals.selectedTotal}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Payment Amount:</span>
                      <strong>${totals.paymentAmount}</strong>
                    </div>
                    {parseFloat(totals.creditAmount) > 0 && (
                      <>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid #d97706'
                        }}>
                          <span>Will be added as Credit:</span>
                          <strong style={{ color: '#16a34a' }}>+${totals.creditAmount}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>New Credit Balance:</span>
                          <strong style={{ color: '#16a34a' }}>${totals.newCreditBalance}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <div style={{ marginTop: '20px' }}>
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional notes about this payment..."
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false);
                setSelectedClient(null);
                setUnpaidInvoices([]);
                setSelectedInvoices({});
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Register Payment
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
          <h1><DollarSign size={32} /> Payments</h1>
          <p>Register and manage client payments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Register Payment
        </button>
      </div>

      <div className="card">
        <h3>Payment Management</h3>
        <p>Use the "Register Payment" button to record a new payment. You can:</p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li>Select which invoices to pay</li>
          <li>Adjust payment amounts for each invoice</li>
          <li>Any overpayment is automatically converted to credit</li>
          <li>Register payments without invoices (direct credit)</li>
        </ul>
      </div>
    </div>
  );
}

export default Payments;
