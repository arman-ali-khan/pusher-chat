'use client';

import { usePWA } from '@/hooks/usePWA';
import { Button } from './button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from './card';

export function InstallPrompt() {
  const { isInstallable, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 border-primary shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install SecureChat</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Install our app for a better experience with offline support and notifications.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={installApp} className="text-xs">
                Install
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDismissed(true)}
                className="text-xs"
              >
                Not now
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}