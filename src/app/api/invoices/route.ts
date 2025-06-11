import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { generateInvoice, checkBookingsNeedingInvoice } from '@/lib/invoice-generator';
import { InvoiceFilters, CreateInvoiceDTO } from '@/types/invoice';

// GET: Ottieni lista ricevute con filtri e paginazione
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
    
    // Parametri di paginazione
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Parametri di ricerca
    const search = url.searchParams.get('search');
    
    // Costruisci i filtri
    const filters: any = {};
    
    // Filtro stato
    const status = url.searchParams.get('status');
    if (status) {
      if (status.includes(',')) {
        filters.status = { $in: status.split(',') };
      } else {
        filters.status = status;
      }
    }
    
    // Filtro stato pagamento
    const paymentStatus = url.searchParams.get('paymentStatus');
    if (paymentStatus) {
      if (paymentStatus.includes(',')) {
        filters['paymentInfo.status'] = { $in: paymentStatus.split(',') };
      } else {
        filters['paymentInfo.status'] = paymentStatus;
      }
    }
    
    // Filtro appartamento
    const apartmentId = url.searchParams.get('apartmentId');
    if (apartmentId) {
      if (apartmentId.includes(',')) {
        filters.apartmentId = { $in: apartmentId.split(',') };
      } else {
        filters.apartmentId = apartmentId;
      }
    }
    
    // Filtro gruppo impostazioni
    const settingsGroupId = url.searchParams.get('settingsGroupId');
    if (settingsGroupId) {
      filters.settingsGroupId = settingsGroupId;
    }
    
    // Filtro date
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      filters.invoiceDate = {};
      if (dateFrom) {
        filters.invoiceDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filters.invoiceDate.$lte = new Date(dateTo);
      }
    }
    
    // Filtro email cliente
    const customerEmail = url.searchParams.get('customerEmail');
    if (customerEmail) {
      filters['customer.email'] = customerEmail;
    }
    
    // Filtro numero ricevuta
    const invoiceNumber = url.searchParams.get('invoiceNumber');
    if (invoiceNumber) {
      filters.invoiceNumber = new RegExp(invoiceNumber, 'i');
    }
    
    // Filtro booking ID
    const bookingId = url.searchParams.get('bookingId');
    if (bookingId) {
      filters.bookingId = bookingId;
    }
    
    // Filtro piattaforma
    const platformSource = url.searchParams.get('platformSource');
    if (platformSource) {
      filters['platformInfo.platform'] = platformSource;
    }
    
    // Ricerca testuale
    if (search) {
      filters.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
        { 'customer.email': new RegExp(search, 'i') },
        { 'customer.phone': new RegExp(search, 'i') },
        { 'stayDetails.apartmentName': new RegExp(search, 'i') },
      ];
    }
    
    // Query principale con paginazione
    const [invoices, totalCount] = await Promise.all([
      InvoiceModel
        .find(filters)
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvoiceModel.countDocuments(filters),
    ]);
    
    // Calcola il numero totale di pagine
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Crea nuova ricevuta
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: CreateInvoiceDTO = await req.json();
    
    // Validazione base
    if (!data.bookingId) {
      return NextResponse.json(
        { error: 'bookingId è obbligatorio' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Genera la ricevuta utilizzando il generatore
    const result = await generateInvoice({
      booking: data.bookingId,
      settingsGroupId: data.settingsGroupId,
      customerOverride: data.customerOverride,
      itemsOverride: data.itemsOverride,
      notes: data.notes,
      internalNotes: data.internalNotes,
      sendEmail: data.sendEmail,
      generatePdf: data.generatePdf,
      lockImmediately: data.lockImmediately,
      userId: session.user?.id || '1',
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Errore nella creazione della ricevuta' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true,
        invoice: result.invoice,
        message: 'Ricevuta creata con successo',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// GET: Ottieni statistiche (endpoint separato: /api/invoices/statistics)
export async function getStatistics(req: NextRequest) {
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
    
    // Filtri opzionali per le statistiche
    const filters: any = {};
    
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      filters.invoiceDate = {};
      if (dateFrom) {
        filters.invoiceDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filters.invoiceDate.$lte = new Date(dateTo);
      }
    }
    
    // Aggrega le statistiche
    const [
      totalStats,
      statusStats,
      paymentStats,
      monthlyStats,
      apartmentStats,
    ] = await Promise.all([
      // Totali generali
      InvoiceModel.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalIssued: { $sum: 1 },
            totalAmount: { $sum: '$total' },
            paidAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$paymentInfo.status', 'paid'] },
                  '$total',
                  0
                ]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$paymentInfo.status', 'pending'] },
                  '$total',
                  0
                ]
              }
            },
          }
        }
      ]),
      
      // Statistiche per stato
      InvoiceModel.aggregate([
        { $match: filters },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Statistiche per stato pagamento
      InvoiceModel.aggregate([
        { $match: filters },
        {
          $group: {
            _id: '$paymentInfo.status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Statistiche mensili (ultimi 12 mesi)
      InvoiceModel.aggregate([
        {
          $match: {
            ...filters,
            invoiceDate: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 11))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' }
            },
            count: { $sum: 1 },
            amount: { $sum: '$total' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]),
      
      // Statistiche per appartamento
      InvoiceModel.aggregate([
        { $match: filters },
        {
          $group: {
            _id: {
              apartmentId: '$apartmentId',
              apartmentName: '$stayDetails.apartmentName'
            },
            count: { $sum: 1 },
            amount: { $sum: '$total' }
          }
        },
        {
          $sort: { amount: -1 }
        },
        {
          $limit: 10
        }
      ]),
    ]);
    
    // Formatta i risultati
    const stats = totalStats[0] || {
      totalIssued: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    };
    
    const byStatus = {
      draft: 0,
      issued: 0,
      sent: 0,
      cancelled: 0,
    };
    statusStats.forEach(s => {
      byStatus[s._id as keyof typeof byStatus] = s.count;
    });
    
    const byPaymentStatus = {
      pending: 0,
      paid: 0,
      partial: 0,
      refunded: 0,
    };
    paymentStats.forEach(s => {
      byPaymentStatus[s._id as keyof typeof byPaymentStatus] = s.count;
    });
    
    const byMonth = monthlyStats.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      count: m.count,
      amount: m.amount,
    }));
    
    const byApartment = apartmentStats.map(a => ({
      apartmentId: a._id.apartmentId,
      apartmentName: a._id.apartmentName,
      count: a.count,
      amount: a.amount,
    }));
    
    return NextResponse.json({
      totalIssued: stats.totalIssued,
      totalAmount: stats.totalAmount,
      paidAmount: stats.paidAmount,
      pendingAmount: stats.pendingAmount,
      byStatus,
      byPaymentStatus,
      byMonth,
      byApartment,
    });
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
