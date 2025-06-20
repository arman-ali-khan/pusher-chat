# Web3 Chat - Secure Decentralized Messaging

A modern, secure Web3 chat application built with Next.js 15+, featuring wallet authentication, end-to-end encryption, and real-time messaging.

## Features

### 🔐 Security
- Web3 wallet authentication (MetaMask/WalletConnect)
- End-to-end message encryption
- Message signing with wallet
- Rate limiting and XSS protection
- Secure session management

### 💬 Real-time Communication
- Pusher integration for real-time messaging
- Presence channels for online status
- Typing indicators
- Message delivery status
- Offline message queue

### 🎨 Modern UI
- Beautiful glassmorphism design
- Smooth animations with Framer Motion
- Responsive layout for all devices
- Dark/light mode support
- Progressive Web App (PWA) ready

### 🔧 Technical Features
- MongoDB database with optimized schemas
- Virtual scrolling for performance
- Message pagination
- Comprehensive error handling
- TypeScript throughout

## Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd web3-chat
npm install
```

2. **Set up environment variables:**
```bash
cp .env.local.example .env.local
```

Fill in your MongoDB URI, Pusher credentials, and JWT secret.

3. **Run the application:**
```bash
npm run dev
```

4. **Open in browser:**
Navigate to `http://localhost:3000`

## Environment Variables

Create a `.env.local` file with:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/web3chat

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Pusher Configuration
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-pusher-cluster
```

## Database Schema

### Users Collection
- Wallet address and ENS integration
- User preferences and settings
- Online status and reputation system

### Messages Collection
- Encrypted content with signatures
- Message types (text, image, file)
- Reactions and read receipts

### Channels Collection
- Public/private channel support
- Member management
- Encryption settings

## API Endpoints

### Authentication
- `POST /api/auth/nonce` - Generate authentication nonce
- `POST /api/auth/verify` - Verify wallet signature and authenticate

### Messaging
- `GET /api/messages` - Retrieve channel messages
- `POST /api/messages` - Send new message

### Channels
- `GET /api/channels` - Get user's channels
- `POST /api/channels` - Create new channel

### Real-time
- `POST /api/pusher/auth` - Authenticate Pusher connection

## Security Features

### Message Encryption
- AES encryption for message content
- Wallet-based key derivation
- Channel-specific encryption keys

### Signature Verification
- All messages signed with user's wallet
- Signature verification on server
- Prevents message tampering

### Rate Limiting
- API endpoint protection
- User-specific rate limits
- Configurable limits per endpoint

## PWA Features

- Service worker for offline functionality
- Push notifications
- App-like experience
- Installable on mobile devices

## Performance Optimizations

- Virtual scrolling for large message lists
- Message pagination (20 messages per load)
- Image compression and lazy loading
- Efficient database queries with indexes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, join our community or create an issue in the repository.