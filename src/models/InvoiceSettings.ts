import mongoose, { Schema } from 'mongoose';

export interface IInvoiceSettings {
  _id?: string;
  groupId: string; // ID univoco per gruppo di appartamenti
  name: string; // Nome del gruppo (es. "Appartamenti Centro", "Appartamenti Mare")
  apartmentIds: string[]; // Array di ID appartamenti in questo gruppo
  
  // Dati intestatario
  businessName: string;
  businessAddress: string;
  businessCity: string;
  businessZip: string;
  businessProvince: string;
  businessCountry: string;
  businessVat?: string; // P.IVA per attività imprenditoriali
  businessTaxCode: string; // Codice Fiscale
  businessEmail?: string;
  businessPhone?: string;
  
  // Tipo di attività
  activityType: 'business' | 'tourist_rental'; // imprenditoriale o locazione turistica
  
  // Impostazioni IVA (solo per business)
  vatRate?: number; // Percentuale IVA (es. 22)
  vatIncluded?: boolean; // Se i prezzi includono già l'IVA
  
  // Impostazioni cedolare secca (solo per tourist_rental)
  withholdingTaxInfo?: {
    showInfo: boolean; // Mostra info sulla cedolare secca
    defaultText: string; // Testo standard da includere
  };
  
  // Numerazione
  numberingFormat: string; // es. "{{year}}/{{number}}" o "{{prefix}}-{{year}}-{{number}}"
  numberingPrefix?: string; // Prefisso opzionale
  lastInvoiceNumber: number; // Ultimo numero usato
  lastInvoiceYear: number; // Anno dell'ultima ricevuta
  resetNumberingYearly: boolean; // Reset numerazione ogni anno
  
  // Piattaforme e loro gestione
  platformSettings: {
    platform: string; // es. "Booking.com", "Airbnb", "Direct"
    emitInvoice: boolean; // Se emettere ricevuta
    invoiceType: 'standard' | 'withholding'; // standard o con cedolare
    defaultWithholdingText?: string; // Testo per cedolare secca
  }[];
  
  // Testi personalizzabili
  invoiceFooter?: string; // Testo piè di pagina
  paymentTerms?: string; // Termini di pagamento
  bankDetails?: string; // Coordinate bancarie
  
  // Impostazioni generali
  autoGenerateOnCheckout: boolean; // Genera automaticamente al checkout
  autoGenerateOnPayment: boolean; // Genera automaticamente quando pagato
  sendEmailToGuest: boolean; // Invia email automatica all'ospite
  emailTemplate?: string; // Template email personalizzato
  
  // Logo e branding
  logoUrl?: string;
  primaryColor?: string;
  
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceSettingsSchema = new Schema<IInvoiceSettings>(
  {
    groupId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    apartmentIds: [{ type: String, ref: 'Apartment' }],
    
    // Dati intestatario
    businessName: { type: String, required: true },
    businessAddress: { type: String, required: true },
    businessCity: { type: String, required: true },
    businessZip: { type: String, required: true },
    businessProvince: { type: String, required: true },
    businessCountry: { type: String, required: true, default: 'Italia' },
    businessVat: { type: String },
    businessTaxCode: { type: String, required: true },
    businessEmail: { type: String },
    businessPhone: { type: String },
    
    // Tipo attività
    activityType: {
      type: String,
      enum: ['business', 'tourist_rental'],
      required: true,
      default: 'tourist_rental'
    },
    
    // IVA
    vatRate: { type: Number, default: 22 },
    vatIncluded: { type: Boolean, default: true },
    
    // Cedolare secca
    withholdingTaxInfo: {
      showInfo: { type: Boolean, default: true },
      defaultText: {
        type: String,
        default: 'Cedolare secca (21%) assolta dalla piattaforma in qualità di sostituto d\'imposta ai sensi dell\'art. 4, comma 1, lett. c) del DL 50/2017.'
      }
    },
    
    // Numerazione
    numberingFormat: { type: String, default: '{{year}}/{{number}}' },
    numberingPrefix: { type: String },
    lastInvoiceNumber: { type: Number, default: 0 },
    lastInvoiceYear: { type: Number, default: new Date().getFullYear() },
    resetNumberingYearly: { type: Boolean, default: true },
    
    // Piattaforme
    platformSettings: [{
      platform: { type: String, required: true },
      emitInvoice: { type: Boolean, default: true },
      invoiceType: {
        type: String,
        enum: ['standard', 'withholding'],
        default: 'standard'
      },
      defaultWithholdingText: { type: String }
    }],
    
    // Testi
    invoiceFooter: { type: String },
    paymentTerms: { type: String, default: 'Pagamento ricevuto' },
    bankDetails: { type: String },
    
    // Impostazioni generali
    autoGenerateOnCheckout: { type: Boolean, default: true },
    autoGenerateOnPayment: { type: Boolean, default: false },
    sendEmailToGuest: { type: Boolean, default: false },
    emailTemplate: { type: String },
    
    // Branding
    logoUrl: { type: String },
    primaryColor: { type: String, default: '#1e40af' }
  },
  { timestamps: true }
);

// Metodo helper per ottenere il prossimo numero di ricevuta
InvoiceSettingsSchema.methods.getNextInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  
  // Se è cambiato l'anno e il reset annuale è attivo
  if (this.resetNumberingYearly && currentYear > this.lastInvoiceYear) {
    this.lastInvoiceYear = currentYear;
    this.lastInvoiceNumber = 0;
  }
  
  this.lastInvoiceNumber += 1;
  await this.save();
  
  // Formatta il numero secondo il formato specificato
  let invoiceNumber = this.numberingFormat;
  invoiceNumber = invoiceNumber.replace('{{year}}', currentYear.toString());
  invoiceNumber = invoiceNumber.replace('{{number}}', this.lastInvoiceNumber.toString().padStart(3, '0'));
  if (this.numberingPrefix) {
    invoiceNumber = invoiceNumber.replace('{{prefix}}', this.numberingPrefix);
  }
  
  return invoiceNumber;
};

// Indici
InvoiceSettingsSchema.index({ apartmentIds: 1 });
InvoiceSettingsSchema.index({ groupId: 1 });

export default mongoose.models.InvoiceSettings || mongoose.model<IInvoiceSettings>('InvoiceSettings', InvoiceSettingsSchema);
