import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import ApartmentModel from '@/models/Apartment';

export const dynamic = 'force-dynamic';

// GET: Ottieni lista appartamenti non assegnati a gruppi di fatturazione
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

    // Ottieni tutti gli appartamenti
    const allApartments = await ApartmentModel.find({}).select('_id name').lean();

    // Ottieni tutti gli appartamenti già assegnati
    const assignedSettings = await InvoiceSettingsModel.find({}).select('apartmentIds').lean();
    const assignedApartmentIds = new Set(
      assignedSettings.flatMap(s => s.apartmentIds.map((id: string) => id.toString()))
    );

    // Filtra gli appartamenti non assegnati
    const unassignedApartments = allApartments.filter(
      apt => !assignedApartmentIds.has((apt._id as { toString(): string }).toString())
    );

    return NextResponse.json({
      unassigned: unassignedApartments,
      total: allApartments.length,
      assigned: assignedApartmentIds.size,
    });
  } catch (error) {
    console.error('Error fetching unassigned apartments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
