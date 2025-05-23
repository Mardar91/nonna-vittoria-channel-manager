'use client';

import { CurrencyEuroIcon } from '@heroicons/react/24/outline';
// --- MODIFICA CHIAVE QUI ---
import { TrendingUpIcon } from '@heroicons/react/24/solid'; // Corretto!
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { RevenueWidgetProps, DataPointClient } from '@/types/dashboard.d'; // Importa tipi

export default function RevenueWidget({
  totalRevenue,
  monthRevenue,
  projectedRevenue,
  performanceData // Ora questo è DataPointClient[]
}: RevenueWidgetProps) {

  // Formatta le date per il grafico SOLO QUI nel client component
  const last7Days = performanceData.slice(-7).map(d => ({
    date: new Date(d.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    revenue: d.revenue
  }));
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs">
          €{payload[0].value}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-sm p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 rounded-xl p-3">
            <CurrencyEuroIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Ricavi Totali</h2>
            <p className="text-sm text-blue-100">Panoramica finanziaria</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <p className="text-sm text-blue-100">Ricavo Totale (sempre)</p>
          <p className="text-3xl font-bold mt-1">
            €{totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-100">Questo Mese</p>
                <p className="text-xl font-semibold mt-1">
                  €{monthRevenue.toLocaleString('it-IT')}
                </p>
              </div>
              {/* Usa l'icona importata correttamente */}
              <TrendingUpIcon className="h-5 w-5 text-green-400" /> 
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-100">Proiezione</p>
                <p className="text-xl font-semibold mt-1">
                  €{Math.round(projectedRevenue).toLocaleString('it-IT')}
                </p>
              </div>
              <div className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                +15% {/* Esempio */}
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-blue-100 mb-2">Ultimi 7 giorni</p>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}> {/* Usa i dati con date formattate */}
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ffffff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/20">
          <div>
            <p className="text-xs text-blue-100">Media/giorno</p>
            <p className="text-sm font-semibold">
              €{Math.round(monthRevenue / 30).toLocaleString('it-IT')} {/* Semplificazione */}
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-100">RevPAR</p>
            <p className="text-sm font-semibold">€85</p> {/* Esempio */}
          </div>
          <div>
            <p className="text-xs text-blue-100">ADR</p>
            <p className="text-sm font-semibold">€120</p> {/* Esempio */}
          </div>
        </div>
      </div>
    </div>
  );
}
