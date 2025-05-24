import { CheckInFormData } from '@/types/checkin';

export interface ValidationError {
  field: string;
  message: string;
}

// Validazione età minima (18 anni per il guest principale)
export const isAdult = (dateOfBirth: string): boolean => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 18;
};

// Validazione formato data
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() > 1900 && date <= new Date();
};

// Validazione codice fiscale italiano (se necessario)
export const isValidItalianTaxCode = (code: string): boolean => {
  if (!code) return true;
  const pattern = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
  return pattern.test(code.toUpperCase());
};

// Validazione numero documento
export const isValidDocumentNumber = (
  type: 'identity_card' | 'passport' | 'driving_license' | 'other', // Tipo ristretto, non include ''
  number: string
): boolean => {
  if (!number || number.trim() === '') return false;
  // type qui non sarà mai '', quindi non serve il controllo type === ''

  switch (type) {
    case 'identity_card':
      return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase());
    
    case 'passport':
      return /^[A-Z0-9]{6,20}$/.test(number.toUpperCase());
    
    case 'driving_license':
      return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase());
    
    case 'other':
      return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase());
    // Non serve un default perché il tipo di 'type' è limitato ai casi sopra.
  }
};

// Validazione del form principale
export const validateCheckInForm = (data: CheckInFormData): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  const mainGuest = data.mainGuest;
  
  if (!mainGuest.lastName || mainGuest.lastName.trim() === '') {
    errors.push({ field: 'mainGuest.lastName', message: 'Il cognome è obbligatorio' });
  }
  
  if (!mainGuest.firstName || mainGuest.firstName.trim() === '') {
    errors.push({ field: 'mainGuest.firstName', message: 'Il nome è obbligatorio' });
  }
  
  // @ts-expect-error TS crede che questo confronto non sia necessario, ma lo è per il nostro tipo 'M' | 'F' | ''
  if (!mainGuest.sex || mainGuest.sex === '') {
    errors.push({ field: 'mainGuest.sex', message: 'Il sesso è obbligatorio' });
  }
  
  if (!mainGuest.dateOfBirth) {
    errors.push({ field: 'mainGuest.dateOfBirth', message: 'La data di nascita è obbligatoria' });
  } else if (!isValidDate(mainGuest.dateOfBirth)) {
    errors.push({ field: 'mainGuest.dateOfBirth', message: 'Data di nascita non valida' });
  } else if (!isAdult(mainGuest.dateOfBirth)) {
    errors.push({ field: 'mainGuest.dateOfBirth', message: 'L\'ospite principale deve essere maggiorenne' });
  }
  
  if (!mainGuest.placeOfBirth || mainGuest.placeOfBirth.trim() === '') {
    errors.push({ field: 'mainGuest.placeOfBirth', message: 'Il luogo di nascita è obbligatorio' });
  }
  
  if (!mainGuest.countryOfBirth || mainGuest.countryOfBirth.trim() === '') {
    errors.push({ field: 'mainGuest.countryOfBirth', message: 'Il paese di nascita è obbligatorio' });
  }
  
  if (mainGuest.countryOfBirth === 'IT' && (!mainGuest.provinceOfBirth || mainGuest.provinceOfBirth.trim() === '')) {
    errors.push({ field: 'mainGuest.provinceOfBirth', message: 'La provincia è obbligatoria per luoghi italiani' });
  }
  
  if (!mainGuest.citizenship || mainGuest.citizenship.trim() === '') {
    errors.push({ field: 'mainGuest.citizenship', message: 'La cittadinanza è obbligatoria' });
  }
  
  // @ts-expect-error TS crede che questo confronto non sia necessario, ma lo è per il nostro tipo unione che include ''
  if (!mainGuest.documentType || mainGuest.documentType === '') {
    errors.push({ field: 'mainGuest.documentType', message: 'Il tipo di documento è obbligatorio' });
  }
  
  if (!mainGuest.documentNumber || mainGuest.documentNumber.trim() === '') {
    errors.push({ field: 'mainGuest.documentNumber', message: 'Il numero del documento è obbligatorio' });
  // @ts-expect-error TS segnala un "no overlap" qui per mainGuest.documentType !== '', ma il controllo è intenzionale per il nostro tipo unione.
  } else if (mainGuest.documentType && mainGuest.documentType !== '' && !isValidDocumentNumber(mainGuest.documentType, mainGuest.documentNumber)) {
    errors.push({ field: 'mainGuest.documentNumber', message: 'Numero documento non valido per il tipo selezionato' });
  }
  
  if (!mainGuest.documentIssuePlace || mainGuest.documentIssuePlace.trim() === '') {
    errors.push({ field: 'mainGuest.documentIssuePlace', message: 'Il luogo di rilascio è obbligatorio' });
  }
  
  if (!mainGuest.documentIssueCountry || mainGuest.documentIssueCountry.trim() === '') {
    errors.push({ field: 'mainGuest.documentIssueCountry', message: 'Il paese di rilascio è obbligatorio' });
  }
  
  if (mainGuest.documentIssueCountry === 'IT' && (!mainGuest.documentIssueProvince || mainGuest.documentIssueProvince.trim() === '')) {
    errors.push({ field: 'mainGuest.documentIssueProvince', message: 'La provincia di rilascio è obbligatoria per documenti italiani' });
  }
  
  data.additionalGuests.forEach((guest, index) => {
    if (!guest.lastName || guest.lastName.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.lastName`, message: 'Il cognome è obbligatorio' });
    }
    
    if (!guest.firstName || guest.firstName.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.firstName`, message: 'Il nome è obbligatorio' });
    }
    
    // @ts-expect-error TS crede che questo confronto non sia necessario, ma lo è per il nostro tipo 'M' | 'F' | ''
    if (!guest.sex || guest.sex === '') {
      errors.push({ field: `additionalGuests.${index}.sex`, message: 'Il sesso è obbligatorio' });
    }
    
    if (!guest.dateOfBirth) {
      errors.push({ field: `additionalGuests.${index}.dateOfBirth`, message: 'La data di nascita è obbligatoria' });
    } else if (!isValidDate(guest.dateOfBirth)) {
      errors.push({ field: `additionalGuests.${index}.dateOfBirth`, message: 'Data di nascita non valida' });
    }
    
    if (!guest.placeOfBirth || guest.placeOfBirth.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.placeOfBirth`, message: 'Il luogo di nascita è obbligatorio' });
    }
    
    if (!guest.countryOfBirth || guest.countryOfBirth.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.countryOfBirth`, message: 'Il paese di nascita è obbligatorio' });
    }
    
    if (guest.countryOfBirth === 'IT' && (!guest.provinceOfBirth || guest.provinceOfBirth.trim() === '')) {
      errors.push({ field: `additionalGuests.${index}.provinceOfBirth`, message: 'La provincia è obbligatoria per luoghi italiani' });
    }
    
    if (!guest.citizenship || guest.citizenship.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.citizenship`, message: 'La cittadinanza è obbligatoria' });
    }
  });
  
  if (!data.acceptTerms) {
    errors.push({ field: 'acceptTerms', message: 'Devi accettare i termini e le condizioni' });
  }
  
  return errors;
};

// Province italiane per validazione e selezione (rimane invariato dalla tua ultima versione)
export const ITALIAN_PROVINCES = [
  { code: 'AG', name: 'Agrigento' },
  { code: 'AL', name: 'Alessandria' },
  { code: 'AN', name: 'Ancona' },
  { code: 'AO', name: 'Aosta' },
  { code: 'AR', name: 'Arezzo' },
  { code: 'AP', name: 'Ascoli Piceno' },
  { code: 'AT', name: 'Asti' },
  { code: 'AV', name: 'Avellino' },
  { code: 'BA', name: 'Bari' },
  { code: 'BT', name: 'Barletta-Andria-Trani' },
  { code: 'BL', name: 'Belluno' },
  { code: 'BN', name: 'Benevento' },
  { code: 'BG', name: 'Bergamo' },
  { code: 'BI', name: 'Biella' },
  { code: 'BO', name: 'Bologna' },
  { code: 'BZ', name: 'Bolzano' },
  { code: 'BS', name: 'Brescia' },
  { code: 'BR', name: 'Brindisi' },
  { code: 'CA', name: 'Cagliari' },
  { code: 'CL', name: 'Caltanissetta' },
  { code: 'CB', name: 'Campobasso' },
  { code: 'CE', name: 'Caserta' },
  { code: 'CT', name: 'Catania' },
  { code: 'CZ', name: 'Catanzaro' },
  { code: 'CH', name: 'Chieti' },
  { code: 'CO', name: 'Como' },
  { code: 'CS', name: 'Cosenza' },
  { code: 'CR', name: 'Cremona' },
  { code: 'KR', name: 'Crotone' },
  { code: 'CN', name: 'Cuneo' },
  { code: 'EN', name: 'Enna' },
  { code: 'FM', name: 'Fermo' },
  { code: 'FE', name: 'Ferrara' },
  { code: 'FI', name: 'Firenze' },
  { code: 'FG', name: 'Foggia' },
  { code: 'FC', name: 'Forlì-Cesena' },
  { code: 'FR', name: 'Frosinone' },
  { code: 'GE', name: 'Genova' },
  { code: 'GO', name: 'Gorizia' },
  { code: 'GR', name: 'Grosseto' },
  { code: 'IM', name: 'Imperia' },
  { code: 'IS', name: 'Isernia' },
  { code: 'SP', name: 'La Spezia' },
  { code: 'AQ', name: "L'Aquila" },
  { code: 'LT', name: 'Latina' },
  { code: 'LE', name: 'Lecce' },
  { code: 'LC', name: 'Lecco' },
  { code: 'LI', name: 'Livorno' },
  { code: 'LO', name: 'Lodi' },
  { code: 'LU', name: 'Lucca' },
  { code: 'MC', name: 'Macerata' },
  { code: 'MN', name: 'Mantova' },
  { code: 'MS', name: 'Massa-Carrara' },
  { code: 'MT', name: 'Matera' },
  { code: 'ME', name: 'Messina' },
  { code: 'MI', name: 'Milano' },
  { code: 'MO', name: 'Modena' },
  { code: 'MB', name: 'Monza e della Brianza' },
  { code: 'NA', name: 'Napoli' },
  { code: 'NO', name: 'Novara' },
  { code: 'NU', name: 'Nuoro' },
  { code: 'OR', name: 'Oristano' },
  { code: 'PD', name: 'Padova' },
  { code: 'PA', name: 'Palermo' },
  { code: 'PR', name: 'Parma' },
  { code: 'PV', name: 'Pavia' },
  { code: 'PG', name: 'Perugia' },
  { code: 'PU', name: 'Pesaro e Urbino' },
  { code: 'PE', name: 'Pescara' },
  { code: 'PC', name: 'Piacenza' },
  { code: 'PI', name: 'Pisa' },
  { code: 'PT', name: 'Pistoia' },
  { code: 'PN', name: 'Pordenone' },
  { code: 'PZ', name: 'Potenza' },
  { code: 'PO', name: 'Prato' },
  { code: 'RG', name: 'Ragusa' },
  { code: 'RA', name: 'Ravenna' },
  { code: 'RC', name: 'Reggio Calabria' },
  { code: 'RE', name: 'Reggio Emilia' },
  { code: 'RI', name: 'Rieti' },
  { code: 'RN', name: 'Rimini' },
  { code: 'RM', name: 'Roma' },
  { code: 'RO', name: 'Rovigo' },
  { code: 'SA', name: 'Salerno' },
  { code: 'SS', name: 'Sassari' },
  { code: 'SV', name: 'Savona' },
  { code: 'SI', name: 'Siena' },
  { code: 'SR', name: 'Siracusa' },
  { code: 'SO', name: 'Sondrio' },
  { code: 'SU', name: 'Sud Sardegna' },
  { code: 'TA', name: 'Taranto' },
  { code: 'TE', name: 'Teramo' },
  { code: 'TR', name: 'Terni' },
  { code: 'TO', name: 'Torino' },
  { code: 'TP', name: 'Trapani' },
  { code: 'TN', name: 'Trento' },
  { code: 'TV', name: 'Treviso' },
  { code: 'TS', name: 'Trieste' },
  { code: 'UD', name: 'Udine' },
  { code: 'VA', name: 'Varese' },
  { code: 'VE', name: 'Venezia' },
  { code: 'VB', name: 'Verbano-Cusio-Ossola' },
  { code: 'VC', name: 'Vercelli' },
  { code: 'VR', name: 'Verona' },
  { code: 'VV', name: 'Vibo Valentia' },
  { code: 'VI', name: 'Vicenza' },
  { code: 'VT', name: 'Viterbo' }
];
