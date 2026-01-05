import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import OfferList from '../components/OfferList';

export default function RestaurantDashboard() {
  const { profile, getToken } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [availableVolunteers, setAvailableVolunteers] = useState(0);

  useEffect(() => {
    fetchOffers();
    fetchAvailableVolunteers();
    const interval = setInterval(fetchAvailableVolunteers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAvailableVolunteers = async () => {
    try {
      const token = await getToken();
      const data = await api.get('/volunteers/available-count', token);
      setAvailableVolunteers(data.count || 0);
    } catch (err) {
      console.error('Error fetching available volunteers:', err);
    }
  };

  const downloadReport = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3002/reports/restaurant', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-offers-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download report');
    }
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await api.get(`/food_offers?restaurantId=${profile?.profileId}`, token);
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

  const handleRemoveOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to remove this offer?')) return;

    try {
      const token = await getToken();
      await api.post(`/food_offers/${offerId}/cancel`, {}, token);
      fetchOffers();
    } catch (err) {
      console.error('Error removing offer:', err);
      alert(err.message || 'Failed to remove offer');
    }
  };

  const handleRejectClaim = async (offerId) => {
    if (!window.confirm('Reject this claim? The offer will become available again.')) return;

    try {
      const token = await getToken();
      await api.post(`/food_offers/${offerId}/reject`, {}, token);
      fetchOffers();
    } catch (err) {
      console.error('Error rejecting claim:', err);
      alert(err.message || 'Failed to reject claim');
    }
  };

  const handleConfirmClaim = async (offerId) => {
    try {
      const token = await getToken();
      await api.post(`/food_offers/${offerId}/confirm`, {}, token);
      fetchOffers();
    } catch (err) {
      console.error('Error confirming claim:', err);
      alert(err.message || 'Failed to confirm claim');
    }
  };

  const handleCompleteClaim = async (offerId) => {
    if (!window.confirm('Mark this pickup as complete?')) return;

    try {
      const token = await getToken();
      await api.post(`/food_offers/${offerId}/complete`, {}, token);
      alert('🎉 Pickup completed! Thank you for reducing food waste!');
      fetchOffers();
    } catch (err) {
      console.error('Error completing pickup:', err);
      alert(err.message || 'Failed to complete pickup');
    }
  };

  const filteredOffers = offers.filter(offer => {
    if (filter === 'all') return true;
    return offer.status === filter;
  });

  const stats = {
    open: offers.filter(o => o.status === 'open').length,
    pending: offers.filter(o => o.status === 'claimed').length,
    confirmed: offers.filter(o => o.status === 'confirmed').length,
    completed: offers.filter(o => o.status === 'completed').length
  };

  const filterTabs = [
    { key: 'all', label: 'All', icon: '📋', count: offers.length },
    { key: 'open', label: 'Open', icon: '🟢', count: stats.open },
    { key: 'claimed', label: 'Pending', icon: '⏳', count: stats.pending },
    { key: 'confirmed', label: 'Confirmed', icon: '✓', count: stats.confirmed },
    { key: 'completed', label: 'Completed', icon: '✅', count: stats.completed },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 md:p-10 text-white">
        <div className="decoration-blob w-64 h-64 bg-white/10 -top-20 -right-20" />
        <div className="decoration-blob w-48 h-48 bg-white/10 -bottom-16 -left-16" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl animate-float">🏪</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                Welcome, {profile?.name?.split(' ')[0] || 'Restaurant'}!
              </h1>
            </div>
            <p className="text-orange-100 text-lg">
              Turn surplus food into community impact
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
              Report
            </button>
            
            <Link
              to="/restaurant/create"
              className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold shadow-lg shadow-white/30 hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
            >
              <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              Create Offer
            </Link>
          </div>
        </div>
      </div>

      {/* Live Volunteer Counter */}
      <div className={`glass-card rounded-2xl p-5 border-l-4 transition-all duration-500 ${
        availableVolunteers > 0
          ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-white/80'
          : 'border-l-gray-300 bg-gradient-to-r from-gray-50/80 to-white/80'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              availableVolunteers > 0 
                ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                : 'bg-gradient-to-br from-gray-300 to-gray-400'
            }`}>
              <span className="text-2xl">{availableVolunteers > 0 ? '🚗' : '😴'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${availableVolunteers > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {availableVolunteers}
                </span>
                <span className={`text-lg font-medium ${availableVolunteers > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {availableVolunteers === 1 ? 'Volunteer' : 'Volunteers'} Available
                </span>
              </div>
              <p className={`text-sm ${availableVolunteers > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                {availableVolunteers > 0 
                  ? 'Ready to pick up your food offers right now!' 
                  : 'No volunteers currently online'}
              </p>
            </div>
          </div>
          {availableVolunteers > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-emerald-700">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Offers', value: stats.open, icon: '🟢', gradient: 'from-emerald-400 to-green-500', bg: 'from-emerald-50 to-green-50' },
          { label: 'Pending Approval', value: stats.pending, icon: '⏳', gradient: 'from-amber-400 to-orange-500', bg: 'from-amber-50 to-orange-50' },
          { label: 'Confirmed', value: stats.confirmed, icon: '✓', gradient: 'from-blue-400 to-indigo-500', bg: 'from-blue-50 to-indigo-50' },
          { label: 'Completed', value: stats.completed, icon: '✅', gradient: 'from-violet-400 to-purple-500', bg: 'from-violet-50 to-purple-50' },
        ].map((stat, i) => (
          <div 
            key={stat.label}
            className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${stat.bg} stagger-item`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-lg`}>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <div className="text-3xl font-bold text-forest-800 stat-number">{stat.value}</div>
            <div className="text-sm text-forest-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1.5 bg-forest-100/50 rounded-2xl overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all duration-300 ${
              filter === tab.key
                ? 'bg-white text-forest-800 shadow-md'
                : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              filter === tab.key ? 'bg-forest-100 text-forest-700' : 'bg-forest-200/50 text-forest-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-forest-800">
            {filter === 'all' ? 'All Offers' : filterTabs.find(t => t.key === filter)?.label + ' Offers'}
          </h2>
          <button
            onClick={fetchOffers}
            className="flex items-center gap-2 text-forest-600 hover:text-orange-600 font-medium transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <OfferList
          offers={filteredOffers}
          loading={loading}
          error={error}
          onRemove={handleRemoveOffer}
          onReject={handleRejectClaim}
          onConfirm={handleConfirmClaim}
          onComplete={handleCompleteClaim}
          onRefresh={fetchOffers}
          emptyMessage={
            filter === 'all'
              ? "You haven't created any offers yet. Click 'Create Offer' to get started!"
              : `No ${filterTabs.find(t => t.key === filter)?.label.toLowerCase()} offers`
          }
        />
      </div>
    </div>
  );
}
