'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

interface QueuedMessage {
  id: string;
  content: string;
  type: 'text' | 'image';
  receiverUsername: string;
  timestamp: string;
  retryCount: number;
}

export function useMessageQueue(
  currentUsername: string,
  onSendMessage: (content: string, type: 'text' | 'image', receiverUsername: string) => Promise<boolean>
) {
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const isOnline = useOnlineStatus();

  const addToQueue = useCallback((
    content: string,
    type: 'text' | 'image',
    receiverUsername: string
  ) => {
    const queuedMessage: QueuedMessage = {
      id: Date.now().toString(),
      content,
      type,
      receiverUsername,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    setMessageQueue(prev => [...prev, queuedMessage]);
    return queuedMessage.id;
  }, []);

  const removeFromQueue = useCallback((messageId: string) => {
    setMessageQueue(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || isProcessing || messageQueue.length === 0) return;

    setIsProcessing(true);

    for (const message of messageQueue) {
      try {
        const success = await onSendMessage(message.content, message.type, message.receiverUsername);
        
        if (success) {
          removeFromQueue(message.id);
        } else {
          // Increment retry count
          setMessageQueue(prev => 
            prev.map(msg => 
              msg.id === message.id 
                ? { ...msg, retryCount: msg.retryCount + 1 }
                : msg
            )
          );

          // Remove message if retry count exceeds limit
          if (message.retryCount >= 3) {
            removeFromQueue(message.id);
          }
        }
      } catch (error) {
        console.error('Error processing queued message:', error);
        // Increment retry count on error
        setMessageQueue(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, retryCount: msg.retryCount + 1 }
              : msg
          )
        );
      }
    }

    setIsProcessing(false);
  }, [isOnline, isProcessing, messageQueue, onSendMessage, removeFromQueue]);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && messageQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, messageQueue.length, processQueue]);

  return {
    messageQueue,
    addToQueue,
    removeFromQueue,
    processQueue,
    isProcessing
  };
}