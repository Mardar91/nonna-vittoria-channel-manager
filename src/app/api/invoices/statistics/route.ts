import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { getStatistics } from '../route';

// GET: Ottieni statistiche dettagliate delle ricevute
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Usa la funzione getStatistics dal route principale
    return getStatistics(req);
    
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Ottieni statistiche avanzate con filtri personalizzati
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const filters = await req.json();
    await connectDB();
    
    // Costruisci query MongoDB dai filtri
    const query: any = {};
    
    if (filters.dateFrom || filters.dateTo) {
      query.invoiceDate = {};
      if (filters.dateFrom) {
        query.invoiceDate.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.invoiceDate.$lte = new Date(filters.dateTo);
      }
    }
    
    if (filters.apartmentIds && filters.apartmentIds.length > 0) {
      query.apartmentId = { $in: filters.apartmentIds };
    }
    
    if (filters.settingsGroupId) {
      query.settingsGroupId = filters.settingsGroupId;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.paymentStatus) {
      query['paymentInfo.status'] = filters.paymentStatus;
    }
    
    // Esegui aggregazioni complesse
    const [
      summaryStats,
      revenueByMonth,
      revenueByApartment,
      revenueByPlatform,
      averageStats,
      taxStats,
    ] = await Promise.all([
      // Statistiche riassuntive
      InvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            totalPaid: {
              $sum: {
                $cond: [{ $eq: ['$paymentInfo.status', 'paid'] }, '$total', 0]
              }
            },
            totalPending: {
              $sum: {
                $cond: [{ $eq: ['$paymentInfo.status', 'pending'] }, '$total', 0]
              }
            },
            totalVat: { $sum: { $ifNull: ['$vatAmount', 0] } },
            avgInvoiceValue: { $avg: '$total' },
          }
        }
      ]),
      
      // Fatturato per mese
      InvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' }
            },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
            paid: {
              $sum: {
                $cond: [{ $eq: ['$paymentInfo.status', 'paid'] }, '$total', 0]
              }
            }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      
      // Fatturato per appartamento
      InvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              apartmentId: '$apartmentId',
              apartmentName: '$stayDetails.apartmentName'
            },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
            avgValue: { $avg: '$total' },
            nights: { $sum: '$stayDetails.nights' }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      
      // Fatturato per piattaforma
      InvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$platformInfo.platform',
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
            avgValue: { $avg: '$total' },
            withholdingTax: {
              $sum: { $ifNull: ['$platformInfo.withholdingTax.amount', 0] }
            }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      
      // Statistiche medie
      InvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgNights: { $avg: '$stayDetails.nights' },
            avgGuests: { $avg: '$stayDetails.guests' },
            avgRevenuePerNight: {
              $avg: { $divide: ['$total', '$stayDetails.nights'] }
            },
            avgRevenuePerGuest: {
              $avg: { $divide: ['$total', '$stayDetails.guests'] }
            }
          }
        }
      ]),
      
      // Statistiche fiscali
      InvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
            vatCollected: { $sum: { $ifNull: ['$vatAmount', 0] } },
            withholdingTax: {
              $sum: { $ifNull: ['$platformInfo.withholdingTax.amount', 0] }
            }
          }
        }
      ])
    ]);
    
    // Formatta i risultati
    const summary = summaryStats[0] || {
      totalInvoices: 0,
      totalRevenue: 0,
      totalPaid: 0,
      totalPending: 0,
      totalVat: 0,
      avgInvoiceValue: 0,
    };
    
    const monthlyRevenue = revenueByMonth.map(item => ({
      year: item._id.year,
      month: item._id.month,
      monthLabel: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.revenue,
      count: item.count,
      paid: item.paid,
      pending: item.revenue - item.paid,
    }));
    
    const apartmentRevenue = revenueByApartment.map(item => ({
      apartmentId: item._id.apartmentId,
      apartmentName: item._id.apartmentName || 'Sconosciuto',
      revenue: item.revenue,
      count: item.count,
      avgValue: item.avgValue,
      totalNights: item.nights,
      avgRevenuePerNight: item.nights > 0 ? item.revenue / item.nights : 0,
    }));
    
    const platformRevenue = revenueByPlatform.map(item => ({
      platform: item._id || 'Direct',
      revenue: item.revenue,
      count: item.count,
      avgValue: item.avgValue,
      withholdingTax: item.withholdingTax,
      netRevenue: item.revenue - item.withholdingTax,
    }));
    
    const averages = averageStats[0] || {
      avgNights: 0,
      avgGuests: 0,
      avgRevenuePerNight: 0,
      avgRevenuePerGuest: 0,
    };
    
    const taxSummary = {
      business: taxStats.find(t => t._id === 'business') || { count: 0, revenue: 0, vatCollected: 0 },
      touristRental: taxStats.find(t => t._id === 'tourist_rental') || { count: 0, revenue: 0, withholdingTax: 0 },
    };
    
    // Calcola trend rispetto al periodo precedente
    let trend = null;
    if (filters.dateFrom && filters.dateTo) {
      const currentStart = new Date(filters.dateFrom);
      const currentEnd = new Date(filters.dateTo);
      const periodLength = currentEnd.getTime() - currentStart.getTime();
      
      const previousEnd = new Date(currentStart.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - periodLength);
      
      const previousQuery = {
        ...query,
        invoiceDate: {
          $gte: previousStart,
          $lte: previousEnd,
        }
      };
      
      const previousStats = await InvoiceModel.aggregate([
        { $match: previousQuery },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$total' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const previous = previousStats[0] || { revenue: 0, count: 0 };
      
      trend = {
        revenueChange: summary.totalRevenue - previous.revenue,
        revenueChangePercent: previous.revenue > 0 
          ? ((summary.totalRevenue - previous.revenue) / previous.revenue) * 100 
          : 0,
        countChange: summary.totalInvoices - previous.count,
        countChangePercent: previous.count > 0 
          ? ((summary.totalInvoices - previous.count) / previous.count) * 100 
          : 0,
      };
    }
    
    return NextResponse.json({
      success: true,
      period: {
        from: filters.dateFrom || null,
        to: filters.dateTo || null,
      },
      summary,
      monthlyRevenue,
      apartmentRevenue,
      platformRevenue,
      averages,
      taxSummary,
      trend,
    });
    
  } catch (error) {
    console.error('Error fetching advanced statistics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
