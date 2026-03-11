-- ═══════════════════════════════════════════
-- SYNERIA — Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══ PROFILES ═══
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'worker' CHECK (role IN ('worker', 'employer')),
  avatar_url TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  education TEXT,
  certifications TEXT[] DEFAULT '{}',
  availability TEXT DEFAULT 'immediate',
  desired_salary NUMERIC,
  passport_verified BOOLEAN DEFAULT FALSE,
  profile_complete BOOLEAN DEFAULT FALSE,
  rating NUMERIC DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ COMPANIES ═══
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_letter TEXT DEFAULT 'C',
  logo_gradient TEXT DEFAULT 'linear-gradient(135deg,#1e2d5f,#3b9ece)',
  description TEXT,
  sector TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  employees_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ JOBS ═══
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  sector TEXT,
  country TEXT,
  city TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT DEFAULT 'USD',
  salary_display TEXT,
  job_type TEXT DEFAULT 'full_time' CHECK (job_type IN ('full_time', 'part_time', 'contract', 'seasonal')),
  visa_sponsorship BOOLEAN DEFAULT FALSE,
  housing_included BOOLEAN DEFAULT FALSE,
  urgent BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'draft')),
  start_date DATE,
  duration TEXT,
  experience_required TEXT,
  languages_required TEXT[] DEFAULT '{}',
  applicants_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ APPLICATIONS ═══
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  motivation TEXT,
  availability DATE,
  cv_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'interview', 'accepted', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- ═══ WALLETS ═══
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  card_last_four TEXT DEFAULT '4829',
  card_expiry TEXT DEFAULT '12/28',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ TRANSACTIONS ═══
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'remittance', 'swap', 'bonus', 'withdrawal', 'deposit')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  recipient_name TEXT,
  recipient_country TEXT,
  local_amount NUMERIC,
  local_currency TEXT,
  fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ CONTRACTS ═══
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  employer_name TEXT,
  position TEXT,
  country TEXT,
  city TEXT,
  salary NUMERIC,
  salary_display TEXT,
  start_date DATE,
  end_date DATE,
  terms TEXT,
  benefits TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'activo', 'completado', 'expirado', 'cancelado')),
  blockchain_hash TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ NOTIFICATIONS ═══
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'job', 'application', 'payment', 'contract')),
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ MESSAGES ═══
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ SAVED JOBS (bookmarks) ═══
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update their own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies: everyone can read, owners can manage
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON companies;
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can manage companies" ON companies;
CREATE POLICY "Owners can manage companies" ON companies FOR ALL USING (auth.uid() = owner_id);

-- Jobs: everyone can read active jobs, employers can manage their own
DROP POLICY IF EXISTS "Active jobs are viewable by everyone" ON jobs;
CREATE POLICY "Active jobs are viewable by everyone" ON jobs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Employers can manage own jobs" ON jobs;
CREATE POLICY "Employers can manage own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = employer_id);
DROP POLICY IF EXISTS "Employers can update own jobs" ON jobs;
CREATE POLICY "Employers can update own jobs" ON jobs FOR UPDATE USING (auth.uid() = employer_id);
DROP POLICY IF EXISTS "Employers can delete own jobs" ON jobs;
CREATE POLICY "Employers can delete own jobs" ON jobs FOR DELETE USING (auth.uid() = employer_id);

-- Applications: users see their own, employers see for their jobs
DROP POLICY IF EXISTS "Users see own applications" ON applications;
CREATE POLICY "Users see own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Employers see job applications" ON applications;
CREATE POLICY "Employers see job applications" ON applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can create applications" ON applications;
CREATE POLICY "Users can create applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Employers can update application status" ON applications;
CREATE POLICY "Employers can update application status" ON applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid())
);

-- Wallets: users see and manage their own
DROP POLICY IF EXISTS "Users see own wallet" ON wallets;
CREATE POLICY "Users see own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own wallet" ON wallets;
CREATE POLICY "Users can manage own wallet" ON wallets FOR ALL USING (auth.uid() = user_id);

-- Transactions: users see their own
DROP POLICY IF EXISTS "Users see own transactions" ON transactions;
CREATE POLICY "Users see own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
CREATE POLICY "Users can create transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contracts: workers see their own
DROP POLICY IF EXISTS "Workers see own contracts" ON contracts;
CREATE POLICY "Workers see own contracts" ON contracts FOR SELECT USING (auth.uid() = worker_id);
DROP POLICY IF EXISTS "Contracts can be created" ON contracts;
CREATE POLICY "Contracts can be created" ON contracts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Workers can update own contracts" ON contracts;
CREATE POLICY "Workers can update own contracts" ON contracts FOR UPDATE USING (auth.uid() = worker_id);

-- Notifications: users see their own
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Notifications can be created" ON notifications;
CREATE POLICY "Notifications can be created" ON notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Messages: users see messages they sent or received
DROP POLICY IF EXISTS "Users see own messages" ON messages;
CREATE POLICY "Users see own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can update received messages" ON messages;
CREATE POLICY "Users can update received messages" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Saved jobs: users manage their own
DROP POLICY IF EXISTS "Users see own saved jobs" ON saved_jobs;
CREATE POLICY "Users see own saved jobs" ON saved_jobs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can save jobs" ON saved_jobs;
CREATE POLICY "Users can save jobs" ON saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unsave jobs" ON saved_jobs;
CREATE POLICY "Users can unsave jobs" ON saved_jobs FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 50.00);

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.id, 'Bienvenido a Syneria', 'Tu cuenta ha sido creada exitosamente. Completa tu perfil para empezar.', 'success');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════
-- SEED DATA: Sample jobs, companies, etc.
-- ═══════════════════════════════════════════

-- Sample companies
INSERT INTO companies (id, name, logo_letter, logo_gradient, description, sector, country, city, employees_count, rating, verified)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Constructora Alpine S.A.', 'C', 'linear-gradient(135deg,#1e2d5f,#3b9ece)', 'Empresa lider en construccion residencial y comercial en Suiza, con mas de 25 anos de experiencia en proyectos de alta calidad.', 'Construccion', 'Suiza', 'Zurich', 340, 4.7, true),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Hochtief AG', 'H', 'linear-gradient(135deg,#2dd4a8,#3b9ece)', 'Grupo global de construccion e infraestructura con sede en Alemania.', 'Construccion', 'Alemania', 'Munich', 520, 4.5, true),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Vinci SA', 'V', 'linear-gradient(135deg,#7c3aed,#ec4899)', 'Multinacional francesa lider en concesiones, energia y construccion.', 'Construccion', 'Francia', 'Lyon', 890, 4.6, true),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Hotel Mediterraneo', 'M', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'Cadena hotelera premium en la costa mediterranea espanola.', 'Hosteleria', 'Espana', 'Barcelona', 180, 4.3, true),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Finca Stuttgart', 'F', 'linear-gradient(135deg,#10b981,#059669)', 'Explotacion agricola de temporada en el sur de Alemania.', 'Agricultura', 'Alemania', 'Stuttgart', 90, 4.4, true),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'TechBau GmbH', 'T', 'linear-gradient(135deg,#3b82f6,#8b5cf6)', 'Empresa de tecnologia y automatizacion para la construccion.', 'Tecnologia', 'Alemania', 'Berlin', 250, 4.8, true),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'Nordic Fish Co.', 'N', 'linear-gradient(135deg,#06b6d4,#2dd4a8)', 'Empresa de acuicultura y procesamiento de pescado en Noruega.', 'Pesca', 'Noruega', 'Bergen', 150, 4.2, true),
  ('b8c9d0e1-f2a3-4567-bcde-678901234567', 'Skanska AB', 'S', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'Compania multinacional sueca de construccion e infraestructura.', 'Construccion', 'Suecia', 'Estocolmo', 700, 4.5, true)
ON CONFLICT (id) DO NOTHING;

-- Sample jobs
INSERT INTO jobs (id, company_id, title, description, sector, country, city, salary_min, salary_max, salary_display, job_type, visa_sponsorship, housing_included, urgent, status, start_date, duration, experience_required, tags, responsibilities, requirements, benefits)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Ayudante de Construccion Senior',
   'Estamos buscando un Ayudante de Construccion Senior experimentado para unirse a nuestro equipo en Zurich, Suiza. Constructora Alpine S.A. es una empresa lider en el sector de la construccion.',
   'Construccion', 'Suiza', 'Zurich', 3200, 3200, '$3,200/mes + beneficios', 'full_time',
   true, true, true, 'active', '2026-04-01', '12 meses (renovable)', '3+ anos',
   ARRAY['Jornada Completa', 'Urgente', 'Visa Sponsorship', 'Alojamiento Incluido'],
   ARRAY['Asistir en la ejecucion de obras de construccion residencial y comercial', 'Preparar y mantener el area de trabajo, incluyendo montaje de andamios', 'Operar herramientas manuales y electricas de construccion', 'Colaborar con el equipo de supervision', 'Cumplir con normativas de seguridad laborales suizas', 'Participar en capacitaciones continuas'],
   ARRAY['Minimo 3 anos de experiencia en construccion civil', 'Certificaciones vigentes en seguridad laboral', 'Capacidad fisica para trabajos de alta demanda', 'Nivel basico de aleman o ingles', 'Pasaporte vigente y disponibilidad inmediata', 'Disposicion para trabajo en equipo multicultural'],
   ARRAY['Visa Sponsorship completo', 'Alojamiento amueblado', 'Seguro medico completo suizo', 'Vuelo de ida cubierto', 'Capacitacion y certificaciones', 'Salario competitivo + bonificaciones']
  ),
  ('22222222-2222-2222-2222-222222222222', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Operador de Maquinaria Pesada',
   'Buscamos operador experimentado de maquinaria pesada para proyectos de infraestructura en Munich.',
   'Construccion', 'Alemania', 'Munich', 3500, 4000, '$3,500-4,000/mes', 'full_time',
   true, true, false, 'active', '2026-05-01', '18 meses', '5+ anos',
   ARRAY['Jornada Completa', 'Visa Sponsorship', 'Alojamiento Incluido'],
   ARRAY['Operar excavadoras, gruas y retroexcavadoras', 'Mantenimiento preventivo de maquinaria', 'Coordinacion con equipo de ingenieria'],
   ARRAY['5+ anos operando maquinaria pesada', 'Licencia de operador vigente', 'Experiencia con equipos CAT o Komatsu'],
   ARRAY['Seguro medico', 'Alojamiento', 'Transporte', 'Formacion continua']
  ),
  ('33333333-3333-3333-3333-333333333333', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
   'Electricista Industrial',
   'Posicion para electricista industrial certificado en proyectos de energia renovable en Lyon, Francia.',
   'Construccion', 'Francia', 'Lyon', 2800, 3200, '$2,800-3,200/mes', 'full_time',
   true, false, false, 'active', '2026-04-15', '12 meses', '4+ anos',
   ARRAY['Jornada Completa', 'Visa Sponsorship'],
   ARRAY['Instalacion de sistemas electricos industriales', 'Diagnostico y reparacion de fallos', 'Lectura de planos electricos'],
   ARRAY['Certificacion de electricista industrial', '4+ anos de experiencia', 'Conocimiento en energias renovables'],
   ARRAY['Seguro medico', 'Bono trimestral', 'Formacion en energias renovables']
  ),
  ('44444444-4444-4444-4444-444444444444', 'd4e5f6a7-b8c9-0123-defa-234567890123',
   'Recepcionista de Hotel',
   'Hotel Mediterraneo busca recepcionista bilingue para su sede en Barcelona.',
   'Hosteleria', 'Espana', 'Barcelona', 2000, 2400, '$2,000-2,400/mes', 'seasonal',
   true, false, false, 'active', '2026-06-01', '6 meses', '2+ anos',
   ARRAY['Temporal', 'Visa Sponsorship'],
   ARRAY['Atencion al cliente en recepcion', 'Gestion de reservas', 'Atencion telefonica y por email'],
   ARRAY['Espanol e ingles fluido', '2+ anos en hosteleria', 'Conocimiento de sistemas hoteleros'],
   ARRAY['Comidas durante turno', 'Descuento en alojamiento', 'Curso de idiomas']
  ),
  ('55555555-5555-5555-5555-555555555555', 'e5f6a7b8-c9d0-1234-efab-345678901234',
   'Recolector Agricola',
   'Trabajo de temporada para recoleccion agricola en Finca Stuttgart, Alemania.',
   'Agricultura', 'Alemania', 'Stuttgart', 2800, 2800, '$2,800/mes', 'seasonal',
   true, true, false, 'active', '2026-04-01', '7 meses', '1+ ano',
   ARRAY['Temporal', 'Alojamiento Incluido', 'Visa Sponsorship'],
   ARRAY['Recoleccion de frutas y verduras de temporada', 'Clasificacion y empaquetado', 'Mantenimiento de areas de cultivo'],
   ARRAY['Experiencia en trabajo agricola', 'Capacidad fisica', 'Disponibilidad para horarios variables'],
   ARRAY['Alojamiento incluido', '3 comidas diarias', 'Seguro de salud', 'Transporte aeropuerto', 'Bono de productividad']
  ),
  ('66666666-6666-6666-6666-666666666666', 'f6a7b8c9-d0e1-2345-fabc-456789012345',
   'Tecnico en Automatizacion',
   'TechBau GmbH busca tecnico en automatizacion para proyectos de construccion inteligente.',
   'Tecnologia', 'Alemania', 'Berlin', 3800, 4500, '$3,800-4,500/mes', 'full_time',
   true, false, false, 'active', '2026-05-01', '24 meses', '3+ anos',
   ARRAY['Jornada Completa', 'Visa Sponsorship'],
   ARRAY['Programacion de PLCs y sistemas SCADA', 'Instalacion de sensores IoT', 'Optimizacion de procesos automatizados'],
   ARRAY['Titulo en ingenieria electronica o similar', 'Experiencia con Siemens/Allen-Bradley', 'Ingles avanzado'],
   ARRAY['Seguro medico premium', 'Stock options', 'Formacion continua', 'Home office parcial']
  ),
  ('77777777-7777-7777-7777-777777777777', 'a7b8c9d0-e1f2-3456-abcd-567890123456',
   'Procesador de Pescado',
   'Nordic Fish Co. necesita procesadores de pescado para su planta en Bergen, Noruega.',
   'Pesca', 'Noruega', 'Bergen', 3000, 3000, '$3,000/mes', 'seasonal',
   true, true, true, 'active', '2026-03-15', '8 meses', '1+ ano',
   ARRAY['Temporal', 'Urgente', 'Alojamiento Incluido'],
   ARRAY['Procesamiento y fileteo de pescado', 'Control de calidad', 'Mantenimiento de higiene en planta'],
   ARRAY['Experiencia en procesamiento de alimentos', 'Capacidad para trabajo en frio', 'Disponibilidad inmediata'],
   ARRAY['Alojamiento incluido', 'Uniformes proporcionados', 'Transporte', 'Bono mensual']
  ),
  ('88888888-8888-8888-8888-888888888888', 'b8c9d0e1-f2a3-4567-bcde-678901234567',
   'Soldador Certificado',
   'Skanska AB busca soldadores certificados para proyectos de infraestructura en Estocolmo.',
   'Construccion', 'Suecia', 'Estocolmo', 3600, 4000, '$3,600-4,000/mes', 'full_time',
   true, true, false, 'active', '2026-05-15', '12 meses', '4+ anos',
   ARRAY['Jornada Completa', 'Visa Sponsorship', 'Alojamiento Incluido'],
   ARRAY['Soldadura MIG/TIG/electrodo', 'Lectura de planos de soldadura', 'Inspeccion de calidad de soldaduras'],
   ARRAY['Certificacion AWS o equivalente', '4+ anos de experiencia', 'Experiencia en estructuras metalicas'],
   ARRAY['Seguro medico completo', 'Alojamiento', 'Equipamiento profesional', 'Vuelo de ida']
  )
ON CONFLICT (id) DO NOTHING;
