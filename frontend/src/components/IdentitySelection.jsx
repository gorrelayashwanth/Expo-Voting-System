import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const IdentitySelection = () => {
  const navigate = useNavigate();
  // Optional token parsing logic can be kept if needed. The prompt asks to build the UI for selection.
  // We'll keep token logic simple.
  const [token, setToken] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token');
    if (t) {
      setToken(t);
    }
  }, []);

  const handleSelect = (type) => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token');
    navigate(`/form/${type.toLowerCase()}${t ? `?token=${t}` : ''}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8 font-sans text-gray-900 w-full">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">TrustPoll</h1>
          <p className="text-gray-600 text-lg">Select your identity to continue</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => handleSelect('Guest')}
            className="w-full flex items-center justify-center py-4 px-6 bg-white border border-gray-200 rounded-xl shadow-sm text-lg font-medium text-gray-800 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] min-h-[56px]"
          >
            Guest
          </button>
          
          <button 
            onClick={() => handleSelect('Faculty')}
            className="w-full flex items-center justify-center py-4 px-6 bg-white border border-gray-200 rounded-xl shadow-sm text-lg font-medium text-gray-800 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] min-h-[56px]"
          >
            Faculty
          </button>
          
          <button 
            onClick={() => handleSelect('Student')}
            className="w-full flex items-center justify-center py-4 px-6 bg-white border border-gray-200 rounded-xl shadow-sm text-lg font-medium text-gray-800 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] min-h-[56px]"
          >
            Student
          </button>
        </div>
        
        {token && (
          <div className="text-center text-xs text-gray-400 mt-8">
            Session active
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentitySelection;
