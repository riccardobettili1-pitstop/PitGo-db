-- Tabella SHOPS (Officine)
CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid, -- Questo si legherà al sistema di Login ufficiale di Supabase (Auth)
  email text NOT NULL,
  nome_officina text NOT NULL,
  partita_iva text,
  codice_qr_url text UNIQUE, -- Es. "pitgo.app/registrati?officina=abc123"
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella CUSTOMERS (Clienti)
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officina_id uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  nome_completo text NOT NULL,
  telefono text,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella VEHICLES (Veicoli)
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officina_id uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL, -- PUÒ ESSERE NULL (Veicolo Ospite)
  targa text NOT NULL,
  marca_modello text NOT NULL,
  anno integer,
  note_veicolo text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella APPOINTMENTS (Appuntamenti e Interventi)
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officina_id uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  data_inizio timestamp with time zone NOT NULL,
  descrizione_problema text,
  stato text DEFAULT 'In attesa', -- Es: In attesa, Lavorazione, Terminato
  totale_pagato numeric(10,2) DEFAULT 0.00,
  note_interne text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella JOB_DETAILS (Singole voci di costo/lavoro dentro un appuntamento)
CREATE TABLE job_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL, -- Es: 'Ricambio', 'Manodopera'
  descrizione text NOT NULL,
  costo numeric(10,2) NOT NULL DEFAULT 0.00,
  quantita integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- SICUREZZA (Row Level Security - RLS)
-- Queste regole garantiscono che ogni officina veda SOLO i propri dati
-- ==========================================

-- Abilitiamo RLS su tutte le tabelle
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_details ENABLE ROW LEVEL SECURITY;

-- Questa regola in seguito sarà raffinata affinché "auth.uid()" combaci con "auth_user_id".
-- Per ora, durante lo sviluppo, possiamo lasciare Policy aperte finché non implementiamo il Login.

-- Policy di SVILUPPO (Permette lettura e scrittura a tutti per poter prototipare velocemente offline)
CREATE POLICY "Enable read access for all users" ON shops FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON appointments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON job_details FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON shops FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON job_details FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON shops FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON vehicles FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON appointments FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON job_details FOR UPDATE USING (true);
