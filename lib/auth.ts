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
    // Username validation rules:
    // - Must be 3-20 characters long
    // - Can only contain letters, numbers, and underscores
    // - Cannot be empty or just whitespace
    if (!username || typeof username !== 'string') {
      return false;
    }

    const trimmed = username.trim();
    
    if (trimmed.length < 3 || trimmed.length > 20) {
      return false;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(trimmed);
  }

  static validatePhoneNumber(phone: string): boolean {
    // Phone number validation (optional field)
    if (!phone || typeof phone !== 'string') {
      return true; // Phone is optional, so empty/null is valid
    }

    const trimmed = phone.trim();
    if (trimmed === '') {
      return true; // Empty string is valid for optional field
    }

    // Basic international phone number validation
    // Allows: +1234567890, (123) 456-7890, 123-456-7890, 123 456 7890, etc.
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(trimmed);
  }

  static sanitizeUsername(username: string): string {
    // Remove any potentially harmful characters and trim whitespace
    return username.trim().replace(/[^a-zA-Z0-9_]/g, '');
  }

  static sanitizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    const trimmed = phone.trim();
    if (trimmed === '') {
      return null;
    }

    // Remove any characters that aren't digits, spaces, hyphens, parentheses, or plus signs
    return trimmed.replace(/[^\d\s\-\(\)\+]/g, '');
  }

  static isAdminUser(username: string): boolean {
    // Define admin usernames
    const adminUsernames = ['admin', 'administrator', 'root', 'superuser'];
    return adminUsernames.includes(username.toLowerCase());
  }
}