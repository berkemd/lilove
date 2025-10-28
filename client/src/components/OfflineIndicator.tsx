/**
 * Offline Indicator Component
 * Shows a banner when the app is offline
 */

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { useState, useEffect } from "react";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      // Show reconnected message briefly
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="ml-2 text-yellow-800 dark:text-yellow-200">
            You're offline. Some features may be limited, but cached content is still available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
            You're back online! All features are now available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

export default OfflineIndicator;
