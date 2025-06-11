import mongoose, { Schema } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate?: number; // Solo per fatture business
  vatAmount?: number; // Solo per fatture business
}

export interface IInvoice {
  _id?: string;
  
  // Numerazione e identificazione
  invoiceNumber: string; // Numero progressivo formattato
  invoiceDate: Date;
  dueDate?: Date;
  
  // Collegamenti
  bookingId: string;
  apartmentId: string;
  settingsGroupId: string; // Gruppo impostazioni usato
  
  // Tipo documento
  documentType: 'receipt' | 'invoice'; // Ricevuta o Fattura
  activityType: 'business' | 'tourist_rental';
  
  // Dati emittente (copiati dalle impostazioni al momento dell'emissione)
  issuer: {
    businessName: string;
    address: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    vatNumber?: string;
    taxCode: string;
    email?: string;
    phone?: string;
  };
  
  // Dati cliente
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    vatNumber?: string; // Per fatture B2B
    taxCode?: string;
  };
  
  // Dettagli soggiorno
  stayDetails: {
    checkIn: Date;
    checkOut: Date;
    nights: number;
    guests: number;
    apartmentName: string;
    apartmentAddress: string;
  };
  
  // Voci di spesa
  items: IInvoiceItem[];
  
  // Totali
  subtotal: number;
  vatAmount?: number; // Solo per business
  total: number;
  
  // Informazioni piattaforma e cedolare
  platformInfo?: {
    platform: string; // es. "Booking.com", "Airbnb", "Direct"
    bookingReference?: string; // Riferimento prenotazione esterna
    withholdingTax?: {
      rate: number; // es. 21
      amount: number;
      text: string; // Testo esplicativo cedolare
    };
  };
  
  // Pagamento
  paymentInfo: {
    method: 'cash' | 'bank_transfer' | 'credit_card' | 'stripe' | 'platform';
    status: 'pending' | 'paid' | 'partial' | 'refunded';
    paidAmount: number;
    paidDate?: Date;
    stripePaymentId?: string; // Se pagato via Stripe
    notes?: string;
  };
  
  // Stato ricevuta
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  
  // Email
  emailSent: boolean;
  emailSentAt?: Date;
  emailSentTo?: string;
  
  // File generato
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  
  // Accesso pubblico
  publicAccessCode?: string; // Codice per download pubblico
  publicAccessExpiry?: Date;
  
  // Note e personalizzazioni
  notes?: string;
  internalNotes?: string; // Note solo per uso interno
  footer?: string; // Footer personalizzato
  
  // Controllo modifiche
  isLocked: boolean; // Impedisce modifiche dopo l'emissione
  lockedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  
  // Metadati
  createdBy?: string; // UserId o 'system'
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  vatRate: { type: Number, min: 0 },
  vatAmount: { type: Number, min: 0 }
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    // Numerazione
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    
    // Collegamenti
    bookingId: { type: String, required: true, ref: 'Booking' },
    apartmentId: { type: String, required: true, ref: 'Apartment' },
    settingsGroupId: { type: String, required: true },
    
    // Tipo
    documentType: {
      type: String,
      enum: ['receipt', 'invoice'],
      default: 'receipt'
    },
    activityType: {
      type: String,
      enum: ['business', 'tourist_rental'],
      required: true
    },
    
    // Emittente
    issuer: {
      businessName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      zip: { type: String, required: true },
      province: { type: String, required: true },
      country: { type: String, required: true },
      vatNumber: { type: String },
      taxCode: { type: String, required: true },
      email: { type: String },
      phone: { type: String }
    },
    
    // Cliente
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
      zip: { type: String },
      province: { type: String },
      country: { type: String },
      vatNumber: { type: String },
      taxCode: { type: String }
    },
    
    // Dettagli soggiorno
    stayDetails: {
      checkIn: { type: Date, required: true },
      checkOut: { type: Date, required: true },
      nights: { type: Number, required: true, min: 1 },
      guests: { type: Number, required: true, min: 1 },
      apartmentName: { type: String, required: true },
      apartmentAddress: { type: String, required: true }
    },
    
    // Voci
    items: { type: [InvoiceItemSchema], required: true },
    
    // Totali
    subtotal: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, min: 0 },
    total: { type: Number, required: true, min: 0 },
    
    // Piattaforma
    platformInfo: {
      platform: { type: String },
      bookingReference: { type: String },
      withholdingTax: {
        rate: { type: Number },
        amount: { type: Number },
        text: { type: String }
      }
    },
    
    // Pagamento
    paymentInfo: {
      method: {
        type: String,
        enum: ['cash', 'bank_transfer', 'credit_card', 'stripe', 'platform'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'refunded'],
        default: 'pending'
      },
      paidAmount: { type: Number, default: 0 },
      paidDate: { type: Date },
      stripePaymentId: { type: String },
      notes: { type: String }
    },
    
    // Stato
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'cancelled'],
      default: 'draft'
    },
    
    // Email
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailSentTo: { type: String },
    
    // PDF
    pdfUrl: { type: String },
    pdfGeneratedAt: { type: Date },
    
    // Accesso pubblico
    publicAccessCode: { type: String, unique: true, sparse: true },
    publicAccessExpiry: { type: Date },
    
    // Note
    notes: { type: String },
    internalNotes: { type: String },
    footer: { type: String },
    
    // Controllo
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    
    // Metadata
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

// Metodi helper
InvoiceSchema.methods.lock = async function() {
  if (!this.isLocked) {
    this.isLocked = true;
    this.lockedAt = new Date();
    this.status = 'issued';
    await this.save();
  }
};

InvoiceSchema.methods.generatePublicAccessCode = async function() {
  const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.publicAccessCode = code;
  this.publicAccessExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 giorni
  await this.save();
  return code;
};

// Indici
InvoiceSchema.index({ bookingId: 1 });
InvoiceSchema.index({ apartmentId: 1 });
InvoiceSchema.index({ status: 1, createdAt: -1 });
InvoiceSchema.index({ 'customer.email': 1 });
InvoiceSchema.index({ publicAccessCode: 1 }, { sparse: true });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ invoiceDate: -1 });
InvoiceSchema.index({ 'paymentInfo.status': 1 });

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
