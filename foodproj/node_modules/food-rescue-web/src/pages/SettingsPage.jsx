import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { profile, getToken } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      
      const response = await fetch('http://localhost:3002/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-forest-800 mb-8">
        ⚙️ Settings
      </h1>

      {/* Profile Info */}
      <div className="bg-white rounded-xl border border-forest-100 p-6 mb-6">
        <h2 className="font-semibold text-lg text-forest-800 mb-4">Profile Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-forest-100">
            <span className="text-forest-600">Name</span>
            <span className="font-medium text-forest-800">{profile?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-forest-100">
            <span className="text-forest-600">Email</span>
            <span className="font-medium text-forest-800">{profile?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-forest-100">
            <span className="text-forest-600">Role</span>
            <span className="font-medium text-forest-800 capitalize">
              {profile?.role === 'restaurant' ? '🏪 Restaurant' : '🚗 Volunteer'}
            </span>
          </div>
          {profile?.address && (
            <div className="flex justify-between py-2">
              <span className="text-forest-600">Location</span>
              <span className="font-medium text-forest-800">{profile.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl border border-forest-100 p-6">
        <h2 className="font-semibold text-lg text-forest-800 mb-4">🔐 Change Password</h2>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
            />
            <p className="text-xs text-forest-500 mt-1">At least 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rescue-500 text-white py-3 rounded-lg font-semibold hover:bg-rescue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Changing Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}







