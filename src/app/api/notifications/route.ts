import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import NotificationModel from '@/models/Notification';

// GET: Recupera le notifiche per l'utente corrente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    // Costruisci la query
    const query: any = { userId: session.user?.id || '1' }; // Usa l'ID dell'utente dalla sessione
    if (unreadOnly) {
      query.isRead = false;
    }

    // Recupera le notifiche con paginazione
    const notifications = await NotificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Conta il totale delle notifiche non lette
    const unreadCount = await NotificationModel.countDocuments({
      userId: session.user?.id || '1',
      isRead: false
    });

    // Conta il totale per la paginazione
    const totalCount = await NotificationModel.countDocuments(query);

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
      hasMore: skip + notifications.length < totalCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Crea una nuova notifica (solo per uso interno, non esposta all'utente)
export async function POST(req: NextRequest) {
  try {
    // Questa API dovrebbe essere chiamata solo internamente
    // In produzione, potresti voler aggiungere una chiave API o altro meccanismo di autenticazione
    const data = await req.json();
    
    await connectDB();

    const notification = await NotificationModel.create({
      ...data,
      userId: data.userId || '1' // Default all'admin se non specificato
    });

    return NextResponse.json({
      success: true,
      notification
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH: Marca tutte le notifiche come lette
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const result = await NotificationModel.updateMany(
      { 
        userId: session.user?.id || '1',
        isRead: false 
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
