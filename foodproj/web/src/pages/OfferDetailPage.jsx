import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';
import ChatWindow from '../components/ChatWindow';

export default function OfferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken, isRestaurant, isVolunteer, profile } = useAuth();
  
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchOffer();
  }, [id]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await api.get(`/food_offers/${id}`, token);
      setOffer(data.offer);
    } catch (err) {
      console.error('Error fetching offer:', err);
      setError('Unable to load offer details');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!window.confirm('Claim this food offer? The restaurant will be notified.')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/food_offers/${id}/claim`, {}, token);
      fetchOffer();
    } catch (err) {
      console.error('Error claiming offer:', err);
      setError(err.message || 'Failed to claim offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/food_offers/${id}/confirm`, {}, token);
      fetchOffer();
    } catch (err) {
      console.error('Error confirming pickup:', err);
      setError(err.message || 'Failed to confirm pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this claim? The offer will become available again.')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/food_offers/${id}/reject`, {}, token);
      fetchOffer();
    } catch (err) {
      console.error('Error rejecting pickup:', err);
      setError(err.message || 'Failed to reject pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this pickup as complete?')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/food_offers/${id}/complete`, {}, token);
      alert('🎉 Pickup completed! Thank you for reducing food waste!');
      navigate(isRestaurant ? '/restaurant' : '/volunteer');
    } catch (err) {
      console.error('Error completing pickup:', err);
      setError(err.message || 'Failed to complete pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPickup = async () => {
    if (!window.confirm('Cancel your claim on this offer?')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      await api.post(`/food_offers/${id}/cancel_pickup`, {}, token);
      fetchOffer();
    } catch (err) {
      console.error('Error cancelling pickup:', err);
      setError(err.message || 'Failed to cancel pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-rescue-100 text-rescue-700 border-rescue-200',
      claimed: 'bg-amber-100 text-amber-700 border-amber-200',
      confirmed: 'bg-leaf-100 text-leaf-700 border-leaf-200',
      completed: 'bg-forest-100 text-forest-700 border-forest-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return styles[status] || styles.open;
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      claimed: 'Pending Approval',
      confirmed: '✓ Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  // Check if volunteer can cancel (24 hour rule)
  const canCancelPickup = () => {
    if (!offer?.expirationTime) return true;
    const pickupTime = new Date(offer.expirationTime);
    const now = new Date();
    const msUntilPickup = pickupTime.getTime() - now.getTime();
    const MS_24H = 24 * 60 * 60 * 1000;
    return msUntilPickup >= MS_24H;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !offer) {
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

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p className="text-forest-600">Offer not found</p>
      </div>
    );
  }

  const isOwner = isRestaurant && offer.restaurantId === profile?.profileId;
  const isClaimer = isVolunteer && offer.claimedBy === profile?.profileId;

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

      {/* Main card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-forest-100 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-forest-800 mb-2">
                {offer.title}
              </h1>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(offer.status)}`}>
                {getStatusLabel(offer.status)}
              </span>
            </div>
          </div>

          {/* Description */}
          {offer.description && (
            <p className="text-forest-600 mb-6">{offer.description}</p>
          )}

          {/* Details grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center text-forest-700">
                <span className="mr-3 text-xl">📦</span>
                <div>
                  <div className="text-sm text-forest-500">Quantity</div>
                  <div className="font-medium">{offer.quantity} portions</div>
                </div>
              </div>

              {offer.foodType && (
                <div className="flex items-center text-forest-700">
                  <span className="mr-3 text-xl">🍽️</span>
                  <div>
                    <div className="text-sm text-forest-500">Food Type</div>
                    <div className="font-medium">{offer.foodType}</div>
                  </div>
                </div>
              )}

              {offer.expirationTime && (
                <div className="flex items-center text-forest-700">
                  <span className="mr-3 text-xl">⏰</span>
                  <div>
                    <div className="text-sm text-forest-500">Pickup By</div>
                    <div className="font-medium">
                      {new Date(offer.expirationTime).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Restaurant Info - check both nested object and direct properties */}
              {(offer.restaurant || offer.restaurantName) && (
                <div className="bg-forest-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">🏪</span>
                    <div>
                      <h3 className="font-semibold text-forest-800">
                        {offer.restaurant?.name || offer.restaurantName}
                      </h3>
                      <p className="text-sm text-forest-600">Restaurant</p>
                    </div>
                  </div>
                  {(offer.restaurant?.address || offer.restaurantAddress) && (
                    <div className="mt-2 flex items-start space-x-2">
                      <span className="text-lg">📍</span>
                      <p className="text-sm text-forest-700 font-medium">
                        {offer.restaurant?.address || offer.restaurantAddress}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {offer.volunteer && (
                <div className="bg-rescue-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <h3 className="font-semibold text-forest-800">{offer.volunteer.name}</h3>
                      <p className="text-sm text-forest-600">Volunteer</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dietary info */}
          {offer.dietaryInfo?.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-forest-500 mb-2">Dietary Information</div>
              <div className="flex flex-wrap gap-2">
                {offer.dietaryInfo.map((info, i) => (
                  <span key={i} className="bg-forest-50 text-forest-600 px-3 py-1 rounded-full text-sm">
                    {info}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-forest-100 pt-6 space-y-4">
            {/* Volunteer: Claim open offer */}
            {isVolunteer && offer.status === 'open' && (
              <button
                onClick={handleClaim}
                disabled={actionLoading}
                className="w-full bg-rescue-500 text-white py-3 rounded-xl font-semibold hover:bg-rescue-600 transition-all hover:shadow-md disabled:opacity-50"
              >
                {actionLoading ? 'Claiming...' : '🙋 Claim This Offer'}
              </button>
            )}

            {/* Volunteer: Claimed but awaiting restaurant approval */}
            {isClaimer && offer.status === 'claimed' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <span className="text-2xl block mb-2">⏳</span>
                  <p className="text-amber-700 font-medium">Awaiting Restaurant Approval</p>
                  <p className="text-amber-600 text-sm">The restaurant needs to confirm your claim.</p>
                </div>
                
                {offer.pickup && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-forest-100 text-forest-700 py-3 rounded-xl font-medium hover:bg-forest-200 transition-colors"
                  >
                    💬 Message Restaurant
                  </button>
                )}

                {canCancelPickup() ? (
                  <button
                    onClick={handleCancelPickup}
                    disabled={actionLoading}
                    className="w-full border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Cancelling...' : 'Cancel My Claim'}
                  </button>
                ) : (
                  <p className="text-center text-sm text-forest-500">
                    Cannot cancel within 24 hours of pickup time
                  </p>
                )}
              </div>
            )}

            {/* Volunteer: Confirmed - ready for pickup */}
            {isClaimer && offer.status === 'confirmed' && (
              <div className="space-y-3">
                <div className="bg-leaf-50 border border-leaf-200 rounded-xl p-4 text-center">
                  <span className="text-2xl block mb-2">✅</span>
                  <p className="text-leaf-700 font-medium">Pickup Confirmed!</p>
                  <p className="text-leaf-600 text-sm">The restaurant has approved. Head over to pick up the food!</p>
                </div>
                
                {offer.pickup && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-forest-100 text-forest-700 py-3 rounded-xl font-medium hover:bg-forest-200 transition-colors"
                  >
                    💬 Message Restaurant
                  </button>
                )}

                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="w-full bg-forest-600 text-white py-3 rounded-xl font-semibold hover:bg-forest-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Completing...' : '🎉 Mark as Picked Up'}
                </button>
              </div>
            )}

            {/* Restaurant: Actions for claimed offers (pending approval) */}
            {isOwner && offer.status === 'claimed' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-700 font-medium mb-1">
                    ⏳ A volunteer wants to claim this offer
                  </p>
                  <p className="text-amber-600 text-sm">
                    {offer.volunteer?.name || 'Volunteer'} is waiting for your approval.
                  </p>
                </div>

                {offer.pickup && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-forest-100 text-forest-700 py-3 rounded-xl font-medium hover:bg-forest-200 transition-colors"
                  >
                    💬 Message Volunteer
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    className="bg-rescue-500 text-white py-3 rounded-xl font-medium hover:bg-rescue-600 transition-colors disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            )}

            {/* Restaurant: Actions for confirmed offers (waiting for pickup) */}
            {isOwner && offer.status === 'confirmed' && (
              <div className="space-y-3">
                <div className="bg-leaf-50 border border-leaf-200 rounded-xl p-4">
                  <p className="text-leaf-700 font-medium mb-1">
                    ✅ Pickup Confirmed
                  </p>
                  <p className="text-leaf-600 text-sm">
                    {offer.volunteer?.name || 'Volunteer'} should be arriving soon to pick up the food.
                  </p>
                </div>

                {offer.pickup && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-forest-100 text-forest-700 py-3 rounded-xl font-medium hover:bg-forest-200 transition-colors"
                  >
                    💬 Message Volunteer
                  </button>
                )}

                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="w-full bg-forest-600 text-white py-3 rounded-xl font-semibold hover:bg-forest-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Completing...' : '🎉 Mark as Completed'}
                </button>
              </div>
            )}

            {/* Completed status */}
            {offer.status === 'completed' && (
              <div className="space-y-3">
                <div className="bg-forest-50 border border-forest-200 rounded-xl p-6 text-center">
                  <span className="text-4xl block mb-2">🎉</span>
                  <h3 className="text-xl font-semibold text-forest-700 mb-1">Pickup Completed!</h3>
                  <p className="text-forest-600">
                    Thank you for helping reduce food waste!
                  </p>
                </div>
                {offer.pickup && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-forest-100 text-forest-700 py-3 rounded-xl font-medium hover:bg-forest-200 transition-colors"
                  >
                    💬 View Conversation History
                  </button>
                )}
              </div>
            )}

            {/* Cancelled status */}
            {offer.status === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <span className="text-4xl block mb-2">❌</span>
                <h3 className="text-xl font-semibold text-red-700 mb-1">Offer Cancelled</h3>
                <p className="text-red-600">
                  This offer is no longer available.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat modal */}
      {showChat && offer.pickup && (
        <ChatWindow
          pickupId={offer.pickup.id}
          pickup={offer.pickup}
          onClose={() => setShowChat(false)}
          onStatusChange={(updatedPickup) => {
            setOffer(prev => ({ ...prev, pickup: updatedPickup }));
          }}
        />
      )}
    </div>
  );
}


