export interface User {
  id?: string;
  username: string;
  phone_number?: string;
  ens_name?: string;
  avatar?: string;
  bio?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
  reputation: number;
  blocked_users: string[];
  settings: {
    notifications: boolean;
    dark_mode: boolean;
    encryption: boolean;
  };
}

export interface UserSession {
  id?: string;
  user_id: string;
  username: string;
  token: string;
  expires_at: string;
  created_at: string;
  ip_address: string;
  user_agent: string;
}