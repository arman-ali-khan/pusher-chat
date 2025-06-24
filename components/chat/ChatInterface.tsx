"use client";

import { useState, useEffect, useRef } from 'react';
import { Message, User, getMessages, sendMessage, updateLastSeen } from '@/lib/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import { formatDistanceToNow } from 'date-fns';

interface ChatInterfaceProps {
  currentUsername: string;
  selectedUser: string;
  privateKey: string;
  users: User[];
  onBack?: () => void;
}

export default function ChatInterface({ 
  currentUsername, 
  selectedUser, 
  privateKey, 
  users,
  onBack 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedUserData = users.find(u => u.username === selectedUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const chatMessages = await getMessages(currentUsername, selectedUser, privateKey);
      setMessages(chatMessages);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'emoji') => {
    setSendingMessage(true);
    try {
      const success = await sendMessage(currentUsername, selectedUser, content, type);
      if (success) {
        // Add optimistic update - show message immediately
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          sender_username: currentUsername,
          receiver_username: selectedUser,
          content: content,
          content_type: type,
          timestamp: new Date().toISOString(),
          decrypted: true,
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(scrollToBottom, 50);
        
        // Reload messages after a short delay to get the real message
        setTimeout(() => {
          loadMessages();
        }, 500);
        
        // Update last seen
        await updateLastSeen(currentUsername);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
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
      if (!sendingMessage) {
        loadMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUser, currentUsername, privateKey, sendingMessage]);

  const isOnline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const formatLastSeen = (lastSeen: string) => {
    if (isOnline(lastSeen)) {
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
        isOnline={selectedUserData ? isOnline(selectedUserData.last_seen) : false}
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
                  />
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={loading || sendingMessage}
          isLoading={sendingMessage}
        />
      </div>
    </div>
  );
}