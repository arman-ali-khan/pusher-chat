"use client";

import { Message } from '@/lib/chat';
import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon, AlertCircle, Edit, MoreVertical, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { MessageStatus, MessageStatusType } from './MessageStatus';
import { EditMessageDialog } from './EditMessageDialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { canEditMessage, editMessage } from '@/lib/messageStatus';

interface MessageBubbleProps {
  message: Message & {
    status?: MessageStatusType;
    isEdited?: boolean;
    editedAt?: string;
  };
  isOwn: boolean;
  currentUsername: string;
  onMessageEdited?: () => void;
}

export default function MessageBubble({ 
  message, 
  isOwn, 
  currentUsername, 
  onMessageEdited 
}: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const handleEditMessage = async (newContent: string): Promise<boolean> => {
    setIsEditing(true);
    try {
      const success = await editMessage(message.id, newContent, currentUsername);
      if (success && onMessageEdited) {
        onMessageEdited();
      }
      return success;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    } finally {
      setIsEditing(false);
    }
  };

  const canEdit = canEditMessage(message.timestamp, message.sender_username, currentUsername);

  const renderContent = () => {
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
      default:
        return <span className="whitespace-pre-wrap break-words">{message.content}</span>;
    }
  };

  return (
    <>
      <div className={cn(
        "flex w-full mb-4 group",
        isOwn ? "justify-end" : "justify-start"
      )}>
        <div className={cn(
          "max-w-[70%] px-4 py-3 rounded-2xl transition-all duration-200 hover:shadow-md relative",
          isOwn 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-muted text-muted-foreground rounded-bl-md"
        )}>
          <div className="space-y-1">
            {renderContent()}
            
            <div className={cn(
              "text-xs opacity-70 flex items-center gap-2",
              isOwn ? "justify-end" : "justify-start"
            )}>
              <div className="flex items-center gap-1">
                <span>{formatTime(message.timestamp)}</span>
                {message.content_type === 'image' && <ImageIcon className="h-3 w-3" />}
                {message.isEdited && (
                  <div className="flex items-center gap-1 text-xs opacity-60" title="Message edited">
                    <Edit className="h-3 w-3" />
                    <span>edited</span>
                  </div>
                )}
              </div>
              
              {isOwn && message.status && (
                <MessageStatus status={message.status} />
              )}
            </div>
          </div>

          {/* Message actions - Show edit button directly for own messages */}
          {isOwn && (
            <div className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && message.content_type === 'text' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="h-8 w-8 p-0 hover:bg-background/20 rounded-full"
                  title="Edit message"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-background/20 rounded-full"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsEditDialogOpen(true)}
                      disabled={!canEdit || message.content_type !== 'text'}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Message
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditMessageDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditMessage}
        currentContent={message.content}
        isLoading={isEditing}
      />
    </>
  );
}