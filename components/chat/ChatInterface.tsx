"use client";

import { useState, useEffect, useRef } from 'react';
import { Message, User, getMessages, sendMessage, updateLastSeen } from '@/lib/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import TypingIndicator from './TypingIndicator';
import { formatDistanceToNow } from 'date-fns';
import { useMessageQueue } from '@/hooks/useMessageQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { MessageStatusType } from '@/lib/messageStatus';

interface ChatInterfaceProps {
  currentUsername: string;
  selectedUser: string;
  privateKey: string;
  users: User[];
  onBack?: () => void;
}

interface MessageWithStatus extends Message {
  status?: MessageStatusType;
  isEdited?: boolean;
  editedAt?: string;
}

export default function ChatInterface({ 
  currentUsername, 
  selectedUser, 
  privateKey, 
  users,
  onBack 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();

  const selectedUserData = users.find(u => u.username === selectedUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const chatMessages = await getMessages(currentUsername, selectedUser, privateKey);
      // Add status to messages (simulate different statuses for demo)
      const messagesWithStatus = chatMessages.map((msg, index) => ({
        ...msg,
        status: msg.sender_username === currentUsername 
          ? (index % 4 === 0 ? 'read' : index % 3 === 0 ? 'delivered' : 'sent') as MessageStatusType
          : undefined
      }));
      setMessages(messagesWithStatus);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessageDirect = async (content: string, type: 'text' | 'image'): Promise<boolean> => {
    try {
      const success = await sendMessage(currentUsername, selectedUser, content, type);
      if (success) {
        await loadMessages();
        await updateLastSeen(currentUsername);
      }
      return success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const { messageQueue, addToQueue } = useMessageQueue(
    currentUsername,
    (content, type, receiver) => handleSendMessageDirect(content, type)
  );

  const handleSendMessage = async (content: string, type: 'text' | 'image') => {
    setSendingMessage(true);
    
    try {
      if (isOnline) {
        // Send immediately if online
        const success = await handleSendMessageDirect(content, type);
        if (!success) {
          // Add to queue if sending fails
          addToQueue(content, type, selectedUser);
        }
      } else {
        // Add to queue if offline
        addToQueue(content, type, selectedUser);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add to queue on error
      addToQueue(content, type, selectedUser);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageEdited = () => {
    // Reload messages when a message is edited
    loadMessages();
  };

  useEffect(() => {
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
  }, [selectedUser, currentUsername, privateKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sendingMessage && isOnline) {
        loadMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUser, currentUsername, privateKey, sendingMessage, isOnline]);

  const isOnlineUser = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const formatLastSeen = (lastSeen: string) => {
    if (isOnlineUser(lastSeen)) {
      return '';
    }
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return 'offline';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        username={selectedUser}
        isOnline={selectedUserData ? isOnlineUser(selectedUserData.last_seen) : false}
        lastSeen={selectedUserData ? formatLastSeen(selectedUserData.last_seen) : undefined}
        onBack={onBack}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">Send a message to {selectedUser}</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.id}-${index}`}
                    message={message}
                    isOwn={message.sender_username === currentUsername}
                    currentUsername={currentUsername}
                    privateKey={privateKey}
                    onMessageEdited={handleMessageEdited}
                  />
                ))}
              </>
            )}

            {/* Show queued messages */}
            {messageQueue.length > 0 && (
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-sm">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                  {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        <TypingIndicator 
          currentUsername={currentUsername} 
          otherUsername={selectedUser} 
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={loading || sendingMessage}
          isLoading={sendingMessage}
          currentUsername={currentUsername}
          selectedUser={selectedUser}
        />
      </div>
    </div>
  );
}