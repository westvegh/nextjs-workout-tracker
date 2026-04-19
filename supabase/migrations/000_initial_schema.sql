-- =============================================================================
-- 000_initial_schema.sql
-- Initial schema for the Next.js Workout Tracker starter.
-- Tables: profiles, workouts, workout_exercises, exercise_sets.
-- All tables have RLS enabled. Users can only access their own rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Trigger function: set_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Trigger function: handle_new_user
-- Creates a profile row when a new auth user is created
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------------------------------
-- Table: profiles
-- One row per auth user. user_exercise_api_key lets users supply their own
-- exerciseapi.dev key instead of relying on the app's server-side key.
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id                      UUID        NOT NULL,
  name                    TEXT        NOT NULL,
  user_exercise_api_key   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Table: workouts
-- -----------------------------------------------------------------------------
CREATE TABLE public.workouts (
  id              UUID    NOT NULL DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL,
  date            DATE    NOT NULL,
  name            TEXT,
  status          TEXT    DEFAULT 'planned',
  notes           TEXT,
  rating          TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workouts_pkey PRIMARY KEY (id),
  CONSTRAINT workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workouts_user_date ON public.workouts (user_id, date DESC);

CREATE TRIGGER set_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workouts"
  ON public.workouts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Table: workout_exercises
-- exercise_id references an exerciseapi.dev exercise id (not a local FK).
-- -----------------------------------------------------------------------------
CREATE TABLE public.workout_exercises (
  id              UUID    NOT NULL DEFAULT gen_random_uuid(),
  workout_id      UUID    NOT NULL,
  exercise_id     TEXT    NOT NULL,
  exercise_name   TEXT    NOT NULL,
  muscle          TEXT,
  equipment       TEXT,
  order_index     INTEGER NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workout_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE
);

CREATE INDEX idx_workout_exercises_workout_id ON public.workout_exercises (workout_id);

CREATE TRIGGER set_workout_exercises_updated_at
  BEFORE UPDATE ON public.workout_exercises
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workout exercises"
  ON public.workout_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Table: exercise_sets
-- -----------------------------------------------------------------------------
CREATE TABLE public.exercise_sets (
  id                    UUID    NOT NULL DEFAULT gen_random_uuid(),
  workout_exercise_id   UUID    NOT NULL,
  set_number            INTEGER NOT NULL,
  weight                NUMERIC,
  weight_unit           TEXT    DEFAULT 'lbs',
  reps                  INTEGER,
  is_completed          BOOLEAN DEFAULT FALSE,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_sets_pkey PRIMARY KEY (id),
  CONSTRAINT exercise_sets_workout_exercise_id_fkey FOREIGN KEY (workout_exercise_id) REFERENCES public.workout_exercises(id) ON DELETE CASCADE
);

CREATE INDEX idx_exercise_sets_workout_exercise_id ON public.exercise_sets (workout_exercise_id);

CREATE TRIGGER set_exercise_sets_updated_at
  BEFORE UPDATE ON public.exercise_sets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exercise sets"
  ON public.exercise_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_exercises
      JOIN public.workouts ON workouts.id = workout_exercises.workout_id
      WHERE workout_exercises.id = exercise_sets.workout_exercise_id
        AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_exercises
      JOIN public.workouts ON workouts.id = workout_exercises.workout_id
      WHERE workout_exercises.id = exercise_sets.workout_exercise_id
        AND workouts.user_id = auth.uid()
    )
  );
