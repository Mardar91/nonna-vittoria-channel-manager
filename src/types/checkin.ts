// Tipi per la validazione della prenotazione
export interface BookingValidationRequest {
  bookingReference: string;
  email: string;
}

export interface BookingValidationResponse {
  valid: boolean;
  booking?: {
    id: string;
    apartmentId: string;
    apartmentName: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    numberOfGuests: number;
    hasCheckedIn: boolean;
  };
  error?: string;
  errorCode?: string; // e.g., BOOKING_NOT_FOUND_ASK_DATES
  mode?: 'unassigned_checkin'; // For specific validation responses
  requestedDates?: { // For unassigned_checkin mode
    checkIn: string;
    checkOut: string;
  };
  // email and bookingReference might also be returned for unassigned_checkin context
  email?: string;
  bookingReference?: string;
}

export interface IGuestData { // Renamed from parts of ICheckIn in models for clarity in form data
  lastName: string;
  firstName: string;
  sex: 'M' | 'F' | '';
  dateOfBirth: string; // string for form input, converted to Date on submission
  placeOfBirth: string;
  provinceOfBirth?: string; // Solo per luoghi italiani
  countryOfBirth: string;
  citizenship: string;
  documentType?: 'identity_card' | 'passport' | 'driving_license' | 'other' | '';
  documentNumber?: string;
  documentIssuePlace?: string;
  documentIssueProvince?: string; // Solo per luoghi italiani
  documentIssueCountry?: string;
  isMainGuest?: boolean; // To distinguish main guest in a flat array if needed, or structure implies it
  phoneNumber?: string;
}


// Tipi per il form di check-in
export interface CheckInFormData {
  mainGuest: IGuestData; // Use the common IGuestData
  additionalGuests: IGuestData[]; // Array of IGuestData
  acceptTerms: boolean;
  numberOfGuests: number; // Total number of guests, reflects editableNumberOfGuests
  notes?: string; // Optional notes from the user
  expectedArrivalTime: string; // Rimosso ?
  phoneNumber: string;       // Rimosso ? (per l'ospite principale)
}

// Tipi per le richieste API
export interface CheckInSubmitRequest {
  bookingId?: string; // Optional for unassigned_checkin
  apartmentId?: string; // Optional for unassigned_checkin
  guests: Array<IGuestData & { isMainGuest: boolean }>; // Submitted guests with isMainGuest flag
  mode: 'normal' | 'unassigned_checkin';
  acceptTerms: boolean;
  notes?: string;
  // For 'unassigned_checkin'
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  originalEmail?: string;
  originalBookingRef?: string;
  numberOfGuests?: number; // Number of guests for unassigned checkin // Può essere numberOfGuests: number; se è sempre obbligatorio nel payload
  identificationEmail?: string;      // <-- MODIFICA QUI: Aggiunta questa riga
  expectedArrivalTime: string; // Rimosso ?
  phoneNumber: string;       // Rimosso ? (per l'ospite principale)
}

export interface CheckInSubmitResponse {
  success: boolean;
  checkInId?: string;
  message?: string;
  error?: string;
  redirectUrl?: string;
}

// Tipi per la visualizzazione
export interface CheckInDetails {
  id: string;
  bookingId: string;
  apartmentName: string;
  checkInDate: string;
  guests: Array<{
    fullName: string;
    dateOfBirth: string;
    documentInfo?: string;
    isMainGuest: boolean;
  }>;
  status: 'pending' | 'completed' | 'cancelled' | 'pending_assignment';
  completedAt?: string;
  completedBy?: string;
}

// Costanti per i tipi di documento
export const DOCUMENT_TYPES = {
  identity_card: 'Carta d\'Identità',
  passport: 'Passaporto',
  driving_license: 'Patente di Guida'
} as const;

// Costanti per i sessi
export const SEX_OPTIONS = {
  M: 'Maschio',
  F: 'Femmina'
} as const;
