'use client';

import { useRouter } from 'next/navigation';
import { INotification } from '@/models/Notification';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

interface NotificationItemProps {
  notification: INotification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  showActions = false
}: NotificationItemProps) {
  const router = useRouter();

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

  // Gestisci il click sulla notifica
  const handleClick = () => {
    let redirectUrl = '';
    if (notification.relatedModel === 'Booking') {
      redirectUrl = `/bookings/${notification.relatedId}`;
    } else if (notification.relatedModel === 'CheckIn') {
      redirectUrl = `/checkins/${notification.relatedId}`;
    }

    if (redirectUrl) {
      // Marca come letta prima di navigare se necessario
      if (!notification.isRead && onMarkAsRead) {
        onMarkAsRead(notification._id!);
      }
      router.push(redirectUrl);
    }
  };

  // Formatta i dettagli aggiuntivi
  const getAdditionalDetails = () => {
    const details = [];
    
    if (notification.metadata?.apartmentName) {
      details.push(notification.metadata.apartmentName);
    }
    
    if (notification.metadata?.checkIn && notification.metadata?.checkOut) {
      const checkIn = new Date(notification.metadata.checkIn).toLocaleDateString('it-IT');
      const checkOut = new Date(notification.metadata.checkOut).toLocaleDateString('it-IT');
      details.push(`${checkIn} - ${checkOut}`);
    }
    
    if (notification.metadata?.source && notification.metadata.source !== 'direct') {
      details.push(`Fonte: ${notification.metadata.source}`);
    }
    
    return details.join(' • ');
  };

  return (
    <div
      className={`group relative flex items-start space-x-3 py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.isRead ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      {/* Icona */}
      <span className="text-2xl flex-shrink-0">
        {getNotificationIcon(notification.type)}
      </span>

      {/* Contenuto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''} text-gray-900`}>
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {notification.message}
            </p>
            {getAdditionalDetails() && (
              <p className="text-xs text-gray-500 mt-1">
                {getAdditionalDetails()}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(notification.createdAt!), {
                addSuffix: true,
                locale: it
              })}
            </p>
          </div>

          {/* Indicatore non letto */}
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full ml-2"></span>
          )}
        </div>
      </div>

      {/* Azioni (visibili solo su hover se showActions è true) */}
      {showActions && (
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && onMarkAsRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification._id!);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Segna come letta"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Sei sicuro di voler eliminare questa notifica?')) {
                  onDelete(notification._id!);
                }
              }}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Elimina"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
