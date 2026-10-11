-- =============================================================================
-- Job Application Assistant — Full Database Schema
-- Supabase PostgreSQL + Row Level Security
-- Last updated: 2026-10-11
-- =============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- EXISTING TABLES (Modules 1-4)
-- =============================================================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id               UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name        TEXT,
    phone            TEXT,
    linkedin_url     TEXT,
    github_url       TEXT,
    base_resume_text TEXT,
    created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jobs Table (deduplicated by url)
CREATE TABLE IF NOT EXISTS jobs (
    id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title          TEXT NOT NULL,
    company        TEXT NOT NULL,
    url            TEXT UNIQUE NOT NULL,
    description    TEXT,
    required_skills TEXT,
    source         TEXT,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,
    job_id               UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status               TEXT DEFAULT 'Found',
    -- status values: 'Found' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Manual Required'
    tailored_resume_text TEXT,
    cover_letter_text    TEXT,
    applied_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Added in Module 7/8:
    missing_fields       JSONB,
    -- e.g. ["Docker", "Kubernetes"] — skills in JD not found in resume
    match_score          NUMERIC(5,2),
    -- TF-IDF cosine similarity score 0.00-100.00
    review_status        TEXT DEFAULT 'pending'
    -- review_status: 'pending' | 'approved' | 'rejected'
);

-- =============================================================================
-- NEW TABLES (Modules 8-12)
-- =============================================================================

-- Subscriptions (synced from Stripe webhooks — source of truth is Stripe)
CREATE TABLE IF NOT EXISTS subscriptions (
    id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT UNIQUE,
    stripe_sub_id      TEXT UNIQUE,
    plan               TEXT DEFAULT 'free',
    -- plan values: 'free' | 'pro'
    status             TEXT DEFAULT 'active',
    -- status values: 'active' | 'canceled' | 'past_due'
    current_period_end TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT now()
);

-- Automation Logs (one row per Playwright action event)
CREATE TABLE IF NOT EXISTS automation_logs (
    id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    event          TEXT NOT NULL,
    -- event values: 'started' | 'navigated' | 'field_filled' | 'captcha_detected' | 'submitted' | 'failed'
    detail         TEXT,
    screenshot_url TEXT,
    -- path in Supabase Storage: automation-screenshots/{user_id}/{application_id}/
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- Interview Prep Sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
    job_id     UUID REFERENCES jobs(id) ON DELETE CASCADE,
    questions  JSONB NOT NULL,
    -- schema: [{question: str, category: behavioral|technical|situational, ideal_answer_points: [str]}]
    created_at TIMESTAMPTZ DEFAULT now()
);

-- In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    -- type values: 'application_ready' | 'submitted' | 'missing_data' | 'captcha_required'
    payload    JSONB,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- =============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- Execute these in Supabase Dashboard → SQL Editor
-- =============================================================================

-- profiles: users can only read/write their own profile
CREATE POLICY "Users manage own profile"
    ON profiles FOR ALL
    USING (auth.uid() = id);

-- jobs: anyone authenticated can read; authenticated users can insert
CREATE POLICY "Authenticated users read jobs"
    ON jobs FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert jobs"
    ON jobs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- applications: users can only access their own applications
CREATE POLICY "Users manage own applications"
    ON applications FOR ALL
    USING (auth.uid() = user_id);

-- subscriptions: users can only read their own subscription
CREATE POLICY "Users read own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Only backend service role can write to subscriptions (via webhook)
-- (Set in Supabase Dashboard: service_role key bypasses RLS)

-- automation_logs: users can read logs for their own applications
CREATE POLICY "Users read own automation logs"
    ON automation_logs FOR SELECT
    USING (
        auth.uid() = (
            SELECT user_id FROM applications WHERE id = application_id
        )
    );

-- interview_sessions: users manage their own sessions
CREATE POLICY "Users manage own interview sessions"
    ON interview_sessions FOR ALL
    USING (auth.uid() = user_id);

-- notifications: users manage their own notifications
CREATE POLICY "Users manage own notifications"
    ON notifications FOR ALL
    USING (auth.uid() = user_id);

-- =============================================================================
-- SUPABASE STORAGE BUCKETS (create in Dashboard → Storage)
-- =============================================================================
-- Bucket: "resumes"          — for uploaded resume files (private, per user)
-- Bucket: "automation-screenshots" — for Playwright screenshots (private, per user)
