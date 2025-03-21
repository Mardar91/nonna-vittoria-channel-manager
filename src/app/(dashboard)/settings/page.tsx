// src/app/(dashboard)/settings/page.tsx
import { getServerSession } from 'next-auth/next';

export default async function SettingsPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Impostazioni</h1>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Impostazioni Account</h3>
            <p className="mt-1 text-sm text-gray-500">
              Gestisci le impostazioni principali del tuo account.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <form className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  defaultValue={session.user?.email || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Fuso Orario
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Europe/Rome">Europe/Rome (CET/CEST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              
              <div>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Impostazioni Channel Manager</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configura le impostazioni del Channel Manager.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <form className="space-y-6">
              <div>
                <label htmlFor="defaultCheckInTime" className="block text-sm font-medium text-gray-700">
                  Orario Default Check-in
                </label>
                <input
                  type="time"
                  name="defaultCheckInTime"
                  id="defaultCheckInTime"
                  defaultValue="14:00"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="defaultCheckOutTime" className="block text-sm font-medium text-gray-700">
                  Orario Default Check-out
                </label>
                <input
                  type="time"
                  name="defaultCheckOutTime"
                  id="defaultCheckOutTime"
                  defaultValue="10:00"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="autoSync"
                      name="autoSync"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      defaultChecked
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="autoSync" className="font-medium text-gray-700">
                      Sincronizzazione Automatica
                    </label>
                    <p className="text-gray-500">
                      Sincronizza automaticamente le prenotazioni da fonti esterne ogni ora.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
