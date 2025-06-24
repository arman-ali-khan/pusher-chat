"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Shield, Users, Zap } from 'lucide-react';
import { getOrCreateKeyPair } from '@/lib/encryption';
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
      // Generate or retrieve key pair for the user
      const { serialized } = await getOrCreateKeyPair(username.trim());
      
      // Create or update user in database
      const success = await createOrUpdateUser(username.trim(), serialized.publicKey);
      
      if (success) {
        // Store username in localStorage
        localStorage.setItem('currentUsername', username.trim());
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
            End-to-end encrypted messaging with real-time delivery. Your conversations stay private.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl w-fit mx-auto mb-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">End-to-End Encryption</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Messages are encrypted with RSA-2048 before sending. Only you and your recipient can read them.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl w-fit mx-auto mb-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Real-time Messaging</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Powered by Pusher for instant message delivery. See when others are online and typing.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl w-fit mx-auto mb-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Simple & Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                No registration required. Just enter a username and start chatting securely with anyone.
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
                Enter a username to start secure messaging
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
                Your encryption keys are generated locally and never leave your device
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Built with Next.js, Supabase, and Pusher • Encrypted with Web Crypto API</p>
        </div>
      </div>
    </div>
  );
}