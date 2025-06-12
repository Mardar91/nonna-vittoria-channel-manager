import mongoose, { Schema } from 'mongoose';

export interface IInvoiceCounter {
  _id?: string;
  settingsGroupId: string; // ID del gruppo di impostazioni
  year: number; // Anno di riferimento
  lastNumber: number; // Ultimo numero utilizzato
  prefix?: string; // Prefisso opzionale
  
  // Log delle numerazioni utilizzate (per debugging e controllo)
  usedNumbers: {
    number: number;
    invoiceId: string;
    generatedAt: Date;
  }[];
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvoiceCounterModel extends mongoose.Model<IInvoiceCounter> {
  getNextNumber(
    settingsGroupId: string,
    year: number,
    invoiceId: string,
    prefix?: string
  ): Promise<{ number: number; formatted: string }>;

  isNumberUsed(
    settingsGroupId: string,
    year: number,
    number: number
  ): Promise<boolean>;

  resetCounter(
    settingsGroupId: string,
    year: number
  ): Promise<boolean>;
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>(
  {
    settingsGroupId: { type: String, required: true },
    year: { type: Number, required: true },
    lastNumber: { type: Number, default: 0 },
    prefix: { type: String },
    
    usedNumbers: [{
      number: { type: Number, required: true },
      invoiceId: { type: String, required: true },
      generatedAt: { type: Date, required: true, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Indice composto unico per garantire un solo contatore per gruppo/anno
InvoiceCounterSchema.index({ settingsGroupId: 1, year: 1 }, { unique: true });

// Metodo statico per ottenere il prossimo numero atomicamente
InvoiceCounterSchema.statics.getNextNumber = async function(
  settingsGroupId: string,
  year: number,
  invoiceId: string,
  prefix?: string
): Promise<{ number: number; formatted: string }> {
  // Usa findOneAndUpdate con upsert per creare o aggiornare atomicamente
  const counter = await this.findOneAndUpdate(
    {
      settingsGroupId,
      year
    },
    {
      $inc: { lastNumber: 1 },
      $push: {
        usedNumbers: {
          $each: [{
            number: -1, // Sarà sostituito dopo
            invoiceId,
            generatedAt: new Date()
          }],
          $slice: -1000 // Mantieni solo gli ultimi 1000 per evitare crescita eccessiva
        }
      },
      $setOnInsert: {
        prefix
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );

  // Aggiorna l'ultimo elemento dell'array con il numero corretto
  const lastIndex = counter.usedNumbers.length - 1;
  if (lastIndex >= 0) {
    counter.usedNumbers[lastIndex].number = counter.lastNumber;
    await counter.save();
  }

  return {
    number: counter.lastNumber,
    formatted: counter.lastNumber.toString().padStart(3, '0')
  };
};

// Metodo per verificare se un numero è già stato usato
InvoiceCounterSchema.statics.isNumberUsed = async function(
  settingsGroupId: string,
  year: number,
  number: number
): Promise<boolean> {
  const counter = await this.findOne({ settingsGroupId, year });
  if (!counter) return false;
  
  return counter.usedNumbers.some(used => used.number === number);
};

// Metodo per ottenere statistiche sulla numerazione
InvoiceCounterSchema.methods.getStatistics = function() {
  return {
    totalIssued: this.lastNumber,
    year: this.year,
    settingsGroupId: this.settingsGroupId,
    firstIssuedAt: this.usedNumbers.length > 0 ? this.usedNumbers[0].generatedAt : null,
    lastIssuedAt: this.usedNumbers.length > 0 ? this.usedNumbers[this.usedNumbers.length - 1].generatedAt : null
  };
};

// Metodo per resettare il contatore (da usare con cautela!)
InvoiceCounterSchema.statics.resetCounter = async function(
  settingsGroupId: string,
  year: number
): Promise<boolean> {
  const result = await this.deleteOne({ settingsGroupId, year });
  return result.deletedCount > 0;
};

export default mongoose.models.InvoiceCounter as IInvoiceCounterModel ||
           mongoose.model<IInvoiceCounter, IInvoiceCounterModel>('InvoiceCounter', InvoiceCounterSchema);
