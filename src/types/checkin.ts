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
}

// Tipi per il form di check-in
export interface CheckInFormData {
  mainGuest: {
    lastName: string;
    firstName: string;
    sex: 'M' | 'F' | '';
    dateOfBirth: string;
    placeOfBirth: string;
    provinceOfBirth: string;
    countryOfBirth: string;
    citizenship: string;
    documentType: 'identity_card' | 'passport' | 'driving_license' | 'other' | '';
    documentNumber: string;
    documentIssuePlace: string;
    documentIssueProvince: string;
    documentIssueCountry: string;
  };
  additionalGuests: Array<{
    lastName: string;
    firstName: string;
    sex: 'M' | 'F' | '';
    dateOfBirth: string;
    placeOfBirth: string;
    provinceOfBirth: string;
    countryOfBirth: string;
    citizenship: string;
  }>;
  acceptTerms: boolean;
}

// Tipi per le richieste API
export interface CheckInSubmitRequest {
  bookingId: string;
  guests: Array<{
    lastName: string;
    firstName: string;
    sex: 'M' | 'F';
    dateOfBirth: string;
    placeOfBirth: string;
    provinceOfBirth?: string;
    countryOfBirth: string;
    citizenship: string;
    documentType?: string;
    documentNumber?: string;
    documentIssuePlace?: string;
    documentIssueProvince?: string;
    documentIssueCountry?: string;
    isMainGuest: boolean;
  }>;
}

export interface CheckInSubmitResponse {
  success: boolean;
  checkInId?: string;
  message?: string;
  error?: string;
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
  status: 'pending' | 'completed' | 'cancelled';
  completedAt?: string;
  completedBy?: string;
}

// Costanti per i tipi di documento
export const DOCUMENT_TYPES = {
  identity_card: 'Carta d\'Identità',
  passport: 'Passaporto',
  driving_license: 'Patente di Guida',
  other: 'Altro'
} as const;

// Costanti per i sessi
export const SEX_OPTIONS = {
  M: 'Maschio',
  F: 'Femmina'
} as const;
