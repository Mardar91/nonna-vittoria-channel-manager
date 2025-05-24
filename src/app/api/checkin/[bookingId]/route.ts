import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel from '@/models/Booking'; // Non usato in GET, ma in PUT
import ApartmentModel from '@/models/Apartment';
import mongoose from 'mongoose'; // Per i tipi ObjectId

// Definiamo l'interfaccia per un singolo ospite all'interno del check-in
interface GuestData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | string; // O solo string se Mongoose lo restituisce così
  isMainGuest: boolean;
  documentType?: string;    // Opzionale
  documentNumber?: string;  // Opzionale
  // Aggiungi altre proprietà del guest se necessario
}

// Definiamo l'interfaccia per il documento CheckIn recuperato dal DB
interface CheckInDocumentAPI {
  _id: mongoose.Types.ObjectId | string;
  bookingId: mongoose.Types.ObjectId | string;
  apartmentId: mongoose.Types.ObjectId | string;
  checkInDate: Date | string;
  guests: GuestData[]; // Array di GuestData
  status: string; // o un tipo più specifico se conosci i valori possibili
  completedAt?: Date | string | null;
  completedBy?: 'guest' | string | null;
  notes?: string | null;
  // Aggiungi altre proprietà se ce ne sono
}

// Opzionale: tipo per ApartmentModel se vuoi tipizzarlo
interface ApartmentDocumentAPI {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  // ...altre proprietà
}


export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    await connectDB();
    
    // Specifica il tipo atteso quando usi .findOne() e .lean() (se lo usi)
    const checkIn = await CheckInModel.findOne({ 
      bookingId: params.bookingId,
      status: 'completed' // Assicurati che questo status sia valido
    }).lean<CheckInDocumentAPI | null>(); // Aggiungi .lean() e il tipo
    
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in non trovato o non completato' }, { status: 404 });
    }
    
    // Ottieni informazioni aggiuntive
    // const booking = await BookingModel.findById(params.bookingId); // Non sembra usato nell'output JSON
    const apartment = await ApartmentModel.findById(checkIn.apartmentId).lean<ApartmentDocumentAPI | null>();
    
    return NextResponse.json({
      id: String(checkIn._id), // Converti ObjectId a stringa
      bookingId: String(checkIn.bookingId), // Converti ObjectId a stringa
      apartmentName: apartment?.name || 'Appartamento',
      checkInDate: checkIn.checkInDate,
      // Ora 'guest' dovrebbe essere correttamente tipizzato come GuestData
      guests: checkIn.guests.map((guest: GuestData) => ({ // Tipizzazione esplicita qui se .lean() non basta
        fullName: `${guest.firstName} ${guest.lastName}`,
        dateOfBirth: guest.dateOfBirth, // Lascia come stringa o data, a seconda di cosa ti serve
        documentInfo: guest.isMainGuest && guest.documentType && guest.documentNumber ? 
          `${guest.documentType}: ${guest.documentNumber}` : undefined,
        isMainGuest: guest.isMainGuest
      })),
      status: checkIn.status,
      completedAt: checkIn.completedAt,
      completedBy: checkIn.completedBy,
      notes: checkIn.notes
    });
    
  } catch (error) {
    console.error('Error fetching check-in:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero del check-in' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    await connectDB();
    
    const body = await req.json();
    const { notes } = body; // Assumiamo che 'notes' sia una stringa
    
    // Specifica il tipo anche per findOneAndUpdate e .lean() se lo usi
    const checkIn = await CheckInModel.findOneAndUpdate(
      { bookingId: params.bookingId },
      { notes, updatedAt: new Date() }, // Assicurati che il tuo schema CheckIn abbia 'updatedAt'
      { new: true }
    ).lean<CheckInDocumentAPI | null>(); // Aggiungi .lean() e il tipo
    
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in non trovato' }, { status: 404 });
    }
    
    // Puoi restituire l'oggetto checkIn aggiornato o solo un messaggio di successo
    // Se restituisci checkIn, assicurati che sia serializzabile e coerente con CheckInDocumentAPI
    return NextResponse.json({ 
      success: true, 
      checkIn: { // Mappa esplicitamente i campi se necessario per coerenza o per rimuovere campi Mongoose
        id: String(checkIn._id),
        notes: checkIn.notes,
        updatedAt: checkIn.updatedAt // Assumi che updatedAt sia presente e desiderato
        // ...altri campi rilevanti da checkIn
      }
    });
    
  } catch (error)
    console.error('Error updating check-in:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del check-in' },
      { status: 500 }
    );
  }
}
