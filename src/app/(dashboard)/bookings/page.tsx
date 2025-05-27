import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import Link from 'next/link';
import BookingList from '@/components/BookingList';
import BookingInquiries from '@/components/BookingInquiries';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OtherBookingsTabContent from '@/components/OtherBookingsTabContent'; // Import the new component

export default async function BookingsPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  try {
    // Fetch confirmed bookings
    const confirmedBookings = await BookingModel.find({ 
      status: 'confirmed' 
    }).sort({ createdAt: -1 });

    // Fetch inquiries
    const inquiries = await BookingModel.find({ 
      status: 'inquiry' 
    }).sort({ createdAt: -1 });

    // Fetch other bookings (pending, completed, cancelled)
    const otherBookings = await BookingModel.find({
      status: { $in: ['pending', 'completed', 'cancelled'] }
    }).sort({ createdAt: -1 });

    // Process confirmed bookings
    const confirmedBookingsWithApartmentInfo: (IBooking & { apartmentName: string })[] = await Promise.all(
      confirmedBookings.map(async (booking) => {
        const bookingObj = booking.toObject() as IBooking;
        const apartment = await ApartmentModel.findById(bookingObj.apartmentId);
        
        return {
          ...bookingObj,
          apartmentName: apartment ? apartment.name : 'Unknown',
        };
      })
    );

    // Process inquiries
    const inquiriesWithApartmentInfo: (IBooking & { apartmentName: string })[] = await Promise.all(
      inquiries.map(async (inquiry) => {
        const inquiryObj = inquiry.toObject() as IBooking;
        const apartment = await ApartmentModel.findById(inquiryObj.apartmentId);
        
        return {
          ...inquiryObj,
          apartmentName: apartment ? apartment.name : 'Unknown',
        };
      })
    );

    // Process other bookings
    const otherBookingsWithApartmentInfo: (IBooking & { apartmentName: string })[] = await Promise.all(
      otherBookings.map(async (booking) => {
        const bookingObj = booking.toObject() as IBooking;
        const apartment = await ApartmentModel.findById(bookingObj.apartmentId);
        return {
          ...bookingObj,
          apartmentName: apartment ? apartment.name : 'Unknown',
        };
      })
    );
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <Link 
            href="/bookings/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Nuova Prenotazione
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <Tabs defaultValue="confirmed" className="w-full">
            <div className="p-4 border-b">
              <TabsList className="grid w-full grid-cols-3"> {/* Changed to grid-cols-3 */}
                <TabsTrigger value="confirmed">
                  Prenotazioni Confermate ({confirmedBookingsWithApartmentInfo.length})
                </TabsTrigger>
                <TabsTrigger value="inquiries">
                  Richieste ({inquiriesWithApartmentInfo.length}) {/* Simplified label */}
                  {inquiriesWithApartmentInfo.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      {inquiriesWithApartmentInfo.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="other"> {/* New TabTrigger */}
                  Altre Prenotazioni ({otherBookingsWithApartmentInfo.length})
                </TabsTrigger>
              </TabsList>
            </div>
          
            <TabsContent value="confirmed">
              {confirmedBookingsWithApartmentInfo.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nessuna prenotazione confermata trovata.
                </div>
              ) : (
                <BookingList bookings={confirmedBookingsWithApartmentInfo} />
              )}
            </TabsContent>
            
            <TabsContent value="inquiries">
              <BookingInquiries inquiries={inquiriesWithApartmentInfo} />
            </TabsContent>

            <TabsContent value="other">
              <OtherBookingsTabContent bookings={otherBookingsWithApartmentInfo} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading bookings:', error);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <Link 
            href="/bookings/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Nuova Prenotazione
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Tutte le Prenotazioni</h2>
          </div>
          <div className="p-4 text-center text-gray-500">
            Si è verificato un errore nel caricamento delle prenotazioni.
          </div>
        </div>
      </div>
    );
  }
}
