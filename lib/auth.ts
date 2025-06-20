import jwt from 'jsonwebtoken';

export interface AuthPayload {
  username: string;
  userId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  static generateToken(username: string, userId: string): string {
    return jwt.sign(
      { username, userId },
      this.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as AuthPayload;
    } catch (error) {
      return null;
    }
  }

  static validateUsername(username: string): boolean {
    // Username must be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  static validatePhoneNumber(phone: string): boolean {
    // Basic phone number validation (optional field)
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  }
}