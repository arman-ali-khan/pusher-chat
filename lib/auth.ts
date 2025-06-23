import jwt from 'jsonwebtoken';

export interface AuthPayload {
  username: string;
  userId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || 'simple-chat-secret-key';

  static generateToken(username: string, userId: string): string {
    return jwt.sign(
      { username, userId },
      this.JWT_SECRET,
      { expiresIn: '30d' } // Extended to 30 days for convenience
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
    // Simplified username validation
    if (!username || typeof username !== 'string') {
      return false;
    }

    const trimmed = username.trim();
    
    if (trimmed.length < 2 || trimmed.length > 30) {
      return false;
    }

    // Allow more characters for flexibility
    const usernameRegex = /^[a-zA-Z0-9_\-\.]+$/;
    return usernameRegex.test(trimmed);
  }

  static validatePhoneNumber(phone: string): boolean {
    // Phone number is optional and very permissive
    if (!phone || typeof phone !== 'string') {
      return true;
    }

    const trimmed = phone.trim();
    if (trimmed === '') {
      return true;
    }

    // Very permissive phone validation
    return trimmed.length >= 5 && trimmed.length <= 20;
  }

  static sanitizeUsername(username: string): string {
    return username.trim();
  }

  static sanitizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    const trimmed = phone.trim();
    return trimmed === '' ? null : trimmed;
  }
}