-- =============================================================================
-- Migration 001: Schema Contract Reconciliation & Constraint Hardening
-- File: backend/migrations/001_reconcile_schema.sql
-- Date: 2026-10-29
-- =============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Enhance jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Remote';
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);

-- 3. Enhance profiles table with structured preferences & skills
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;

-- 4. Reconcile applications table columns
-- Add canonical columns expected by backend and agent
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailored_resume TEXT;

-- Backfill from legacy _text columns if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'cover_letter_text'
    ) THEN
        UPDATE applications 
        SET cover_letter = cover_letter_text 
        WHERE cover_letter IS NULL AND cover_letter_text IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'tailored_resume_text'
    ) THEN
        UPDATE applications 
        SET tailored_resume = tailored_resume_text 
        WHERE tailored_resume IS NULL AND tailored_resume_text IS NOT NULL;
    END IF;
END $$;

-- Add workflow, audit, and submission state tracking
ALTER TABLE applications ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'discovered';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS draft_version INTEGER DEFAULT 1;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'automatic';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_mode TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_reference TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS missing_fields JSONB DEFAULT '[]'::jsonb;

-- Update existing default status if needed
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'Found';

-- 5. Deduplicate applications table and apply UNIQUE (user_id, job_id) constraint
-- Deletes older duplicates, keeping the most recently created application row
DELETE FROM applications a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (user_id, job_id) id
    FROM applications
    WHERE user_id IS NOT NULL AND job_id IS NOT NULL
    ORDER BY user_id, job_id, created_at DESC
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'applications_user_id_job_id_key'
    ) THEN
        ALTER TABLE applications 
        ADD CONSTRAINT applications_user_id_job_id_key UNIQUE (user_id, job_id);
    END IF;
END $$;

-- 6. Ensure indexes for efficient foreign key and status lookups
CREATE INDEX IF NOT EXISTS idx_applications_user_job ON applications (user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_applications_workflow_status ON applications (workflow_status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);

