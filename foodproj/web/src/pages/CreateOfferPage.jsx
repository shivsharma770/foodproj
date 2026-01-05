import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';

export default function CreateOfferPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [foodType, setFoodType] = useState('');
  const [expirationTime, setExpirationTime] = useState('');
  const [dietaryInfo, setDietaryInfo] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const foodTypes = [
    'Prepared Meals',
    'Fresh Produce',
    'Bakery Items',
    'Dairy Products',
    'Beverages',
    'Mixed Items',
    'Other'
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Halal',
    'Kosher'
  ];

  const toggleDietary = (option) => {
    setDietaryInfo(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = await getToken();
      await api.post('/food_offers', {
        title,
        description,
        quantity: parseInt(quantity, 10),
        foodType: foodType || null,
        expirationTime: expirationTime ? new Date(expirationTime).toISOString() : null,
        dietaryInfo
      }, token);

      navigate('/restaurant');
    } catch (err) {
      console.error('Error creating offer:', err);
      setError(err.message || 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  // Calculate min datetime (now)
  const now = new Date();
  const minDateTime = now.toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-forest-600 hover:text-rescue-600 transition-colors mb-6"
      >
        <span className="mr-2">←</span>
        Back
      </button>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-forest-100 p-8">
        <h1 className="font-display text-2xl font-bold text-forest-800 mb-2">
          Create Food Offer
        </h1>
        <p className="text-forest-600 mb-6">
          Share your surplus food with the community
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Fresh sandwiches from lunch service"
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what you're offering..."
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800 resize-none"
            />
          </div>

          {/* Quantity and Food Type */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1">
                Quantity (portions) *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
                placeholder="10"
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1">
                Food Type
              </label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800"
              >
                <option value="">Select type...</option>
                {foodTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiration Time */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-1">
              Pickup By
            </label>
            <input
              type="datetime-local"
              value={expirationTime}
              onChange={(e) => setExpirationTime(e.target.value)}
              min={minDateTime}
              className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none transition-colors text-forest-800"
            />
            <p className="text-xs text-forest-500 mt-1">
              When does this food need to be picked up by?
            </p>
          </div>

          {/* Dietary Info */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              Dietary Information
            </label>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleDietary(option)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    dietaryInfo.includes(option)
                      ? 'bg-rescue-500 text-white'
                      : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 rounded-xl border border-forest-200 text-forest-600 font-medium hover:bg-forest-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title || !quantity}
              className="flex-1 px-6 py-3 rounded-xl bg-rescue-500 text-white font-semibold hover:bg-rescue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}









