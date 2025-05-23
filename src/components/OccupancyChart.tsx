'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import type { OccupancyChartProps, DataPointClient } from '@/types/dashboard.d'; // Importa tipi

export default function OccupancyChart({ data }: OccupancyChartProps) {
  // Formatta i dati per il grafico QUI, convertendo le stringhe ISO
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short' 
    })
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600 mt-1">
            Occupati: {payload[0].value}
          </p>
          <p className="text-sm text-gray-600">
            Disponibili: {payload[1].value}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-2">
            Tasso: {payload[0].payload.rate}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 rounded-xl p-3">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Occupazione Mensile</h2>
            <p className="text-sm text-gray-500">Ultimi 30 giorni</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Occupati</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <span className="text-sm text-gray-600">Disponibili</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              {/* ID Unici per evitare conflitti SVG */}
              <linearGradient id="colorOccupiedChart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorAvailableChart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E5E7EB" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#E5E7EB" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="occupied"
              stackId="1"
              stroke="#3B82F6"
              fill="url(#colorOccupiedChart)"
            />
            <Area
              type="monotone"
              dataKey="available"
              stackId="1"
              stroke="#E5E7EB"
              fill="url(#colorAvailableChart)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
        <div>
          <p className="text-sm text-gray-500">Media Occupazione</p>
          <p className="text-xl font-semibold text-gray-900">
            {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + (d.rate || 0), 0) / data.length) : 0}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Picco Occupazione</p>
          <p className="text-xl font-semibold text-gray-900">
            {data.length > 0 ? Math.max(...data.map(d => d.rate || 0)) : 0}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Giorni Pieni</p>
          <p className="text-xl font-semibold text-gray-900">
            {data.filter(d => d.rate === 100).length}
          </p>
        </div>
      </div>
    </div>
  );
}
