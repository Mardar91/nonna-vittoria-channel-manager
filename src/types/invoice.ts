// Tipi base per il sistema di fatturazione

export type ActivityType = 'business' | 'tourist_rental';
export type DocumentType = 'receipt' | 'invoice';
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'stripe' | 'platform';
export type InvoiceType = 'standard' | 'withholding';

// Tipo per la creazione di una nuova ricevuta
export interface CreateInvoiceDTO {
  bookingId: string;
  apartmentId?: string; // Opzionale se viene dedotto dal booking
  settingsGroupId?: string; // Opzionale se viene dedotto dall'appartamento
  
  // Override dati cliente (se diversi dal booking)
  customerOverride?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    vatNumber?: string;
    taxCode?: string;
  };
  
  // Override voci (se diversi dal calcolo automatico)
  itemsOverride?: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
  }[];
  
  // Informazioni aggiuntive
  notes?: string;
  internalNotes?: string;
  
  // Opzioni
  sendEmail?: boolean;
  generatePdf?: boolean;
  lockImmediately?: boolean;
}

// Tipo per l'aggiornamento di una ricevuta
export interface UpdateInvoiceDTO {
  // Dati cliente
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    vatNumber?: string;
    taxCode?: string;
  };
  
  // Voci (sostituisce completamente le voci esistenti)
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
  }[];
  
  // Pagamento
  paymentInfo?: {
    method?: PaymentMethod;
    status?: PaymentStatus;
    paidAmount?: number;
    paidDate?: Date | string;
    notes?: string;
  };
  
  // Note
  notes?: string;
  internalNotes?: string;
  footer?: string;
  
  // Stato
  status?: InvoiceStatus;
}

// Tipo per i filtri di ricerca
export interface InvoiceFilters {
  status?: InvoiceStatus | InvoiceStatus[];
  paymentStatus?: PaymentStatus | PaymentStatus[];
  apartmentId?: string | string[];
  settingsGroupId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  customerEmail?: string;
  invoiceNumber?: string;
  bookingId?: string;
  hasPrice?: boolean; // Per filtrare prenotazioni senza prezzo
  platformSource?: string;
}

// Tipo per le statistiche
export interface InvoiceStatistics {
  totalIssued: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  byStatus: {
    draft: number;
    issued: number;
    sent: number;
    cancelled: number;
  };
  byPaymentStatus: {
    pending: number;
    paid: number;
    partial: number;
    refunded: number;
  };
  byMonth: {
    month: string;
    count: number;
    amount: number;
  }[];
  byApartment: {
    apartmentId: string;
    apartmentName: string;
    count: number;
    amount: number;
  }[];
}

// Tipo per la configurazione piattaforme
export interface PlatformConfiguration {
  platform: string;
  emitInvoice: boolean;
  invoiceType: InvoiceType;
  defaultWithholdingText?: string;
  withholdingRate?: number;
}

// Tipo per la generazione batch
export interface GenerateInvoiceBatch {
  bookingIds: string[];
  options: {
    skipExisting?: boolean;
    sendEmails?: boolean;
    generatePdfs?: boolean;
    lockImmediately?: boolean;
  };
}

// Tipo per il risultato della generazione
export interface InvoiceGenerationResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
  bookingId?: string;
}

// Tipo per l'export
export interface InvoiceExportOptions {
  format: 'csv' | 'excel' | 'pdf_batch';
  filters: InvoiceFilters;
  columns?: string[]; // Colonne da includere nell'export
  includeItems?: boolean; // Includere dettaglio voci
}

// Tipo per le notifiche prenotazioni senza prezzo
export interface MissingPriceBooking {
  bookingId: string;
  apartmentId: string;
  apartmentName: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  source: string;
  daysAfterCheckout: number;
}

// Tipo per template email
export interface EmailTemplate {
  subject: string;
  body: string;
  attachPdf: boolean;
  variables: {
    guestName: string;
    invoiceNumber: string;
    totalAmount: string;
    checkIn: string;
    checkOut: string;
    apartmentName: string;
    downloadLink?: string;
  };
}

// Tipo per la risposta API delle ricevute
export interface InvoiceResponse {
  invoice: any; // Usa il tipo IInvoice dal modello
  pdfUrl?: string;
  publicAccessUrl?: string;
}

// Tipo per validazione accesso pubblico
export interface PublicAccessValidation {
  isValid: boolean;
  invoiceId?: string;
  expiresAt?: Date;
  error?: string;
}

// Helper type per i permessi (per future implementazioni multi-tenancy)
export interface InvoicePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canLock: boolean;
  canUnlock: boolean;
  canSendEmail: boolean;
  canExport: boolean;
  canViewAll: boolean;
  canEditSettings: boolean;
}

// Tipo per la dashboard fatturazione
export interface InvoiceDashboardData {
  statistics: InvoiceStatistics;
  recentInvoices: any[]; // Array di IInvoice
  pendingBookings: MissingPriceBooking[];
  upcomingCheckouts: {
    bookingId: string;
    guestName: string;
    checkOut: Date;
    hasInvoice: boolean;
  }[];
}
