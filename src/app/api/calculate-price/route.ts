import { NextRequest, NextResponse } from 'next/server';
import { calculateDynamicPriceForStay } from '@/lib/pricing';
import connectDB from '@/lib/db'; // Necessario se calculateDynamicPriceForStay interagisce con DB tramite modelli non ancora connessi

export async function POST(req: NextRequest) {
  try {
    await connectDB(); // Assicura la connessione al DB

    const body = await req.json();
    const { apartmentId, checkInDate, checkOutDate, numGuests } = body;

    // Validazione dell'input
    if (!apartmentId || !checkInDate || !checkOutDate || numGuests === undefined) {
      return NextResponse.json({ error: 'Parametri mancanti o non validi' }, { status: 400 });
    }

    if (typeof apartmentId !== 'string') {
        return NextResponse.json({ error: 'apartmentId deve essere una stringa' }, { status: 400 });
    }
    if (isNaN(new Date(checkInDate).getTime())) {
        return NextResponse.json({ error: 'checkInDate non valida' }, { status: 400 });
    }
    if (isNaN(new Date(checkOutDate).getTime())) {
        return NextResponse.json({ error: 'checkOutDate non valida' }, { status: 400 });
    }
    if (typeof numGuests !== 'number' || numGuests < 0) {
        return NextResponse.json({ error: 'numGuests deve essere un numero positivo' }, { status: 400 });
    }

    // Ulteriore validazione per date
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkIn >= checkOut) {
        return NextResponse.json({ error: 'La data di check-out deve essere successiva a quella di check-in' }, { status: 400 });
    }

    // Chiamata alla funzione di calcolo del prezzo
    const totalPrice = await calculateDynamicPriceForStay(
      apartmentId,
      checkIn,
      checkOut,
      numGuests
    );

    return NextResponse.json({ totalPrice });

  } catch (error: any) {
    console.error('Errore API /api/calculate-price:', error);
    // Controlla se l'errore ha un messaggio specifico, altrimenti errore generico
    const errorMessage = error.message || 'Errore nel calcolo del prezzo';
    // Determina uno status code più specifico se possibile, altrimenti 500
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
