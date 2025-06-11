import { IBooking } from '@/models/Booking';
import { IApartment } from '@/models/Apartment';
import { IInvoiceSettings } from '@/models/InvoiceSettings';
import { IInvoice, IInvoiceItem } from '@/models/Invoice';
import InvoiceModel from '@/models/Invoice';
import InvoiceCounterModel from '@/models/InvoiceCounter';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import NotificationModel from '@/models/Notification';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface GenerateInvoiceOptions {
  booking: IBooking | string; // Booking object o ID
  settingsGroupId?: string; // Override gruppo impostazioni
  customerOverride?: Partial<IInvoice['customer']>; // Override dati cliente
  itemsOverride?: IInvoiceItem[]; // Override voci
  notes?: string;
  internalNotes?: string;
  sendEmail?: boolean;
  generatePdf?: boolean;
  lockImmediately?: boolean;
  userId?: string; // Per tracciare chi crea la ricevuta
}

interface GenerateInvoiceResult {
  success: boolean;
  invoice?: IInvoice;
  error?: string;
}

// Funzione principale per generare una ricevuta
export async function generateInvoice(options: GenerateInvoiceOptions): Promise<GenerateInvoiceResult> {
  try {
    // 1. Carica i dati necessari
    let booking: IBooking;
    if (typeof options.booking === 'string') {
      const bookingData = await BookingModel.findById(options.booking);
      if (!bookingData) {
        return { success: false, error: 'Prenotazione non trovata' };
      }
      booking = bookingData.toObject();
    } else {
      booking = options.booking;
    }

    // Verifica se la ricevuta è già stata emessa
    if (booking.invoiceSettings?.invoiceEmitted) {
      return { 
        success: false, 
        error: `Ricevuta già emessa con numero ${booking.invoiceSettings.invoiceNumber}` 
      };
    }

    // Verifica che il prezzo sia confermato
    if (booking.totalPrice === 0 || !booking.invoiceSettings?.priceConfirmed) {
      return { 
        success: false, 
        error: 'Il prezzo della prenotazione deve essere confermato prima di emettere la ricevuta' 
      };
    }

    // 2. Carica l'appartamento
    const apartment = await ApartmentModel.findById(booking.apartmentId);
    if (!apartment) {
      return { success: false, error: 'Appartamento non trovato' };
    }

    // 3. Trova le impostazioni appropriate
    let settings: IInvoiceSettings | null = null;
    
    if (options.settingsGroupId) {
      // Usa il gruppo specificato
      settings = await InvoiceSettingsModel.findOne({ groupId: options.settingsGroupId });
    } else {
      // Trova il gruppo che contiene questo appartamento
      settings = await InvoiceSettingsModel.findOne({ 
        apartmentIds: booking.apartmentId 
      });
    }
    
    if (!settings) {
      return { 
        success: false, 
        error: 'Nessuna configurazione di fatturazione trovata per questo appartamento' 
      };
    }

    // 4. Determina la piattaforma e il tipo di ricevuta
    const platform = booking.platformOverride?.platform || booking.source || 'Direct';
    const platformSetting = settings.platformSettings.find(
      ps => ps.platform.toLowerCase() === platform.toLowerCase()
    ) || settings.platformSettings.find(ps => ps.platform === 'Direct');

    if (!platformSetting?.emitInvoice) {
      return { 
        success: false, 
        error: `L'emissione ricevute è disabilitata per la piattaforma ${platform}` 
      };
    }

    // 5. Genera il numero progressivo
    const currentYear = new Date().getFullYear();
    const { number, formatted } = await InvoiceCounterModel.getNextNumber(
      settings.groupId,
      currentYear,
      '', // L'ID verrà assegnato dopo la creazione
      settings.numberingPrefix
    );

    // Formatta il numero secondo il pattern
    let invoiceNumber = settings.numberingFormat;
    invoiceNumber = invoiceNumber.replace('{{year}}', currentYear.toString());
    invoiceNumber = invoiceNumber.replace('{{number}}', formatted);
    if (settings.numberingPrefix) {
      invoiceNumber = invoiceNumber.replace('{{prefix}}', settings.numberingPrefix);
    }

    // 6. Prepara i dati del cliente
    const customer: IInvoice['customer'] = {
      name: options.customerOverride?.name || booking.guestName,
      email: options.customerOverride?.email || booking.guestEmail,
      phone: options.customerOverride?.phone || booking.guestPhone || booking.guestPhoneNumber,
      ...booking.guestDetails,
      ...options.customerOverride,
    };

    // 7. Calcola le voci e i totali
    let items: IInvoiceItem[] = [];
    let subtotal = 0;
    let vatAmount = 0;
    let total = 0;

    if (options.itemsOverride) {
      // Usa le voci fornite
      items = options.itemsOverride;
      items.forEach(item => {
        subtotal += item.totalPrice;
        if (settings!.activityType === 'business' && item.vatRate) {
          const itemVat = settings!.vatIncluded 
            ? (item.totalPrice / (1 + item.vatRate / 100)) * (item.vatRate / 100)
            : item.totalPrice * (item.vatRate / 100);
          vatAmount += itemVat;
          item.vatAmount = itemVat;
        }
      });
    } else {
      // Genera le voci automaticamente
      const nights = Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      const description = `Soggiorno presso ${apartment.name} dal ${format(new Date(booking.checkIn), 'dd/MM/yyyy')} al ${format(new Date(booking.checkOut), 'dd/MM/yyyy')} (${nights} notti, ${booking.numberOfGuests} ospiti)`;

      const basePrice = booking.totalPrice;
      
      if (settings.activityType === 'business') {
        // Con IVA
        const vatRate = settings.vatRate || 22;
        let itemPrice = basePrice;
        let itemVat = 0;

        if (settings.vatIncluded) {
          // Prezzo include già l'IVA, dobbiamo scorporarla
          itemPrice = basePrice / (1 + vatRate / 100);
          itemVat = basePrice - itemPrice;
        } else {
          // Prezzo non include IVA, dobbiamo aggiungerla
          itemVat = itemPrice * (vatRate / 100);
        }

        items.push({
          description,
          quantity: 1,
          unitPrice: itemPrice,
          totalPrice: itemPrice,
          vatRate,
          vatAmount: itemVat,
        });

        subtotal = itemPrice;
        vatAmount = itemVat;
        total = settings.vatIncluded ? basePrice : itemPrice + itemVat;
      } else {
        // Senza IVA (locazione turistica)
        items.push({
          description,
          quantity: 1,
          unitPrice: basePrice,
          totalPrice: basePrice,
        });

        subtotal = basePrice;
        total = basePrice;
      }
    }

    // Se non ci sono override, ricalcola il totale
    if (!options.itemsOverride) {
      total = subtotal + vatAmount;
    } else {
      total = settings.activityType === 'business' && !settings.vatIncluded 
        ? subtotal + vatAmount 
        : subtotal;
    }

    // 8. Gestione cedolare secca per piattaforme
    let platformInfo: IInvoice['platformInfo'];
    if (platformSetting.invoiceType === 'withholding' && settings.activityType === 'tourist_rental') {
      const withholdingRate = 21; // Cedolare secca standard
      const withholdingAmount = total * (withholdingRate / 100);
      
      platformInfo = {
        platform,
        bookingReference: booking.externalId,
        withholdingTax: {
          rate: withholdingRate,
          amount: withholdingAmount,
          text: platformSetting.defaultWithholdingText || settings.withholdingTaxInfo?.defaultText || 
                'Cedolare secca (21%) assolta dalla piattaforma in qualità di sostituto d\'imposta',
        },
      };
    } else {
      platformInfo = {
        platform,
        bookingReference: booking.externalId,
      };
    }

    // 9. Determina il metodo di pagamento
    let paymentMethod: IInvoice['paymentInfo']['method'] = 'cash';
    let paymentStatus: IInvoice['paymentInfo']['status'] = 'pending';
    let paidAmount = 0;
    let paidDate: Date | undefined;

    if (booking.paymentStatus === 'paid') {
      paymentStatus = 'paid';
      paidAmount = total;
      paidDate = new Date();
      
      if (booking.paymentId?.startsWith('pi_') || booking.paymentId?.startsWith('cs_')) {
        paymentMethod = 'stripe';
      } else if (['Booking.com', 'Airbnb', 'Expedia'].includes(platform)) {
        paymentMethod = 'platform';
      }
    }

    // 10. Crea la ricevuta
    const invoiceData: Partial<IInvoice> = {
      invoiceNumber,
      invoiceDate: new Date(),
      bookingId: booking._id!,
      apartmentId: booking.apartmentId,
      settingsGroupId: settings.groupId,
      documentType: settings.activityType === 'business' ? 'invoice' : 'receipt',
      activityType: settings.activityType,
      issuer: {
        businessName: settings.businessName,
        address: settings.businessAddress,
        city: settings.businessCity,
        zip: settings.businessZip,
        province: settings.businessProvince,
        country: settings.businessCountry,
        vatNumber: settings.businessVat,
        taxCode: settings.businessTaxCode,
        email: settings.businessEmail,
        phone: settings.businessPhone,
      },
      customer,
      stayDetails: {
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        nights: Math.ceil(
          (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 
          (1000 * 60 * 60 * 24)
        ),
        guests: booking.numberOfGuests,
        apartmentName: apartment.name,
        apartmentAddress: apartment.address,
      },
      items,
      subtotal,
      vatAmount: settings.activityType === 'business' ? vatAmount : undefined,
      total,
      platformInfo,
      paymentInfo: {
        method: paymentMethod,
        status: paymentStatus,
        paidAmount,
        paidDate,
        stripePaymentId: booking.paymentId,
      },
      status: 'draft',
      notes: options.notes || settings.invoiceFooter,
      internalNotes: options.internalNotes,
      footer: settings.invoiceFooter,
      createdBy: options.userId || 'system',
    };

    const invoice = await InvoiceModel.create(invoiceData);

    // 11. Aggiorna il contatore con l'ID della ricevuta
    await InvoiceCounterModel.findOneAndUpdate(
      { settingsGroupId: settings.groupId, year: currentYear },
      { $set: { 'usedNumbers.$[elem].invoiceId': invoice._id } },
      { arrayFilters: [{ 'elem.number': number }] }
    );

    // 12. Collega la ricevuta alla prenotazione
    await BookingModel.findByIdAndUpdate(booking._id, {
      'invoiceSettings.invoiceEmitted': true,
      'invoiceSettings.invoiceId': invoice._id,
      'invoiceSettings.invoiceNumber': invoiceNumber,
      'invoiceSettings.emittedAt': new Date(),
    });

    // 13. Se richiesto, blocca immediatamente la ricevuta
    if (options.lockImmediately) {
      await invoice.lock();
    }

    // 14. Crea una notifica per l'admin
    await NotificationModel.create({
      userId: '1', // Admin user
      type: 'new_booking',
      title: 'Nuova ricevuta generata',
      message: `Ricevuta ${invoiceNumber} generata per ${customer.name}`,
      relatedModel: 'Booking',
      relatedId: booking._id!,
      apartmentId: booking.apartmentId,
      metadata: {
        guestName: customer.name,
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        apartmentName: apartment.name,
      },
    });

    return {
      success: true,
      invoice: invoice.toObject(),
    };

  } catch (error) {
    console.error('Errore nella generazione della ricevuta:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto nella generazione della ricevuta',
    };
  }
}

// Funzione per generare ricevute in batch
export async function generateInvoiceBatch(
  bookingIds: string[],
  options: {
    skipExisting?: boolean;
    sendEmails?: boolean;
    generatePdfs?: boolean;
    lockImmediately?: boolean;
    userId?: string;
  } = {}
): Promise<GenerateInvoiceResult[]> {
  const results: GenerateInvoiceResult[] = [];

  for (const bookingId of bookingIds) {
    try {
      // Verifica se esiste già una ricevuta
      if (options.skipExisting) {
        const booking = await BookingModel.findById(bookingId);
        if (booking?.invoiceSettings?.invoiceEmitted) {
          results.push({
            success: false,
            error: `Ricevuta già emessa per la prenotazione ${bookingId}`,
          });
          continue;
        }
      }

      const result = await generateInvoice({
        booking: bookingId,
        sendEmail: options.sendEmails,
        generatePdf: options.generatePdfs,
        lockImmediately: options.lockImmediately,
        userId: options.userId,
      });

      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: `Errore per prenotazione ${bookingId}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
      });
    }
  }

  return results;
}

// Funzione per controllare prenotazioni che necessitano ricevuta
export async function checkBookingsNeedingInvoice(): Promise<IBooking[]> {
  const bookings = await BookingModel.find({
    status: 'completed',
    'invoiceSettings.invoiceEmitted': false,
    'invoiceSettings.priceConfirmed': true,
    totalPrice: { $gt: 0 },
  }).populate('apartmentId');

  // Filtra solo quelle con impostazioni di fatturazione configurate
  const bookingsWithSettings = [];
  
  for (const booking of bookings) {
    const settings = await InvoiceSettingsModel.findOne({
      apartmentIds: booking.apartmentId,
    });
    
    if (settings) {
      bookingsWithSettings.push(booking);
    }
  }

  return bookingsWithSettings;
}

// Funzione per controllare prenotazioni senza prezzo
export async function checkBookingsMissingPrice(): Promise<IBooking[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Prenotazioni checkout da più di 7 giorni

  return await BookingModel.find({
    $or: [
      { totalPrice: 0 },
      { totalPrice: null },
      { 'invoiceSettings.priceConfirmed': false },
    ],
    checkOut: { $lt: cutoffDate },
    status: { $in: ['confirmed', 'completed'] },
  }).populate('apartmentId');
}

// Funzione per cancellare una ricevuta (solo se in bozza)
export async function cancelInvoice(
  invoiceId: string,
  reason: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invoice = await InvoiceModel.findById(invoiceId);
    
    if (!invoice) {
      return { success: false, error: 'Ricevuta non trovata' };
    }
    
    if (invoice.status !== 'draft') {
      return { success: false, error: 'Solo le ricevute in bozza possono essere cancellate' };
    }
    
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelReason = reason;
    invoice.updatedBy = userId;
    await invoice.save();

    // Aggiorna la prenotazione
    await BookingModel.findByIdAndUpdate(invoice.bookingId, {
      'invoiceSettings.invoiceEmitted': false,
      'invoiceSettings.invoiceId': null,
      'invoiceSettings.invoiceNumber': null,
      'invoiceSettings.emittedAt': null,
    });

    return { success: true };
  } catch (error) {
    console.error('Errore nella cancellazione della ricevuta:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
}

// Funzione per duplicare una ricevuta
export async function duplicateInvoice(
  invoiceId: string,
  userId: string
): Promise<GenerateInvoiceResult> {
  try {
    const originalInvoice = await InvoiceModel.findById(invoiceId);
    
    if (!originalInvoice) {
      return { success: false, error: 'Ricevuta originale non trovata' };
    }

    // Crea una nuova prenotazione fittizia per la duplicazione
    const result = await generateInvoice({
      booking: originalInvoice.bookingId,
      settingsGroupId: originalInvoice.settingsGroupId,
      customerOverride: originalInvoice.customer,
      itemsOverride: originalInvoice.items,
      notes: originalInvoice.notes,
      internalNotes: `Duplicata da ricevuta ${originalInvoice.invoiceNumber}`,
      userId,
    });

    return result;
  } catch (error) {
    console.error('Errore nella duplicazione della ricevuta:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
}
