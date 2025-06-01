'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transition } from '@headlessui/react';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { INotification } from '@/models/Notification';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Carica le notifiche
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marca una notifica come letta e naviga
  const handleNotificationClick = async (notification: INotification) => {
    // Marca come letta se non lo è già
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        });
        
        // Aggiorna lo stato locale
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Naviga alla risorsa correlata
    let redirectUrl = '';
    if (notification.relatedModel === 'Booking') {
      redirectUrl = `/bookings/${notification.relatedId}`;
    } else if (notification.relatedModel === 'CheckIn') {
      redirectUrl = `/checkins/${notification.relatedId}`;
    }

    if (redirectUrl) {
      router.push(redirectUrl);
      onClose();
    }
  };

  // Marca tutte come lette
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Ottieni l'icona in base al tipo di notifica
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_booking':
      case 'booking_inquiry':
        return '📅';
      case 'new_checkin':
        return '✅';
      case 'ical_import':
        return '🔄';
      default:
        return '📢';
    }
  };

  // Carica le notifiche quando il dropdown si apre
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  return (
    <Transition
      show={isOpen}
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <div className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifiche</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Segna tutte come lette
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Caricamento...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nessuna notifica
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''} text-gray-900`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt!), {
                          addSuffix: true,
                          locale: it
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {hasMore && (
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => {
                router.push('/notifications');
                onClose();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 w-full text-center"
            >
              Vedi tutte le notifiche
            </button>
          </div>
        )}
      </div>
    </Transition>
  );
}
