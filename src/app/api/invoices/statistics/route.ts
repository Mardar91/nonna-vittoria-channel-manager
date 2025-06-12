import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';

export const dynamic = 'force-dynamic';

// GET: Ottieni statistiche
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
