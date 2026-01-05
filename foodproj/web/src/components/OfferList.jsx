import OfferCard from './OfferCard';

export default function OfferList({ offers, loading, error, onRemove, onReject, onConfirm, onComplete, onRefresh, emptyMessage }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="spinner"></div>
          <div className="absolute inset-0 blur-xl bg-emerald-400/30 rounded-full"></div>
        </div>
        <p className="text-forest-500 mt-4 animate-pulse">Loading offers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center border-l-4 border-l-red-400">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
        <p className="text-red-600 mb-4">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-forest-100 to-forest-200 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float">
          <span className="text-4xl">🍽️</span>
        </div>
        <h3 className="font-display text-xl font-semibold text-forest-800 mb-2">No offers found</h3>
        <p className="text-forest-600 max-w-md mx-auto">
          {emptyMessage || 'No food offers available right now. Check back soon!'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer, index) => (
        <div 
          key={offer.id} 
          className="stagger-item"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <OfferCard
            offer={offer}
            onRemove={onRemove}
            onReject={onReject}
            onConfirm={onConfirm}
            onComplete={onComplete}
            onRefresh={onRefresh}
          />
        </div>
      ))}
    </div>
  );
}
