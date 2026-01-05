import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Safe fetch with timeout and connection error handling
 */
async function safeFetch(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Server may be slow or unresponsive.');
    }
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Unable to connect to server. Please ensure the backend is running.');
    }
    throw error;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);
  
  // Derive needsOnboarding from profile status - more reliable than storing separately
  const needsOnboarding = profile?.status === 'pending_onboarding';

  // Check server health
  const checkServer = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      const isOnline = response.ok;
      setServerOnline(isOnline);
      return isOnline;
    } catch {
      setServerOnline(false);
      return false;
    }
  }, []);

  // Periodically check server health
  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkServer]);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedSession = localStorage.getItem('userSession');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          setUser(session.user);
          setProfile(session.user);
          
          // Verify session is still valid
          try {
            const response = await safeFetch(`${API_URL}/auth/me`, {
              headers: { 'Authorization': `Bearer ${session.token}` }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.user) {
                setUser(data.user);
                setProfile(data.user);
                // Update localStorage with latest user data
                localStorage.setItem('userSession', JSON.stringify({
                  ...session,
                  user: data.user
                }));
              }
              setServerOnline(true);
            } else {
              // Session invalid, clear it
              localStorage.removeItem('userSession');
              setUser(null);
              setProfile(null);
            }
          } catch (err) {
            // Server may be down - keep local session but mark server offline
            console.warn('Server check failed, using cached session:', err.message);
            setServerOnline(false);
          }
        }
      } catch (err) {
        console.error('Error loading user session:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Master admin login
  const loginMasterAdmin = async (email, password) => {
    const response = await safeFetch(`${API_URL}/auth/master-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Save session
    localStorage.setItem('userSession', JSON.stringify({
      user: data.user,
      token: data.token
    }));
    
    setUser(data.user);
    setProfile(data.user);
    setServerOnline(true);
    
    return data;
  };

  // Org admin login
  const loginOrgAdmin = async (email, password) => {
    const response = await safeFetch(`${API_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Save session
    localStorage.setItem('userSession', JSON.stringify({
      user: data.user,
      token: data.token
    }));
    
    setUser(data.user);
    setProfile(data.user);
    setServerOnline(true);
    
    return data;
  };

  // User login (restaurant or volunteer)
  const loginUser = async (email, password, role) => {
    const response = await safeFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Save session
    localStorage.setItem('userSession', JSON.stringify({
      user: data.user,
      token: data.token
    }));
    
    setUser(data.user);
    setProfile(data.user);
    setServerOnline(true);
    
    return data;
  };

  // Complete onboarding
  const completeOnboarding = async (updatedUser) => {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    localStorage.setItem('userSession', JSON.stringify({
      ...session,
      user: updatedUser
    }));
    
    setUser(updatedUser);
    setProfile(updatedUser);
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem('userSession');
    setUser(null);
    setProfile(null);
  };

  // Get auth token
  const getToken = async () => {
    const session = localStorage.getItem('userSession');
    if (session) {
      const { token } = JSON.parse(session);
      return token;
    }
    return null;
  };

  // Refresh profile from server
  const refreshProfile = async () => {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await safeFetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setProfile(data.user);
          setServerOnline(true);
          return data.user;
        }
      }
      return null;
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setServerOnline(false);
      return null;
    }
  };

  // Role checks
  const isRestaurant = profile?.role === 'restaurant';
  const isVolunteer = profile?.role === 'volunteer';
  const isOrgAdmin = profile?.role === 'org_admin';
  const isMasterAdmin = profile?.role === 'master_admin';
  const isAnyAdmin = isOrgAdmin || isMasterAdmin;

  const value = {
    user,
    profile,
    loading,
    needsOnboarding,
    serverOnline,
    checkServer,
    loginUser,
    loginMasterAdmin,
    loginOrgAdmin,
    completeOnboarding,
    logout,
    getToken,
    refreshProfile,
    isRestaurant,
    isVolunteer,
    isOrgAdmin,
    isMasterAdmin,
    isAnyAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
