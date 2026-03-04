-- Drop all tables (order: dependents first)
DROP TABLE IF EXISTS predefined_messages;
DROP TABLE IF EXISTS contract_templates;
DROP TABLE IF EXISTS default_templates;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS users;

-- Users (JWT auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_type VARCHAR(100) NOT NULL,
  couple_name VARCHAR(255) NOT NULL DEFAULT '',
  client_phone VARCHAR(30),
  event_date DATE NOT NULL,
  location VARCHAR(500) NOT NULL DEFAULT '',
  start_time TIME NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  advance_payment DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_schedule JSONB NOT NULL DEFAULT '[]',
  cancellation_term_ids TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);

-- Default templates (shared; hardcoded seed content for all users)
CREATE TABLE default_templates (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  template_description TEXT NOT NULL DEFAULT '',
  vendor_type VARCHAR(100) NOT NULL,
  section_contents JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User templates (saved copies: name + content only)
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_description TEXT NOT NULL DEFAULT '',
  vendor_type VARCHAR(100),
  section_contents JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_contract_templates_user_id ON contract_templates(user_id);
CREATE INDEX idx_contract_templates_created_at ON contract_templates(created_at DESC);

-- הודעות מובנות לוואטסאפ (לכל משתמש)
CREATE TABLE predefined_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_predefined_messages_user_id ON predefined_messages(user_id);
CREATE INDEX idx_predefined_messages_created_at ON predefined_messages(created_at DESC);
