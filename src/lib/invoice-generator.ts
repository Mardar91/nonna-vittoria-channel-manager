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
import { generateAndUploadPdfToBlob } from './pdf-generator'; // Added import

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
  bookingId?: string;
}

// Funzione principale per generare una ricevuta
export async function generateInvoice(options: GenerateInvoiceOptions): Promise<GenerateInvoiceResult> {
  let preliminaryInvoiceId: string | null = null; // Per il rollback del contatore in caso di errore
  let settingsGroupIdForRollback: string | null = null;
  let currentYearForRollback: number | null = null;

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
    if (booking.invoiceSettings?.invoiceEmitted && booking.invoiceSettings.invoiceId) {
        // Controllo aggiuntivo se la fattura esiste davvero, altrimenti si potrebbe rigenerare
        const existingInvoiceCheck = await InvoiceModel.findById(booking.invoiceSettings.invoiceId);
        if (existingInvoiceCheck) {
            return {
                success: false,
                error: `Ricevuta già emessa con numero ${booking.invoiceSettings.invoiceNumber}`
            };
        }
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
      settings = await InvoiceSettingsModel.findOne({ groupId: options.settingsGroupId });
    } else {
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
    settingsGroupIdForRollback = settings.groupId; // Per rollback

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

    // 5.a Creare una bozza di fattura per ottenere un ID
    const tempInvoice = new InvoiceModel({
      bookingId: booking._id!,
      apartmentId: booking.apartmentId,
      settingsGroupId: settings.groupId,
      status: 'draft',
      customer: {
        name: options.customerOverride?.name || booking.guestName || 'Placeholder Name',
        email: options.customerOverride?.email || booking.guestEmail || 'placeholder@example.com'
      },
      issuer: {
        businessName: settings.businessName,
        address: settings.businessAddress,
        city: settings.businessCity,
        zip: settings.businessZip,
        province: settings.businessProvince,
        country: settings.businessCountry,
        taxCode: settings.businessTaxCode,
        vatNumber: settings.businessVat,
        email: settings.businessEmail,
        phone: settings.businessPhone,
      },
      stayDetails: {
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        nights: Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
        guests: booking.numberOfGuests,
        apartmentName: apartment.name,
        apartmentAddress: apartment.address,
      },
      items: [],
      subtotal: 0,
      total: 0,
      paymentInfo: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0
      },
      activityType: settings.activityType,
      invoiceDate: new Date(),
      invoiceNumber: 'TEMP-' + Date.now().toString()
    });
    await tempInvoice.save();
    preliminaryInvoiceId = tempInvoice._id.toString(); // Assegna per rollback

    // 5.b Genera il numero progressivo usando l'ID della bozza
    const currentYear = new Date().getFullYear();
    currentYearForRollback = currentYear; // Per rollback
    const { number, formatted } = await InvoiceCounterModel.getNextNumber(
      settings.groupId,
      currentYear,
      preliminaryInvoiceId,
      settings.numberingPrefix
    );

    let finalInvoiceNumber = settings.numberingFormat;
    finalInvoiceNumber = finalInvoiceNumber.replace('{{year}}', currentYear.toString());
    finalInvoiceNumber = finalInvoiceNumber.replace('{{number}}', formatted);
    if (settings.numberingPrefix) {
      finalInvoiceNumber = finalInvoiceNumber.replace('{{prefix}}', settings.numberingPrefix);
    }

    // 6. Prepara i dati del cliente
    const customer: IInvoice['customer'] = {
      name: options.customerOverride?.name || booking.guestName,
      email: options.customerOverride?.email || booking.guestEmail,
      phone: options.customerOverride?.phone || booking.guestPhone || booking.guestPhoneNumber,
      address: options.customerOverride?.address || booking.guestDetails?.address,
      city: options.customerOverride?.city || booking.guestDetails?.city,
      zip: options.customerOverride?.zip || booking.guestDetails?.zip,
      province: options.customerOverride?.province || booking.guestDetails?.province,
      country: options.customerOverride?.country || booking.guestDetails?.country,
      vatNumber: options.customerOverride?.vatNumber || booking.guestDetails?.vatNumber,
      taxCode: options.customerOverride?.taxCode || booking.guestDetails?.taxCode,
    };

    // 7. Calcola le voci e i totali
    let items: IInvoiceItem[] = [];
    let subtotal = 0;
    let vatAmount = 0;
    let total = 0;

    if (options.itemsOverride) {
      items = options.itemsOverride;
      items.forEach(item => {
        const priceForSubtotal = (settings!.activityType === 'business' && settings!.vatIncluded && item.vatRate)
            ? item.totalPrice / (1 + item.vatRate/100)
            : item.totalPrice;
        subtotal += priceForSubtotal;

        if (settings!.activityType === 'business' && item.vatRate) {
          const itemVat = settings!.vatIncluded 
            ? item.totalPrice - priceForSubtotal
            : priceForSubtotal * (item.vatRate / 100);
          vatAmount += itemVat;
          item.vatAmount = itemVat; // Assicurati che vatAmount sia settato sull'item
        }
      });
       total = subtotal + vatAmount;
    } else {
      const nights = Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      const description = `Soggiorno presso ${apartment.name} dal ${format(new Date(booking.checkIn), 'dd/MM/yyyy')} al ${format(new Date(booking.checkOut), 'dd/MM/yyyy')} (${nights} notti, ${booking.numberOfGuests} ospiti)`;
      const basePrice = booking.totalPrice;
      
      if (settings.activityType === 'business') {
        const vatRate = settings.vatRate || 22;
        let itemSubtotal: number;
        let itemVat: number;
        if (settings.vatIncluded) {
          itemSubtotal = basePrice / (1 + vatRate / 100);
          itemVat = basePrice - itemSubtotal;
        } else {
          itemSubtotal = basePrice;
          itemVat = itemSubtotal * (vatRate / 100);
        }
        items.push({
          description, quantity: 1, unitPrice: itemSubtotal, totalPrice: itemSubtotal,
          vatRate, vatAmount: itemVat,
        });
        subtotal = itemSubtotal; vatAmount = itemVat; total = basePrice;
      } else {
        items.push({ description, quantity: 1, unitPrice: basePrice, totalPrice: basePrice });
        subtotal = basePrice; vatAmount = 0; total = basePrice;
      }
    }

    // 8. Gestione cedolare secca per piattaforme
    let platformInfo: IInvoice['platformInfo'];
    if (platformSetting.invoiceType === 'withholding' && settings.activityType === 'tourist_rental') {
      const withholdingRate = 21;
      const withholdingAmount = total * (withholdingRate / 100);
      platformInfo = {
        platform, bookingReference: booking.externalId,
        withholdingTax: {
          rate: withholdingRate, amount: withholdingAmount,
          text: platformSetting.defaultWithholdingText || settings.withholdingTaxInfo?.defaultText || 
                'Cedolare secca (21%) assolta dalla piattaforma in qualità di sostituto d\'imposta',
        },
      };
    } else {
      platformInfo = { platform, bookingReference: booking.externalId };
    }

    // 9. Determina il metodo di pagamento
    let paymentMethod: IInvoice['paymentInfo']['method'] = 'cash';
    let paymentStatus: IInvoice['paymentInfo']['status'] = 'pending';
    let paidAmount = 0;
    let paidDate: Date | undefined;

    if (booking.paymentStatus === 'paid') {
      paymentStatus = 'paid'; paidAmount = total; paidDate = new Date();
      if (booking.paymentId?.startsWith('pi_') || booking.paymentId?.startsWith('cs_test_')) {
        paymentMethod = 'stripe';
      } else if (['Booking.com', 'Airbnb', 'Expedia'].includes(platform)) {
        paymentMethod = 'platform';
      }
    }

    // 10. Prepara i dati finali per l'aggiornamento
    const invoiceDataToUpdate: Partial<IInvoice> = {
      invoiceNumber: finalInvoiceNumber, invoiceDate: new Date(),
      documentType: settings.activityType === 'business' ? 'invoice' : 'receipt',
      activityType: settings.activityType,
      issuer: {
        businessName: settings.businessName, address: settings.businessAddress, city: settings.businessCity,
        zip: settings.businessZip, province: settings.businessProvince, country: settings.businessCountry,
        vatNumber: settings.businessVat, taxCode: settings.businessTaxCode,
        email: settings.businessEmail, phone: settings.businessPhone,
      },
      customer,
      stayDetails: {
        checkIn: new Date(booking.checkIn), checkOut: new Date(booking.checkOut),
        nights: Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
        guests: booking.numberOfGuests, apartmentName: apartment.name, apartmentAddress: apartment.address,
      },
      items, subtotal,
      vatAmount: settings.activityType === 'business' ? vatAmount : undefined,
      total, platformInfo,
      paymentInfo: {
        method: paymentMethod, status: paymentStatus, paidAmount, paidDate,
        stripePaymentId: booking.paymentId,
      },
      status: options.lockImmediately ? 'issued' : 'draft',
      notes: options.notes || settings.invoiceFooter,
      internalNotes: options.internalNotes,
      footer: settings.invoiceFooter,
      createdBy: options.userId || 'system',
      updatedBy: options.userId || 'system',
    };

    const invoice = await InvoiceModel.findByIdAndUpdate(
      preliminaryInvoiceId,
      { $set: invoiceDataToUpdate },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      await InvoiceCounterModel.findOneAndUpdate(
          { settingsGroupId: settings.groupId, year: currentYear },
          { $pull: { usedNumbers: { invoiceId: preliminaryInvoiceId } }, $inc: { lastNumber: -1 } }
      );
      return { success: false, error: 'Errore nell\'aggiornamento della bozza della fattura dopo aver ottenuto il numero' };
    }

    // PDF Generation
    if (invoice && (options.generatePdf === undefined || options.generatePdf === true)) {
      try {
        const pdfResult = await generateAndUploadPdfToBlob(invoice.toObject() as IInvoice, invoice._id.toString());
        if (pdfResult.blobUrl) {
          const updatedInvoiceWithPdf = await InvoiceModel.findByIdAndUpdate(
            invoice._id,
            // Usiamo pdfGeneratedAt invece di htmlGeneratedAt
            { $set: { pdfUrl: pdfResult.blobUrl, pdfGeneratedAt: new Date() } },
            { new: true }
          );
          if (updatedInvoiceWithPdf) {
            Object.assign(invoice, updatedInvoiceWithPdf.toObject());
          } else {
            console.warn(`[Invoice ${invoice.invoiceNumber}] PDF generato e caricato su ${pdfResult.blobUrl}, ma fallito l'aggiornamento del db con pdfUrl.`);
          }
        } else if (pdfResult.error) {
          console.error(`[Invoice ${invoice.invoiceNumber}] Fallita generazione/upload PDF: ${pdfResult.error}`);
          let errorNote = `Errore generazione PDF: ${pdfResult.error}`;
          if (invoice.internalNotes) {
            invoice.internalNotes += `\n${errorNote}`;
          } else {
            invoice.internalNotes = errorNote;
          }
          await InvoiceModel.findByIdAndUpdate(invoice._id, { $set: { internalNotes: invoice.internalNotes }});
        }
      } catch (pdfProcessingError) {
        console.error(`[Invoice ${invoice.invoiceNumber}] Errore critico durante il processo PDF: ${pdfProcessingError}`);
        let errorNote = `Errore critico processo PDF: ${ (pdfProcessingError instanceof Error) ? pdfProcessingError.message : String(pdfProcessingError)}`;
        if (invoice.internalNotes) {
            invoice.internalNotes += `\n${errorNote}`;
          } else {
            invoice.internalNotes = errorNote;
          }
        await InvoiceModel.findByIdAndUpdate(invoice._id, { $set: { internalNotes: invoice.internalNotes }});
      }
    }

    // 12. Collega la ricevuta alla prenotazione
    await BookingModel.findByIdAndUpdate(booking._id, {
      'invoiceSettings.invoiceEmitted': true,
      'invoiceSettings.invoiceId': invoice._id,
      'invoiceSettings.invoiceNumber': finalInvoiceNumber,
      'invoiceSettings.emittedAt': new Date(),
    });

    // 13. Se richiesto, blocca immediatamente la ricevuta
    if (options.lockImmediately && invoice.status !== 'issued') {
      await invoice.lock();
    }

    // 14. Crea una notifica per l'admin
    await NotificationModel.create({
      userId: '1',
      type: 'new_invoice',
      title: `Nuova ${invoice.documentType} generata`,
      message: `${invoice.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'} ${invoice.invoiceNumber} generata per ${customer.name}`,
      relatedModel: 'Invoice',
      relatedId: invoice._id!,
      apartmentId: booking.apartmentId,
      metadata: {
        guestName: customer.name, checkIn: new Date(booking.checkIn), checkOut: new Date(booking.checkOut),
        apartmentName: apartment.name, invoiceNumber: invoice.invoiceNumber, invoiceTotal: invoice.total,
      },
    });

    return {
      success: true,
      invoice: invoice.toObject(),
    };

  } catch (error) {
    console.error('Errore globale nella generazione della ricevuta:', error);
    // Rollback del numero se l'errore si verifica dopo la generazione del numero
    if (preliminaryInvoiceId && settingsGroupIdForRollback && currentYearForRollback) {
        try {
            await InvoiceCounterModel.findOneAndUpdate(
              { settingsGroupId: settingsGroupIdForRollback, year: currentYearForRollback },
              { $pull: { usedNumbers: { invoiceId: preliminaryInvoiceId } }, $inc: { lastNumber: -1 } }
            );
            console.log(`[Invoice Generation Error] Rolled back number for preliminaryInvoiceId: ${preliminaryInvoiceId}`);
            // Considera anche di eliminare la tempInvoice se creata
             await InvoiceModel.findByIdAndDelete(preliminaryInvoiceId);
             console.log(`[Invoice Generation Error] Deleted temporary invoice: ${preliminaryInvoiceId}`);

        } catch (rollbackError) {
            console.error(`[Invoice Generation Error] Failed to rollback invoice number for ${preliminaryInvoiceId}:`, rollbackError);
        }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto nella generazione della ricevuta',
    };
  }
}

export async function cancelIssuedInvoice(
  invoiceId: string,
  reason: string,
  userId: string
): Promise<{ success: boolean; error?: string; invoice?: IInvoice }> {
  try {
    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      return { success: false, error: 'Fattura non trovata' };
    }

    if (invoice.status === 'cancelled') {
      return { success: false, error: 'Questa fattura è già stata annullata' };
    }

    if (invoice.status === 'draft') {
      return {
        success: false,
        error: 'Questa funzione è per annullare fatture emesse. Per le bozze, usare cancelDraftInvoice.'
      };
    }

    // Per fatture emesse (issued, sent, paid, partial, ecc.) procedi con la cancellazione logica
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelReason = reason;
    invoice.updatedBy = userId;
    // isLocked potrebbe rimanere true, indicando che è stata finalizzata e poi annullata.

    await invoice.save();

    // Aggiungi una nota alla prenotazione collegata che la sua fattura è stata annullata.
    if (invoice.bookingId) {
      const booking = await BookingModel.findById(invoice.bookingId);
      if (booking) {
        let newNotes = `Fattura ${invoice.invoiceNumber} annullata il ${format(new Date(), 'dd/MM/yyyy')}. Motivo: ${reason}.`;
        if (booking.notes) {
          booking.notes += `
${newNotes}`;
        } else {
          booking.notes = newNotes;
        }
        // Non resettiamo invoiceSettings.invoiceEmitted o invoiceId sulla prenotazione
        // per mantenere traccia che una fattura è stata emessa e poi annullata.
        // Potrebbe essere necessario rivedere questa logica se si vuole permettere
        // la ri-emissione di una fattura per la stessa prenotazione.
        await booking.save();
      }
    }

    return { success: true, invoice: invoice.toObject() };
  } catch (error) {
    console.error('Errore nell'annullamento della fattura emessa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Errore sconosciuto durante l'annullamento"
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
      if (options.skipExisting) {
        const booking = await BookingModel.findById(bookingId);
        if (booking?.invoiceSettings?.invoiceEmitted && booking.invoiceSettings.invoiceId) {
            const existingInvoiceCheck = await InvoiceModel.findById(booking.invoiceSettings.invoiceId);
            if (existingInvoiceCheck) {
                 results.push({
                    success: false,
                    error: `Ricevuta già emessa per la prenotazione ${bookingId}`,
                    bookingId: bookingId,
                 });
                 continue;
            }
        }
      }

      const result = await generateInvoice({
        booking: bookingId,
        sendEmail: options.sendEmails,
        generatePdf: options.generatePdfs, // Passa l'opzione
        lockImmediately: options.lockImmediately,
        userId: options.userId,
      });

      if (!result.success) {
        results.push({ ...result, bookingId: bookingId });
      } else {
        results.push({ ...result, bookingId: result.invoice?.bookingId?.toString() || bookingId });
      }
    } catch (error) {
      results.push({
        success: false,
        error: `Errore per prenotazione ${bookingId}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        bookingId: bookingId,
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

  const bookingsWithSettings = [];
  for (const booking of bookings) {
    if (booking.apartmentId && typeof booking.apartmentId !== 'string') { // Controlla che apartmentId sia popolato
        const settings = await InvoiceSettingsModel.findOne({
          apartmentIds: (booking.apartmentId as IApartment)._id.toString(),
        });
        if (settings) {
          bookingsWithSettings.push(booking);
        }
    } else if (booking.apartmentId) { // Caso in cui apartmentId è solo una stringa
        const settings = await InvoiceSettingsModel.findOne({
          apartmentIds: booking.apartmentId,
        });
        if (settings) {
          bookingsWithSettings.push(booking);
        }
    }
  }
  return bookingsWithSettings;
}

// Funzione per controllare prenotazioni senza prezzo
export async function checkBookingsMissingPrice(): Promise<IBooking[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  return await BookingModel.find({
    $or: [
      { totalPrice: 0 }, { totalPrice: null },
      { 'invoiceSettings.priceConfirmed': false },
    ],
    checkOut: { $lt: cutoffDate },
    status: { $in: ['confirmed', 'completed'] },
  }).populate('apartmentId');
}

// Funzione per cancellare una ricevuta (solo se in bozza e non bloccata)
export async function cancelDraftInvoice(
  invoiceId: string, reason: string, userId: string
): Promise<{ success: boolean; error?: string; invoice?: IInvoice }> {
  try {
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) return { success: false, error: 'Ricevuta non trovata' };
    if (invoice.status !== 'draft') return { success: false, error: 'Solo le ricevute in bozza possono essere cancellate' };
    if (invoice.isLocked) return { success: false, error: 'La ricevuta è bloccata e non può essere cancellata come bozza.' };
    
    const counter = await InvoiceCounterModel.findOne({
      settingsGroupId: invoice.settingsGroupId,
      year: new Date(invoice.invoiceDate).getFullYear()
    });
    if (counter) {
      const foundIndex = counter.usedNumbers.findIndex(n => n.invoiceId === invoiceId);
      if (foundIndex > -1) {
        counter.usedNumbers.splice(foundIndex, 1);
        await counter.save();
      }
    }

    await InvoiceModel.findByIdAndDelete(invoiceId);

    await BookingModel.findByIdAndUpdate(invoice.bookingId, {
      'invoiceSettings.invoiceEmitted': false, 'invoiceSettings.invoiceId': null,
      'invoiceSettings.invoiceNumber': null, 'invoiceSettings.emittedAt': null,
    });

    return { success: true, invoice: invoice.toObject() };
  } catch (error) {
    console.error('Errore nella cancellazione della bozza di ricevuta:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
  }
}

// Funzione per duplicare una ricevuta
export async function duplicateInvoice(
  invoiceId: string, userId: string
): Promise<GenerateInvoiceResult> {
  try {
    const originalInvoice = await InvoiceModel.findById(invoiceId).lean();
    if (!originalInvoice) return { success: false, error: 'Ricevuta originale non trovata' };

    const duplicateOptions: GenerateInvoiceOptions = {
      booking: originalInvoice.bookingId.toString(),
      settingsGroupId: originalInvoice.settingsGroupId,
      customerOverride: { ...originalInvoice.customer },
      itemsOverride: originalInvoice.items.map(item => ({ ...item, _id: undefined })), // Rimuovi _id dagli items
      notes: originalInvoice.notes,
      internalNotes: `Duplicata da ${originalInvoice.documentType} ${originalInvoice.invoiceNumber}. ${originalInvoice.internalNotes || ''}`.trim(),
      userId,
      lockImmediately: false,
      generatePdf: true, // Genera PDF per la duplicata
    };

    return await generateInvoice(duplicateOptions);
  } catch (error) {
    console.error('Errore nella duplicazione della ricevuta:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
  }
}
