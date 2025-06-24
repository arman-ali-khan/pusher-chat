'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ConnectionStatusProps {
  onRetry?: () => void;
}

export function ConnectionStatus({ onRetry }: ConnectionStatusProps) {
  const isOnline = useOnlineStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
      // Force a network check
      await fetch('/api/health', { method: 'HEAD' });
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300">
        <Wifi className="h-4 w-4" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300">
      <WifiOff className="h-4 w-4" />
      <span>No internet connection</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRetry}
        disabled={isRetrying}
        className="h-6 px-2 text-white hover:bg-red-600 ml-2"
      >
        <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
        <span className="ml-1">Retry</span>
      </Button>
    </div>
  );
}