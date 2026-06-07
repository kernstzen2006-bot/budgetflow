-- ============================================================================
-- BudgetFlow – Supabase Database Schema
-- ============================================================================
-- This schema defines the complete data model for BudgetFlow, a personal
-- budget tracker designed for students with variable hourly income.
--
-- SECTIONS:
--   1. Tables           – Core data tables
--   2. Row-Level Security – RLS policies so users only access their own data
--   3. Indexes          – Performance indexes on frequently queried columns
-- ============================================================================


-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- Stores user profile information linked 1:1 with auth.users.
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   text,
  hourly_rate numeric(10, 2) DEFAULT 0,
  currency    text           DEFAULT 'USD',
  created_at  timestamptz    DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- shifts
-- Tracks individual work shifts so students can log hours worked.
-- ---------------------------------------------------------------------------
CREATE TABLE shifts (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid           NOT NULL REFERENCES profiles ON DELETE CASCADE,
  date        date           NOT NULL,
  hours       numeric(5, 2)  NOT NULL,
  hourly_rate numeric(10, 2) NOT NULL,
  notes       text,
  created_at  timestamptz    DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- paychecks
-- Records actual paychecks received, optionally tied to a pay period.
-- ---------------------------------------------------------------------------
CREATE TABLE paychecks (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid           NOT NULL REFERENCES profiles ON DELETE CASCADE,
  amount       numeric(10, 2) NOT NULL,
  income_type  text           DEFAULT 'Wages',
  date         date           NOT NULL,
  period_start date,
  period_end   date,
  notes        text,
  created_at   timestamptz    DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- categories
-- Expense categories (seeded with defaults on sign-up, user can customise).
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name       text    NOT NULL,
  icon       text    NOT NULL,
  color      text    NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- expenses
-- Individual expense entries tied to a category.
-- ---------------------------------------------------------------------------
CREATE TABLE expenses (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid           NOT NULL REFERENCES profiles ON DELETE CASCADE,
  category_id uuid           REFERENCES categories ON DELETE SET NULL,
  amount      numeric(10, 2) NOT NULL,
  description text,
  date        date           NOT NULL,
  created_at  timestamptz    DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- goals
-- Savings goals that students work towards (e.g. textbooks, travel).
-- ---------------------------------------------------------------------------
CREATE TABLE goals (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid           NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name           text           NOT NULL,
  target_amount  numeric(10, 2) NOT NULL,
  current_amount numeric(10, 2) DEFAULT 0,
  percentage     numeric(5, 2)  DEFAULT 0,
  color          text           NOT NULL,
  icon           text           NOT NULL,
  deadline       date,
  is_active      boolean        DEFAULT true,
  created_at     timestamptz    DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- goal_contributions
-- Links a portion of a paycheck to a specific savings goal.
-- ---------------------------------------------------------------------------
CREATE TABLE goal_contributions (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid           NOT NULL REFERENCES profiles ON DELETE CASCADE,
  goal_id     uuid           NOT NULL REFERENCES goals ON DELETE CASCADE,
  paycheck_id uuid           NOT NULL REFERENCES paychecks ON DELETE CASCADE,
  amount      numeric(10, 2) NOT NULL,
  created_at  timestamptz    DEFAULT now()
);


-- ============================================================================
-- 2. ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Every table is locked down so authenticated users can only read/write
-- rows that belong to them (matched via user_id or id for profiles).
-- ============================================================================

-- profiles ------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- shifts --------------------------------------------------------------------
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shifts"
  ON shifts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shifts"
  ON shifts FOR DELETE
  USING (auth.uid() = user_id);

-- paychecks -----------------------------------------------------------------
ALTER TABLE paychecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paychecks"
  ON paychecks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paychecks"
  ON paychecks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own paychecks"
  ON paychecks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own paychecks"
  ON paychecks FOR DELETE
  USING (auth.uid() = user_id);

-- categories ----------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- expenses ------------------------------------------------------------------
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- goals ---------------------------------------------------------------------
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- goal_contributions --------------------------------------------------------
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal contributions"
  ON goal_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal contributions"
  ON goal_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal contributions"
  ON goal_contributions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal contributions"
  ON goal_contributions FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================
-- Indexes on user_id for fast per-user filtering and on date columns for
-- chronological queries (dashboards, reports, analytics).
-- ============================================================================

-- user_id indexes
CREATE INDEX idx_shifts_user_id             ON shifts (user_id);
CREATE INDEX idx_paychecks_user_id          ON paychecks (user_id);
CREATE INDEX idx_categories_user_id         ON categories (user_id);
CREATE INDEX idx_expenses_user_id           ON expenses (user_id);
CREATE INDEX idx_goals_user_id              ON goals (user_id);
CREATE INDEX idx_goal_contributions_user_id ON goal_contributions (user_id);

-- date indexes
CREATE INDEX idx_shifts_date                ON shifts (date);
CREATE INDEX idx_paychecks_date             ON paychecks (date);
CREATE INDEX idx_expenses_date              ON expenses (date);

-- composite indexes for common dashboard queries (user + date range)
CREATE INDEX idx_shifts_user_date           ON shifts (user_id, date);
CREATE INDEX idx_paychecks_user_date        ON paychecks (user_id, date);
CREATE INDEX idx_expenses_user_date         ON expenses (user_id, date);

-- goal contributions lookup
CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions (goal_id);
