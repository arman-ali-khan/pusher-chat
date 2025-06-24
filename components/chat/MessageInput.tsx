"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Image, Smile, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string, type: 'text' | 'image' | 'emoji') => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function MessageInput({ onSendMessage, disabled, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!message.trim() || disabled) return;

    await onSendMessage(message.trim(), 'text');
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const handleSendImage = () => {
    if (imagePreview) {
      onSendMessage(imagePreview, 'image');
      setImagePreview(null);
      setShowImageDialog(false);
    }
  };

  const handleCancelImage = () => {
    setImagePreview(null);
    setShowImageDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addEmoji = (emoji: string) => {
    onSendMessage(emoji, 'emoji');
  };

  const commonEmojis = ['😀', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥'];

  return (
    <>
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 space-y-3">
          {/* Emoji Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {commonEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="text-lg hover:bg-accent flex-shrink-0"
                onClick={() => addEmoji(emoji)}
                disabled={disabled}
              >
                {emoji}
              </Button>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <div className="relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
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