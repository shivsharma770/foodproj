export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50" />
      <div className="decoration-blob decoration-blob-green w-96 h-96 -top-48 -left-48 animate-float" />
      <div className="decoration-blob decoration-blob-orange w-80 h-80 bottom-0 -right-40 animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 text-center">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30 animate-bounce-in">
            <span className="text-5xl animate-float">🥗</span>
          </div>
          
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-400 rounded-full shadow-lg" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-lg" />
            <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-3 bg-pink-400 rounded-full shadow-lg" />
            <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="font-display text-2xl font-bold text-forest-800 mb-2 animate-fade-in">
          Food Rescue Platform
        </h1>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="text-forest-500 text-sm ml-2">Loading</span>
        </div>
      </div>
    </div>
  );
}
