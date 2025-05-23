'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import type { PerformanceChartProps, DataPointClient } from '@/types/dashboard.d'; // Importa tipi

export default function PerformanceChart({ data }: PerformanceChartProps) {
  // Raggruppa i dati per settimana usando le stringhe ISO ricevute
  const weeklyData = [];
  if (data.length > 0) {
    for (let i = 0; i < data.length; i += 7) {
      const weekData = data.slice(i, i + 7);
      if (weekData.length > 0) {
        const weekRevenue = weekData.reduce((sum, day) => sum + (day.revenue || 0), 0);
        // Usa la prima data della settimana per l'etichetta
        const weekStart = new Date(weekData[0].date);
        
        weeklyData.push({
          week: weekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
          revenue: weekRevenue,
          daily: Math.round(weekRevenue / weekData.length) // Usa la lunghezza effettiva della fetta
        });
      }
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">Settimana del {label}</p>
          <p className="text-sm text-green-600 mt-1">
            Totale: €{payload[0].value.toLocaleString('it-IT')}
          </p>
          <p className="text-sm text-gray-600">
            Media giornaliera: €{payload[0].payload.daily.toLocaleString('it-IT')}
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
          <div className="bg-green-100 rounded-xl p-3">
            <ChartBarIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Performance Settimanale</h2>
            <p className="text-sm text-gray-500">Ricavi per settimana</p>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Vedi dettagli →
        </button>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeklyData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="week" 
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
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="revenue"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-sm text-gray-500">Miglior settimana</p>
          <p className="text-xl font-semibold text-gray-900">
            €{weeklyData.length > 0 ? Math.max(...weeklyData.map(w => w.revenue)).toLocaleString('it-IT') : 0}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Crescita media</p>
          <p className="text-xl font-semibold text-green-600">+12.5%</p> {/* Valore di esempio */}
        </div>
      </div>
    </div>
  );
}
