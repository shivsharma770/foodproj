import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import OfferList from '../components/OfferList';

export default function VolunteerDashboard() {
  const { profile, getToken } = useAuth();
  const [offers, setOffers] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    fetchOffers();
    fetchMyPickups();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await api.get('/food_offers?status=open', token);
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
      if (err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError(err.message || 'Failed to load food offers');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPickups = async () => {
    try {
      const token = await getToken();
      const data = await api.get(`/food_offers?claimedBy=${profile?.profileId}`, token);
      setMyPickups(data.offers || []);
    } catch (err) {
      console.error('Error fetching my pickups:', err);
    }
  };

  const toggleAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      const token = await getToken();
      await api.post('/volunteers/availability', { available: !available }, token);
      setAvailable(!available);
    } catch (err) {
      console.error('Error updating availability:', err);
      alert(err.message || 'Failed to update availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3002/reports/volunteer', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-pickups-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download report');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-8 md:p-10 text-white">
        <div className="decoration-blob w-64 h-64 bg-white/10 -top-20 -right-20" />
        <div className="decoration-blob w-48 h-48 bg-white/10 -bottom-16 -left-16" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl animate-float">🚗</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                Welcome back, {profile?.name?.split(' ')[0] || 'Volunteer'}!
              </h1>
            </div>
            <p className="text-emerald-100 text-lg">
              Ready to make a difference? Find food offers near you.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadReport}
              className="btn-secondary !bg-white/20 !border-white/30 !text-white hover:!bg-white/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Report
            </button>
            
            <button
              onClick={toggleAvailability}
              disabled={availabilityLoading}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                available
                  ? 'bg-white text-emerald-600 shadow-lg shadow-white/30 hover:shadow-xl'
                  : 'bg-white/20 text-white border-2 border-white/30 hover:bg-white/30'
              }`}
            >
              {availabilityLoading ? (
                <>
                  <div className="spinner-sm border-current border-t-transparent" />
                  <span>Updating...</span>
                </>
              ) : available ? (
                <>
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span>Available</span>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 bg-white/50 rounded-full" />
                  <span>Go Available</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      <div className={`glass-card rounded-2xl p-5 border-l-4 transition-all duration-500 ${
        available
          ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-white/80'
          : 'border-l-gray-400 bg-gradient-to-r from-gray-50/80 to-white/80'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            available 
              ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
              : 'bg-gradient-to-br from-gray-300 to-gray-400'
          }`}>
            <span className="text-2xl">{available ? '✓' : '○'}</span>
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${available ? 'text-emerald-800' : 'text-gray-700'}`}>
              {available ? "You're Online & Available" : "You're Currently Offline"}
            </h3>
            <p className={`text-sm ${available ? 'text-emerald-600' : 'text-gray-500'}`}>
              {available
                ? "🟢 Restaurants can see you're ready for pickups"
                : "Toggle availability when you're ready to help"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Available Offers', value: offers.length, icon: '📦', color: 'from-orange-400 to-red-500' },
          { label: 'My Active Pickups', value: myPickups.filter(p => p.status !== 'completed').length, icon: '🚚', color: 'from-blue-400 to-indigo-500' },
          { label: 'Completed', value: myPickups.filter(p => p.status === 'completed').length, icon: '✅', color: 'from-emerald-400 to-green-500' },
          { label: 'Total Pickups', value: myPickups.length, icon: '📊', color: 'from-violet-400 to-purple-500' },
        ].map((stat, i) => (
          <div 
            key={stat.label} 
            className="glass-card rounded-2xl p-5 stagger-item"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <div className="text-3xl font-bold text-forest-800 stat-number">{stat.value}</div>
            <div className="text-sm text-forest-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-forest-100/50 rounded-2xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
            activeTab === 'available'
              ? 'bg-white text-forest-800 shadow-md'
              : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>📦</span>
            Available ({offers.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-white text-forest-800 shadow-md'
              : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>🚗</span>
            Active ({myPickups.filter(p => p.status !== 'completed').length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-white text-forest-800 shadow-md'
              : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>✅</span>
            Completed ({myPickups.filter(p => p.status === 'completed').length})
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === 'available' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-forest-800">
                Available Food Offers
              </h2>
              <button
                onClick={fetchOffers}
                className="flex items-center gap-2 text-forest-600 hover:text-emerald-600 font-medium transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            <OfferList
              offers={offers}
              loading={loading}
              error={error}
              onRefresh={fetchOffers}
              emptyMessage="No food offers available right now. Check back later!"
            />
          </div>
        )}

        {(activeTab === 'active' || activeTab === 'completed') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-forest-800">
                {activeTab === 'active' ? 'Active Pickups' : 'Completed Pickups'}
              </h2>
              <button
                onClick={fetchMyPickups}
                className="flex items-center gap-2 text-forest-600 hover:text-emerald-600 font-medium transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {(() => {
              const filteredPickups = activeTab === 'active' 
                ? myPickups.filter(p => p.status !== 'completed')
                : myPickups.filter(p => p.status === 'completed');
              
              if (filteredPickups.length === 0) {
                return (
                  <div className="glass-card rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-forest-100 to-forest-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">{activeTab === 'active' ? '🚗' : '✅'}</span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-forest-800 mb-2">
                      {activeTab === 'active' ? 'No active pickups' : 'No completed pickups yet'}
                    </h3>
                    <p className="text-forest-600 mb-6">
                      {activeTab === 'active' 
                        ? 'Browse available offers and claim your first pickup!'
                        : 'Complete some pickups to see them here!'}
                    </p>
                    <button
                      onClick={() => setActiveTab('available')}
                      className="btn-primary"
                    >
                      View Available Offers
                    </button>
                  </div>
                );
              }
              
              return (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPickups.map((pickup, index) => {
                    const statusConfig = {
                      claimed: { 
                        gradient: 'from-amber-400 to-orange-500', 
                        bg: 'from-amber-50 to-orange-50',
                        border: 'border-amber-200',
                        label: 'Pending Approval',
                        icon: '⏳'
                      },
                      confirmed: { 
                        gradient: 'from-emerald-400 to-green-500', 
                        bg: 'from-emerald-50 to-green-50',
                        border: 'border-emerald-200',
                        label: 'Ready for Pickup',
                        icon: '✓'
                      },
                      completed: { 
                        gradient: 'from-violet-400 to-purple-500', 
                        bg: 'from-violet-50 to-purple-50',
                        border: 'border-violet-200',
                        label: 'Completed',
                        icon: '✅'
                      },
                    };
                    const config = statusConfig[pickup.status] || statusConfig.claimed;
                    
                    return (
                      <Link
                        key={pickup.id}
                        to={`/offers/${pickup.id}`}
                        className={`group block glass-card rounded-2xl overflow-hidden border ${config.border} 
                          hover:shadow-xl transition-all duration-300 stagger-item`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {/* Status bar */}
                        <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
                        
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-lg text-forest-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                              {pickup.title}
                            </h3>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${config.bg} ${config.border} border`}>
                              <span>{config.icon}</span>
                              {config.label}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-forest-600 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">🏪</span>
                              <span>{pickup.restaurantName || 'Restaurant'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">📦</span>
                              <span>{pickup.quantity} portions</span>
                            </div>
                            {pickup.completedAt && (
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center">📅</span>
                                <span>Completed {new Date(pickup.completedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-forest-100 flex items-center justify-between">
                            <span className="text-sm text-forest-500">
                              {pickup.status === 'confirmed' ? 'Ready now!' : 
                               pickup.status === 'claimed' ? 'Awaiting approval' : 
                               pickup.status === 'completed' ? 'Successfully delivered' : 'View details'}
                            </span>
                            <span className="text-emerald-600 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                              View
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
