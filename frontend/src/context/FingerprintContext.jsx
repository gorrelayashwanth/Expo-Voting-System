import React, { createContext, useContext, useEffect, useState } from 'react';
import fpPromise from '@fingerprintjs/fingerprintjs';
import { setGlobalFingerprint } from '../api/axios';

const FingerprintContext = createContext(null);

export const FingerprintProvider = ({ children }) => {
  const [visitorId, setVisitorId] = useState(null);

  useEffect(() => {
    const initFingerprint = async () => {
      try {
        // Initialize an agent at application startup.
        const fp = await fpPromise.load();
        
        // Get the visitor identifier when you need it.
        const result = await fp.get();
        
        setVisitorId(result.visitorId);
        setGlobalFingerprint(result.visitorId); // This attaches it to axios automatically
        console.log("Device Fingerprint generated:", result.visitorId);
      } catch (error) {
        console.error("Failed to generate fingerprint:", error);
      }
    };

    initFingerprint();
  }, []);

  return (
    <FingerprintContext.Provider value={visitorId}>
      {children}
    </FingerprintContext.Provider>
  );
};

export const useFingerprint = () => useContext(FingerprintContext);
