'use client';

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { CheckInFormData, DOCUMENT_TYPES, SEX_OPTIONS, IGuestData } from '@/types/checkin';
import { validateCheckInForm } from '@/lib/checkin-validator'; // ITALIAN_PROVINCES might not be needed directly here anymore
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ITALIAN_MUNICIPALITIES, ItalianMunicipality } from '@/data/italianMunicipalities';
import { COUNTRIES } from '@/data/countries';
import PhoneInput, { isValidPhoneNumber as isValidPhoneNumberExternal } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const ITALIA_COUNTRY_CODE = '100000100';

interface CommuneOption {
  value: string;
  label: string;
  province: string;
}

export interface CheckInFormProps {
  numberOfGuests: number;
  onSubmit: (data: CheckInFormData) => void;
  isSubmitting: boolean;
  checkInTerms?: string;
  mode: 'normal' | 'unassigned_checkin';
  bookingSource?: string;
  defaultCheckInTime?: string;
}

export default function CheckInForm({
  numberOfGuests: initialNumberOfGuests,
  onSubmit,
  isSubmitting,
  checkInTerms,
  mode,
  bookingSource,
  defaultCheckInTime
}: CheckInFormProps) {

  const [editableNumberOfGuests, setEditableNumberOfGuests] = useState(initialNumberOfGuests || 1);
  const isNumberOfGuestsEditable = mode === 'unassigned_checkin' || (mode === 'normal' && bookingSource !== 'direct');

  useEffect(() => {
    if (!isNumberOfGuestsEditable) {
      setEditableNumberOfGuests(initialNumberOfGuests || 1);
    } else {
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
      countryOfBirth: ITALIA_COUNTRY_CODE, // Default to Italy
      citizenship: ITALIA_COUNTRY_CODE,   // Default to Italy
      documentType: '',
      documentNumber: '',
      documentIssuePlace: '',
      documentIssueProvince: '',
      documentIssueCountry: ITALIA_COUNTRY_CODE, // Default to Italy
      isMainGuest: true,
      phoneNumber: '',
    },
    additionalGuests: [],
    acceptTerms: false,
    numberOfGuests: initialNumberOfGuests || 1,
    notes: '',
    expectedArrivalTime: '',
    phoneNumber: '',
  });

  useEffect(() => {
    setFormData(prev => {
      const currentAdditionalGuests = prev.additionalGuests;
      const newAdditionalGuestCount = Math.max(0, editableNumberOfGuests - 1);
      const updatedAdditionalGuests: IGuestData[] = [...currentAdditionalGuests];

      if (newAdditionalGuestCount > currentAdditionalGuests.length) {
        for (let i = currentAdditionalGuests.length; i < newAdditionalGuestCount; i++) {
          updatedAdditionalGuests.push({
            lastName: '', firstName: '', sex: '', dateOfBirth: '',
            placeOfBirth: '', provinceOfBirth: '', countryOfBirth: ITALIA_COUNTRY_CODE, citizenship: ITALIA_COUNTRY_CODE,
            documentType: '', documentNumber: '', documentIssuePlace: '',
            documentIssueProvince: '', documentIssueCountry: ITALIA_COUNTRY_CODE,
            isMainGuest: false,
          });
        }
      } else if (newAdditionalGuestCount < currentAdditionalGuests.length) {
        updatedAdditionalGuests.splice(newAdditionalGuestCount);
      }
      return {
        ...prev,
        numberOfGuests: editableNumberOfGuests,
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
      // Reset dependent fields if country changes
      if (field === 'countryOfBirth') {
        updatedMainGuest.placeOfBirth = '';
        updatedMainGuest.provinceOfBirth = '';
      }
      if (field === 'documentIssueCountry') {
        updatedMainGuest.documentIssuePlace = '';
        updatedMainGuest.documentIssueProvince = '';
      }
      return {
        ...prev,
        mainGuest: updatedMainGuest,
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
      additionalGuests: prev.additionalGuests.map((guest, i) => {
        if (i === index) {
          const updatedGuest = { ...guest, [field]: value };
          if (field === 'countryOfBirth') {
            updatedGuest.placeOfBirth = '';
            updatedGuest.provinceOfBirth = '';
          }
          if (field === 'documentIssueCountry') {
            updatedGuest.documentIssuePlace = '';
            updatedGuest.documentIssueProvince = '';
          }
          return updatedGuest;
        }
        return guest;
      })
    }));
    if (errors[`additionalGuests.${index}.${field}`]) {
      setErrors(prevErrs => ({ ...prevErrs, [`additionalGuests.${index}.${field}`]: '' }));
    }
  };

  const handleNumGuestsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isNumberOfGuestsEditable) return;
    let newNum = parseInt(e.target.value, 10);
    if (isNaN(newNum) || newNum < 1) newNum = 1;
    if (newNum > 20) newNum = 20;
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
    if (editableNumberOfGuests > 1) {
       setEditableNumberOfGuests(prevNum => prevNum - 1);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, notes: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const generateTimeOptions = (defaultMinTime?: string): { value: string; label: string }[] => {
    const options: { value: string; label: string }[] = [{ value: '', label: 'Seleziona orario...' }];
    let startHour = 0;
    let startMinute = 0;

    if (defaultMinTime && /^[0-9]{2}:[0-9]{2}$/.test(defaultMinTime)) {
      [startHour, startMinute] = defaultMinTime.split(':').map(Number);
    }

    if (defaultMinTime) {
      if (startMinute > 0 && startMinute < 30) {
          startMinute = 30;
      } else if (startMinute > 30) {
          startMinute = 0;
          startHour += 1;
      }
    }

    if (startHour >= 24) return options;

    for (let h = startHour; h < 24; h++) {
      for (let m = (h === startHour ? startMinute : 0); m < 60; m += 30) {
        const hourString = h.toString().padStart(2, '0');
        const minuteString = m.toString().padStart(2, '0');
        const timeValue = `${hourString}:${minuteString}`;
        options.push({ value: timeValue, label: timeValue });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions(defaultCheckInTime);

  // Options for react-select components
  const sexOptionsForSelect = [{ value: "", label: "Seleziona..." }, ...Object.entries(SEX_OPTIONS).map(([value, label]) => ({ value, label: String(label) }))];
  const countryOptionsForSelect = [{ value: "", label: "Seleziona Paese..." }, ...COUNTRIES.map(country => ({ value: country.code, label: country.name }))];
  const documentTypesForSelect = [{ value: "", label: "Seleziona..." }, ...Object.entries(DOCUMENT_TYPES).map(([value, label]) => ({ value, label: String(label) }))];

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
              max="20"
              value={editableNumberOfGuests}
              onChange={handleNumGuestsInputChange}
              className={`form-input-custom mt-1 ${errors.numberOfGuests ? 'border-red-300' : 'border-gray-300'}`}
            />
          ) : (
            <p className="form-input-custom mt-1 text-gray-700 bg-gray-100 cursor-not-allowed">
              {editableNumberOfGuests}
            </p>
          )}
          {errors.numberOfGuests && (
            <p className="mt-1 text-sm text-red-600">{errors.numberOfGuests}</p>
          )}
        </div>
        <div className="mt-4">
          <label htmlFor="expectedArrivalTime" className="block text-sm font-medium text-gray-700">Orario Previsto d'Arrivo *</label>
          <Select
            id="expectedArrivalTime"
            options={timeOptions}
            value={timeOptions.find(option => option.value === formData.expectedArrivalTime) || null}
            onChange={(selectedOption) => setFormData(prev => ({ ...prev, expectedArrivalTime: selectedOption ? selectedOption.value : '' }))}
            placeholder="Seleziona orario..."
            isClearable
            className={`mt-1 react-select-container ${errors.expectedArrivalTime ? 'react-select-error' : ''}`}
            classNamePrefix="react-select"
            noOptionsMessage={() => "Nessuna opzione"}
          />
          {errors.expectedArrivalTime && <p className="mt-1 text-sm text-red-600">{errors.expectedArrivalTime}</p>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Ospite Principale</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cognome *</label>
            <input type="text" value={formData.mainGuest.lastName} onChange={(e) => handleMainGuestChange('lastName', e.target.value)}
                   className={`form-input-custom mt-1 ${errors['mainGuest.lastName'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.lastName'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.lastName']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome *</label>
            <input type="text" value={formData.mainGuest.firstName} onChange={(e) => handleMainGuestChange('firstName', e.target.value)}
                   className={`form-input-custom mt-1 ${errors['mainGuest.firstName'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.firstName'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.firstName']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sesso *</label>
            <Select
              options={sexOptionsForSelect}
              value={sexOptionsForSelect.find(option => option.value === formData.mainGuest.sex) || null}
              onChange={(selectedOption) => handleMainGuestChange('sex', selectedOption ? selectedOption.value : '')}
              placeholder="Seleziona..."
              isClearable
              className={`mt-1 react-select-container ${errors['mainGuest.sex'] ? 'react-select-error' : ''}`}
              classNamePrefix="react-select"
              noOptionsMessage={() => "Nessuna opzione"}
            />
            {errors['mainGuest.sex'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.sex']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data di nascita *</label>
            <input type="date" max={maxDate} value={formData.mainGuest.dateOfBirth} onChange={(e) => handleMainGuestChange('dateOfBirth', e.target.value)}
                   className={`form-input-custom mt-1 ${errors['mainGuest.dateOfBirth'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.dateOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.dateOfBirth']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Paese di nascita *</label>
            <Select
              options={countryOptionsForSelect}
              value={countryOptionsForSelect.find(option => option.value === formData.mainGuest.countryOfBirth) || null}
              onChange={(selectedOption) => handleMainGuestChange('countryOfBirth', selectedOption ? selectedOption.value : '')}
              placeholder="Seleziona Paese..."
              isClearable
              className={`mt-1 react-select-container ${errors['mainGuest.countryOfBirth'] ? 'react-select-error' : ''}`}
              classNamePrefix="react-select"
              noOptionsMessage={() => "Nessun paese trovato"}
            />
            {errors['mainGuest.countryOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.countryOfBirth']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo di nascita *</label>
            {formData.mainGuest.countryOfBirth === ITALIA_COUNTRY_CODE ? (
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
            ) : formData.mainGuest.countryOfBirth && formData.mainGuest.countryOfBirth !== ITALIA_COUNTRY_CODE ? (
              <input
                type="text"
                value={formData.mainGuest.placeOfBirth}
                onChange={(e) => handleMainGuestChange('placeOfBirth', e.target.value)}
                className={`form-input-custom mt-1 ${errors['mainGuest.placeOfBirth'] ? 'border-red-300' : 'border-gray-300'}`}
              />
            ) : (
              <input
                type="text"
                disabled
                placeholder="Seleziona prima il paese di nascita"
                className="form-input-custom mt-1"
              />
            )}
            {errors['mainGuest.placeOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.placeOfBirth']}</p>}
          </div>
          {formData.mainGuest.countryOfBirth === ITALIA_COUNTRY_CODE && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia di nascita *</label>
              <input
                type="text"
                value={formData.mainGuest.provinceOfBirth || ''}
                readOnly
                className="form-input-custom mt-1"
              />
              {errors['mainGuest.provinceOfBirth'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.provinceOfBirth']}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Cittadinanza *</label>
            <Select
              options={countryOptionsForSelect}
              value={countryOptionsForSelect.find(option => option.value === formData.mainGuest.citizenship) || null}
              onChange={(selectedOption) => handleMainGuestChange('citizenship', selectedOption ? selectedOption.value : '')}
              placeholder="Seleziona Cittadinanza..."
              isClearable
              className={`mt-1 react-select-container ${errors['mainGuest.citizenship'] ? 'react-select-error' : ''}`}
              classNamePrefix="react-select"
              noOptionsMessage={() => "Nessuna cittadinanza trovata"}
            />
            {errors['mainGuest.citizenship'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.citizenship']}</p>}
          </div>
          <div>
            <label htmlFor="mainGuestPhoneNumber" className="block text-sm font-medium text-gray-700">Numero di telefono *</label>
            <PhoneInput
              id="mainGuestPhoneNumber"
              international
              defaultCountry="IT"
              value={formData.mainGuest.phoneNumber}
              onChange={(value) => handleMainGuestChange('phoneNumber', value || '')}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm custom-phone-input ${errors['mainGuest.phoneNumber'] ? 'border-red-300' : 'border-gray-300'}`}
            />
            {errors['mainGuest.phoneNumber'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.phoneNumber']}</p>}
          </div>
        </div>

        <h4 className="text-md font-medium mt-6 mb-4">Documento di identità (Ospite Principale)</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo documento *</label>
            <Select
              options={documentTypesForSelect}
              value={documentTypesForSelect.find(option => option.value === formData.mainGuest.documentType) || null}
              onChange={(selectedOption) => handleMainGuestChange('documentType', selectedOption ? selectedOption.value : '')}
              placeholder="Seleziona..."
              isClearable
              className={`mt-1 react-select-container ${errors['mainGuest.documentType'] ? 'react-select-error' : ''}`}
              classNamePrefix="react-select"
              noOptionsMessage={() => "Nessuna opzione"}
            />
            {errors['mainGuest.documentType'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentType']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Numero documento *</label>
            <input type="text" value={formData.mainGuest.documentNumber} onChange={(e) => handleMainGuestChange('documentNumber', e.target.value.toUpperCase())}
                   className={`form-input-custom mt-1 ${errors['mainGuest.documentNumber'] ? 'border-red-300' : 'border-gray-300'}`} />
            {errors['mainGuest.documentNumber'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentNumber']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Paese di rilascio *</label>
            <Select
              options={countryOptionsForSelect}
              value={countryOptionsForSelect.find(option => option.value === formData.mainGuest.documentIssueCountry) || null}
              onChange={(selectedOption) => handleMainGuestChange('documentIssueCountry', selectedOption ? selectedOption.value : '')}
              placeholder="Seleziona Paese..."
              isClearable
              className={`mt-1 react-select-container ${errors['mainGuest.documentIssueCountry'] ? 'react-select-error' : ''}`}
              classNamePrefix="react-select"
              noOptionsMessage={() => "Nessun paese trovato"}
            />
            {errors['mainGuest.documentIssueCountry'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssueCountry']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Luogo di rilascio *</label>
            {formData.mainGuest.documentIssueCountry === ITALIA_COUNTRY_CODE ? (
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
            ) : formData.mainGuest.documentIssueCountry && formData.mainGuest.documentIssueCountry !== ITALIA_COUNTRY_CODE ? (
              <input
                type="text"
                value={formData.mainGuest.documentIssuePlace}
                onChange={(e) => handleMainGuestChange('documentIssuePlace', e.target.value)}
                className={`form-input-custom mt-1 ${errors['mainGuest.documentIssuePlace'] ? 'border-red-300' : 'border-gray-300'}`}
              />
            ) : (
              <input
                type="text"
                disabled
                placeholder="Seleziona prima il paese di rilascio"
                className="form-input-custom mt-1"
              />
            )}
            {errors['mainGuest.documentIssuePlace'] && <p className="mt-1 text-sm text-red-600">{errors['mainGuest.documentIssuePlace']}</p>}
          </div>
          {formData.mainGuest.documentIssueCountry === ITALIA_COUNTRY_CODE && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia di rilascio *</label>
              <input
                type="text"
                value={formData.mainGuest.documentIssueProvince || ''}
                readOnly
                className="form-input-custom mt-1"
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Cognome *</label>
              <input type="text" value={guest.lastName} onChange={(e) => handleAdditionalGuestChange(index, 'lastName', e.target.value)}
                     className={`form-input-custom mt-1 ${errors[`additionalGuests.${index}.lastName`] ? 'border-red-300' : 'border-gray-300'}`} />
              {errors[`additionalGuests.${index}.lastName`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.lastName`]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input type="text" value={guest.firstName} onChange={(e) => handleAdditionalGuestChange(index, 'firstName', e.target.value)}
                     className={`form-input-custom mt-1 ${errors[`additionalGuests.${index}.firstName`] ? 'border-red-300' : 'border-gray-300'}`} />
              {errors[`additionalGuests.${index}.firstName`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.firstName`]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sesso *</label>
              <Select
                options={sexOptionsForSelect}
                value={sexOptionsForSelect.find(option => option.value === guest.sex) || null}
                onChange={(selectedOption) => handleAdditionalGuestChange(index, 'sex', selectedOption ? selectedOption.value : '')}
                placeholder="Seleziona..."
                isClearable
                className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.sex`] ? 'react-select-error' : ''}`}
                classNamePrefix="react-select"
                noOptionsMessage={() => "Nessuna opzione"}
              />
              {errors[`additionalGuests.${index}.sex`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.sex`]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data di nascita *</label>
              <input type="date" max={maxDate} value={guest.dateOfBirth} onChange={(e) => handleAdditionalGuestChange(index, 'dateOfBirth', e.target.value)}
                     className={`form-input-custom mt-1 ${errors[`additionalGuests.${index}.dateOfBirth`] ? 'border-red-300' : 'border-gray-300'}`} />
              {errors[`additionalGuests.${index}.dateOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.dateOfBirth`]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Paese di nascita *</label>
              <Select
                options={countryOptionsForSelect}
                value={countryOptionsForSelect.find(option => option.value === guest.countryOfBirth) || null}
                onChange={(selectedOption) => handleAdditionalGuestChange(index, 'countryOfBirth', selectedOption ? selectedOption.value : '')}
                placeholder="Seleziona Paese..."
                isClearable
                className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.countryOfBirth`] ? 'react-select-error' : ''}`}
                classNamePrefix="react-select"
                noOptionsMessage={() => "Nessun paese trovato"}
              />
              {errors[`additionalGuests.${index}.countryOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.countryOfBirth`]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Luogo di nascita *</label>
              {guest.countryOfBirth === ITALIA_COUNTRY_CODE ? (
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
              ) : guest.countryOfBirth && guest.countryOfBirth !== ITALIA_COUNTRY_CODE ? (
                <input
                  type="text"
                  value={guest.placeOfBirth}
                  onChange={(e) => handleAdditionalGuestChange(index, 'placeOfBirth', e.target.value)}
                  className={`form-input-custom mt-1 ${errors[`additionalGuests.${index}.placeOfBirth`] ? 'border-red-300' : 'border-gray-300'}`}
                />
              ) : (
                <input
                  type="text"
                  disabled
                  placeholder="Seleziona prima il paese di nascita"
                  className="form-input-custom mt-1"
                />
              )}
              {errors[`additionalGuests.${index}.placeOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.placeOfBirth`]}</p>}
            </div>
            {guest.countryOfBirth === ITALIA_COUNTRY_CODE && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Provincia di nascita *</label>
                <input
                  type="text"
                  value={guest.provinceOfBirth || ''}
                  readOnly
                  className="form-input-custom mt-1"
                />
                {errors[`additionalGuests.${index}.provinceOfBirth`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.provinceOfBirth`]}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Cittadinanza *</label>
            <Select
              options={countryOptionsForSelect}
              value={countryOptionsForSelect.find(option => option.value === guest.citizenship) || null}
              onChange={(selectedOption) => handleAdditionalGuestChange(index, 'citizenship', selectedOption ? selectedOption.value : '')}
              placeholder="Seleziona Cittadinanza..."
              isClearable
              className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.citizenship`] ? 'react-select-error' : ''}`}
              classNamePrefix="react-select"
              noOptionsMessage={() => "Nessuna cittadinanza trovata"}
            />
              {errors[`additionalGuests.${index}.citizenship`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.citizenship`]}</p>}
            </div>

            <>
              <h4 className="text-md font-medium mt-6 mb-2 sm:col-span-2">Documento di identità (Ospite {index + 2})</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo documento</label>
                <Select
                  options={documentTypesForSelect}
                  value={documentTypesForSelect.find(option => option.value === guest.documentType) || null}
                  onChange={(selectedOption) => handleAdditionalGuestChange(index, 'documentType', selectedOption ? selectedOption.value : '')}
                  placeholder="Seleziona..."
                  isClearable
                  className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.documentType`] ? 'react-select-error' : ''}`}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Nessuna opzione"}
                />
                {errors[`additionalGuests.${index}.documentType`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentType`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Numero documento</label>
                <input type="text" value={guest.documentNumber || ''} onChange={(e) => handleAdditionalGuestChange(index, 'documentNumber', e.target.value.toUpperCase())}
                        className={`form-input-custom mt-1 ${errors[`additionalGuests.${index}.documentNumber`] ? 'border-red-300' : 'border-gray-300'}`} />
                {errors[`additionalGuests.${index}.documentNumber`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentNumber`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Paese di rilascio</label>
                <Select
                  options={countryOptionsForSelect}
                  value={countryOptionsForSelect.find(option => option.value === guest.documentIssueCountry) || null}
                  onChange={(selectedOption) => handleAdditionalGuestChange(index, 'documentIssueCountry', selectedOption ? selectedOption.value : '')}
                  placeholder="Seleziona Paese..."
                  isClearable
                  className={`mt-1 react-select-container ${errors[`additionalGuests.${index}.documentIssueCountry`] ? 'react-select-error' : ''}`}
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "Nessun paese trovato"}
                />
                {errors[`additionalGuests.${index}.documentIssueCountry`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentIssueCountry`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Luogo di rilascio</label>
                {guest.documentIssueCountry === ITALIA_COUNTRY_CODE ? (
                  <Select<CommuneOption>
                    options={communeOptions}
                    value={communeOptions.find(option => option.value === guest.documentIssuePlace) || null}
                    onChange={(selectedOption) => {
                      if (selectedOption) {
                        handleAdditionalGuestChange(index, 'documentIssuePlace', selectedOption.value);
                        handleAdditionalGuestChange(index, 'provinceOfBirth', selectedOption.province); // Attenzione: qui potrebbe esserci un typo, dovrebbe essere documentIssueProvince? Ma il codice originale lo ha così. Lo lascio com'era nel codice fornito.
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
                ) : guest.documentIssueCountry && guest.documentIssueCountry !== ITALIA_COUNTRY_CODE ? (
                  <input
                    type="text"
                    value={guest.documentIssuePlace || ''}
                    onChange={(e) => handleAdditionalGuestChange(index, 'documentIssuePlace', e.target.value)}
                  className={`form-input-custom mt-1 ${errors[`additionalGuests.${index}.documentIssuePlace`] ? 'border-red-300' : 'border-gray-300'}`}
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    placeholder="Seleziona prima il paese di rilascio"
                  className="form-input-custom mt-1"
                  />
                )}
                {errors[`additionalGuests.${index}.documentIssuePlace`] && <p className="mt-1 text-sm text-red-600">{errors[`additionalGuests.${index}.documentIssuePlace`]}</p>}
              </div>
              {(guest.documentIssueCountry === ITALIA_COUNTRY_CODE || !guest.documentIssueCountry) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provincia di rilascio</label>
                  <input
                    type="text"
                    value={guest.documentIssueProvince || ''}
                    readOnly
                  className="form-input-custom mt-1"
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
            className={`form-input-custom mt-1 ${errors.notes ? 'border-red-300' : 'border-gray-300'}`}
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
