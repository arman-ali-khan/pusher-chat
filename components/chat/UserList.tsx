"use client";

import { User } from '@/lib/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserListProps {
  users: User[];
  currentUsername: string;
  selectedUser?: string;
  onSelectUser: (username: string) => void;
}

export default function UserList({ users, currentUsername, selectedUser, onSelectUser }: UserListProps) {
  const otherUsers = users.filter(user => user.username !== currentUsername);

  const isOnline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5; // Consider online if active within last 5 minutes
  };

  const formatLastSeen = (lastSeen: string) => {
    if (isOnline(lastSeen)) {
      return 'Online';
    }
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return 'Offline';
    }
  };

  return (
    <div className="w-80 border-r bg-muted/20 flex flex-col">
      <div className="p-4 border-b bg-background/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentUsername.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{currentUsername}</h2>
            <p className="text-sm text-muted-foreground">Your account</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
              Users ({otherUsers.length})
            </h3>
            <div className="space-y-1">
              {otherUsers.map((user) => (
                <Button
                  key={user.username}
                  variant={selectedUser === user.username ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start p-3 h-auto",
                    selectedUser === user.username && "bg-accent"
                  )}
                  onClick={() => onSelectUser(user.username)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Circle 
                        className={cn(
                          "absolute -bottom-1 -right-1 h-4 w-4 border-2 border-background rounded-full",
                          isOnline(user.last_seen) 
                            ? "fill-green-500 text-green-500" 
                            : "fill-gray-400 text-gray-400"
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{user.username}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatLastSeen(user.last_seen)}
                      </div>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              ))}
              {otherUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No other users online</p>
                  <p className="text-xs">Ask someone to join!</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}