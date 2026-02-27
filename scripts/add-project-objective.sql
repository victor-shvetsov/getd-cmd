-- Add project_objective column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_objective text DEFAULT '';
