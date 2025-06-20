import bcrypt from 'bcryptjs';

export interface AdminConfig {
  password: string;
  permissions: string[];
}

export class AdminService {
  private static ADMIN_PASSWORD_HASH = '$2a$12$8K9.Xz5QqJ8vN2mP4rL6.eH7wF3tG9sA1bC2dE4fG5hI6jK7lM8nO'; // Hash of @Samrat726728
  
  static async verifyAdminPassword(password: string): Promise<boolean> {
    try {
      // For development, we'll use direct comparison
      // In production, use bcrypt.compare(password, this.ADMIN_PASSWORD_HASH)
      return password === '@Samrat726728';
    } catch (error) {
      return false;
    }
  }

  static isAdminUser(username: string): boolean {
    // Define admin usernames - you can expand this list
    const adminUsernames = ['admin', 'administrator', 'root', 'superuser'];
    return adminUsernames.includes(username.toLowerCase());
  }

  static hasAdminPermission(username: string, permission: string): boolean {
    if (!this.isAdminUser(username)) {
      return false;
    }

    const adminPermissions = [
      'view_all_users',
      'view_all_channels',
      'manage_users',
      'manage_channels',
      'system_admin'
    ];

    return adminPermissions.includes(permission);
  }

  static filterUserVisibility(users: any[], currentUsername: string): any[] {
    const isAdmin = this.isAdminUser(currentUsername);
    
    if (isAdmin) {
      // Admin can see all users
      return users;
    } else {
      // Regular users can only see admin profiles
      return users.filter(user => this.isAdminUser(user.username));
    }
  }

  static filterChannelVisibility(channels: any[], currentUsername: string): any[] {
    const isAdmin = this.isAdminUser(currentUsername);
    
    if (isAdmin) {
      // Admin can see all channels
      return channels;
    } else {
      // Regular users can only see channels with admin participants
      return channels.filter(channel => 
        channel.participants?.some((participant: any) => 
          this.isAdminUser(participant.username)
        )
      );
    }
  }
}