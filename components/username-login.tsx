'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageCircle, User, Phone, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface UsernameLoginProps {
  onConnect: (user: any, token: string) => void;
}

interface ValidationError {
  field: 'username' | 'phone' | 'general';
  message: string;
}

export function UsernameLogin({ onConnect }: UsernameLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const { toast } = useToast();

  // Simplified username validation
  const validateUsername = (value: string): ValidationError | null => {
    if (!value.trim()) {
      return { field: 'username', message: 'Username is required' };
    }
    
    if (value.length < 2) {
      return { field: 'username', message: 'Username must be at least 2 characters long' };
    }
    
    if (value.length > 30) {
      return { field: 'username', message: 'Username must be no more than 30 characters long' };
    }
    
    return null;
  };

  // Very permissive phone validation
  const validatePhone = (value: string): ValidationError | null => {
    if (!value.trim()) return null; // Phone is optional
    
    if (value.length < 5 || value.length > 20) {
      return { field: 'phone', message: 'Please enter a valid phone number' };
    }
    
    return null;
  };

  // Handle username input change with real-time validation
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    
    // Clear previous username errors
    setErrors(prev => prev.filter(error => error.field !== 'username'));
    
    // Add new validation error if any
    const error = validateUsername(value);
    if (error) {
      setErrors(prev => [...prev, error]);
    }
  };

  // Handle phone input change with real-time validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    
    // Clear previous phone errors
    setErrors(prev => prev.filter(error => error.field !== 'phone'));
    
    // Add new validation error if any
    const error = validatePhone(value);
    if (error) {
      setErrors(prev => [...prev, error]);
    }
  };

  // Get error message for a specific field
  const getFieldError = (field: 'username' | 'phone') => {
    return errors.find(error => error.field === field)?.message;
  };

  // Get general error message
  const getGeneralError = () => {
    return errors.find(error => error.field === 'general')?.message;
  };

  // Check if form is valid
  const isFormValid = () => {
    const usernameError = validateUsername(username);
    const phoneError = validatePhone(phoneNumber);
    return !usernameError && !phoneError;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors([]);
    
    // Validate all fields
    const usernameError = validateUsername(username);
    const phoneError = validatePhone(phoneNumber);
    
    const validationErrors: ValidationError[] = [];
    if (usernameError) validationErrors.push(usernameError);
    if (phoneError) validationErrors.push(phoneError);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

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
        // Handle specific error cases
        if (response.status === 409) {
          setErrors([{ field: 'username', message: 'This username is already taken. Please choose a different one.' }]);
        } else {
          setErrors([{ field: 'general', message: data.error || 'Login failed. Please try again.' }]);
        }
        return;
      }

      // Success
      toast({
        title: 'Welcome to Web3 Chat!',
        description: `Successfully logged in as ${username}`,
      });

      onConnect(data.user, data.token);
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors([{ 
        field: 'general', 
        message: 'Connection failed. Please check your internet connection and try again.' 
      }]);
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
              Join Web3 Chat
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Enter your username to start chatting with the community
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {/* General Error Alert */}
              <AnimatePresence>
                {getGeneralError() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700 dark:text-red-300">
                        <strong>Error:</strong> {getGeneralError()}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username *
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={handleUsernameChange}
                      className={`bg-white/50 dark:bg-gray-700/50 border-white/20 pr-10 ${
                        getFieldError('username') 
                          ? 'border-red-300 focus:border-red-500' 
                          : username && !getFieldError('username')
                          ? 'border-green-300 focus:border-green-500'
                          : ''
                      }`}
                      required
                      disabled={isLoading}
                      autoComplete="username"
                    />
                    {/* Validation Icon */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {username && (
                        getFieldError('username') ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Username Error */}
                  <AnimatePresence>
                    {getFieldError('username') && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {getFieldError('username')}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  
                  {/* Username Help Text */}
                  {!getFieldError('username') && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      2-30 characters, most characters allowed
                    </p>
                  )}
                </div>

                {/* Phone Number Field */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className={`bg-white/50 dark:bg-gray-700/50 border-white/20 pr-10 ${
                        getFieldError('phone') 
                          ? 'border-red-300 focus:border-red-500' 
                          : phoneNumber && !getFieldError('phone')
                          ? 'border-green-300 focus:border-green-500'
                          : ''
                      }`}
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                    {/* Validation Icon */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {phoneNumber && (
                        getFieldError('phone') ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Phone Error */}
                  <AnimatePresence>
                    {getFieldError('phone') && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {getFieldError('phone')}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  
                  {/* Phone Help Text */}
                  {!getFieldError('phone') && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Optional - for account recovery and notifications
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Join Chat Room
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Features Section */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                >
                  <MessageCircle className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">Real-time Chat</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20"
                >
                  <User className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">Simple Login</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20"
                >
                  <Phone className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">Easy Access</p>
                </motion.div>
              </div>
            </div>

            {/* Login Instructions */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                <strong>New here?</strong> Just enter any username to create your account and start chatting!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}