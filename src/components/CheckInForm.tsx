'use client';

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { CheckInFormData, DOCUMENT_TYPES, SEX_OPTIONS, IGuestData } from '@/types/checkin';
import { validateCheckInForm, ITALIAN_PROVINCES } from '@/lib/checkin-validator';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ITALIAN_MUNICIPALITIES, ItalianMunicipality } from '@/data/italianMunicipalities';
import { COUNTRIES } from '@/data/countries';

interface CommuneOption {
  value: string; // Codice del comune
  label: string; // Nome del comune (es. "ROMA (RM)")
  province: string;
}

// Modifica: Aggiunto 'export' per rendere l'interfaccia importabile
export interface CheckInFormProps {
  numberOfGuests: number; // This will be used as initialNumberOfGuests
  onSubmit: (data: CheckInFormData) => void;
  isSubmitting: boolean;
  checkInTerms?: string;
  mode: 'normal' | 'unassigned_checkin';
  bookingSource?: string;
  defaultCheckInTime?: string; // Aggiunta: formato "HH:mm"
}

export default function CheckInForm({ 
  numberOfGuests: initialNumberOfGuests,
  onSubmit, 
  isSubmitting,
  checkInTerms,
  mode,
  bookingSource,
  defaultCheckInTime // Aggiunta
}: CheckInFormProps) {

  const [editableNumberOfGuests, setEditableNumberOfGuests] = useState(initialNumberOfGuests || 1);

  const isNumberOfGuestsEditable = mode === 'unassigned_checkin' || (mode === 'normal' && bookingSource !== 'direct');

  useEffect(() => {
    // Sync editableNumberOfGuests with initialNumberOfGuests prop if it's not editable,
    // or if the initial prop value changes (e.g. parent updates the default for unassigned mode)
    if (!isNumberOfGuestsEditable) {
      setEditableNumberOfGuests(initialNumberOfGuests || 1);
    } else {
      // For editable cases, prop is the initial default. If prop changes, reflect it.
      // This ensures that if the parent page (form/page.tsx) changes the numberOfGuests
      // (e.g. for unassigned_checkin mode if a default is fetched later), it's updated here.
      setEditableNumberOfGuests(initialNumberOfGuests || 1);
    }
  }, [initialNumberOfGuests, isNumberOfGuestsEditable]);
  

  const [formData, setFormData] = useState<CheckInFormData>({
    mainGuest: {
      lastName: '',
      firstName: '',
      sex: '',
      dateOfBirth: '',
      placeOfBirth: '',
      provinceOfBirth: '',
      countryOfBirth: 'IT',
      citizenship: 'IT',
      documentType: '',
      documentNumber: '',
      documentIssuePlace: '',
      documentIssueProvince: '',
      documentIssueCountry: 'IT',
      isMainGuest: true, // Main guest is always true
      phoneNumber: '', // Aggiunto
    },
    additionalGuests: [], // Initialized empty, populated by useEffect
    acceptTerms: false,
    numberOfGuests: initialNumberOfGuests || 1,
    notes: '',
    expectedArrivalTime: '', // Aggiunto
    phoneNumber: '', // Aggiunto per l'ospite principale
  });

  // Effect to synchronize the additionalGuests array with editableNumberOfGuests
  useEffect(() => {
    setFormData(prev => {
      const currentAdditionalGuests = prev.additionalGuests;
      const newAdditionalGuestCount = Math.max(0, editableNumberOfGuests - 1);
      const updatedAdditionalGuests: IGuestData[] = [...currentAdditionalGuests];

      if (newAdditionalGuestCount > currentAdditionalGuests.length) {
        for (let i = currentAdditionalGuests.length; i < newAdditionalGuestCount; i++) {
          updatedAdditionalGuests.push({
            lastName: '', firstName: '', sex: '', dateOfBirth: '',
            placeOfBirth: '', provinceOfBirth: '', countryOfBirth: 'IT', citizenship: 'IT',
            documentType: '', documentNumber: '', documentIssuePlace: '', 
            documentIssueProvince: '', documentIssueCountry: 'IT',
            isMainGuest: false,
          });
        }
      } else if (newAdditionalGuestCount < currentAdditionalGuests.length) {
        updatedAdditionalGuests.splice(newAdditionalGuestCount);
      }
      return {
        ...prev,
        numberOfGuests: editableNumberOfGuests, // Update numberOfGuests in formData
        additionalGuests: updatedAdditionalGuests
      };
    });
  }, [editableNumberOfGuests]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleMainGuestChange = (field: string, value: string) => {
    setFormData(prev => {
      const updatedMainGuest = {
        ...prev.mainGuest,
        [field]: value
      };
      return {
        ...prev,
        mainGuest: updatedMainGuest,
        // Sincronizza il phoneNumber a livello principale del form se è quello che sta cambiando
        ...(field === 'phoneNumber' && { phoneNumber: value })
      };
    });
    if (errors[`mainGuest.${field}`]) {
      setErrors(prevErrs => ({ ...prevErrs, [`mainGuest.${field}`]: '' }));
    }
  };
  
  const handleAdditionalGuestChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalGuests: prev.additionalGuests.map((guest, i) => 
        i === index ? { ...guest, [field]: value } : guest
      )
    }));
    if (errors[`additionalGuests.${index}.${field}`]) {
      setErrors(prevErrs => ({ ...prevErrs, [`additionalGuests.${index}.${field}`]: '' }));
    }
  };
  
  const handleNumGuestsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isNumberOfGuestsEditable) return;
    let newNum = parseInt(e.target.value, 10);
    if (isNaN(newNum) || newNum < 1) newNum = 1;
    if (newNum > 20) newNum = 20; // Example: Max 20 guests

    setEditableNumberOfGuests(newNum);
  };
  
  const addAdditionalGuestButton = () => {
    if (!isNumberOfGuestsEditable) return;
    if (editableNumberOfGuests < 20) {
      setEditableNumberOfGuests(prevNum => prevNum + 1);
    }
  };
  
  const removeAdditionalGuestButton = (index: number) => {
    if (!isNumberOfGuestsEditable) return;
    // This function now just decrements the total number of guests.
    // The useEffect for 'editableNumberOfGuests' will handle removing the last guest from the array.
    // The 'index' parameter is kept if direct removal by index is restored later,
    // but for current logic, it's not directly used to splice the array here.
    if (editableNumberOfGuests > 1) {
       setEditableNumberOfGuests(prevNum => prevNum - 1);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, notes: e.target.value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // formData should be up-to-date due to state management and useEffect
    const validationErrors = validateCheckInForm(formData, mode === 'unassigned_checkin' ? 'unassigned' : bookingSource, defaultCheckInTime);
    
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }
    onSubmit(formData);
  };
  
  const maxDate = new Date().toISOString().split('T')[0];

  const communeOptions: CommuneOption[] = ITALIAN_MUNICIPALITIES.map(comune => ({
    value: comune.code,
    label: `${comune.name.toUpperCase()} (${comune.province.toUpperCase()})`,
    province: comune.province.toUpperCase()
  }));
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Numero Totale Ospiti</h3>
        <div>
          <label htmlFor="numberOfGuestsInput" className="block text-sm font-medium text-gray-700">
            Numero Ospiti *
          </label>
          {isNumberOfGuestsEditable ? (
            <input
              id="numberOfGuestsInput"
              type="number"
              min="1"
              max="20" // Example: Max 20 guests
              value={editableNumberOfGuests}
              onChange={handleNumGuestsInputChange}
              className="mt-1 block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          ) : (
            <p className="mt-1 block w-full px-3 py-2 sm:text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md">
              {editableNumberOfGuests}
            </p>
          )}
          {errors.numberOfGuests && (
            <p className="mt-1 text-sm text-red-600">{errors.numberOfGuests}</p>
          )}
        </div>
        <div className="mt-4"> {/* Added margin-top for spacing */}
          <label htmlFor="expectedArrivalTime" className="block text-sm font-medium text-gray-700">Orario Previsto d'Arrivo</label>
          <input
            type="time"
            id="expectedArrivalTime"
            value={formData.expectedArrivalTime || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, expectedArrivalTime: e.target.value }))}
            min={defaultCheckInTime} // Aggiunta questa riga
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.expectedArrivalTime ? 'border-red-300' : 'border-gray-300'}`}
          />
          {errors.expectedArrivalTime && <p className="mt-1 text-sm text-red-600">{errors.expectedArrivalTime}</p>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Ospite Principale</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Cognome *</label>
            <input type="text" value={formData.mainGuest.lastName} onChange={(e) => handleMainGuestChange('lastName', e.target.value)} 
                   className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.lastName'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.lastName'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.lastName']}</p>}
          </div>
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome *</label>
            <input type="text" value={formData.mainGuest.firstName} onChange={(e) => handleMainGuestChange('firstName', e.target.value)}
                   className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.firstName'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.firstName'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.firstName']}</p>}
          </div>
          {/* Sex */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Sesso *</label>
            <select value={formData.mainGuest.sex} onChange={(e) => handleMainGuestChange('sex', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.sex'] ? 'border-red-300' : 'border-gray-300'}`}>
              <option value="">Seleziona</option>
              {Object.entries(SEX_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {errors['mainGuest.sex'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.sex']}</p>}
          </div>
          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Data di nascita *</label>
            <input type="date" max={maxDate} value={formData.mainGuest.dateOfBirth} onChange={(e) => handleMainGuestChange('dateOfBirth', e.target.value)}
                   className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.dateOfBirth'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.dateOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.dateOfBirth']}</p>}
          </div>
          {/* Country of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Paese di nascita *</label>
            <select
              value={formData.mainGuest.countryOfBirth}
              onChange={(e) => {
                const newCountry = e.target.value;
                handleMainGuestChange('countryOfBirth', newCountry);
                // Reset placeOfBirth e provinceOfBirth se il paese cambia
                handleMainGuestChange('placeOfBirth', '');
                handleMainGuestChange('provinceOfBirth', '');
              }}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.countryOfBirth'] ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Seleziona Paese</option>
              {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
            {errors['mainGuest.countryOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.countryOfBirth']}</p>}
          </div>
          {/* Place of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo di nascita *</label>
            {formData.mainGuest.countryOfBirth === 'IT' ? (
              <Select<CommuneOption>
                options={communeOptions}
                value={communeOptions.find(option => option.value === formData.mainGuest.placeOfBirth) || null}
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    handleMainGuestChange('placeOfBirth', selectedOption.value);
                    handleMainGuestChange('provinceOfBirth', selectedOption.province);
                  } else {
                    handleMainGuestChange('placeOfBirth', '');
                    handleMainGuestChange('provinceOfBirth', '');
                  }
                }}
                placeholder="Digita per cercare un comune..."
                isClearable
                className={`mt-1 react-select-container ${errors['mainGuest.placeOfBirth'] ? 'react-select-error' : ''}`}
                classNamePrefix="react-select"
                noOptionsMessage={() => "Nessun comune trovato"}
              />
            ) : (
              <input
                type="text"
                value={formData.mainGuest.placeOfBirth}
                onChange={(e) => handleMainGuestChange('placeOfBirth', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.placeOfBirth'] ? 'border-red-300' : 'border-gray-300'}`}
              />
            )}
            {errors['mainGuest.placeOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.placeOfBirth']}</p>}
          </div>
          {/* Province of Birth (Conditional) */}
          {formData.mainGuest.countryOfBirth === 'IT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia di nascita *</label>
              <input
                type="text"
                value={formData.mainGuest.provinceOfBirth || ''}
                readOnly
                className="mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-gray-100 border-gray-300"
              />
              {/* L'errore per provinceOfBirth sarà gestito dalla validazione se placeOfBirth (comune) non è selezionato */}
              {errors['mainGuest.provinceOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.provinceOfBirth']}</p>}
            </div>
          )}
          {/* Citizenship */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Cittadinanza *</label>
            <select
              value={formData.mainGuest.citizenship}
              onChange={(e) => handleMainGuestChange('citizenship', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.citizenship'] ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Seleziona Cittadinanza</option>
              {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
            {errors['mainGuest.citizenship'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.citizenship']}</p>}
          </div>
          {/* Phone Number */}
          <div>
            <label htmlFor="mainGuestPhoneNumber" className="block text-sm font-medium text-gray-700">Numero di telefono</label>
            <input
              type="tel"
              id="mainGuestPhoneNumber"
              value={formData.mainGuest.phoneNumber || ''}
              onChange={(e) => handleMainGuestChange('phoneNumber', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.phoneNumber'] ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Es. 3331234567"
            />
            {errors['mainGuest.phoneNumber'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.phoneNumber']}</p>}
          </div>
        </div>
        
        <h4 className="text-md font-medium mt-6 mb-4">Documento di identità (Ospite Principale)</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo documento *</label>
            <select value={formData.mainGuest.documentType} onChange={(e) => handleMainGuestChange('documentType', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.documentType'] ? 'border-red-300' : 'border-gray-300'}`}>
              <option value="">Seleziona</option>
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {errors['mainGuest.documentType'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentType']}</p>}
          </div>
          {/* Document Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Numero documento *</label>
            <input type="text" value={formData.mainGuest.documentNumber} onChange={(e) => handleMainGuestChange('documentNumber', e.target.value.toUpperCase())}
                   className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.documentNumber'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.documentNumber'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentNumber']}</p>}
          </div>
          {/* Document Issue Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Paese di rilascio *</label>
            <select
              value={formData.mainGuest.documentIssueCountry}
              onChange={(e) => {
                const newCountry = e.target.value;
                handleMainGuestChange('documentIssueCountry', newCountry);
                handleMainGuestChange('documentIssuePlace', '');
                handleMainGuestChange('documentIssueProvince', '');
              }}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.documentIssueCountry'] ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Seleziona Paese</option>
              {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
            {errors['mainGuest.documentIssueCountry'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssueCountry']}</p>}
          </div>
          {/* Document Issue Place */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo di rilascio *</label>
            {formData.mainGuest.documentIssueCountry === 'IT' ? (
              <Select<CommuneOption>
                options={communeOptions}
                value={communeOptions.find(option => option.value === formData.mainGuest.documentIssuePlace) || null}
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    handleMainGuestChange('documentIssuePlace', selectedOption.value);
                    handleMainGuestChange('documentIssueProvince', selectedOption.province);
                  } else {
                    handleMainGuestChange('documentIssuePlace', '');
                    handleMainGuestChange('documentIssueProvince', '');
                  }
                }}
                placeholder="Digita per cercare un comune..."
                isClearable
                className={`mt-1 react-select-container ${errors['mainGuest.documentIssuePlace'] ? 'react-select-error' : ''}`}
                classNamePrefix="react-select"
                noOptionsMessage={() => "Nessun comune trovato"}
              />
            ) : (
              <input
                type="text"
                value={formData.mainGuest.documentIssuePlace}
                onChange={(e) => handleMainGuestChange('documentIssuePlace', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors['mainGuest.documentIssuePlace'] ? 'border-red-300' : 'border-gray-300'}`}
              />
            )}
            {errors['mainGuest.documentIssuePlace'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssuePlace']}</p>}
          </div>
          {/* Document Issue Province (Conditional) */}
          {formData.mainGuest.documentIssueCountry === 'IT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia di rilascio *</label>
              <input
                type="text"
                value={formData.mainGuest.documentIssueProvince || ''}
                readOnly
                className="mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-gray-100 border-gray-300"
              />
              {errors['mainGuest.documentIssueProvince'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssueProvince']}</p>}
            </div>
          )}
        </div>
      </div>
      
      {formData.additionalGuests.map((guest, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Ospite {index + 2}</h3>
            {isNumberOfGuestsEditable && (
              <button type="button" onClick={() => removeAdditionalGuestButton(index)}
                      className="text-red-600 hover:text-red-800">
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Cognome *</label>
              <input type="text" value={guest.lastName} onChange={(e) => handleAdditionalGuestChange(index, 'lastName', e.target.value)}
                     className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.lastName`] ? 'border-red-300' : 'border-gray-300'}`} />
              {errors[`additionalGuests.${index}.lastName`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.lastName`]}</p>}
            </div>
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input type="text" value={guest.firstName} onChange={(e) => handleAdditionalGuestChange(index, 'firstName', e.target.value)}
                     className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.firstName`] ? 'border-red-300' : 'border-gray-300'}`} />
              {errors[`additionalGuests.${index}.firstName`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.firstName`]}</p>}
            </div>
            {/* Sex */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Sesso *</label>
              <select value={guest.sex} onChange={(e) => handleAdditionalGuestChange(index, 'sex', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.sex`] ? 'border-red-300' : 'border-gray-300'}`}>
                <option value="">Seleziona</option>
                {Object.entries(SEX_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {errors[`additionalGuests.${index}.sex`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.sex`]}</p>}
            </div>
            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Data di nascita *</label>
              <input type="date" max={maxDate} value={guest.dateOfBirth} onChange={(e) => handleAdditionalGuestChange(index, 'dateOfBirth', e.target.value)}
                     className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.dateOfBirth`] ? 'border-red-300' : 'border-gray-300'}`} />
              {errors[`additionalGuests.${index}.dateOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.dateOfBirth`]}</p>}
            </div>
            {/* Country of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Paese di nascita *</label>
              <select
                value={guest.countryOfBirth}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  handleAdditionalGuestChange(index, 'countryOfBirth', newCountry);
                  handleAdditionalGuestChange(index, 'placeOfBirth', '');
                  handleAdditionalGuestChange(index, 'provinceOfBirth', '');
                }}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.countryOfBirth`] ? 'border-red-300' : 'border-gray-300'}`}
              >
                <option value="">Seleziona Paese</option>
                {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
              {errors[`additionalGuests.${index}.countryOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.countryOfBirth`]}</p>}
            </div>
            {/* Place of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Luogo di nascita *</label>
              {guest.countryOfBirth === 'IT' ? (
                <Select<CommuneOption>
                  options={communeOptions}
                  value={communeOptions.find(option => option.value === guest.placeOfBirth) || null}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      handleAdditionalGuestChange(index, 'placeOfBirth', selectedOption.value);
                      handleAdditionalGuestChange(index, 'provinceOfBirth', selectedOption.province);
                    } else {
                      handleAdditionalGuestChange(index, 'placeOfBirth', '');
                      handleAdditionalGuestChange(index, 'provinceOfBirth', '');
                    }
                  }}
                  placeholder="Digita per cercare un comune..."
                  isClearable
                  className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.placeOfBirth`] ? 'react-select-error' : ''}`}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Nessun comune trovato"}
                />
              ) : (
                <input
                  type="text"
                  value={guest.placeOfBirth}
                  onChange={(e) => handleAdditionalGuestChange(index, 'placeOfBirth', e.target.value)}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.placeOfBirth`] ? 'border-red-300' : 'border-gray-300'}`}
                />
              )}
              {errors[`additionalGuests.${index}.placeOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.placeOfBirth`]}</p>}
            </div>
            {/* Province of Birth (Conditional) */}
            {guest.countryOfBirth === 'IT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Provincia di nascita *</label>
                <input
                  type="text"
                  value={guest.provinceOfBirth || ''}
                  readOnly
                  className="mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-gray-100 border-gray-300"
                />
                {errors[`additionalGuests.${index}.provinceOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.provinceOfBirth`]}</p>}
              </div>
            )}
            {/* Citizenship */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Cittadinanza *</label>
              <select
                value={guest.citizenship}
                onChange={(e) => handleAdditionalGuestChange(index, 'citizenship', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.citizenship`] ? 'border-red-300' : 'border-gray-300'}`}
              >
                <option value="">Seleziona Cittadinanza</option>
                {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
              {errors[`additionalGuests.${index}.citizenship`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.citizenship`]}</p>}
            </div>
            
            {/* Document Fields for Additional Guests - ALWAYS RENDERED */}
            {/* The validator (checkin-validator.ts) handles if these are mandatory based on bookingSource/context */}
            <>
              <h4 className="text-md font-medium mt-6 mb-2 sm:col-span-2">Documento di identità (Ospite {index + 2})</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo documento</label>
                <select value={guest.documentType || ''} onChange={(e) => handleAdditionalGuestChange(index, 'documentType', e.target.value)}
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.documentType`] ? 'border-red-300' : 'border-gray-300'}`}>
                  <option value="">Seleziona</option>
                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errors[`additionalGuests.${index}.documentType`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentType`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Numero documento</label>
                <input type="text" value={guest.documentNumber || ''} onChange={(e) => handleAdditionalGuestChange(index, 'documentNumber', e.target.value.toUpperCase())}
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.documentNumber`] ? 'border-red-300' : 'border-gray-300'}`} />
                {errors[`additionalGuests.${index}.documentNumber`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentNumber`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Paese di rilascio</label>
                <select
                  value={guest.documentIssueCountry || 'IT'}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    handleAdditionalGuestChange(index, 'documentIssueCountry', newCountry);
                    handleAdditionalGuestChange(index, 'documentIssuePlace', '');
                    handleAdditionalGuestChange(index, 'documentIssueProvince', '');
                  }}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.documentIssueCountry`] ? 'border-red-300' : 'border-gray-300'}`}
                >
                  <option value="">Seleziona Paese</option>
                  {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
                {errors[`additionalGuests.${index}.documentIssueCountry`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentIssueCountry`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Luogo di rilascio</label>
                {guest.documentIssueCountry === 'IT' ? (
                  <Select<CommuneOption>
                    options={communeOptions}
                    value={communeOptions.find(option => option.value === guest.documentIssuePlace) || null}
                    onChange={(selectedOption) => {
                      if (selectedOption) {
                        handleAdditionalGuestChange(index, 'documentIssuePlace', selectedOption.value);
                        handleAdditionalGuestChange(index, 'documentIssueProvince', selectedOption.province);
                      } else {
                        handleAdditionalGuestChange(index, 'documentIssuePlace', '');
                        handleAdditionalGuestChange(index, 'documentIssueProvince', '');
                      }
                    }}
                    placeholder="Digita per cercare un comune..."
                    isClearable
                    className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.documentIssuePlace`] ? 'react-select-error' : ''}`}
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Nessun comune trovato"}
                  />
                ) : (
                  <input
                    type="text"
                    value={guest.documentIssuePlace || ''}
                    onChange={(e) => handleAdditionalGuestChange(index, 'documentIssuePlace', e.target.value)}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors[`additionalGuests.${index}.documentIssuePlace`] ? 'border-red-300' : 'border-gray-300'}`}
                  />
                )}
                {errors[`additionalGuests.${index}.documentIssuePlace`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentIssuePlace`]}</p>}
              </div>
              {(guest.documentIssueCountry === 'IT' || !guest.documentIssueCountry) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provincia di rilascio</label>
                  <input
                    type="text"
                    value={guest.documentIssueProvince || ''}
                    readOnly
                    className="mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-gray-100 border-gray-300"
                  />
                  {errors[`additionalGuests.${index}.documentIssueProvince`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentIssueProvince`]}</p>}
                </div>
              )}
            </>
          </div>
        </div>
      ))}
      
      {isNumberOfGuestsEditable && formData.additionalGuests.length < editableNumberOfGuests - 1 && (
        <div className="flex justify-center">
          <button type="button" onClick={addAdditionalGuestButton}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <PlusIcon className="h-5 w-5 mr-2" />
            Aggiungi ospite
          </button>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Note Aggiuntive (opzionale)</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes || ''}
            onChange={handleNotesChange}
            className="mt-1 block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Eventuali richieste speciali o informazioni aggiuntive..."
          />
        </div>

        {checkInTerms && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Termini e condizioni del Check-in</h4>
            <div className="text-sm text-gray-600 mb-4 max-h-40 overflow-y-auto border p-2 rounded-md bg-gray-50">
              {checkInTerms}
            </div>
          </div>
        )}
        
        <div className="mt-6 flex items-center">
          <input
            type="checkbox"
            id="acceptTerms"
            checked={formData.acceptTerms}
            onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
            Accetto i termini e le condizioni e confermo che i dati inseriti sono corretti *
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
        )}
      </div>
      
      <div className="flex justify-end space-x-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Invio in corso...' : 'Completa Check-in'}
        </button>
      </div>
    </form>
  );
}
