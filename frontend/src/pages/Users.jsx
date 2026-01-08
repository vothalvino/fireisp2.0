import { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { Users as UsersIcon, Plus, Edit, Trash2, Key, UserCheck, UserX } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userService.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedUser) {
        await userService.update(selectedUser.id, formData);
        alert('User updated successfully');
      } else {
        if (!formData.password) {
          alert('Password is required for new users');
          return;
        }
        await userService.create(formData);
        alert('User created successfully');
      }
      
      setShowForm(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      alert(error.response?.data?.error?.message || 'Failed to save user');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      await userService.changePassword(selectedUser.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully');
      setShowPasswordForm(false);
      setSelectedUser(null);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
      alert(error.response?.data?.error?.message || 'Failed to change password');
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.full_name || '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userService.delete(id);
      alert('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.updateStatus(user.id, { isActive: !user.is_active });
      alert(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert(error.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setShowPasswordForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'user'
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (showPasswordForm) {
    return (
      <div>
        <div className="page-header">
          <h1><Key size={32} /> Change Password</h1>
          <button className="btn" onClick={() => {
            setShowPasswordForm(false);
            setSelectedUser(null);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          }}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <form onSubmit={handlePasswordSubmit}>
            <div>
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                required
              />
            </div>
            
            <div>
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                minLength="6"
                required
              />
            </div>
            
            <div>
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                minLength="6"
                required
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowPasswordForm(false);
                setSelectedUser(null);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Change Password
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
          <h1><UsersIcon size={32} /> {selectedUser ? 'Edit User' : 'Create User'}</h1>
          <button className="btn" onClick={() => {
            setShowForm(false);
            setSelectedUser(null);
            resetForm();
          }}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
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
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
              />
            </div>
            
            {!selectedUser && (
              <div>
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  minLength="6"
                  required={!selectedUser}
                />
              </div>
            )}
            
            <div>
              <label>Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => {
                setShowForm(false);
                setSelectedUser(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {selectedUser ? 'Update User' : 'Create User'}
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
          <h1><UsersIcon size={32} /> Users</h1>
          <p>Manage system users and permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="card">
        <h3>System Users ({users.length})</h3>
        {users.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.full_name || '-'}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: user.role === 'admin' ? '#6366f1' : '#64748b',
                      color: 'white'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: user.is_active ? 'green' : 'red',
                      color: 'white'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleChangePassword(user)}
                        title="Change Password"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleToggleStatus(user)}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(user.id)}
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
          <p>No users found</p>
        )}
      </div>
    </div>
  );
}

export default Users;
