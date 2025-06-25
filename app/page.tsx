"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Shield, Users, Zap } from 'lucide-react';
import { createOrUpdateUser } from '@/lib/chat';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const savedUsername = localStorage.getItem('currentUsername');
    if (savedUsername) {
      router.push('/chat');
    }
  }, [router]);

  const handleJoinChat = async () => {
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      // Create or update user in database (simplified without encryption)
      const success = await createOrUpdateUser(username.trim());
      
      if (success) {
        // Store username in localStorage
        localStorage.setItem('currentUsername', username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''));
        router.push('/chat');
      } else {
        alert('Failed to join chat. Please try again.');
      }
    } catch (error) {
      console.error('Error joining chat:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinChat();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              SecureChat
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Fast and reliable messaging with optimized performance. Your conversations delivered instantly.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl w-fit mx-auto mb-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Messages are transmitted securely with basic privacy protection and input sanitization.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl w-fit mx-auto mb-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Lightning Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Optimized message delivery with smart chunking for large messages and efficient processing.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl w-fit mx-auto mb-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Simple & Reliable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                No registration required. Just enter a username and start chatting with reliable message delivery.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Join Chat Form */}
        <div className="max-w-md mx-auto">
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Join SecureChat</CardTitle>
              <CardDescription>
                Enter a username to start messaging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-center text-lg h-12"
                  disabled={isLoading}
                  maxLength={20}
                />
              </div>
              <Button
                onClick={handleJoinChat}
                disabled={!username.trim() || isLoading}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Joining...
                  </div>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Start Chatting
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your messages are processed efficiently with optimized delivery
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Built with Next.js and Supabase • Optimized for Performance</p>
        </div>
      </div>
    </div>
  );
}