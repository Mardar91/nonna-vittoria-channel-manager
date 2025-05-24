'use client';

import React, { useState } from 'react';
import { CheckInFormData, DOCUMENT_TYPES, SEX_OPTIONS } from '@/types/checkin';
import { validateCheckInForm, ITALIAN_PROVINCES } from '@/lib/checkin-validator';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface CheckInFormProps {
  numberOfGuests: number;
  onSubmit: (data: CheckInFormData) => void;
  isSubmitting: boolean;
  checkInTerms?: string;
}

export default function CheckInForm({ 
  numberOfGuests, 
  onSubmit, 
  isSubmitting,
  checkInTerms 
}: CheckInFormProps) {
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
      documentIssueCountry: 'IT'
    },
    additionalGuests: Array(Math.max(0, numberOfGuests - 1)).fill(null).map(() => ({
      lastName: '',
      firstName: '',
      sex: '',
      dateOfBirth: '',
      placeOfBirth: '',
      provinceOfBirth: '',
      countryOfBirth: 'IT',
      citizenship: 'IT'
    })),
    acceptTerms: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleMainGuestChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      mainGuest: {
        ...prev.mainGuest,
        [field]: value
      }
    }));
    
    // Rimuovi l'errore quando l'utente modifica il campo
    if (errors[`mainGuest.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`mainGuest.${field}`];
        return newErrors;
      });
    }
  };
  
  const handleAdditionalGuestChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalGuests: prev.additionalGuests.map((guest, i) => 
        i === index ? { ...guest, [field]: value } : guest
      )
    }));
    
    // Rimuovi l'errore quando l'utente modifica il campo
    if (errors[`additionalGuests.${index}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`additionalGuests.${index}.${field}`];
        return newErrors;
      });
    }
  };
  
  const addAdditionalGuest = () => {
    setFormData(prev => ({
      ...prev,
      additionalGuests: [...prev.additionalGuests, {
        lastName: '',
        firstName: '',
        sex: '',
        dateOfBirth: '',
        placeOfBirth: '',
        provinceOfBirth: '',
        countryOfBirth: 'IT',
        citizenship: 'IT'
      }]
    }));
  };
  
  const removeAdditionalGuest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalGuests: prev.additionalGuests.filter((_, i) => i !== index)
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valida il form
    const validationErrors = validateCheckInForm(formData);
    
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }
    
    // Se tutto è valido, invia i dati
    onSubmit(formData);
  };
  
  // Calcola la data massima (oggi)
  const maxDate = new Date().toISOString().split('T')[0];
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Ospite principale */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Ospite Principale</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cognome *</label>
            <input
              type="text"
              value={formData.mainGuest.lastName}
              onChange={(e) => handleMainGuestChange('lastName', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.lastName'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors['mainGuest.lastName'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.lastName']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome *</label>
            <input
              type="text"
              value={formData.mainGuest.firstName}
              onChange={(e) => handleMainGuestChange('firstName', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.firstName'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors['mainGuest.firstName'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.firstName']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Sesso *</label>
            <select
              value={formData.mainGuest.sex}
              onChange={(e) => handleMainGuestChange('sex', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.sex'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="">Seleziona</option>
              {Object.entries(SEX_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors['mainGuest.sex'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.sex']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Data di nascita *</label>
            <input
              type="date"
              max={maxDate}
              value={formData.mainGuest.dateOfBirth}
              onChange={(e) => handleMainGuestChange('dateOfBirth', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.dateOfBirth'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors['mainGuest.dateOfBirth'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.dateOfBirth']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo di nascita *</label>
            <input
              type="text"
              value={formData.mainGuest.placeOfBirth}
              onChange={(e) => handleMainGuestChange('placeOfBirth', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.placeOfBirth'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors['mainGuest.placeOfBirth'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.placeOfBirth']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Paese di nascita *</label>
            <select
              value={formData.mainGuest.countryOfBirth}
              onChange={(e) => handleMainGuestChange('countryOfBirth', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.countryOfBirth'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="IT">Italia</option>
              <option value="other">Altro</option>
            </select>
            {errors['mainGuest.countryOfBirth'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.countryOfBirth']}</p>
            )}
          </div>
          
          {formData.mainGuest.countryOfBirth === 'IT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia di nascita *</label>
              <select
                value={formData.mainGuest.provinceOfBirth}
                onChange={(e) => handleMainGuestChange('provinceOfBirth', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors['mainGuest.provinceOfBirth'] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Seleziona provincia</option>
                {ITALIAN_PROVINCES.map(prov => (
                  <option key={prov.code} value={prov.code}>
                    {prov.name} ({prov.code})
                  </option>
                ))}
              </select>
              {errors['mainGuest.provinceOfBirth'] && (
                <p className="mt-1 text-sm text-red-600">{errors['mainGuest.provinceOfBirth']}</p>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Cittadinanza *</label>
            <select
              value={formData.mainGuest.citizenship}
              onChange={(e) => handleMainGuestChange('citizenship', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.citizenship'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="IT">Italiana</option>
              <option value="other">Altra</option>
            </select>
            {errors['mainGuest.citizenship'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.citizenship']}</p>
            )}
          </div>
        </div>
        
        <h4 className="text-md font-medium mt-6 mb-4">Documento di identità</h4>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo documento *</label>
            <select
              value={formData.mainGuest.documentType}
              onChange={(e) => handleMainGuestChange('documentType', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.documentType'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="">Seleziona</option>
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors['mainGuest.documentType'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentType']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Numero documento *</label>
            <input
              type="text"
              value={formData.mainGuest.documentNumber}
              onChange={(e) => handleMainGuestChange('documentNumber', e.target.value.toUpperCase())}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.documentNumber'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors['mainGuest.documentNumber'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentNumber']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo di rilascio *</label>
            <input
              type="text"
              value={formData.mainGuest.documentIssuePlace}
              onChange={(e) => handleMainGuestChange('documentIssuePlace', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.documentIssuePlace'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors['mainGuest.documentIssuePlace'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssuePlace']}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Paese di rilascio *</label>
            <select
              value={formData.mainGuest.documentIssueCountry}
              onChange={(e) => handleMainGuestChange('documentIssueCountry', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors['mainGuest.documentIssueCountry'] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="IT">Italia</option>
              <option value="other">Altro</option>
            </select>
            {errors['mainGuest.documentIssueCountry'] && (
              <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssueCountry']}</p>
            )}
          </div>
          
          {formData.mainGuest.documentIssueCountry === 'IT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia di rilascio *</label>
              <select
                value={formData.mainGuest.documentIssueProvince}
                onChange={(e) => handleMainGuestChange('documentIssueProvince', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors['mainGuest.documentIssueProvince'] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Seleziona provincia</option>
                {ITALIAN_PROVINCES.map(prov => (
                  <option key={prov.code} value={prov.code}>
                    {prov.name} ({prov.code})
                  </option>
                ))}
              </select>
              {errors['mainGuest.documentIssueProvince'] && (
                <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssueProvince']}</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Ospiti aggiuntivi */}
      {formData.additionalGuests.map((guest, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Ospite {index + 2}</h3>
            <button
              type="button"
              onClick={() => removeAdditionalGuest(index)}
              className="text-red-600 hover:text-red-800"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cognome *</label>
              <input
                type="text"
                value={guest.lastName}
                onChange={(e) => handleAdditionalGuestChange(index, 'lastName', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.lastName`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors[`additionalGuests.${index}.lastName`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.lastName`]}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input
                type="text"
                value={guest.firstName}
                onChange={(e) => handleAdditionalGuestChange(index, 'firstName', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.firstName`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors[`additionalGuests.${index}.firstName`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.firstName`]}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Sesso *</label>
              <select
                value={guest.sex}
                onChange={(e) => handleAdditionalGuestChange(index, 'sex', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.sex`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Seleziona</option>
                {Object.entries(SEX_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors[`additionalGuests.${index}.sex`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.sex`]}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Data di nascita *</label>
              <input
                type="date"
                max={maxDate}
                value={guest.dateOfBirth}
                onChange={(e) => handleAdditionalGuestChange(index, 'dateOfBirth', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.dateOfBirth`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors[`additionalGuests.${index}.dateOfBirth`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.dateOfBirth`]}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Luogo di nascita *</label>
              <input
                type="text"
                value={guest.placeOfBirth}
                onChange={(e) => handleAdditionalGuestChange(index, 'placeOfBirth', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.placeOfBirth`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors[`additionalGuests.${index}.placeOfBirth`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.placeOfBirth`]}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Paese di nascita *</label>
              <select
                value={guest.countryOfBirth}
                onChange={(e) => handleAdditionalGuestChange(index, 'countryOfBirth', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.countryOfBirth`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="IT">Italia</option>
                <option value="other">Altro</option>
              </select>
              {errors[`additionalGuests.${index}.countryOfBirth`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.countryOfBirth`]}</p>
              )}
            </div>
            
            {guest.countryOfBirth === 'IT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Provincia di nascita *</label>
                <select
                  value={guest.provinceOfBirth}
                  onChange={(e) => handleAdditionalGuestChange(index, 'provinceOfBirth', e.target.value)}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors[`additionalGuests.${index}.provinceOfBirth`] 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Seleziona provincia</option>
                  {ITALIAN_PROVINCES.map(prov => (
                    <option key={prov.code} value={prov.code}>
                      {prov.name} ({prov.code})
                    </option>
                  ))}
                </select>
                {errors[`additionalGuests.${index}.provinceOfBirth`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.provinceOfBirth`]}</p>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Cittadinanza *</label>
              <select
                value={guest.citizenship}
                onChange={(e) => handleAdditionalGuestChange(index, 'citizenship', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors[`additionalGuests.${index}.citizenship`] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="IT">Italiana</option>
                <option value="other">Altra</option>
              </select>
              {errors[`additionalGuests.${index}.citizenship`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.citizenship`]}</p>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Pulsante aggiungi ospite */}
      {formData.additionalGuests.length < numberOfGuests - 1 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={addAdditionalGuest}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Aggiungi ospite
          </button>
        </div>
      )}
      
      {/* Termini e condizioni */}
      {checkInTerms && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Termini e condizioni</h4>
          <div className="text-sm text-gray-600 mb-4 max-h-40 overflow-y-auto">
            {checkInTerms}
          </div>
        </div>
      )}
      
      <div className="flex items-center">
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
      {errors['acceptTerms'] && (
        <p className="mt-1 text-sm text-red-600">{errors['acceptTerms']}</p>
      )}
      
      {/* Pulsanti azione */}
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
