import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Confirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const serverName = location.state?.server || 'Unknown Server';

  useEffect(() => {
    // Aggressively prevent back navigation to the form
    // The previous route used replace: true, but this adds extra security against hardware back buttons
    const handlePopState = (event) => {
      window.history.pushState(null, document.title, window.location.href);
    };

    window.history.pushState(null, document.title, window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8 font-sans text-gray-900 w-full">
      <div className="w-full max-w-sm space-y-6 text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Vote recorded successfully ✅
        </h1>
        
        <p className="text-gray-500 text-sm mt-2">
          Thank you for participating in TrustPoll. Your vote has been securely logged.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
            System Diagnostics
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Handled by {serverName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
