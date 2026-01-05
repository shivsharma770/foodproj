import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import Chat from '../components/Chat';

export default function PickupDetailPage() {
  const { pickupId } = useParams();
  const navigate = useNavigate();
  const { getToken, isRestaurant, isVolunteer, profile } = useAuth();
  
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchPickup();
  }, [pickupId]);

  const fetchPickup = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await api.get(`/pickups/${pickupId}`, token);
      setPickup(data.pickup);
    } catch (err) {
      console.error('Error fetching pickup:', err);
      setError('Unable to load pickup details');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this pickup as complete? This confirms the volunteer successfully picked up the food.')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/pickups/${pickupId}/complete`, {}, token);
      
      // Show success message and redirect
      alert('Pickup completed successfully! Thank you for reducing food waste. 🌿');
      navigate('/restaurant');
    } catch (err) {
      console.error('Error completing pickup:', err);
      setError(err.message || 'Failed to complete pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/pickups/${pickupId}/cancel`, { reason: cancelReason }, token);
      
      // Show success message and redirect
      alert('Pickup cancelled. The offer is now available for other volunteers.');
      navigate('/restaurant');
    } catch (err) {
      console.error('Error cancelling pickup:', err);
      setError(err.message || 'Failed to cancel pickup');
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      claimed: 'bg-leaf-100 text-leaf-700 border-leaf-200',
      completed: 'bg-forest-100 text-forest-700 border-forest-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !pickup) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-red-600 hover:text-red-800 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!pickup) {
    return (
      <div className="text-center py-12">
        <p className="text-forest-600">Pickup not found</p>
      </div>
    );
  }

  // Determine the other party for chat
  const otherPartyName = isRestaurant 
    ? pickup.volunteerName || pickup.volunteer?.name || 'Volunteer'
    : pickup.restaurant?.name || 'Restaurant';
  const otherPartyRole = isRestaurant ? 'volunteer' : 'restaurant';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-forest-600 hover:text-rescue-600 transition-colors"
      >
        <span className="mr-2">←</span>
        Back
      </button>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-forest-100 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-forest-800">
                {pickup.offer?.title || 'Pickup Details'}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border capitalize ${getStatusBadge(pickup.status)}`}>
                {pickup.status}
              </span>
            </div>
            <p className="text-forest-600">{pickup.offer?.description}</p>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-forest-500">Quantity:</span>
                <span className="ml-2 font-medium text-forest-800">{pickup.offer?.quantity} portions</span>
              </div>
              <div>
                <span className="text-forest-500">Claimed:</span>
                <span className="ml-2 font-medium text-forest-800">
                  {new Date(pickup.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Restaurant Info (for volunteers) */}
          {isVolunteer && pickup.restaurant && (
            <div className="bg-forest-50 rounded-xl p-4 min-w-[200px]">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">🏪</span>
                <div>
                  <h3 className="font-semibold text-forest-800">{pickup.restaurant.name}</h3>
                  <p className="text-sm text-forest-600">Restaurant</p>
                </div>
              </div>
              <p className="text-sm text-forest-600">{pickup.restaurant.address}</p>
              {pickup.restaurant.contactPhone && (
                <p className="text-sm text-forest-600 mt-1">📞 {pickup.restaurant.contactPhone}</p>
              )}
            </div>
          )}

          {/* Volunteer Info (for restaurants) */}
          {isRestaurant && (
            <div className="bg-rescue-50 rounded-xl p-4 min-w-[200px]">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">🚗</span>
                <div>
                  <h3 className="font-semibold text-forest-800">
                    {pickup.volunteerName || pickup.volunteer?.name || 'Volunteer'}
                  </h3>
                  <p className="text-sm text-forest-600">Volunteer</p>
                </div>
              </div>
              {pickup.volunteer?.phone && (
                <p className="text-sm text-forest-600">📞 {pickup.volunteer.phone}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Controls */}
      {isRestaurant && pickup.status === 'claimed' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-forest-100 p-6">
          <h2 className="text-lg font-semibold text-forest-800 mb-4">Verification Controls</h2>
          <p className="text-forest-600 mb-4">
            Once the volunteer arrives and picks up the food, mark the pickup as complete. 
            If there are any issues, you can cancel the claim.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="flex items-center px-6 py-3 bg-rescue-500 text-white rounded-xl font-semibold hover:bg-rescue-600 transition-all hover:shadow-md disabled:opacity-50"
            >
              <span className="mr-2">✓</span>
              Mark as Complete
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="flex items-center px-6 py-3 bg-white border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <span className="mr-2">✕</span>
              Cancel Claim
            </button>
          </div>
        </div>
      )}

      {/* Completed/Cancelled Status */}
      {pickup.status === 'completed' && (
        <div className="bg-rescue-50 border border-rescue-200 rounded-2xl p-6 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-xl font-semibold text-rescue-700 mb-2">Pickup Completed!</h3>
          <p className="text-rescue-600">
            Thank you for helping reduce food waste. This pickup was successfully completed on{' '}
            {new Date(pickup.completedAt).toLocaleDateString()}.
          </p>
        </div>
      )}

      {pickup.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <span className="text-4xl mb-3 block">❌</span>
          <h3 className="text-xl font-semibold text-red-700 mb-2">Pickup Cancelled</h3>
          <p className="text-red-600">
            This pickup was cancelled. 
            {pickup.cancelReason && <span> Reason: {pickup.cancelReason}</span>}
          </p>
        </div>
      )}

      {/* Chat Section - Only show for active pickups */}
      {pickup.status === 'claimed' && (
        <div>
          <h2 className="text-lg font-semibold text-forest-800 mb-4">
            💬 Messages with {otherPartyName}
          </h2>
          <Chat 
            pickupId={pickupId} 
            otherPartyName={otherPartyName}
            otherPartyRole={otherPartyRole}
          />
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
            <h3 className="text-xl font-semibold text-forest-800 mb-4">Cancel Pickup Claim</h3>
            <p className="text-forest-600 mb-4">
              Are you sure you want to cancel this volunteer's claim? The offer will become available again for other volunteers.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-forest-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., No-show, timing issues..."
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none text-forest-800"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-forest-200 text-forest-600 rounded-lg hover:bg-forest-50 transition-colors"
              >
                Keep Claim
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

