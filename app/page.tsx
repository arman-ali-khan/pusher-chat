'use client';

import { useState, useEffect } from 'react';
import { UsernameLogin } from '@/components/username-login';
import { ChatInterface } from '@/components/chat-interface';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

interface User {
  id: string;
  username: string;
  phoneNumber?: string;
  avatar?: string;
  settings: any;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication
    const storedToken = localStorage.getItem('web3chat_token');
    const storedUser = localStorage.getItem('web3chat_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('web3chat_token');
        localStorage.removeItem('web3chat_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleConnect = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    
    // Store authentication data
    localStorage.setItem('web3chat_token', authToken);
    localStorage.setItem('web3chat_user', JSON.stringify(userData));
  };

  const handleDisconnect = () => {
    setUser(null);
    setToken(null);
    
    // Clear stored data
    localStorage.removeItem('web3chat_token');
    localStorage.removeItem('web3chat_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      {user && token ? (
        <ChatInterface 
          user={user} 
          token={token} 
          onDisconnect={handleDisconnect} 
        />
      ) : (
        <UsernameLogin onConnect={handleConnect} />
      )}
      <Toaster />
    </ThemeProvider>
  );
}