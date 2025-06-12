import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceCounterModel from '@/models/InvoiceCounter';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import InvoiceModel from '@/models/Invoice';

// GET: Ottieni tutti i contatori
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const url = new URL(req.url);
    const settingsGroupId = url.searchParams.get('settingsGroupId');
    const year = url.searchParams.get('year');
    
    // Costruisci la query
    const query: any = {};
    if (settingsGroupId) {
      query.settingsGroupId = settingsGroupId;
    }
    if (year) {
      query.year = parseInt(year);
    }
    
    // Ottieni i contatori
    const counters = await InvoiceCounterModel
      .find(query)
      .sort({ year: -1, settingsGroupId: 1 })
      .lean();
    
    // Arricchisci con informazioni sul gruppo
    const enrichedCounters = await Promise.all(
      counters.map(async (counter) => {
        const settings = await InvoiceSettingsModel.findOne({
          groupId: counter.settingsGroupId
        });
        
        // Calcola statistiche per il contatore
        // Dato che usiamo .lean(), counter.getStatistics non sarà disponibile.
        // Applichiamo direttamente la logica di fallback.
        const statistics = {
            totalIssued: counter.lastNumber,
            year: counter.year,
            settingsGroupId: counter.settingsGroupId,
            firstIssuedAt: counter.usedNumbers?.[0]?.generatedAt || null,
            lastIssuedAt: counter.usedNumbers?.[counter.usedNumbers.length - 1]?.generatedAt || null,
          };
        
        return {
          ...counter,
          groupName: settings?.name || 'Gruppo non trovato',
          statistics,
        };
      })
    );
    
    return NextResponse.json(enrichedCounters);
  } catch (error) {
    console.error('Error fetching counters:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Verifica integrità contatori
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await req.json();
    
    if (action !== 'verify-integrity') {
      return NextResponse.json(
        { error: 'Azione non valida' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Ottieni tutti i gruppi di impostazioni
    const allSettings = await InvoiceSettingsModel.find({});
    const issues = [];
    const fixedIssues = [];
    
    for (const settings of allSettings) {
      const currentYear = new Date().getFullYear();
      
      // Verifica che esista un contatore per l'anno corrente
      let counter = await InvoiceCounterModel.findOne({
        settingsGroupId: settings.groupId,
        year: currentYear,
      });
      
      if (!counter) {
        // Crea il contatore mancante
        counter = await InvoiceCounterModel.create({
          settingsGroupId: settings.groupId,
          year: currentYear,
          lastNumber: 0,
          prefix: settings.numberingPrefix,
          usedNumbers: [],
        });
        
        fixedIssues.push({
          type: 'missing_counter',
          message: `Creato contatore mancante per ${settings.name} - Anno ${currentYear}`,
          groupId: settings.groupId,
        });
      }
      
      // Verifica la coerenza tra il contatore e le ricevute emesse
      const invoices = await InvoiceModel.find({
        settingsGroupId: settings.groupId,
        invoiceDate: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1),
        },
      }).sort({ invoiceNumber: 1 });
      
      // Estrai i numeri dalle ricevute
      const invoiceNumbers = invoices.map(inv => {
        const match = inv.invoiceNumber.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).filter(n => n > 0);
      
      if (invoiceNumbers.length > 0) {
        const maxInvoiceNumber = Math.max(...invoiceNumbers);
        
        // Verifica se il contatore è allineato
        if (counter.lastNumber < maxInvoiceNumber) {
          issues.push({
            type: 'counter_mismatch',
            message: `Contatore non allineato per ${settings.name} - Anno ${currentYear}. Contatore: ${counter.lastNumber}, Max ricevuta: ${maxInvoiceNumber}`,
            groupId: settings.groupId,
            counterValue: counter.lastNumber,
            actualMax: maxInvoiceNumber,
            canFix: true,
          });
        }
        
        // Verifica buchi nella numerazione
        const expectedNumbers = Array.from({ length: maxInvoiceNumber }, (_, i) => i + 1);
        const missingNumbers = expectedNumbers.filter(n => !invoiceNumbers.includes(n));
        
        if (missingNumbers.length > 0) {
          issues.push({
            type: 'missing_numbers',
            message: `Numeri mancanti nella sequenza per ${settings.name} - Anno ${currentYear}: ${missingNumbers.join(', ')}`,
            groupId: settings.groupId,
            missingNumbers,
          });
        }
      }
      
      // Verifica che le impostazioni siano allineate con il contatore
      if (settings.lastInvoiceYear === currentYear && settings.lastInvoiceNumber !== counter.lastNumber) {
        issues.push({
          type: 'settings_mismatch',
          message: `Impostazioni non allineate con il contatore per ${settings.name}`,
          groupId: settings.groupId,
          settingsValue: settings.lastInvoiceNumber,
          counterValue: counter.lastNumber,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        groupsChecked: allSettings.length,
        issuesFound: issues.length,
        issuesFixed: fixedIssues.length,
      },
      issues,
      fixedIssues,
    });
  } catch (error) {
    console.error('Error verifying counter integrity:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Correggi problemi nei contatori
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, settingsGroupId, year, newValue } = await req.json();
    
    if (action !== 'fix-counter') {
      return NextResponse.json(
        { error: 'Azione non valida' },
        { status: 400 }
      );
    }
    
    if (!settingsGroupId || !year) {
      return NextResponse.json(
        { error: 'settingsGroupId e year sono obbligatori' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Trova il contatore
    const counter = await InvoiceCounterModel.findOne({
      settingsGroupId,
      year: parseInt(year.toString()),
    });
    
    if (!counter) {
      return NextResponse.json(
        { error: 'Contatore non trovato' },
        { status: 404 }
      );
    }
    
    // Se è fornito un nuovo valore, aggiornalo
    if (newValue !== undefined && newValue >= 0) {
      // Verifica che non ci siano ricevute con numero superiore
      const existingInvoices = await InvoiceModel.find({
        settingsGroupId,
        invoiceDate: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(parseInt(year.toString()) + 1, 0, 1),
        },
      });
      
      const maxExistingNumber = Math.max(
        ...existingInvoices.map(inv => {
          const match = inv.invoiceNumber.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }),
        0
      );
      
      if (newValue < maxExistingNumber) {
        return NextResponse.json(
          { 
            error: `Il nuovo valore (${newValue}) non può essere inferiore al numero massimo esistente (${maxExistingNumber})` 
          },
          { status: 400 }
        );
      }
      
      counter.lastNumber = newValue;
    } else {
      // Auto-fix: allinea al massimo numero esistente
      const invoices = await InvoiceModel.find({
        settingsGroupId,
        invoiceDate: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(parseInt(year.toString()) + 1, 0, 1),
        },
      });
      
      if (invoices.length > 0) {
        const maxNumber = Math.max(
          ...invoices.map(inv => {
            const match = inv.invoiceNumber.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }),
          0
        );
        
        counter.lastNumber = maxNumber;
      }
    }
    
    await counter.save();
    
    // Aggiorna anche le impostazioni se necessario
    const settings = await InvoiceSettingsModel.findOne({ groupId: settingsGroupId });
    if (settings && settings.lastInvoiceYear === parseInt(year.toString())) {
      settings.lastInvoiceNumber = counter.lastNumber;
      await settings.save();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Contatore aggiornato con successo',
      counter: {
        settingsGroupId: counter.settingsGroupId,
        year: counter.year,
        lastNumber: counter.lastNumber,
      },
    });
  } catch (error) {
    console.error('Error fixing counter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Reset forzato contatore (solo admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const settingsGroupId = url.searchParams.get('settingsGroupId');
    const year = url.searchParams.get('year');
    const force = url.searchParams.get('force') === 'true';
    
    if (!settingsGroupId || !year) {
      return NextResponse.json(
        { error: 'settingsGroupId e year sono obbligatori' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Verifica che non ci siano ricevute per quell'anno
    const existingInvoices = await InvoiceModel.countDocuments({
      settingsGroupId,
      invoiceDate: {
        $gte: new Date(parseInt(year), 0, 1),
        $lt: new Date(parseInt(year) + 1, 0, 1),
      },
    });
    
    if (existingInvoices > 0 && !force) {
      return NextResponse.json(
        { 
          error: `Esistono ${existingInvoices} ricevute per l'anno ${year}. Usa force=true per eliminare comunque il contatore.`,
          invoiceCount: existingInvoices,
        },
        { status: 400 }
      );
    }
    
    // Elimina il contatore
    const result = await InvoiceCounterModel.deleteOne({
      settingsGroupId,
      year: parseInt(year),
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Contatore non trovato' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Contatore per l'anno ${year} eliminato con successo`,
      warning: existingInvoices > 0 ? `ATTENZIONE: Esistevano ${existingInvoices} ricevute associate` : undefined,
    });
  } catch (error) {
    console.error('Error deleting counter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
