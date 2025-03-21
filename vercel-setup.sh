#!/bin/bash
# Questo script esegue operazioni di setup per Vercel

# Assicurarsi che i moduli siano disponibili
mkdir -p node_modules

# Verificare che le directory necessarie esistano
mkdir -p src/components
mkdir -p src/models
mkdir -p src/lib
mkdir -p .next/types

echo "Setup completato!"
