import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import CheckInModel from '@/models/CheckIn';
import DailyRateModel from '@/models/DailyRate';
import NotificationModel from '@/models/Notification';
import PublicProfileModel from '@/models/PublicProfile';
import SettingsModel from '@/models/Settings';

export async function DELETE(request: Request) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Ulteriore controllo: solo un ruolo specifico può resettare?
  // Per ora, assumiamo che qualsiasi utente loggato possa farlo,
  // ma in produzione potresti voler limitare questa azione (es. solo 'admin').
  // if (session.user.role !== 'admin') {
  //   return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  // }

  try {
    await connectDB();

    // Array di promesse per tutte le operazioni di cancellazione
    const deletionPromises = [
      ApartmentModel.deleteMany({}),
      BookingModel.deleteMany({}),
      CheckInModel.deleteMany({}),
      DailyRateModel.deleteMany({}),
      NotificationModel.deleteMany({}), // Considera se vuoi cancellare le notifiche o meno
      PublicProfileModel.deleteMany({}),
      SettingsModel.deleteMany({})
    ];

    await Promise.all(deletionPromises);

    return NextResponse.json({ message: 'Account reset successfully. All data has been deleted.' }, { status: 200 });

  } catch (error) {
    console.error('Error during account reset:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Error resetting account.', error: errorMessage }, { status: 500 });
  }
}
