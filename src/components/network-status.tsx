'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner || isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white py-3 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <WifiOff className="w-5 h-5 animate-pulse" />
        <p className="font-medium text-sm sm:text-base">
          No Internet Connection - Please check your network
        </p>
      </div>
    </div>
  );
}
