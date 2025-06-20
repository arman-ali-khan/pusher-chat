import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher configuration
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

// Client-side Pusher configuration with fallback values
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || 'demo-key', 
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    authEndpoint: '/api/pusher/auth',
    auth: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);