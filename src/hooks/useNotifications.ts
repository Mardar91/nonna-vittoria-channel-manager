import { useEffect, useState, useCallback } from 'react';
import { INotification } from '@/models/Notification';

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 secondi
    limit = 20
  } = options;

  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Funzione per caricare le notifiche
  const fetchNotifications = useCallback(async (skip = 0, append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/notifications?limit=${limit}&skip=${skip}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle notifiche');
      }
      
      const data = await response.json();
      
      if (append) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setOffset(skip + data.notifications.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Funzione per ricaricare le notifiche
  const refresh = useCallback(async () => {
    await fetchNotifications(0, false);
  }, [fetchNotifications]);

  // Funzione per caricare più notifiche
  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchNotifications(offset, true);
    }
  }, [loading, hasMore, offset, fetchNotifications]);

  // Marca una notifica come letta
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      
      if (!response.ok) {
        throw new Error('Errore nel marcare la notifica come letta');
      }
      
      // Aggiorna lo stato locale
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  }, []);

  // Marca tutte le notifiche come lette
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Errore nel marcare tutte le notifiche come lette');
      }
      
      // Aggiorna lo stato locale
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  }, []);

  // Carica le notifiche al mount
  useEffect(() => {
    fetchNotifications(0, false);
  }, [fetchNotifications]);

  // Auto-refresh se abilitato
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      fetchNotifications(0, false);
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    refresh,
    markAsRead,
    markAllAsRead,
    loadMore
  };
}
