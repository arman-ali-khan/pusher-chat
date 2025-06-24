"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Image, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTypingStatus } from '@/lib/chat';

interface MessageInputProps {
  onSendMessage: (content: string, type: 'text' | 'image') => void;
  disabled?: boolean;
  isLoading?: boolean;
  currentUsername: string;
  selectedUser: string;
}

export default function MessageInput({ 
  onSendMessage, 
  disabled, 
  isLoading, 
  currentUsername, 
  selectedUser 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing status
  useEffect(() => {
    const handleTypingStatus = async (typing: boolean) => {
      if (typing !== isTyping) {
        setIsTyping(typing);
        await setTypingStatus(currentUsername, selectedUser, typing);
      }
    };

    if (message.trim() && !isTyping) {
      handleTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing status
    if (message.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStatus(false);
      }, 2000); // Stop typing after 2 seconds of inactivity
    } else if (isTyping) {
      handleTypingStatus(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, currentUsername, selectedUser, isTyping]);

  // Cleanup typing status when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (isTyping) {
        setTypingStatus(currentUsername, selectedUser, false);
      }
    };
  }, [currentUsername, selectedUser, isTyping]);

  const handleSend = async () => {
    if (!message.trim() || disabled) return;

    // Stop typing status before sending
    if (isTyping) {
      await setTypingStatus(currentUsername, selectedUser, false);
      setIsTyping(false);
    }

    await onSendMessage(message.trim(), 'text');
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setShowImageDialog(true);
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSendImage = async () => {
    if (imagePreview) {
      // Stop typing status before sending
      if (isTyping) {
        await setTypingStatus(currentUsername, selectedUser, false);
        setIsTyping(false);
      }

      onSendMessage(imagePreview, 'image');
      setImagePreview(null);
      setShowImageDialog(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelImage = () => {
    setImagePreview(null);
    setShowImageDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4">
          {/* Message Input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <div className="relative">
                <Input
                  value={message}
                  onChange={handleMessageChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={disabled}
                  className="pr-12 resize-none min-h-[44px] rounded-full"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    title="Upload image"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              className="rounded-full h-11 w-11 p-0"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Send Image
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelImage}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelImage}>
                Cancel
              </Button>
              <Button onClick={handleSendImage} disabled={!imagePreview}>
                <Upload className="h-4 w-4 mr-2" />
                Send Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}