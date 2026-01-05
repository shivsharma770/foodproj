import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OnboardingPage() {
  const { profile, completeOnboarding, getToken } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1 = password change, 2 = profile setup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Common fields
  const [location, setLocation] = useState('');
  
  // Restaurant fields
  const [foodTypes, setFoodTypes] = useState('');
  const [wasteFrequency, setWasteFrequency] = useState('');

  const isRestaurant = profile?.role === 'restaurant';
  const isVolunteer = profile?.role === 'volunteer';
  const isOrgAdmin = profile?.role === 'org_admin';

  const getRoleInfo = () => {
    if (isRestaurant) return { emoji: '🏪', label: 'Restaurant' };
    if (isVolunteer) return { emoji: '🚗', label: 'Volunteer' };
    if (isOrgAdmin) return { emoji: '🏢', label: 'Organization Admin' };
    return { emoji: '👤', label: 'User' };
  };

  const roleInfo = getRoleInfo();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      
      const response = await fetch('http://localhost:3002/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPasswordChange = () => {
    setStep(2);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = await getToken();
      
      let onboardingData;
      if (isRestaurant) {
        onboardingData = {
          location: location.trim(),
          foodTypes: foodTypes.trim(),
          wasteFrequency
        };
      } else if (isVolunteer) {
        onboardingData = {
          location: location.trim()
        };
      } else if (isOrgAdmin) {
        onboardingData = {
          location: location.trim()
        };
      }

      const response = await fetch('http://localhost:3002/auth/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(onboardingData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete onboarding');
      }

      // Update local profile and navigate
      await completeOnboarding(data.user);
      
      // Navigate based on role
      if (isRestaurant) {
        navigate('/restaurant');
      } else if (isVolunteer) {
        navigate('/volunteer');
      } else if (isOrgAdmin) {
        navigate('/org-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Password Change
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🔐</span>
            <h1 className="font-display text-3xl font-bold text-forest-800 mb-2">
              Welcome, {profile?.name}!
            </h1>
            <p className="text-forest-600">
              First, let's secure your account with a new password
            </p>
          </div>

          <div className="bg-leaf-50 border border-leaf-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-leaf-700">
              💡 Your admin created a temporary password. We recommend changing it to something only you know.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1">
                Current Password (from admin)
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
                placeholder="Enter temporary password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
                placeholder="Choose a strong password"
              />
              <p className="text-xs text-forest-500 mt-1">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rescue-500 text-white py-3 rounded-lg font-semibold hover:bg-rescue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing Password...' : 'Change Password & Continue'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleSkipPasswordChange}
              className="text-sm text-forest-500 hover:text-forest-700 underline"
            >
              Skip for now (not recommended)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Profile Setup
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">{roleInfo.emoji}</span>
          <h1 className="font-display text-3xl font-bold text-forest-800 mb-2">
            Almost Done!
          </h1>
          <p className="text-forest-600">
            Now let's set up your {roleInfo.label.toLowerCase()} profile
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-rescue-500 text-white flex items-center justify-center text-sm font-medium">✓</div>
            <div className="w-16 h-1 bg-rescue-500"></div>
            <div className="w-8 h-8 rounded-full bg-rescue-500 text-white flex items-center justify-center text-sm font-medium">2</div>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Location - Common for all */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              📍 {isRestaurant ? 'Restaurant Location' : isOrgAdmin ? 'Organization Location' : 'Your Location'}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white"
              placeholder="Full address (street, city, zip)"
            />
            <p className="text-xs text-forest-500 mt-1">
              {isRestaurant 
                ? 'This helps volunteers find your location for food pickup'
                : isOrgAdmin
                  ? 'Your organization\'s base location'
                  : 'This helps us match you with nearby restaurants'}
            </p>
          </div>

          {isRestaurant && (
            <>
              {/* Restaurant-specific fields */}
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1">
                  🍽️ What type of food do you typically have?
                </label>
                <textarea
                  value={foodTypes}
                  onChange={(e) => setFoodTypes(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 bg-white resize-none"
                  placeholder="e.g., Italian cuisine, baked goods, prepared meals, fresh produce..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1">
                  📊 How often does food typically go to waste?
                </label>
                <select
                  value={wasteFrequency}
                  onChange={(e) => setWasteFrequency(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none bg-white text-forest-800"
                >
                  <option value="">Select frequency...</option>
                  <option value="daily">Daily - We have surplus every day</option>
                  <option value="few_times_week">A few times per week</option>
                  <option value="weekly">About once a week</option>
                  <option value="occasionally">Occasionally - Less than once a week</option>
                  <option value="rarely">Rarely - Only special circumstances</option>
                </select>
              </div>
            </>
          )}

          {isVolunteer && (
            <div className="bg-leaf-50 border border-leaf-200 rounded-lg p-4">
              <h3 className="font-medium text-leaf-700 mb-2">🚗 Volunteer Guidelines</h3>
              <ul className="text-sm text-leaf-600 space-y-1">
                <li>• Be punctual for scheduled pickups</li>
                <li>• Handle food safely and hygienically</li>
                <li>• Communicate with restaurants if plans change</li>
                <li>• Deliver food to designated recipients promptly</li>
              </ul>
            </div>
          )}

          {isOrgAdmin && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-700 mb-2">🏢 Organization Admin</h3>
              <p className="text-sm text-purple-600 mb-2">
                As an org admin, you can:
              </p>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>• Add and manage volunteers in your organization</li>
                <li>• Monitor volunteer activity</li>
                <li>• Suspend or remove volunteers as needed</li>
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rescue-500 text-white py-3 rounded-lg font-semibold hover:bg-rescue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
