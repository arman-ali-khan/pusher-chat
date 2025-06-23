'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AdminUserList } from '@/components/admin-user-list';
import { 
  Send, 
  Users, 
  Settings, 
  LogOut, 
  Hash,
  MessageCircle,
  Smile,
  Paperclip,
  MoreHorizontal,
  User,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pusherClient } from '@/lib/pusher';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  phoneNumber?: string;
  avatar?: string;
  settings: any;
}

interface Message {
  _id: string;
  content: string;
  sender: {
    username: string;
    avatar?: string;
  };
  createdAt: string;
  messageType: string;
  reactions: any[];
  isEdited: boolean;
}

interface Channel {
  _id: string;
  name: string;
  type: string;
  participants: any[];
  messageCount: number;
  lastMessage?: any;
  settings: any;
}

interface ChatInterfaceProps {
  user: User;
  token: string;
  onDisconnect: () => void;
}

export function ChatInterface({ user, token, onDisconnect }: ChatInterfaceProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showUserList, setShowUserList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadChannels();
    setupPusher();
    
    return () => {
      pusherClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentChannel) {
      loadMessages(currentChannel._id);
      subscribeToChannel(currentChannel._id);
    }
  }, [currentChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChannels = async () => {
    try {
      const response = await fetch('/api/channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setChannels(data.channels);
        
        if (data.channels.length > 0) {
          setCurrentChannel(data.channels[0]);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load channels',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load channels',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      const response = await fetch(`/api/messages?channelId=${channelId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const setupPusher = () => {
    pusherClient.connection.bind('connected', () => {
      console.log('Connected to Pusher');
    });

    pusherClient.connection.bind('error', (error: any) => {
      console.error('Pusher connection error:', error);
    });
  };

  const subscribeToChannel = (channelId: string) => {
    const channel = pusherClient.subscribe(`channel-${channelId}`);
    
    channel.bind('new-message', (data: Message) => {
      setMessages(prev => [...prev, data]);
    });

    channel.bind('user-typing', (data: any) => {
      setTypingUsers(prev => new Set(prev).add(data.username));
      setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }, 3000);
    });

    const presenceChannel = pusherClient.subscribe(`presence-channel-${channelId}`);
    
    presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
      setOnlineUsers(new Set(Object.keys(members.members)));
    });

    presenceChannel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers(prev => new Set(prev).add(member.id));
    });

    presenceChannel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(member.id);
        return newSet;
      });
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChannel || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelId: currentChannel._id,
          content: newMessage,
          signature: 'simple-auth',
        }),
      });

      if (response.ok) {
        setNewMessage('');
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-r border-white/20">
          {/* Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{user.username}</p>
                  {user.phoneNumber && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {user.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                className="text-gray-500 hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Channels */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Channels</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowUserList(!showUserList)}
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2">
                {channels.map((channel) => (
                  <motion.div
                    key={channel._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`p-3 cursor-pointer transition-all ${
                        currentChannel?._id === channel._id
                          ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-300'
                          : 'bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70'
                      }`}
                      onClick={() => setCurrentChannel(channel)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                          <Hash className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {channel.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {channel.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {channels.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No channels available
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {showUserList ? (
            <div className="flex-1 p-6">
              <AdminUserList token={token} currentUser={user} />
            </div>
          ) : currentChannel ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                      <Hash className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        {currentChannel.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {currentChannel.participants.length} members • {onlineUsers.size} online
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start space-x-3"
                      >
                        <Avatar className="h-10 w-10 mt-1">
                          <AvatarImage src={message.sender.avatar} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                            {message.sender.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {message.sender.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </p>
                            {message.isEdited && (
                              <Badge variant="outline" className="text-xs">
                                edited
                              </Badge>
                            )}
                          </div>
                          <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-gray-900 dark:text-white">{message.content}</p>
                          </div>
                          {message.reactions.length > 0 && (
                            <div className="flex items-center space-x-1 mt-2">
                              {message.reactions.map((reaction, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {reaction.emoji} {reaction.count}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {typingUsers.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span>
                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                      </span>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-white/20">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <Input
                      placeholder={`Message #${currentChannel.name}`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isSending}
                      className="bg-white/50 dark:bg-gray-700/50 border-white/20"
                    />
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to Web3 Chat
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a channel to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}