"use client";

import { useEffect, useState } from 'react';
import { getTypingStatus, TypingStatus } from '@/lib/chat';

interface TypingIndicatorProps {
  currentUsername: string;
  otherUsername: string;
}

export default function TypingIndicator({ currentUsername, otherUsername }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);

  useEffect(() => {
    const checkTypingStatus = async () => {
      const status = await getTypingStatus(currentUsername, otherUsername);
      setTypingUsers(status.filter(s => s.isTyping));
    };

    // Check immediately
    checkTypingStatus();

    // Check every 2 seconds
    const interval = setInterval(checkTypingStatus, 2000);

    return () => clearInterval(interval);
  }, [currentUsername, otherUsername]);

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span>{otherUsername} is typing...</span>
      </div>
    </div>
  );
}