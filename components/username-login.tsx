'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageCircle, User, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface UsernameLoginProps {
  onConnect: (user: any, token: string) => void;
}

export function UsernameLogin({ onConnect }: UsernameLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          phoneNumber: phoneNumber.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      toast({
        title: 'Welcome!',
        description: `Logged in as ${username}`,
      });

      onConnect(data.user, data.token);
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-white/20 shadow-xl">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Web3 Chat
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Enter your username to start chatting
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-red-700 dark:text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username *
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/50 dark:bg-gray-700/50 border-white/20"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                    title="Username must be 3-20 characters, letters, numbers, and underscores only"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    3-20 characters, letters, numbers, and underscores only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-white/50 dark:bg-gray-700/50 border-white/20"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Optional - for account recovery and notifications
                  </p>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Enter Chat
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <MessageCircle className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">Real-time</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <User className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">Simple</p>
                </div>
                <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                  <Phone className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">Secure</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}