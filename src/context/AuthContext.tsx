import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationItem } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('apex_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('apex_theme') as 'dark' | 'light') || 'dark'
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    localStorage.setItem('apex_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        fetchNotifications(authToken);
      } else {
        localStorage.removeItem('apex_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (authToken: string) => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.notifications || []);
        setNotifications(list.map((n: any) => ({ ...n, read: n.read ?? !!n.read_at })));
      }
    } catch (err) {
      // Silently handle fetch errors for notifications
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Real-time EventSource listener, background polling, and multi-tab synchronization
  useEffect(() => {
    if (!token) return;

    // 1. Lightweight authenticated polling interval (every 3 seconds)
    const pollInterval = setInterval(() => {
      fetchCurrentUserSilently(token);
    }, 3000);

    // 2. Server-Sent Events (SSE) connection for instant push updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/live-events?token=${encodeURIComponent(token)}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'DEPOSIT_APPROVED' ||
            data.type === 'DEPOSIT_REJECTED' ||
            data.type === 'WALLET_UPDATED' ||
            data.type === 'WITHDRAWAL_PROCESSED' ||
            data.type === 'NOTIFICATION'
          ) {
            refreshUserData();
          }
        } catch (e) {
          // ignore heartbeat parse
        }
      };
    } catch (err) {
      console.warn('SSE initialization deferred or unavailable:', err);
    }

    // 3. Multi-tab synchronization via BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('apex_wallet_sync');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'WALLET_REFRESH') {
            refreshUserData();
          }
        };
      } catch (e) {
        // BroadcastChannel optional fallback
      }
    }

    // 4. Custom DOM event listener for app-wide triggers
    const handleWalletEvent = () => {
      refreshUserData();
    };
    window.addEventListener('apex_wallet_updated', handleWalletEvent);

    return () => {
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener('apex_wallet_updated', handleWalletEvent);
    };
  }, [token]);

  const fetchCurrentUserSilently = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        fetchNotifications(authToken);
      }
    } catch (err) {
      // Silent error during background poll
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      localStorage.setItem('apex_token', data.token);
      setToken(data.token);
      setUser(data.user);
      fetchNotifications(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (formData: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      localStorage.setItem('apex_token', data.token);
      setToken(data.token);
      setUser(data.user);
      fetchNotifications(data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('apex_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
  };

  const refreshUserData = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        notifications,
        unreadCount,
        login,
        register,
        logout,
        refreshUserData,
        markNotificationAsRead
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
