'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdminAuthModal } from '@/components/admin-auth-modal';
import { 
  Users, 
  Shield, 
  Crown, 
  Clock, 
  Phone, 
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface User {
  _id: string;
  username: string;
  phoneNumber?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  reputation: number;
  settings: any;
}

interface AdminUserListProps {
  token: string;
  currentUser: any;
}

export function AdminUserList({ token, currentUser }: AdminUserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      } else {
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          setIsAuthenticated(false);
        } else {
          setError(data.error || 'Failed to load users');
        }
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    toast({
      title: 'Admin Access Granted',
      description: 'You now have access to admin features.',
    });
    loadUsers();
  };

  const handleViewUsers = () => {
    if (isAuthenticated) {
      loadUsers();
    } else {
      setShowAuthModal(true);
    }
  };

  const isAdminUser = (username: string) => {
    const adminUsernames = ['admin', 'administrator', 'root', 'superuser'];
    return adminUsernames.includes(username.toLowerCase());
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
              {isAuthenticated && (
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin Access
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadUsers}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewUsers}
                className="bg-orange-50 hover:bg-orange-100 border-orange-200"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isAuthenticated ? 'Refresh' : 'View Users'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!isAuthenticated && !error && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Admin Authentication Required
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You need admin privileges to view the complete user list.
              </p>
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Shield className="mr-2 h-4 w-4" />
                Authenticate as Admin
              </Button>
            </div>
          )}

          {isAuthenticated && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                <AnimatePresence>
                  {users.map((user, index) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className={`${
                                isAdminUser(user.username) 
                                  ? 'bg-gradient-to-r from-orange-500 to-red-600' 
                                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
                              } text-white`}>
                                {user.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {user.username}
                                </p>
                                {isAdminUser(user.username) && (
                                  <Crown className="h-4 w-4 text-orange-500" />
                                )}
                                {user.isOnline ? (
                                  <Badge variant="outline" className="bg-green-100 text-green-700">
                                    Online
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                    Offline
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                {user.phoneNumber && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {user.phoneNumber}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {user.isOnline 
                                    ? 'Online now' 
                                    : `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Rep: {user.reputation}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {users.length === 0 && !isLoading && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No users found
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">
                Loading users...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Admin User List Access"
        description="Enter the admin password to view the complete user list and management features."
      />
    </>
  );
}