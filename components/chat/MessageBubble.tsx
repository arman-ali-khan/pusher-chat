"use client";

import { Message } from '@/lib/chat';
import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon, Smile, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const renderContent = () => {
    if (!message.decrypted) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Message could not be decrypted</span>
        </div>
      );
    }

    switch (message.content_type) {
      case 'image':
        return (
          <div className="max-w-sm">
            {!imageError ? (
              <img 
                src={message.content} 
                alt="Shared image" 
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onError={() => setImageError(true)}
                onClick={() => {
                  // Open image in new tab for full view
                  window.open(message.content, '_blank');
                }}
                loading="lazy"
              />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-lg">
                <ImageIcon className="h-4 w-4" />
                <span>Image failed to load</span>
              </div>
            )}
          </div>
        );
      case 'emoji':
        return (
          <div className="flex items-center gap-2">
            <span className="text-3xl">{message.content}</span>
          </div>
        );
      default:
        return <span className="whitespace-pre-wrap break-words">{message.content}</span>;
    }
  };

  return (
    <div className={cn(
      "flex w-full mb-4",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] px-4 py-3 rounded-2xl transition-all duration-200 hover:shadow-md",
        isOwn 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted text-muted-foreground rounded-bl-md"
      )}>
        <div className="space-y-1">
          {renderContent()}
          <div className={cn(
            "text-xs opacity-70 flex items-center gap-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            <span>{formatTime(message.timestamp)}</span>
            {message.content_type === 'image' && <ImageIcon className="h-3 w-3" />}
            {message.content_type === 'emoji' && <Smile className="h-3 w-3" />}
          </div>
        </div>
      </div>
    </div>
  );
}