import { useState, useEffect } from 'react';
import { clientService } from '../services/api';
import { Users, Plus } from 'lucide-react';

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1><Users size={32} /> Clients</h1>
          <p>Manage your customer base</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} /> Add Client
        </button>
      </div>

      <div className="card">
        {clients.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Client Code</th>
                <th>Company</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Services</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.client_code}</td>
                  <td>{client.company_name}</td>
                  <td>{client.contact_person}</td>
                  <td>{client.email}</td>
                  <td>{client.phone}</td>
                  <td>{client.service_count}</td>
                  <td>
                    <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>
                      {client.status}
                    </span>
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
