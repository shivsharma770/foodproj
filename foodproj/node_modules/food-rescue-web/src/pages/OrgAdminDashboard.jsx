import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OrgAdminDashboard() {
  const { profile, logout, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Create volunteer form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Main tabs
  const [mainTab, setMainTab] = useState('volunteers');
  
  // Activity data
  const [volunteerActivity, setVolunteerActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    fetchVolunteers();
  }, []);
  
  useEffect(() => {
    if (mainTab === 'activity') {
      fetchVolunteerActivity();
    }
  }, [mainTab]);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('http://localhost:3002/auth/org-admin/volunteers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch volunteers');
      }

      setActiveVolunteers(data.activeVolunteers || []);
      setPendingVolunteers(data.pendingVolunteers || []);
      setOrganization(data.organization || null);
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVolunteerActivity = async () => {
    try {
      setActivityLoading(true);
      const token = await getToken();
      const response = await fetch('http://localhost:3002/reports/org-admin/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch activity');
      }

      setVolunteerActivity(data.activity || []);
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleCreateVolunteer = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3002/auth/org-admin/create-volunteer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create volunteer');
      }

      setCreateSuccess(`Volunteer "${createName}" created successfully!`);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      
      fetchVolunteers();
    } catch (err) {
      console.error('Create volunteer error:', err);
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
        throw new Error(data.message || 'Failed to suspend volunteer');
      }

      fetchVolunteers();
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
        throw new Error(data.message || 'Failed to reactivate volunteer');
      }

      fetchVolunteers();
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
        throw new Error(data.message || 'Failed to delete volunteer');
      }

      fetchVolunteers();
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
      const response = await fetch('http://localhost:3002/reports/org-admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `org-activity-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download report');
    }
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

  const allVolunteers = [...activeVolunteers, ...pendingVolunteers];
  const suspendedVolunteers = allVolunteers.filter(v => v.status === 'suspended');
  const activeAndPending = allVolunteers.filter(v => v.status !== 'suspended');

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 to-leaf-50">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-forest-800 mb-2">
              {confirmModal.action === 'delete' ? '🗑️ Delete Volunteer' : '🚫 Suspend Volunteer'}
            </h3>
            <p className="text-forest-600 mb-4">
              {confirmModal.action === 'delete' 
                ? `Are you sure you want to permanently delete "${confirmModal.user.name}"? This action cannot be undone.`
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
            <span className="text-2xl">🏢</span>
            <div>
              <h1 className="font-display font-bold text-xl text-forest-800">
                {organization?.name || 'Organization'} Dashboard
              </h1>
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
        {/* Main Tabs */}
        <div className="flex gap-2 p-1.5 bg-forest-100/50 rounded-2xl w-fit mb-8">
          <button
            onClick={() => setMainTab('volunteers')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              mainTab === 'volunteers'
                ? 'bg-white text-forest-800 shadow-md'
                : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
            }`}
          >
            <span>👥</span>
            Volunteers
          </button>
          <button
            onClick={() => setMainTab('activity')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              mainTab === 'activity'
                ? 'bg-white text-forest-800 shadow-md'
                : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
            }`}
          >
            <span>📊</span>
            Activity
          </button>
        </div>

        {mainTab === 'volunteers' && (
          <>
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-leaf-600">
              {activeVolunteers.filter(v => v.status === 'active').length}
            </div>
            <div className="text-forest-600">Active Volunteers</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-yellow-600">
              {pendingVolunteers.filter(v => v.status === 'pending_onboarding').length}
            </div>
            <div className="text-forest-600">Pending Onboarding</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-red-600">
              {suspendedVolunteers.length}
            </div>
            <div className="text-forest-600">Suspended</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-forest-100">
            <div className="text-3xl font-bold text-blue-600">
              {allVolunteers.length}
            </div>
            <div className="text-forest-600">Total Volunteers</div>
          </div>
        </div>

        {/* Organization Info */}
        {organization && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <h3 className="font-semibold text-purple-800">{organization.name}</h3>
                <p className="text-sm text-purple-600">
                  Manage volunteers for your organization
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Volunteer Section */}
        <div className="bg-white rounded-xl border border-forest-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-forest-800">
              {showCreateForm ? 'Add New Volunteer' : 'Volunteer Management'}
            </h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showCreateForm
                  ? 'bg-forest-100 text-forest-700 hover:bg-forest-200'
                  : 'bg-leaf-500 text-white hover:bg-leaf-600'
              }`}
            >
              {showCreateForm ? '← Back to List' : '+ Add Volunteer'}
            </button>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateVolunteer} className="space-y-4">
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

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forest-700 mb-1">Volunteer Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-200 outline-none bg-white text-forest-800"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forest-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-200 outline-none bg-white text-forest-800"
                    placeholder="volunteer@example.com"
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
                    className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-200 outline-none bg-white text-forest-800"
                    placeholder="Temporary password"
                  />
                </div>
              </div>

              <div className="bg-leaf-50 border border-leaf-200 rounded-lg p-4 text-sm text-leaf-700">
                💡 The volunteer will use this email and temporary password to sign in for the first time.
                They'll be prompted to change their password and complete their profile.
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full md:w-auto px-6 py-3 bg-leaf-500 text-white rounded-lg font-medium hover:bg-leaf-600 transition-colors disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Add Volunteer'}
              </button>
            </form>
          ) : (
            <>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
              ) : (
                <div className="space-y-6">
                  {/* Suspended Volunteers */}
                  {suspendedVolunteers.length > 0 && (
                    <div>
                      <h3 className="font-medium text-red-700 mb-3">🚫 Suspended Volunteers</h3>
                      <div className="space-y-2">
                        {suspendedVolunteers.map((volunteer) => (
                          <div
                            key={volunteer.uid}
                            className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                          >
                            <div>
                              <div className="font-medium text-forest-800">{volunteer.name}</div>
                              <div className="text-sm text-forest-500">{volunteer.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(volunteer.status)}
                              <button
                                onClick={() => handleUnsuspendUser(volunteer.uid)}
                                disabled={actionLoading === volunteer.uid}
                                className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === volunteer.uid ? '...' : 'Reactivate'}
                              </button>
                              <button
                                onClick={() => setConfirmModal({ action: 'delete', user: volunteer })}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Volunteers */}
                  {pendingVolunteers.filter(v => v.status !== 'suspended').length > 0 && (
                    <div>
                      <h3 className="font-medium text-yellow-700 mb-3">⏳ Pending Onboarding</h3>
                      <div className="space-y-2">
                        {pendingVolunteers.filter(v => v.status !== 'suspended').map((volunteer) => (
                          <div
                            key={volunteer.uid}
                            className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                          >
                            <div>
                              <div className="font-medium text-forest-800">{volunteer.name}</div>
                              <div className="text-sm text-forest-500">{volunteer.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(volunteer.status)}
                              <button
                                onClick={() => setConfirmModal({ action: 'suspend', user: volunteer })}
                                className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => setConfirmModal({ action: 'delete', user: volunteer })}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Volunteers */}
                  <div>
                    <h3 className="font-medium text-forest-700 mb-3">✅ Active Volunteers</h3>
                    {activeVolunteers.filter(v => v.status !== 'suspended').length === 0 ? (
                      <p className="text-forest-500 text-center py-4">No active volunteers yet. Add your first volunteer!</p>
                    ) : (
                      <div className="space-y-2">
                        {activeVolunteers.filter(v => v.status !== 'suspended').map((volunteer) => (
                          <div
                            key={volunteer.uid}
                            className="flex items-center justify-between p-4 bg-forest-50 rounded-lg border border-forest-200"
                          >
                            <div>
                              <div className="font-medium text-forest-800">{volunteer.name}</div>
                              <div className="text-sm text-forest-500">{volunteer.email}</div>
                              {volunteer.address && (
                                <div className="text-sm text-forest-400">📍 {volunteer.address}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(volunteer.status)}
                              <button
                                onClick={() => setConfirmModal({ action: 'suspend', user: volunteer })}
                                className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => setConfirmModal({ action: 'delete', user: volunteer })}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          </>
        )}

        {/* Activity Tab */}
        {mainTab === 'activity' && (
          <div className="space-y-6">
            {/* Activity Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                <div className="text-3xl font-bold text-emerald-700">
                  {volunteerActivity.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-emerald-600">Completed Pickups</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <div className="text-3xl font-bold text-amber-700">
                  {volunteerActivity.filter(a => a.status === 'confirmed' || a.status === 'claimed').length}
                </div>
                <div className="text-amber-600">Active Pickups</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700">
                  {volunteerActivity.length}
                </div>
                <div className="text-blue-600">Total Activity</div>
              </div>
            </div>

            {/* Activity Filter */}
            <div className="flex gap-2 p-1 bg-forest-100/50 rounded-xl w-fit">
              {[
                { key: 'all', label: 'All', icon: '📋' },
                { key: 'completed', label: 'Completed', icon: '✅' },
                { key: 'active', label: 'Active', icon: '🚗' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActivityFilter(filter.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    activityFilter === filter.key
                      ? 'bg-white text-forest-800 shadow-sm'
                      : 'text-forest-500 hover:text-forest-700'
                  }`}
                >
                  <span>{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Activity List */}
            <div className="bg-white rounded-xl border border-forest-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-forest-100 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-forest-800">Volunteer Activity</h3>
                <button
                  onClick={fetchVolunteerActivity}
                  className="flex items-center gap-2 text-forest-600 hover:text-leaf-600 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {activityLoading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : volunteerActivity.length === 0 ? (
                <div className="text-center py-12 text-forest-500">
                  <div className="text-4xl mb-3">📭</div>
                  <p>No activity yet. Volunteer pickups will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-forest-100">
                  {volunteerActivity
                    .filter(activity => {
                      if (activityFilter === 'all') return true;
                      if (activityFilter === 'completed') return activity.status === 'completed';
                      if (activityFilter === 'active') return activity.status === 'confirmed' || activity.status === 'claimed';
                      return true;
                    })
                    .map((activity, index) => {
                      const statusConfig = {
                        claimed: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending', icon: '⏳' },
                        confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed', icon: '✓' },
                        completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed', icon: '✅' },
                      };
                      const config = statusConfig[activity.status] || statusConfig.claimed;
                      
                      return (
                        <div key={activity.id || index} className="px-6 py-4 hover:bg-forest-50/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-semibold text-forest-800">{activity.volunteerName}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                                  {config.icon} {config.label}
                                </span>
                              </div>
                              <div className="text-sm text-forest-600 mb-2">
                                {activity.offerTitle || 'Food Offer'}
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs text-forest-500">
                                <span className="flex items-center gap-1">
                                  <span>🏪</span>
                                  {activity.restaurantName || 'Restaurant'}
                                </span>
                                {activity.quantity && (
                                  <span className="flex items-center gap-1">
                                    <span>📦</span>
                                    {activity.quantity} portions
                                  </span>
                                )}
                                {activity.claimedAt && (
                                  <span className="flex items-center gap-1">
                                    <span>📅</span>
                                    {new Date(activity.claimedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {activity.completedAt && (
                              <div className="text-right text-xs text-forest-500">
                                <div className="font-medium text-emerald-600">Completed</div>
                                <div>{new Date(activity.completedAt).toLocaleDateString()}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

