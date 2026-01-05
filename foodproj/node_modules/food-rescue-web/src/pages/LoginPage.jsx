import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  
  const { loginUser, loginMasterAdmin, loginOrgAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await fetch('http://localhost:3002/auth/admin-exists');
      const data = await response.json();
      setAdminExists(data.exists);
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (selectedRole === 'master_admin') {
        await loginMasterAdmin(email, password);
        navigate('/admin');
      } else if (selectedRole === 'org_admin') {
        const result = await loginOrgAdmin(email, password);
        if (result.user?.status === 'pending_onboarding') {
          navigate('/onboarding');
        } else {
          navigate('/org-admin');
        }
      } else {
        const result = await loginUser(email, password, selectedRole);
        if (result.user?.status === 'pending_onboarding') {
          navigate('/onboarding');
        } else {
          navigate(selectedRole === 'restaurant' ? '/restaurant' : '/volunteer');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const roleCards = [
    {
      id: 'restaurant',
      title: 'Restaurant',
      emoji: '🏪',
      description: 'Post surplus food for pickup',
      gradient: 'from-orange-400 via-orange-500 to-red-500',
      bgLight: 'bg-gradient-to-br from-orange-50 to-red-50',
      borderHover: 'hover:border-orange-400',
      iconBg: 'bg-gradient-to-br from-orange-400 to-red-500',
    },
    {
      id: 'volunteer',
      title: 'Volunteer',
      emoji: '🚗',
      description: 'Pick up and deliver donations',
      gradient: 'from-emerald-400 via-green-500 to-teal-500',
      bgLight: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      borderHover: 'hover:border-emerald-400',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    },
    {
      id: 'org_admin',
      title: 'Org Admin',
      emoji: '🏢',
      description: 'Manage your volunteer team',
      gradient: 'from-violet-400 via-purple-500 to-indigo-500',
      bgLight: 'bg-gradient-to-br from-violet-50 to-indigo-50',
      borderHover: 'hover:border-violet-400',
      iconBg: 'bg-gradient-to-br from-violet-400 to-indigo-500',
    },
    {
      id: 'master_admin',
      title: 'Master Admin',
      emoji: '👑',
      description: 'Platform administration',
      gradient: 'from-amber-400 via-yellow-500 to-orange-500',
      bgLight: 'bg-gradient-to-br from-amber-50 to-orange-50',
      borderHover: 'hover:border-amber-400',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    }
  ];

  // Role selection view
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="decoration-blob decoration-blob-green w-96 h-96 -top-48 -left-48 animate-float" />
        <div className="decoration-blob decoration-blob-orange w-80 h-80 top-1/3 -right-40 animate-float" style={{ animationDelay: '2s' }} />
        <div className="decoration-blob decoration-blob-blue w-72 h-72 -bottom-36 left-1/4 animate-float" style={{ animationDelay: '4s' }} />
        
        <div className="glass-card rounded-3xl w-full max-w-4xl p-8 md:p-12 animate-fade-in-up relative z-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 mb-6 shadow-lg shadow-green-500/30 animate-bounce-in">
              <span className="text-4xl">🥗</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold bg-gradient-to-r from-forest-800 via-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
              Food Rescue Platform
            </h1>
            <p className="text-forest-600 text-lg">Reducing waste, feeding communities</p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {roleCards.map((role, index) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`group relative p-5 md:p-6 rounded-2xl border-2 border-white/50 ${role.bgLight} 
                  transition-all duration-500 hover:shadow-xl hover:scale-105 ${role.borderHover}
                  text-left overflow-hidden stagger-item`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Decorative gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                {/* Icon */}
                <div className={`${role.iconBg} w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                  <span className="text-2xl md:text-3xl">{role.emoji}</span>
                </div>
                
                {/* Content */}
                <h3 className="font-display font-bold text-lg md:text-xl text-forest-800 mb-1 group-hover:text-forest-900">
                  {role.title}
                </h3>
                <p className="text-sm text-forest-600 leading-snug">
                  {role.description}
                </p>

                {/* Arrow indicator */}
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  <svg className="w-4 h-4 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Admin setup link */}
          {!adminExists && (
            <div className="text-center p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 animate-pulse-soft">
              <p className="text-emerald-700 mb-2 font-medium">✨ Welcome! Set up the first admin account to get started.</p>
              <Link
                to="/admin-setup"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 font-semibold group"
              >
                Create Master Admin Account
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}

          {/* Role hierarchy visualization */}
          <div className="mt-8 pt-6 border-t border-forest-100">
            <p className="text-center text-sm text-forest-500 mb-4">Platform Role Hierarchy</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full text-sm font-medium text-amber-800 border border-amber-200">
                👑 Master Admin
              </span>
              <svg className="w-5 h-5 text-forest-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1.5 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full text-sm font-medium text-violet-800 border border-violet-200">
                🏢 Org Admin
              </span>
              <span className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-red-100 rounded-full text-sm font-medium text-orange-800 border border-orange-200">
                🏪 Restaurant
              </span>
              <svg className="w-5 h-5 text-forest-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full text-sm font-medium text-emerald-800 border border-emerald-200">
                🚗 Volunteer
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login form view
  const currentRole = roleCards.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="decoration-blob decoration-blob-green w-96 h-96 -top-48 -right-48 animate-float" />
      <div className="decoration-blob decoration-blob-orange w-80 h-80 -bottom-40 -left-40 animate-float" style={{ animationDelay: '3s' }} />
      
      <div className="glass-card rounded-3xl w-full max-w-md p-8 md:p-10 animate-scale-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`${currentRole?.iconBg} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg animate-bounce-in`}>
            <span className="text-4xl">{currentRole?.emoji}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-forest-800 mb-2">
            {currentRole?.title} Sign In
          </h1>
          <p className="text-forest-600">{currentRole?.description}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm animate-slide-down flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-forest-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-forest-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {loading ? (
              <>
                <div className="spinner-sm border-white border-t-transparent" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Back button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setSelectedRole(null);
              setError('');
              setEmail('');
              setPassword('');
            }}
            className="inline-flex items-center gap-2 text-forest-500 hover:text-forest-700 font-medium transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Choose different role
          </button>
        </div>

        {selectedRole !== 'master_admin' && (
          <p className="mt-6 text-center text-sm text-forest-500 bg-forest-50 rounded-xl p-4">
            🔒 Don't have an account? Contact your administrator to get access.
          </p>
        )}
      </div>
    </div>
  );
}
