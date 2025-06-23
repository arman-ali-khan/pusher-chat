# Web3 Chat - Secure Decentralized Messaging

A modern, secure Web3 chat application built with Next.js 15+, featuring username authentication, end-to-end encryption, and real-time messaging powered by Supabase.

## Features

### 🔐 Security
- Simple username authentication with JWT tokens
- End-to-end message encryption
- Message signing capabilities
- Rate limiting and XSS protection
- Secure session management with Supabase

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
- Supabase PostgreSQL database with Row Level Security
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

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Run the migration in the Supabase SQL editor

3. **Set up environment variables:**
```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials, Pusher credentials, and JWT secret.

4. **Run the database migration:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and run the SQL from `supabase/migrations/create_initial_schema.sql`

5. **Run the application:**
```bash
npm run dev
```

6. **Open in browser:**
Navigate to `http://localhost:3000`

## Environment Variables

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Pusher Configuration
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-pusher-cluster
```

## Database Schema

### Users Table
- Username-based authentication
- User preferences and settings
- Online status and reputation system

### Messages Table
- Encrypted content with signatures
- Message types (text, image, file)
- Reactions and read receipts

### Channels Table
- Public/private channel support
- Member management
- Encryption settings

### Channel Members Table
- User-channel relationships
- Role-based permissions
- Notification preferences

## API Endpoints

### Authentication
- `POST /api/auth/login` - Username-based authentication

### Messaging
- `GET /api/messages` - Retrieve channel messages
- `POST /api/messages` - Send new message

### Channels
- `GET /api/channels` - Get user's channels
- `POST /api/channels` - Create new channel

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/verify` - Verify admin password

### Real-time
- `POST /api/pusher/auth` - Authenticate Pusher connection

## Security Features

### Message Encryption
- AES encryption for message content
- Username-based key derivation
- Channel-specific encryption keys

### Row Level Security
- Supabase RLS policies protect data access
- Users can only access their own data and channels
- Channel-based message access control

### Rate Limiting
- API endpoint protection
- User-specific rate limits
- Configurable limits per endpoint

## Admin Features

- Admin user management with special privileges
- Password-protected admin functions
- User visibility controls
- Channel access management

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
- Supabase real-time subscriptions

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