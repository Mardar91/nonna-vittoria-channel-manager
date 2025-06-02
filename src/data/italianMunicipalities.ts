export interface ItalianMunicipality {
  code: string;
  name: string; // 'Descrizione' nell'issue
  province: string; // 'Provincia' nell'issue
}

export const ITALIAN_MUNICIPALITIES: ItalianMunicipality[] = [
  { code: '405028001', name: 'ABANO TERME', province: 'PD' },
  { code: '401001501', name: 'ABBADIA ALPINA', province: 'TO' },
  { code: '403098001', name: 'ABBADIA CERRETO', province: 'LO' },
  // Esempio: Mola di Bari (codice fittizio per ora, verrà corretto con dati reali)
  { code: 'BA0000001', name: 'MOLA DI BARI', province: 'BA' },
  // Esempio: Roma (codice fittizio per ora, verrà corretto con dati reali)
  { code: 'RM0000001', name: 'ROMA', province: 'RM' },
  // Esempio: Milano (codice fittizio per ora, verrà corretto con dati reali)
  { code: 'MI0000001', name: 'MILANO', province: 'MI' },
  // L'elenco completo è molto lungo e verrà inserito nel file effettivo.
];
