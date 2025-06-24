"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, getUsers, updateLastSeen } from '@/lib/chat';
import { getOrCreateKeyPair } from '@/lib/encryption';
import UserList from '@/components/chat/UserList';
import ChatInterface from '@/components/chat/ChatInterface';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Shield } from 'lucide-react';

export default function ChatPage() {
  const [currentUsername, setCurrentUsername] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeChat = async () => {
      const savedUsername = localStorage.getItem('currentUsername');
      if (!savedUsername) {
        router.push('/');
        return;
      }

      try {
        setCurrentUsername(savedUsername);
        
        // Get or create key pair
        const { serialized } = await getOrCreateKeyPair(savedUsername);
        setPrivateKey(serialized.privateKey);
        
        // Load users
        await loadUsers();
        
        // Update last seen
        await updateLastSeen(savedUsername);
      } catch (error) {
        console.error('Error initializing chat:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [router]);

  const loadUsers = async () => {
    try {
      const userList = await getUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Auto-refresh users every 10 seconds
  useEffect(() => {
    if (!currentUsername) return;

    const interval = setInterval(() => {
      loadUsers();
      updateLastSeen(currentUsername);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUsername]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading secure chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Desktop Layout */}
      <div className="hidden lg:flex w-full">
        <UserList
          users={users}
          currentUsername={currentUsername}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
        
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <ChatInterface
              currentUsername={currentUsername}
              selectedUser={selectedUser}
              privateKey={privateKey}
              users={users}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="max-w-md text-center border-0 shadow-lg">
                <CardContent className="p-8 space-y-4">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold">Welcome to SecureChat</h2>
                  <p className="text-muted-foreground">
                    Select a user from the sidebar to start an encrypted conversation.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>All messages are end-to-end encrypted</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden w-full">
        {selectedUser ? (
          <ChatInterface
            currentUsername={currentUsername}
            selectedUser={selectedUser}
            privateKey={privateKey}
            users={users}
            onBack={() => setSelectedUser('')}
          />
        ) : (
          <UserList
            users={users}
            currentUsername={currentUsername}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
          />
        )}
      </div>
    </div>
  );
}