import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { profile, logout, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [activeUsers, setActiveUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createType, setCreateType] = useState('org_admin'); // org_admin or restaurant
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createOrgName, setCreateOrgName] = useState(''); // For org admin
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('org_admins');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('http://localhost:3002/auth/master-admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }

      setActiveUsers(data.activeUsers || []);
      setPendingUsers(data.pendingUsers || []);
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);

    try {
      const token = await getToken();
      const endpoint = createType === 'org_admin' 
        ? 'http://localhost:3002/auth/master-admin/create-org-admin'
        : 'http://localhost:3002/auth/master-admin/create-restaurant';
      
      const body = createType === 'org_admin'
        ? { name: createName, email: createEmail, password: createPassword, organizationName: createOrgName }
        : { name: createName, email: createEmail, password: createPassword };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      const typeLabel = createType === 'org_admin' ? 'Organizational Admin' : 'Restaurant';
      setCreateSuccess(`${typeLabel} "${createName}" created successfully!`);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateOrgName('');
      
      fetchUsers();
    } catch (err) {
      console.error('Create user error:', err);
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      setActionLoading(userId);
      const token = await getToken();
      const response = await fetch('http://localhost:3002/auth/suspend-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to suspend user');
      }

      fetchUsers();
      setConfirmModal(null);
    } catch (err) {
      console.error('Suspend user error:', err);
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspendUser = async (userId) => {
    try {
      setActionLoading(userId);
      const token = await getToken();
      const response = await fetch('http://localhost:3002/auth/unsuspend-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reactivate user');
      }

      fetchUsers();
    } catch (err) {
      console.error('Unsuspend user error:', err);
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setActionLoading(userId);
      const token = await getToken();
      const response = await fetch(`http://localhost:3002/auth/delete-user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user');
      }

      fetchUsers();
      setConfirmModal(null);
    } catch (err) {
      console.error('Delete user error:', err);
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const downloadReport = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3002/reports/master-admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download report');
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'org_admin') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">🏢 Org Admin</span>;
    }
    if (role === 'restaurant') {
      return <span className="px-2 py-1 bg-rescue-100 text-rescue-700 rounded-full text-xs font-medium">🏪 Restaurant</span>;
    }
    return <span className="px-2 py-1 bg-leaf-100 text-leaf-700 rounded-full text-xs font-medium">🚗 Volunteer</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>;
    }
    if (status === 'suspended') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">🚫 Suspended</span>;
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>;
  };

  // Filter users by type
  const allUsers = [...activeUsers, ...pendingUsers];
  const orgAdmins = allUsers.filter(u => u.role === 'org_admin');
  const restaurants = allUsers.filter(u => u.role === 'restaurant');

  const renderUserCard = (user) => (
    <div
      key={user.uid}
      className={`flex items-center justify-between p-4 rounded-lg border ${
        user.status === 'suspended' 
          ? 'bg-red-50 border-red-200'
          : user.status === 'pending_onboarding'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-forest-50 border-forest-200'
      }`}
    >
      <div>
        <div className="font-medium text-forest-800">{user.name}</div>
        <div className="text-sm text-forest-500">{user.email}</div>
        {user.organizationName && (
          <div className="text-sm text-purple-600">🏢 {user.organizationName}</div>
        )}
        {user.address && (
          <div className="text-sm text-forest-400">📍 {user.address}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {getRoleBadge(user.role)}
        {getStatusBadge(user.status)}
        {user.status === 'suspended' ? (
          <button
            onClick={() => handleUnsuspendUser(user.uid)}
            disabled={actionLoading === user.uid}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {actionLoading === user.uid ? '...' : 'Reactivate'}
          </button>
        ) : (
          <button
            onClick={() => setConfirmModal({ action: 'suspend', user })}
            className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
          >
            Suspend
          </button>
        )}
        <button
          onClick={() => setConfirmModal({ action: 'delete', user })}
          className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 to-rescue-50">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-forest-800 mb-2">
              {confirmModal.action === 'delete' ? '🗑️ Delete User' : '🚫 Suspend User'}
            </h3>
            <p className="text-forest-600 mb-4">
              {confirmModal.action === 'delete' 
                ? `Are you sure you want to permanently delete "${confirmModal.user.name}"? ${confirmModal.user.role === 'org_admin' ? 'This will also delete all volunteers in this organization!' : 'This action cannot be undone.'}`
                : `Are you sure you want to suspend "${confirmModal.user.name}"? They will not be able to log in until reactivated.`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2 bg-forest-100 text-forest-700 rounded-lg hover:bg-forest-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmModal.action === 'delete' 
                  ? handleDeleteUser(confirmModal.user.uid)
                  : handleSuspendUser(confirmModal.user.uid)
                }
                disabled={actionLoading === confirmModal.user.uid}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                  confirmModal.action === 'delete'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } disabled:opacity-50`}
              >
                {actionLoading === confirmModal.user.uid 
                  ? 'Processing...' 
                  : confirmModal.action === 'delete' ? 'Delete' : 'Suspend'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-forest-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">👑</span>
            <div>
              <h1 className="font-display font-bold text-xl text-forest-800">Master Admin Dashboard</h1>
              <p className="text-sm text-forest-500">Welcome, {profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-forest-100 text-forest-700 rounded-lg text-sm font-medium hover:bg-forest-200 transition-colors flex items-center gap-2"
            >
              📊 Download Report
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-forest-500 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-purple-600">
              {orgAdmins.filter(u => u.status === 'active').length}
            </div>
            <div className="text-forest-600">Active Org Admins</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-rescue-600">
              {restaurants.filter(u => u.status === 'active').length}
            </div>
            <div className="text-forest-600">Active Restaurants</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-blue-600">
              {organizations.length}
            </div>
            <div className="text-forest-600">Organizations</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-yellow-600">
              {allUsers.filter(u => u.status === 'pending_onboarding').length}
            </div>
            <div className="text-forest-600">Pending Onboarding</div>
          </div>
        </div>

        {/* Create User Section */}
        <div className="bg-white rounded-xl border border-forest-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-forest-800">
              {showCreateForm ? 'Create New Account' : 'User Management'}
            </h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showCreateForm
                  ? 'bg-forest-100 text-forest-700 hover:bg-forest-200'
                  : 'bg-rescue-500 text-white hover:bg-rescue-600'
              }`}
            >
              {showCreateForm ? '← Back to List' : '+ Create Account'}
            </button>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateUser} className="space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                  {createSuccess}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forest-700 mb-1">Account Type</label>
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none bg-white text-forest-800"
                  >
                    <option value="org_admin">🏢 Organizational Admin</option>
                    <option value="restaurant">🏪 Restaurant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-forest-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none bg-white text-forest-800"
                    placeholder={createType === 'org_admin' ? 'Admin Name' : 'Restaurant Name'}
                  />
                </div>
                {createType === 'org_admin' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-forest-700 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={createOrgName}
                      onChange={(e) => setCreateOrgName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none bg-white text-forest-800"
                      placeholder="e.g., Downtown Food Bank, Community Helpers"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-forest-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none bg-white text-forest-800"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forest-700 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none bg-white text-forest-800"
                    placeholder="Temporary password"
                  />
                </div>
              </div>

              <div className="bg-leaf-50 border border-leaf-200 rounded-lg p-4 text-sm text-leaf-700">
                {createType === 'org_admin' 
                  ? '💡 Org Admins can add and manage volunteers within their organization.'
                  : '💡 Restaurants can post food offers and communicate with volunteers.'
                }
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full md:w-auto px-6 py-3 bg-rescue-500 text-white rounded-lg font-medium hover:bg-rescue-600 transition-colors disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : `Create ${createType === 'org_admin' ? 'Org Admin' : 'Restaurant'}`}
              </button>
            </form>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('org_admins')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'org_admins'
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  🏢 Org Admins ({orgAdmins.length})
                </button>
                <button
                  onClick={() => setActiveTab('restaurants')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'restaurants'
                      ? 'bg-rescue-500 text-white'
                      : 'bg-rescue-100 text-rescue-700 hover:bg-rescue-200'
                  }`}
                >
                  🏪 Restaurants ({restaurants.length})
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
              ) : (
                <div className="space-y-3">
                  {activeTab === 'org_admins' && (
                    orgAdmins.length === 0 ? (
                      <p className="text-forest-500 text-center py-8">
                        No organizational admins yet. Create one to get started!
                      </p>
                    ) : (
                      orgAdmins.map(renderUserCard)
                    )
                  )}
                  {activeTab === 'restaurants' && (
                    restaurants.length === 0 ? (
                      <p className="text-forest-500 text-center py-8">
                        No restaurants yet. Create one to get started!
                      </p>
                    ) : (
                      restaurants.map(renderUserCard)
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
