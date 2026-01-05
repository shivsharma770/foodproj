import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { user, profile, logout, isRestaurant, isVolunteer, isOrgAdmin, isMasterAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl">🥗</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-display font-bold text-xl text-forest-800">Food Rescue</span>
                <span className="block text-xs text-forest-500 -mt-0.5">Reducing waste, feeding communities</span>
              </div>
            </Link>
            
            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {user && (
                <>
                  {/* Role-specific nav items */}
                  {isMasterAdmin && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                        isActive('/admin')
                          ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-sm'
                          : 'text-forest-600 hover:bg-forest-50'
                      }`}
                    >
                      <span>👑</span>
                      <span className="hidden md:inline">Admin</span>
                    </Link>
                  )}

                  {isOrgAdmin && (
                    <Link
                      to="/org-admin"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                        isActive('/org-admin')
                          ? 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 shadow-sm'
                          : 'text-forest-600 hover:bg-forest-50'
                      }`}
                    >
                      <span>🏢</span>
                      <span className="hidden md:inline">Dashboard</span>
                    </Link>
                  )}
                  
                  {isRestaurant && (
                    <>
                      <Link
                        to="/restaurant"
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                          isActive('/restaurant')
                            ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 shadow-sm'
                            : 'text-forest-600 hover:bg-forest-50'
                        }`}
                      >
                        <span>📊</span>
                        <span className="hidden md:inline">Dashboard</span>
                      </Link>
                      <Link
                        to="/restaurant/create"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">New Offer</span>
                      </Link>
                    </>
                  )}
                  
                  {isVolunteer && (
                    <Link
                      to="/volunteer"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                        isActive('/volunteer')
                          ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 shadow-sm'
                          : 'text-forest-600 hover:bg-forest-50'
                      }`}
                    >
                      <span>📊</span>
                      <span className="hidden md:inline">Dashboard</span>
                    </Link>
                  )}
                  
                  {/* User menu */}
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-forest-200">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-forest-50 rounded-full">
                      <div className="w-6 h-6 bg-gradient-to-br from-forest-400 to-forest-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {(profile?.name || user?.email)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-forest-700 max-w-[120px] truncate">
                        {profile?.name || user?.email}
                      </span>
                    </div>
                    
                    {(isRestaurant || isVolunteer) && (
                      <Link
                        to="/settings"
                        className="w-9 h-9 rounded-xl bg-forest-50 hover:bg-forest-100 flex items-center justify-center transition-colors"
                        title="Settings"
                      >
                        <svg className="w-5 h-5 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="w-9 h-9 rounded-xl bg-forest-50 hover:bg-red-50 flex items-center justify-center transition-colors group"
                      title="Logout"
                    >
                      <svg className="w-5 h-5 text-forest-600 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="relative overflow-hidden bg-gradient-to-br from-forest-800 via-forest-900 to-forest-800 text-forest-200 py-8">
        <div className="decoration-blob w-64 h-64 bg-emerald-500/10 -bottom-32 -left-32" />
        <div className="decoration-blob w-48 h-48 bg-blue-500/10 -top-24 -right-24" />
        
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center">
                <span className="text-lg">🥗</span>
              </div>
              <div>
                <span className="font-display font-bold text-white">Food Rescue Platform</span>
                <p className="text-sm text-forest-400">Reducing waste, feeding communities</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-emerald-400">🌿</span>
                Built with purpose
              </span>
              <span className="flex items-center gap-2">
                <span className="text-red-400">❤️</span>
                For communities
              </span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-forest-700 text-center text-sm text-forest-500">
            © {new Date().getFullYear()} Food Rescue Platform. Making a difference, one meal at a time.
          </div>
        </div>
      </footer>
    </div>
  );
}
