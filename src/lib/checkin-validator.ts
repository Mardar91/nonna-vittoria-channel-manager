import { CheckInFormData } from '@/types/checkin';

export interface ValidationError {
  field: string;
  message: string;
}

export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || phone.trim() === '') return true; // Opzionale, quindi valido se vuoto
  const pattern = /^[+]?[0-9\s-()]{7,20}$/; // Regex semplice per numeri internazionali
  return pattern.test(phone);
};

export const isValidExpectedTime = (expectedTime: string, defaultMinTime?: string): boolean => {
  if (!expectedTime) return true; // Opzionale, quindi valido se vuoto
  if (!/^[0-9]{2}:[0-9]{2}$/.test(expectedTime)) return false; // Formato HH:mm

  if (defaultMinTime && /^[0-9]{2}:[0-9]{2}$/.test(defaultMinTime)) {
    const [eh, em] = expectedTime.split(':').map(Number);
    const [dh, dm] = defaultMinTime.split(':').map(Number);
    if (eh < dh || (eh === dh && em < dm)) {
      return false; // Orario previsto è precedente al minimo consentito
    }
  }
  return true;
};

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
  type: 'identity_card' | 'passport' | 'driving_license' | 'other', 
  number: string
): boolean => {
  if (!number || number.trim() === '') return false;

  switch (type) {
    case 'identity_card':
      return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase());
    
    case 'passport':
      return /^[A-Z0-9]{6,20}$/.test(number.toUpperCase());
    
    case 'driving_license':
      return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase());
    
    case 'other':
      return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase());
  }
};

// Validazione del form principale
export const validateCheckInForm = (
  data: CheckInFormData,
  context?: 'airbnb' | 'booking' | 'unassigned' | string,
  defaultCheckInTime?: string // Aggiunto
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  const mainGuest = data.mainGuest;
  const mainGuestDocType = mainGuest.documentType; 

  // Validate numberOfGuests
  if (typeof data.numberOfGuests !== 'number' || !Number.isInteger(data.numberOfGuests)) {
    errors.push({ field: 'numberOfGuests', message: 'Il numero di ospiti deve essere un numero intero.' });
  } else if (data.numberOfGuests < 1) {
    errors.push({ field: 'numberOfGuests', message: 'Il numero di ospiti deve essere almeno 1.' });
  } else if (data.numberOfGuests !== 1 + (data.additionalGuests?.length || 0)) {
    errors.push({ field: 'numberOfGuests', message: 'Il numero di ospiti dichiarato non corrisponde al numero di moduli ospiti presentati.' });
  }
  
  if (!mainGuest.lastName || mainGuest.lastName.trim() === '') {
    errors.push({ field: 'mainGuest.lastName', message: 'Il cognome è obbligatorio' });
  }
  
  if (!mainGuest.firstName || mainGuest.firstName.trim() === '') {
    errors.push({ field: 'mainGuest.firstName', message: 'Il nome è obbligatorio' });
  }
  
  // @ts-expect-error
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

  if (mainGuest.countryOfBirth === 'IT' && (!mainGuest.placeOfBirth || mainGuest.placeOfBirth.trim() === '')) {
    errors.push({ field: 'mainGuest.placeOfBirth', message: 'Il comune di nascita è obbligatorio per l\'Italia.' });
  } else if (mainGuest.countryOfBirth !== 'IT' && (!mainGuest.placeOfBirth || mainGuest.placeOfBirth.trim() === '')) {
    errors.push({ field: 'mainGuest.placeOfBirth', message: 'Il luogo di nascita è obbligatorio.' });
  }

  if (!mainGuest.countryOfBirth || mainGuest.countryOfBirth.trim() === '') { // This might be redundant if countryOfBirth drives placeOfBirth logic
    errors.push({ field: 'mainGuest.countryOfBirth', message: 'Il paese di nascita è obbligatorio' });
  }
  
  if (mainGuest.countryOfBirth === 'IT' && (!mainGuest.provinceOfBirth || mainGuest.provinceOfBirth.trim() === '')) {
    // Questo errore potrebbe indicare un problema nella logica di auto-popolamento
    errors.push({ field: 'mainGuest.provinceOfBirth', message: 'La provincia di nascita è obbligatoria e dovrebbe essere auto-compilata.' });
  }
  
  if (!mainGuest.citizenship || mainGuest.citizenship.trim() === '') {
    errors.push({ field: 'mainGuest.citizenship', message: 'La cittadinanza è obbligatoria' });
  }

  if (!mainGuest.phoneNumber || mainGuest.phoneNumber.trim() === '') {
    errors.push({ field: 'mainGuest.phoneNumber', message: 'Il numero di telefono è obbligatorio.' });
  } else if (!isValidPhoneNumber(mainGuest.phoneNumber)) {
    errors.push({ field: 'mainGuest.phoneNumber', message: 'Numero di telefono non valido.' });
  }
  
  // Validazione Documento Ospite Principale
  if (!mainGuestDocType) { 
    errors.push({ field: 'mainGuest.documentType', message: 'Il tipo di documento è obbligatorio' });
  }
  
  if (!mainGuest.documentNumber || mainGuest.documentNumber.trim() === '') {
    errors.push({ field: 'mainGuest.documentNumber', message: 'Il numero del documento è obbligatorio' });
  } else { 
    // Qui documentNumber è presente e non vuoto.
    // mainGuestDocType può essere SpecificDocType | '' | undefined.
    if (typeof mainGuestDocType === 'string' && mainGuestDocType !== '') { 
      // Ora mainGuestDocType è sicuramente uno dei tipi specifici del documento.
      if (!isValidDocumentNumber(mainGuestDocType, mainGuest.documentNumber)) {
        errors.push({ field: 'mainGuest.documentNumber', message: 'Numero documento non valido per il tipo selezionato' });
      }
    }
  }
  
  if (mainGuest.documentIssueCountry === 'IT' && (!mainGuest.documentIssuePlace || mainGuest.documentIssuePlace.trim() === '')) {
    errors.push({ field: 'mainGuest.documentIssuePlace', message: 'Il comune di rilascio del documento è obbligatorio per l\'Italia.' });
  } else if (mainGuest.documentIssueCountry !== 'IT' && (!mainGuest.documentIssuePlace || mainGuest.documentIssuePlace.trim() === '')) {
    errors.push({ field: 'mainGuest.documentIssuePlace', message: 'Il luogo di rilascio del documento è obbligatorio.' });
  }

  if (!mainGuest.documentIssueCountry || mainGuest.documentIssueCountry.trim() === '') { // Similar to countryOfBirth, might be redundant
    errors.push({ field: 'mainGuest.documentIssueCountry', message: 'Il paese di rilascio è obbligatorio' });
  }
  
  if (mainGuest.documentIssueCountry === 'IT' && (!mainGuest.documentIssueProvince || mainGuest.documentIssueProvince.trim() === '')) {
    errors.push({ field: 'mainGuest.documentIssueProvince', message: 'La provincia di rilascio è obbligatoria e dovrebbe essere auto-compilata.' });
  }
  
  // Validazione Ospiti Aggiuntivi
  data.additionalGuests.forEach((guest, index) => {
    const guestDocType = guest.documentType; 

    if (!guest.lastName || guest.lastName.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.lastName`, message: 'Il cognome è obbligatorio' });
    }
    
    if (!guest.firstName || guest.firstName.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.firstName`, message: 'Il nome è obbligatorio' });
    }
    
    // @ts-expect-error
    if (!guest.sex || guest.sex === '') {
      errors.push({ field: `additionalGuests.${index}.sex`, message: 'Il sesso è obbligatorio' });
    }
    
    if (!guest.dateOfBirth) {
      errors.push({ field: `additionalGuests.${index}.dateOfBirth`, message: 'La data di nascita è obbligatoria' });
    } else if (!isValidDate(guest.dateOfBirth)) {
      errors.push({ field: `additionalGuests.${index}.dateOfBirth`, message: 'Data di nascita non valida' });
    }
    
    if (guest.countryOfBirth === 'IT' && (!guest.placeOfBirth || guest.placeOfBirth.trim() === '')) {
      errors.push({ field: `additionalGuests.${index}.placeOfBirth`, message: 'Il comune di nascita è obbligatorio per l\'Italia.' });
    } else if (guest.countryOfBirth !== 'IT' && (!guest.placeOfBirth || guest.placeOfBirth.trim() === '')) {
      errors.push({ field: `additionalGuests.${index}.placeOfBirth`, message: 'Il luogo di nascita è obbligatorio.' });
    }

    if (!guest.countryOfBirth || guest.countryOfBirth.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.countryOfBirth`, message: 'Il paese di nascita è obbligatorio' });
    }
    
    if (guest.countryOfBirth === 'IT' && (!guest.provinceOfBirth || guest.provinceOfBirth.trim() === '')) {
      errors.push({ field: `additionalGuests.${index}.provinceOfBirth`, message: 'La provincia di nascita è obbligatoria e dovrebbe essere auto-compilata.' });
    }
    
    if (!guest.citizenship || guest.citizenship.trim() === '') {
      errors.push({ field: `additionalGuests.${index}.citizenship`, message: 'La cittadinanza è obbligatoria' });
    }

    if (guest.phoneNumber && !isValidPhoneNumber(guest.phoneNumber)) {
      errors.push({ field: `additionalGuests.${index}.phoneNumber`, message: 'Numero di telefono non valido.' });
    }

    const isDocumentOptional = context === 'airbnb' || context === 'booking';

    if (!isDocumentOptional) {
      // Documento Obbligatorio per Ospite Aggiuntivo
      if (!guestDocType) { 
        errors.push({ field: `additionalGuests.${index}.documentType`, message: 'Il tipo di documento è obbligatorio' });
      }
      
      if (!guest.documentNumber || guest.documentNumber.trim() === '') {
        errors.push({ field: `additionalGuests.${index}.documentNumber`, message: 'Il numero del documento è obbligatorio' });
      } else { 
        if (typeof guestDocType === 'string' && guestDocType !== '') {
          if (!isValidDocumentNumber(guestDocType, guest.documentNumber)) {
            errors.push({ field: `additionalGuests.${index}.documentNumber`, message: 'Numero documento non valido per il tipo selezionato' });
          }
        }
      }
      
      if (guest.documentIssueCountry === 'IT' && (!guest.documentIssuePlace || guest.documentIssuePlace.trim() === '')) {
        errors.push({ field: `additionalGuests.${index}.documentIssuePlace`, message: 'Il comune di rilascio del documento è obbligatorio per l\'Italia.' });
      } else if (guest.documentIssueCountry !== 'IT' && (!guest.documentIssuePlace || guest.documentIssuePlace.trim() === '')) {
        errors.push({ field: `additionalGuests.${index}.documentIssuePlace`, message: 'Il luogo di rilascio del documento è obbligatorio.' });
      }
      
      if (!guest.documentIssueCountry || guest.documentIssueCountry.trim() === '') {
        errors.push({ field: `additionalGuests.${index}.documentIssueCountry`, message: 'Il paese di rilascio è obbligatorio' });
      }
      
      if (guest.documentIssueCountry === 'IT' && (!guest.documentIssueProvince || guest.documentIssueProvince.trim() === '')) {
        errors.push({ field: `additionalGuests.${index}.documentIssueProvince`, message: 'La provincia di rilascio è obbligatoria e dovrebbe essere auto-compilata.' });
      }
    } else {
      // Documento Opzionale per Ospite Aggiuntivo, ma se il tipo è fornito, il resto diventa condizionatamente obbligatorio.
      if (typeof guestDocType === 'string' && guestDocType !== '') { 
        if (!guest.documentNumber || guest.documentNumber.trim() === '') {
          errors.push({ field: `additionalGuests.${index}.documentNumber`, message: 'Il numero del documento è richiesto se si specifica il tipo' });
        } else if (!isValidDocumentNumber(guestDocType, guest.documentNumber)) { 
          errors.push({ field: `additionalGuests.${index}.documentNumber`, message: 'Numero documento non valido per il tipo selezionato' });
        }
        
        if (guest.documentNumber && guest.documentNumber.trim() !== '' && isValidDocumentNumber(guestDocType, guest.documentNumber)) {
            if (guest.documentIssueCountry === 'IT' && (!guest.documentIssuePlace || guest.documentIssuePlace.trim() === '')) {
                errors.push({ field: `additionalGuests.${index}.documentIssuePlace`, message: 'Comune di rilascio richiesto se tipo/numero sono forniti per l\'Italia' });
            } else if (guest.documentIssueCountry !== 'IT' && (!guest.documentIssuePlace || guest.documentIssuePlace.trim() === '')) {
                errors.push({ field: `additionalGuests.${index}.documentIssuePlace`, message: 'Luogo di rilascio richiesto se tipo/numero sono forniti' });
            }

            if (!guest.documentIssueCountry || guest.documentIssueCountry.trim() === '') {
                errors.push({ field: `additionalGuests.${index}.documentIssueCountry`, message: 'Paese di rilascio richiesto se tipo/numero sono forniti' });
            }
            if (guest.documentIssueCountry === 'IT' && (!guest.documentIssueProvince || guest.documentIssueProvince.trim() === '')) {
                errors.push({ field: `additionalGuests.${index}.documentIssueProvince`, message: 'Provincia di rilascio richiesta per documenti italiani se tipo/numero sono forniti' });
            }
        }
      }
    }
  });
  
  if (!data.expectedArrivalTime || data.expectedArrivalTime.trim() === '') {
    errors.push({ field: 'expectedArrivalTime', message: 'L\'orario previsto d\'arrivo è obbligatorio.' });
  } else if (!isValidExpectedTime(data.expectedArrivalTime, defaultCheckInTime)) {
    if (defaultCheckInTime && data.expectedArrivalTime < defaultCheckInTime) {
      errors.push({ field: 'expectedArrivalTime', message: `L'orario di arrivo non può essere precedente alle ${defaultCheckInTime}.` });
    } else {
      errors.push({ field: 'expectedArrivalTime', message: 'Formato orario previsto non valido (HH:mm).' });
    }
  }

  if (!data.acceptTerms) {
    errors.push({ field: 'acceptTerms', message: 'Devi accettare i termini e le condizioni' });
  }
  
  return errors;
};

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
