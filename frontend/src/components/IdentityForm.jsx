import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useFingerprint } from '../context/FingerprintContext';

const IdentityForm = ({ variant }) => {
  const navigate = useNavigate();
  const fingerprint = useFingerprint();
  const [formData, setFormData] = useState({
    name: '',
    organisation: '',
    position: '',
    department: '',
    identifier: '',
    year: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      // Base payload fields common to all types
      const payload = {
        voter_type: variant,
        name: formData.name,
      };

      if (token) {
        payload.token = token;
      }

      // Variant-specific fields
      if (variant === 'guest') {
        if (formData.organisation) payload.organisation = formData.organisation;
        if (formData.position) payload.position = formData.position;
        // The backend explicitly requires 'identifier' even for guests
        payload.identifier = `guest-${Date.now()}`;
      } else if (variant === 'faculty') {
        payload.department = formData.department;
        payload.identifier = formData.department; // Mapped as per backend schema "Employee ID or Dept"
      } else if (variant === 'student') {
        payload.identifier = formData.identifier;
        payload.year = formData.year;
        payload.department = formData.department;
      }

      const response = await apiClient.post('/register-voter', payload, {
        headers: {
          'X-Device-Fingerprint': fingerprint
        }
      });
      
      const voterId = response.data?.voter_id;

      // On success, navigate to project selection passing voter_id in state
      navigate(`/projects${token ? `?token=${token}` : ''}`, { 
        state: { voter_id: voterId } 
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 px-4 py-8 font-sans text-gray-900 w-full">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="text-teal-600 font-medium mb-4 inline-block hover:text-teal-700 transition-colors"
          >
            &larr; Back
          </button>
          <h1 className="text-3xl font-bold tracking-tight capitalize">{variant} Registration</h1>
          <p className="text-gray-600 mt-2">Please fill in your details to continue.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
            <input 
              id="name"
              name="name"
              type="text" 
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
            />
          </div>

          {variant === 'guest' && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="organisation" className="block text-sm font-medium text-gray-700">Organisation / Business Name (Optional)</label>
                <input 
                  id="organisation"
                  name="organisation"
                  type="text" 
                  value={formData.organisation}
                  onChange={handleChange}
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position / Designation (Optional)</label>
                <input 
                  id="position"
                  name="position"
                  type="text" 
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                />
              </div>
            </>
          )}

          {variant === 'faculty' && (
            <div className="space-y-1.5">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department *</label>
              <select 
                id="department"
                name="department"
                required
                value={formData.department}
                onChange={handleChange}
                className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-shadow"
              >
                <option value="">Select a department...</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
              </select>
            </div>
          )}

          {variant === 'student' && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">Roll Number *</label>
                <input 
                  id="identifier"
                  name="identifier"
                  type="text" 
                  required
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year *</label>
                <select 
                  id="year"
                  name="year"
                  required
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-shadow"
                >
                  <option value="">Select year...</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department *</label>
                <select 
                  id="department"
                  name="department"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white transition-shadow"
                >
                  <option value="">Select a department...</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                </select>
              </div>
            </>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-6 bg-teal-600 text-white rounded-xl shadow-sm text-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] min-h-[56px] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Continue to Projects'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdentityForm;
