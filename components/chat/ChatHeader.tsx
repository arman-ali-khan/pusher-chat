"use client";

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Circle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  username: string;
  isOnline: boolean;
  lastSeen?: string;
  onBack?: () => void;
}

export default function ChatHeader({ username, isOnline, lastSeen, onBack }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 border-b bg-background/50 backdrop-blur">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Circle 
          className={cn(
            "absolute -bottom-1 -right-1 h-4 w-4 border-2 border-background rounded-full",
            isOnline 
              ? "fill-green-500 text-green-500" 
              : "fill-gray-400 text-gray-400"
          )}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">{username}</h2>
        <p className="text-sm text-muted-foreground">
          {isOnline ? 'Online' : lastSeen ? `Last seen ${lastSeen}` : 'Offline'}
        </p>
      </div>
      
      <Button variant="ghost" size="sm">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}