import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ticketService, clientService, userService } from '../services/api';
import { Ticket, Plus, Eye, Trash2, MessageSquare, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

function Tickets() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [loadingTicketFromNav, setLoadingTicketFromNav] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    description: '',
    type: 'support',
    priority: 'medium',
    assignedTo: ''
  });
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    loadData();
  }, [filter, priorityFilter, typeFilter]);

  // Handle ticket navigation from ClientDashboard
  useEffect(() => {
    const loadTicketFromNavigation = async () => {
      if (location.state?.ticketId && !loadingTicketFromNav) {
        setLoadingTicketFromNav(true);
        try {
          const response = await ticketService.getOne(location.state.ticketId);
          setSelectedTicket(response.data);
          setShowDetails(true);
          // Clear the state to prevent re-triggering
          navigate('/tickets', { replace: true });
        } catch (error) {
          console.error('Failed to load ticket from navigation:', error);
        } finally {
          setLoadingTicketFromNav(false);
        }
      }
    };
    
    loadTicketFromNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const loadData = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const [ticketsRes, clientsRes, usersRes, statsRes] = await Promise.all([
        ticketService.getAll(params),
        clientService.getAll({ limit: 1000 }),
        userService.getAll(),
        ticketService.getStats()
      ]);
      
      setTickets(ticketsRes.data.tickets || []);
      setClients(clientsRes.data.clients || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load tickets');
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
      // Clean up form data: convert empty strings to null for optional UUID fields
      const cleanedData = {
        ...formData,
        clientId: formData.clientId || null,
        assignedTo: formData.assignedTo || null,
      };
      await ticketService.create(cleanedData);
      alert('Ticket created successfully');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to create ticket');
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await ticketService.update(id, updates);
      loadData();
      if (selectedTicket && selectedTicket.id === id) {
        const updated = await ticketService.getOne(id);
        setSelectedTicket(updated.data);
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
      alert('Failed to update ticket');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    
    try {
      await ticketService.delete(id);
      alert('Ticket deleted successfully');
      loadData();
      if (showDetails) setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      alert('Failed to delete ticket');
    }
  };

  const handleViewDetails = async (ticket) => {
    try {
      const response = await ticketService.getOne(ticket.id);
      setSelectedTicket(response.data);
      setShowDetails(true);
    } catch (error) {
      console.error('Failed to load ticket details:', error);
      alert('Failed to load ticket details');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await ticketService.addComment(selectedTicket.id, { comment: commentText });
      setCommentText('');
      const updated = await ticketService.getOne(selectedTicket.id);
      setSelectedTicket(updated.data);
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      title: '',
      description: '',
      type: 'support',
      priority: 'medium',
      assignedTo: ''
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      open: 'badge-primary',
      in_progress: 'badge-warning',
      pending: 'badge-info',
      resolved: 'badge-success',
      closed: 'badge-secondary'
    };
    return statusColors[status] || 'badge-secondary';
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      low: 'badge-info',
      medium: 'badge-warning',
      high: 'badge-danger',
      urgent: 'badge-danger'
    };
    return priorityColors[priority] || 'badge-secondary';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle size={16} />;
    }
    return <Clock size={16} />;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (showDetails && selectedTicket) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1><Ticket size={32} /> Ticket Details</h1>
            <p>Ticket #{selectedTicket.ticket_number}</p>
          </div>
          <button onClick={() => setShowDetails(false)} className="btn btn-secondary">
            Back to List
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{selectedTicket.title}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`badge ${getStatusBadge(selectedTicket.status)}`}>
                  {selectedTicket.status.replace('_', ' ')}
                </span>
                <span className={`badge ${getPriorityBadge(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <strong>Type:</strong> {selectedTicket.type}
              </div>
              <div>
                <strong>Created:</strong> {new Date(selectedTicket.created_at).toLocaleString()}
              </div>
              {selectedTicket.client_id ? (
                <div>
                  <strong>Client:</strong> {selectedTicket.company_name} ({selectedTicket.client_code})
                </div>
              ) : (
                <div>
                  <strong>Type:</strong> <span className="badge badge-info">Independent Ticket</span>
                </div>
              )}
              <div>
                <strong>Assigned To:</strong> {selectedTicket.assigned_username || 'Unassigned'}
              </div>
              <div>
                <strong>Created By:</strong> {selectedTicket.created_by_username}
              </div>
              {selectedTicket.resolved_at && (
                <div>
                  <strong>Resolved:</strong> {new Date(selectedTicket.resolved_at).toLocaleString()}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong>Description:</strong>
              <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{selectedTicket.description || 'No description'}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong>Status:</strong>
              <select
                value={selectedTicket.status}
                onChange={(e) => handleUpdate(selectedTicket.id, { status: e.target.value })}
                className="form-input"
                style={{ marginTop: '8px', maxWidth: '200px' }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong>Assigned To:</strong>
              <select
                value={selectedTicket.assigned_to || ''}
                onChange={(e) => handleUpdate(selectedTicket.id, { assignedTo: e.target.value || null })}
                className="form-input"
                style={{ marginTop: '8px', maxWidth: '200px' }}
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>

            <div>
              <h3 style={{ marginBottom: '16px' }}>
                <MessageSquare size={20} style={{ marginRight: '8px' }} />
                Comments ({selectedTicket.comments?.length || 0})
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map(comment => (
                    <div key={comment.id} style={{ 
                      padding: '12px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong>{comment.full_name || comment.username}</strong>
                        <span style={{ fontSize: '0.9em', color: '#666' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No comments yet</p>
                )}
              </div>

              <form onSubmit={handleAddComment}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="form-input"
                  rows="4"
                  style={{ marginBottom: '8px' }}
                />
                <button type="submit" className="btn btn-primary">
                  Add Comment
                </button>
              </form>
            </div>
          </div>

          <div className="card-footer">
            <button onClick={() => handleDelete(selectedTicket.id)} className="btn btn-danger">
              <Trash2 size={20} />
              Delete Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1><Plus size={32} /> Create Ticket</h1>
          <button onClick={() => { setShowForm(false); resetForm(); }} className="btn btn-secondary">
            Cancel
          </button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="card-body">
              <div className="form-group">
                <label>Client (Optional)</label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="">-- Independent Ticket --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} ({client.client_code})
                    </option>
                  ))}
                </select>
                <small className="form-hint">Leave empty for independent tickets (non-client related jobs)</small>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Brief description of the issue"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-input"
                  rows="5"
                  placeholder="Detailed description of the issue"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="support">Support</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="installation">Installation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Assign To</label>
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="">-- Unassigned --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-footer">
              <button type="submit" className="btn btn-primary">Create Ticket</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1><Ticket size={32} /> Support Tickets</h1>
          <p>Manage client support tickets and independent job tickets</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus size={20} />
          New Ticket
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.open_count || 0}</div>
              <div className="stat-label">Open</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <AlertCircle size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.in_progress_count || 0}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.pending_count || 0}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.resolved_count || 0}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <AlertCircle size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.urgent_count || 0}</div>
              <div className="stat-label">Urgent</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
              <Ticket size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.independent_count || 0}</div>
              <div className="stat-label">Independent</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>All Tickets</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-input">
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="form-input">
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-input">
              <option value="all">All Types</option>
              <option value="support">Support</option>
              <option value="maintenance">Maintenance</option>
              <option value="installation">Installation</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Title</th>
                <th>Client</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No tickets found. Create your first ticket to get started.
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.ticket_number}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getPriorityIcon(ticket.priority)}
                        {ticket.title}
                      </div>
                    </td>
                    <td>
                      {ticket.client_id ? (
                        <div>
                          {ticket.company_name}
                          <br />
                          <small style={{ color: '#666' }}>{ticket.client_code}</small>
                        </div>
                      ) : (
                        <span className="badge badge-info">Independent</span>
                      )}
                    </td>
                    <td>{ticket.type}</td>
                    <td>
                      <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{ticket.assigned_username || 'Unassigned'}</td>
                    <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleViewDetails(ticket)}
                          className="btn btn-sm btn-primary"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="btn btn-sm btn-danger"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Tickets;
