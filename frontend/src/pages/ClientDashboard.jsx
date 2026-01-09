import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientService, invoiceService, ticketService, radiusService, documentService } from '../services/api';
import { 
  ArrowLeft, User, Mail, Phone, MapPin, FileText, Package, 
  Ticket, Radio, DollarSign, Calendar, AlertCircle, Upload, Download, Trash2, FolderOpen
} from 'lucide-react';

function ClientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const loadClientData = async () => {
    try {
      const [clientRes, servicesRes, invoicesRes, ticketsRes, sessionsRes, documentsRes] = await Promise.all([
        clientService.getOne(id),
        clientService.getServices(id),
        invoiceService.getAll({ clientId: id, limit: 5 }),
        ticketService.getAll({ clientId: id, limit: 5 }),
        radiusService.getSessions().catch(() => ({ data: [] })),
        documentService.getAll(id).catch(() => ({ data: [] }))
      ]);
      
      setClient(clientRes.data);
      setServices(servicesRes.data || []);
      setInvoices(invoicesRes.data?.invoices || []);
      setTickets(ticketsRes.data?.tickets || []);
      setDocuments(documentsRes.data || []);
      
      // Filter sessions for this client's services
      const clientUsernames = servicesRes.data?.map(s => s.username) || [];
      const clientSessions = sessionsRes.data?.filter(session => 
        clientUsernames.includes(session.username)
      ) || [];
      setSessions(clientSessions);
    } catch (error) {
      console.error('Failed to load client data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('document', file);

      await documentService.upload(id, formData);
      
      // Reload documents
      const documentsRes = await documentService.getAll(id);
      setDocuments(documentsRes.data || []);
      
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert(error.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDownloadDocument = async (documentId, filename) => {
    try {
      const response = await documentService.download(id, documentId);
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentService.delete(id, documentId);
      
      // Reload documents
      const documentsRes = await documentService.getAll(id);
      setDocuments(documentsRes.data || []);
      
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (!client) {
    return (
      <div>
        <div className="page-header">
          <h1>Client Not Found</h1>
        </div>
        <div className="card">
          <p>The requested client could not be found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/clients')}>
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  const activeServices = services.filter(s => s.status === 'active').length;
  const totalInvoices = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Package size={24} color="#3b82f6" />
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Active Services</span>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{activeServices}</h2>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <DollarSign size={24} color="#10b981" />
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Invoices</span>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>${totalInvoices.toFixed(2)}</h2>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <AlertCircle size={24} color="#f59e0b" />
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pending Invoices</span>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{pendingInvoices}</h2>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Ticket size={24} color="#ef4444" />
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Open Tickets</span>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{openTickets}</h2>
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Client Information */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={20} /> Client Information
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>Client Type</label>
                    <span className={`badge badge-${(client.client_type || 'company') === 'company' ? 'info' : 'secondary'}`}>
                      {client.client_type || 'company'}
                    </span>
                  </div>
                  {(client.client_type || 'company') === 'company' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>Contact Person</label>
                      <p style={{ fontWeight: '500' }}>{client.contact_person}</p>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>
                      <Mail size={14} /> Email
                    </label>
                    <p style={{ fontWeight: '500' }}>
                      <a href={`mailto:${client.email}`} style={{ color: '#3b82f6' }}>{client.email}</a>
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>
                        <Phone size={14} /> Phone
                      </label>
                      <p style={{ fontWeight: '500' }}>{client.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>
                        <Phone size={14} /> Mobile
                      </label>
                      <p style={{ fontWeight: '500' }}>{client.mobile || 'N/A'}</p>
                    </div>
                  </div>
                  {client.address && (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>
                        <MapPin size={14} /> Address
                      </label>
                      <p style={{ fontWeight: '500' }}>
                        {client.address}
                        {client.city && `, ${client.city}`}
                        {client.state && `, ${client.state}`}
                        {client.postal_code && ` ${client.postal_code}`}
                        {client.country && `, ${client.country}`}
                      </p>
                    </div>
                  )}
                  {client.tax_id && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>Tax ID</label>
                      <p style={{ fontWeight: '500' }}>{client.tax_id}</p>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginBottom: '5px' }}>
                      <Calendar size={14} /> Created At
                    </label>
                    <p style={{ fontWeight: '500' }}>{formatDate(client.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Active Services */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={20} /> Active Services ({services.length})
                </h3>
                {services.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {services.slice(0, 5).map((service) => (
                      <div 
                        key={service.id} 
                        onClick={() => navigate('/services', { state: { clientId: id } })}
                        className="ticket-card-clickable"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong>{service.plan_name || 'Service Plan'}</strong>
                          <span className={`badge badge-${service.status === 'active' ? 'success' : 'warning'}`}>
                            {service.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          <p><strong>Username:</strong> {service.username}</p>
                          {service.ip_address && <p><strong>IP:</strong> {service.ip_address}</p>}
                          {service.service_type && <p><strong>Type:</strong> {service.service_type}</p>}
                        </div>
                      </div>
                    ))}
                    {services.length > 5 && (
                      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                        And {services.length - 5} more...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="no-data">No services found for this client.</p>
                )}
              </div>
            </div>

            {/* RADIUS Sessions */}
            {sessions.length > 0 && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Radio size={20} /> Active RADIUS Sessions ({sessions.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>NAS IP</th>
                        <th>Framed IP</th>
                        <th>Session Start</th>
                        <th>Upload</th>
                        <th>Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session, index) => (
                        <tr key={index}>
                          <td>{session.username}</td>
                          <td>{session.nasipaddress}</td>
                          <td>{session.framedipaddress}</td>
                          <td>{formatDate(session.acctstarttime)}</td>
                          <td>{formatBytes(session.acctinputoctets)}</td>
                          <td>{formatBytes(session.acctoutputoctets)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Invoices and Tickets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Recent Invoices */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} /> Recent Invoices
                </h3>
                {invoices.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {invoices.map((invoice) => (
                      <div 
                        key={invoice.id}
                        style={{ 
                          padding: '12px', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong>{invoice.invoice_number}</strong>
                          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {formatDate(invoice.issue_date)}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            ${parseFloat(invoice.total || 0).toFixed(2)}
                          </p>
                          <span className={`badge badge-${
                            invoice.status === 'paid' ? 'success' : 
                            invoice.status === 'pending' ? 'warning' : 'danger'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No invoices found for this client.</p>
                )}
              </div>

              {/* Recent Tickets */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Ticket size={20} /> Recent Tickets
                </h3>
                {tickets.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {tickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        onClick={() => navigate('/tickets', { state: { ticketId: ticket.id } })}
                        className="ticket-card-clickable"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <strong>{ticket.title}</strong>
                          <span className={`badge badge-${
                            ticket.status === 'open' ? 'warning' : 
                            ticket.status === 'in_progress' ? 'info' : 'success'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>
                          {ticket.description?.substring(0, 100)}
                          {ticket.description?.length > 100 && '...'}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                          <span className={`badge badge-${
                            ticket.priority === 'high' ? 'danger' :
                            ticket.priority === 'medium' ? 'warning' : 'secondary'
                          }`}>
                            {ticket.priority}
                          </span>
                          <span className={`badge badge-info`}>
                            {ticket.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No tickets found for this client.</p>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {client.notes && (
              <div className="card" style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} /> Notes
                </h3>
                <p style={{ whiteSpace: 'pre-wrap', color: '#64748b' }}>{client.notes}</p>
              </div>
            )}
          </>
        );

      case 'documents':
        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <FolderOpen size={20} /> Documents ({documents.length})
              </h3>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={20} />
                {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={uploadingDocument}
                />
              </label>
            </div>

            {documents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Uploaded By</th>
                      <th>Upload Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} color="#3b82f6" />
                            {doc.original_filename}
                          </div>
                        </td>
                        <td>{formatFileSize(doc.file_size)}</td>
                        <td>{doc.uploaded_by_name || 'N/A'}</td>
                        <td>{formatDate(doc.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleDownloadDocument(doc.id, doc.original_filename)}
                              title="Download"
                              style={{ padding: '0.25rem 0.5rem' }}
                            >
                              <Download size={16} />
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Delete"
                              style={{ padding: '0.25rem 0.5rem' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p>No documents uploaded yet</p>
                <p style={{ fontSize: '0.875rem' }}>Upload documents to get started</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button 
            className="btn btn-outline" 
            onClick={() => navigate('/clients')}
            style={{ marginBottom: '10px' }}
          >
            <ArrowLeft size={20} /> Back to Clients
          </button>
          <h1><User size={32} /> {client.company_name}</h1>
          <p>Client Dashboard - {client.client_code}</p>
        </div>
        <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
          {client.status}
        </span>
      </div>

      {/* Horizontal Tabs */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '0', 
        marginBottom: '20px',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: activeTab === 'overview' ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: activeTab === 'documents' ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === 'documents' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FolderOpen size={16} />
            Documents
            {documents.length > 0 && (
              <span style={{ 
                background: '#3b82f6', 
                color: 'white', 
                borderRadius: '10px', 
                padding: '2px 6px', 
                fontSize: '0.75rem' 
              }}>
                {documents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}

export default ClientDashboard;
