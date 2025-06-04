export interface CountryItalian {
  code: string;
  name: string;
}

// Elenco dei paesi con i loro nomi in italiano.
// Questo elenco deve essere completato con tutti i paesi necessari,
// assicurandosi che i 'code' corrispondano a quelli usati nel file src/data/countries.ts.
export const COUNTRIES_ITALIAN: CountryItalian[] = [
  // Esempio per l'Italia
  { code: '100000100', name: 'Italia' },

  // Esempi basati sui codici usati in countries.ts e nomi italiani comuni
  // L'utente dovrà verificare e completare questi codici e nomi
  // secondo il proprio file src/data/countries.ts.

  // Esempi generici (i codici sono placeholder e devono essere verificati)
  // { code: 'DE', name: 'Germania' }, // Esempio se si usano codici ISO
  // { code: 'FR', name: 'Francia' },  // Esempio se si usano codici ISO
  // { code: 'ES', name: 'Spagna' },   // Esempio se si usano codici ISO
  // { code: 'GB', name: 'Regno Unito' }, // Esempio se si usano codici ISO
  // { code: 'US', name: 'Stati Uniti d'America' }, // Esempio se si usano codici ISO

  // Esempi basati sui codici numerici forniti nel prompt del task
  // (Afghanistan, Albania, Algeria, Andorra)
  // Questi codici devono corrispondere esattamente a quelli in `src/data/countries.ts`
  { code: '100000301', name: 'Afghanistan' }, // Assumendo che 100000301 sia Afghanistan
  { code: '100000201', name: 'Albania' },     // Assumendo che 100000201 sia Albania
  { code: '100000401', name: 'Algeria' },     // Assumendo che 100000401 sia Algeria
  { code: '100000202', name: 'Andorra' },     // Assumendo che 100000202 sia Andorra
  { code: '100000501', name: 'Angola' },      // Aggiungo un altro esempio
  { code: '100000203', name: 'Antigua e Barbuda' }, // Aggiungo un altro esempio

  // Aggiungere qui altri paesi...
  // Esempio:
  // { code: 'CODICE_PAESE_DA_COUNTRIES_TS', name: 'Nome Italiano del Paese' },
];
