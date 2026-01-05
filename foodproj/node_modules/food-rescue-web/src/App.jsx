import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ServerStatus from './components/ServerStatus';
import LoginPage from './pages/LoginPage';
import AdminSetupPage from './pages/AdminSetupPage';
import AdminDashboard from './pages/AdminDashboard';
import OrgAdminDashboard from './pages/OrgAdminDashboard';
import OnboardingPage from './pages/OnboardingPage';
import RestaurantDashboard from './pages/RestaurantDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import OfferDetailPage from './pages/OfferDetailPage';
import PickupDetailPage from './pages/PickupDetailPage';
import CreateOfferPage from './pages/CreateOfferPage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect to onboarding if needed
  if (needsOnboarding) {
    return <Navigate to="/onboarding" />;
  }
  
  return children;
}

function OnboardingRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // If already onboarded, redirect to dashboard
  if (!needsOnboarding) {
    return <Navigate to="/" />;
  }
  
  return children;
}

function MasterAdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (profile?.role !== 'master_admin') {
    return <Navigate to="/" />;
  }
  
  return children;
}

function OrgAdminRoute({ children }) {
  const { user, profile, loading, needsOnboarding } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect to onboarding if needed
  if (needsOnboarding) {
    return <Navigate to="/onboarding" />;
  }
  
  if (profile?.role !== 'org_admin') {
    return <Navigate to="/" />;
  }
  
  return children;
}

function RoleRoute({ children, allowedRole }) {
  const { user, profile, loading, needsOnboarding } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect to onboarding if needed
  if (needsOnboarding) {
    return <Navigate to="/onboarding" />;
  }
  
  if (!profile) {
    return <Navigate to="/login" />;
  }
  
  if (profile.role !== allowedRole) {
    // Redirect based on role
    if (profile.role === 'master_admin') {
      return <Navigate to="/admin" />;
    } else if (profile.role === 'org_admin') {
      return <Navigate to="/org-admin" />;
    } else if (profile.role === 'restaurant') {
      return <Navigate to="/restaurant" />;
    }
    return <Navigate to="/volunteer" />;
  }
  
  return children;
}

function AuthRedirect() {
  const { user, profile, loading, needsOnboarding } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect to onboarding if needed
  if (needsOnboarding) {
    return <Navigate to="/onboarding" />;
  }
  
  if (!profile) {
    return <Navigate to="/login" />;
  }
  
  // Redirect based on role
  if (profile.role === 'master_admin') {
    return <Navigate to="/admin" />;
  } else if (profile.role === 'org_admin') {
    return <Navigate to="/org-admin" />;
  } else if (profile.role === 'restaurant') {
    return <Navigate to="/restaurant" />;
  }
  
  return <Navigate to="/volunteer" />;
}

export default function App() {
  return (
    <>
      <ServerStatus />
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-setup" element={<AdminSetupPage />} />
      
      {/* Onboarding route */}
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />
      
      {/* Auth redirect */}
      <Route path="/" element={<AuthRedirect />} />
      
      {/* Master Admin routes */}
      <Route
        path="/admin"
        element={
          <MasterAdminRoute>
            <AdminDashboard />
          </MasterAdminRoute>
        }
      />
      
      {/* Org Admin routes */}
      <Route
        path="/org-admin"
        element={
          <OrgAdminRoute>
            <OrgAdminDashboard />
          </OrgAdminRoute>
        }
      />
      
      {/* Restaurant routes */}
      <Route
        path="/restaurant"
        element={
          <RoleRoute allowedRole="restaurant">
            <Layout>
              <RestaurantDashboard />
            </Layout>
          </RoleRoute>
        }
      />
      <Route
        path="/restaurant/create"
        element={
          <RoleRoute allowedRole="restaurant">
            <Layout>
              <CreateOfferPage />
            </Layout>
          </RoleRoute>
        }
      />
      
      {/* Volunteer routes */}
      <Route
        path="/volunteer"
        element={
          <RoleRoute allowedRole="volunteer">
            <Layout>
              <VolunteerDashboard />
            </Layout>
          </RoleRoute>
        }
      />
      
      {/* Shared routes */}
      <Route
        path="/offers/:id"
        element={
          <PrivateRoute>
            <Layout>
              <OfferDetailPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/pickups/:pickupId"
        element={
          <PrivateRoute>
            <Layout>
              <PickupDetailPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </>
  );
}
