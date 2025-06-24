'use client';

import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  status: MessageStatusType;
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending':
        return 'text-muted-foreground';
      case 'sent':
        return 'text-muted-foreground';
      case 'delivered':
        return 'text-muted-foreground';
      case 'read':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('flex items-center', getStatusColor(), className)}>
      {getStatusIcon()}
    </div>
  );
}