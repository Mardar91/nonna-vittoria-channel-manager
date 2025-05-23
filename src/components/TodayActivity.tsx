'use client';

import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Activity {
  id: string;
  guestName: string;
  apartmentName: string;
  time: Date;
}

interface TodayActivityProps {
  checkIns: Activity[];
  checkOuts: Activity[];
}

export default function TodayActivity({ checkIns, checkOuts }: TodayActivityProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const activities = [
    ...checkIns.map(activity => ({ ...activity, type: 'check-in' as const })),
    ...checkOuts.map(activity => ({ ...activity, type: 'check-out' as const }))
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 rounded-xl p-3">
            <ClockIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Attività di Oggi</h2>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('it-IT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1.5"></div>
            <span className="text-gray-600">{checkIns.length} check-in</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1.5"></div>
            <span className="text-gray-600">{checkOuts.length} check-out</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nessuna attività prevista per oggi</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <Link 
              key={`${activity.type}-${activity.id}`}
              href={`/bookings/${activity.id}`}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-sm ${
                activity.type === 'check-in' 
                  ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                  : 'border-red-200 bg-red-50 hover:bg-red-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`rounded-lg p-2 ${
                  activity.type === 'check-in' 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  {activity.type === 'check-in' ? (
                    <ArrowRightOnRectangleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowLeftOnRectangleIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{activity.guestName}</p>
                  <p className="text-sm text-gray-600">{activity.apartmentName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  activity.type === 'check-in' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {activity.type === 'check-in' ? 'Check-in' : 'Check-out'}
                </p>
                <p className="text-sm text-gray-500">{formatTime(activity.time)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">
              Totale attività: <span className="font-medium text-gray-900">{activities.length}</span>
            </p>
            <Link 
              href="/bookings" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Vedi calendario completo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
