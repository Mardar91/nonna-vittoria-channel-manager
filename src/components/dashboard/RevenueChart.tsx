'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface RevenueChartProps {
  bookings: Array<{
    checkIn: Date;
    totalPrice: number;
    status: string;
    paymentStatus: string;
  }>;
}

export default function RevenueChart({ bookings }: RevenueChartProps) {
  const chartData = useMemo(() => {
    const monthlyRevenue: { [key: string]: { revenue: number; month: string } } = {};
    
    // Inizializza gli ultimi 6 mesi
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
      monthlyRevenue[monthKey] = { revenue: 0, month: monthName };
    }
    
    // Somma i ricavi per mese (solo prenotazioni pagate)
    bookings
      .filter(b => b.status === 'confirmed' && b.paymentStatus === 'paid')
      .forEach(booking => {
        const checkIn = new Date(booking.checkIn);
        const monthKey = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey].revenue += booking.totalPrice;
        }
      });
    
    return Object.values(monthlyRevenue);
  }, [bookings]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-green-600">
            Ricavi: €{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        💰 Ricavi Mensili
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
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
    </div>
  );
}
