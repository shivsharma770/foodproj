import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OfferCard({ offer, onRemove, onReject, onConfirm, onComplete }) {
  const { isRestaurant, isVolunteer } = useAuth();

  const statusConfig = {
    open: { 
      gradient: 'from-emerald-400 to-green-500',
      bg: 'from-emerald-50 to-green-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      label: 'Open',
      icon: '🟢'
    },
    claimed: { 
      gradient: 'from-amber-400 to-orange-500',
      bg: 'from-amber-50 to-orange-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      label: 'Pending Approval',
      icon: '⏳'
    },
    confirmed: { 
      gradient: 'from-blue-400 to-indigo-500',
      bg: 'from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      label: 'Confirmed',
      icon: '✓'
    },
    completed: { 
      gradient: 'from-violet-400 to-purple-500',
      bg: 'from-violet-50 to-purple-50',
      border: 'border-violet-200',
      text: 'text-violet-700',
      label: 'Completed',
      icon: '✅'
    },
    cancelled: { 
      gradient: 'from-red-400 to-rose-500',
      bg: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      text: 'text-red-700',
      label: 'Cancelled',
      icon: '✕'
    },
    expired: { 
      gradient: 'from-gray-400 to-slate-500',
      bg: 'from-gray-50 to-slate-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      label: 'Expired',
      icon: '⌛'
    }
  };

  const config = statusConfig[offer.status] || statusConfig.open;

  const formatTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const handleRemove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) await onRemove(offer.id);
  };

  return (
    <Link
      to={`/offers/${offer.id}`}
      className="group block glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* Status bar */}
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display font-semibold text-lg text-forest-800 line-clamp-1 group-hover:text-forest-900 transition-colors">
            {offer.title}
          </h3>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${config.bg} ${config.border} border shrink-0`}>
            <span>{config.icon}</span>
            <span className={config.text}>{config.label}</span>
          </span>
        </div>
        
        {/* Description */}
        {offer.description && (
          <p className="text-forest-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {offer.description}
          </p>
        )}
        
        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-50 rounded-lg text-sm text-forest-600">
            <span className="text-base">📦</span>
            <span className="font-medium">{offer.quantity}</span> portions
          </span>
          
          {offer.restaurantName && isVolunteer && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg text-sm text-orange-700">
              <span className="text-base">🏪</span>
              {offer.restaurantName}
            </span>
          )}
          
          {offer.expirationTime && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg text-sm text-amber-700">
              <span className="text-base">⏰</span>
              {formatTime(offer.expirationTime)}
            </span>
          )}
        </div>

        {/* Restaurant address for volunteers */}
        {offer.restaurantAddress && isVolunteer && (
          <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl mb-4 border border-green-100">
            <span className="text-lg">📍</span>
            <span className="text-sm text-green-800">{offer.restaurantAddress}</span>
          </div>
        )}

        {/* Food type tags */}
        {offer.foodType && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-gradient-to-r from-leaf-100 to-green-100 text-leaf-700 px-3 py-1 rounded-full text-xs font-medium border border-leaf-200">
              {offer.foodType}
            </span>
            {offer.dietaryInfo?.map((info, i) => (
              <span key={i} className="bg-forest-50 text-forest-600 px-3 py-1 rounded-full text-xs font-medium border border-forest-100">
                {info}
              </span>
            ))}
          </div>
        )}

        {/* Restaurant actions for open offers */}
        {isRestaurant && offer.status === 'open' && onRemove && (
          <div className="mt-4 pt-4 border-t border-forest-100">
            <button
              onClick={handleRemove}
              className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1 group/btn"
            >
              <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove Offer
            </button>
          </div>
        )}

        {/* Restaurant actions for claimed offers (pending approval) */}
        {isRestaurant && offer.status === 'claimed' && (
          <div className="mt-4 pt-4 border-t border-forest-100 space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-xl">⏳</span>
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  Claimed by {offer.claimedByName || offer.volunteer?.name || 'volunteer'}
                </div>
                <div className="text-xs text-amber-600">Awaiting your approval</div>
              </div>
            </div>
            <div className="flex gap-2">
              {onConfirm && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm(offer.id); }}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReject(offer.id); }}
                  className="flex-1 border-2 border-red-200 text-red-600 py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Decline
                </button>
              )}
            </div>
          </div>
        )}

        {/* Restaurant actions for confirmed offers (ready for pickup) */}
        {isRestaurant && offer.status === 'confirmed' && (
          <div className="mt-4 pt-4 border-t border-forest-100 space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xl">✅</span>
              <div>
                <div className="text-sm font-semibold text-blue-800">Confirmed & Ready</div>
                <div className="text-xs text-blue-600">Waiting for volunteer pickup</div>
              </div>
            </div>
            {onComplete && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onComplete(offer.id); }}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>🎉</span>
                Mark as Complete
              </button>
            )}
          </div>
        )}

        {/* Volunteer call to action */}
        {isVolunteer && offer.status === 'open' && (
          <div className="mt-4 pt-4 border-t border-forest-100 flex items-center justify-between">
            <span className="text-sm text-forest-500">Available for pickup</span>
            <span className="text-emerald-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Details
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
