import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminSetupPage() {
  const { loginMasterAdmin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await fetch('http://localhost:3002/auth/admin-exists');
      const data = await response.json();
      setAdminExists(data.exists);
      if (data.exists) {
        // Redirect if admin already exists
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Unable to connect to server');
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3002/auth/master-admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create master admin');
      }

      // Auto-login the admin after registration
      await loginMasterAdmin(email, password);
      navigate('/admin');
    } catch (err) {
      console.error('Admin setup error:', err);
      setError(err.message || 'Failed to create master admin account');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-forest-600">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <span className="text-5xl mb-4 block">🔒</span>
          <h1 className="font-display text-2xl font-bold text-forest-800 mb-4">
            Master Admin Already Exists
          </h1>
          <p className="text-forest-600 mb-6">
            A master administrator has already been registered for this system.
          </p>
          <p className="text-forest-500 text-sm">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">👑</span>
          <h1 className="font-display text-3xl font-bold text-forest-800 mb-2">
            Master Admin Setup
          </h1>
          <p className="text-forest-600">
            Create the master administrator account
          </p>
          <div className="mt-4 bg-leaf-50 border border-leaf-200 rounded-lg p-3 text-sm text-leaf-700">
            ⚠️ This is a one-time setup. Only one master admin can exist.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
              placeholder="Master Admin Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
              placeholder="••••••••"
            />
            <p className="text-xs text-forest-500 mt-1">At least 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-600 text-white py-3 rounded-lg font-semibold hover:bg-forest-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Master Admin...' : 'Create Master Admin Account'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-forest-100 text-center">
          <p className="text-sm text-forest-600">
            The Master Admin can create:
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-sm text-forest-500">🏢 Org Admins</span>
            <span className="text-sm text-forest-500">🏪 Restaurants</span>
          </div>
        </div>
      </div>
    </div>
  );
}
