-- =========================================================
-- DATABASE: BARBER SHOP GESTIONALE (EX PITGO)
-- =========================================================

-- Pulizia Tabelle Precedenti (CANCELLA I VECCHI DATI DELL'OFFICINA)
DROP TABLE IF EXISTS appointment_services CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS job_details CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS salons CASCADE;

-- Tabella SALONS (Barberie / Saloni)
CREATE TABLE salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid, -- Legato all'utente Supabase (Titolare)
  email text NOT NULL,
  nome_salone text NOT NULL,
  partita_iva text,
  codice_qr_url text UNIQUE, -- Es. "pitgo.app/prenota/barbiere-mario"
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella BARBERS (Staff / Collaboratori)
CREATE TABLE barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salone_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  auth_user_id uuid, -- Permette al dipendente (staff) di avere un proprio Login
  nome text NOT NULL,
  attivo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella CUSTOMERS (Clienti e Anagrafica PWA)
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salone_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  nome_completo text NOT NULL,
  telefono text,
  email text UNIQUE,
  note_preferenze text, -- Es "Preferisce sfumatura molto alta"
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella SERVICES (Listino Taglio, Barba, ecc.)
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salone_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  prezzo numeric(10,2) NOT NULL DEFAULT 0.00,
  durata_minuti integer NOT NULL DEFAULT 30, -- Serve per calcolare gli slot del Calendario
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella PRODUCTS (Prodotti vendibili in cassa)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salone_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  prezzo numeric(10,2) NOT NULL DEFAULT 0.00,
  quantita_stock integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella APPOINTMENTS (Il Calendario Appuntamenti)
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salone_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL, -- Quale membro dello staff
  data_ora_inizio timestamp with time zone NOT NULL,
  data_ora_fine timestamp with time zone NOT NULL,
  stato text DEFAULT 'Confermato', -- In attesa, Confermato, Completato, Cancellato
  totale_da_pagare numeric(10,2) DEFAULT 0.00,
  origine text DEFAULT 'PWA', -- 'PWA' o 'Salone'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella APPOINTMENT_SERVICES (I servizi associati a un appuntamento, es. Taglio + Barba)
CREATE TABLE appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  prezzo_bloccato numeric(10,2) NOT NULL, -- Prezzo congelato al momento della prenotazione
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella TRANSACTIONS (Cassa, Spese, Entrate)
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salone_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  tipo text NOT NULL, -- 'ENTRATA', 'USCITA'
  categoria text NOT NULL, -- Es: 'Prestazione', 'Vendita Prodotti', 'Affitto', 'Merce Fornitore'
  importo numeric(10,2) NOT NULL,
  descrizione text,
  data_transazione timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- POLICY DI SVILUPPO (DA RESTRINGERE IN PRODUZIONE)
-- ==========================================
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable dev access for all" ON salons USING (true);
CREATE POLICY "Enable dev access for all" ON barbers USING (true);
CREATE POLICY "Enable dev access for all" ON customers USING (true);
CREATE POLICY "Enable dev access for all" ON services USING (true);
CREATE POLICY "Enable dev access for all" ON products USING (true);
CREATE POLICY "Enable dev access for all" ON appointments USING (true);
CREATE POLICY "Enable dev access for all" ON appointment_services USING (true);
CREATE POLICY "Enable dev access for all" ON transactions USING (true);
