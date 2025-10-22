-- Migration: Split birth_date into separate month/day/year columns
-- This allows birthdays where the birth year is unknown

-- Add new columns
ALTER TABLE birthdays ADD COLUMN IF NOT EXISTS birth_month INTEGER;
ALTER TABLE birthdays ADD COLUMN IF NOT EXISTS birth_day INTEGER;
ALTER TABLE birthdays ADD COLUMN IF NOT EXISTS birth_year INTEGER;

-- Migrate existing data from birth_date to new columns (if birth_date exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'birthdays' AND column_name = 'birth_date'
    ) THEN
        UPDATE birthdays
        SET
            birth_month = EXTRACT(MONTH FROM birth_date)::INTEGER,
            birth_day = EXTRACT(DAY FROM birth_date)::INTEGER,
            birth_year = EXTRACT(YEAR FROM birth_date)::INTEGER
        WHERE birth_date IS NOT NULL;

        -- Drop the old birth_date column
        ALTER TABLE birthdays DROP COLUMN birth_date;
    END IF;
END $$;

-- Make birth_month and birth_day NOT NULL (year remains nullable)
ALTER TABLE birthdays ALTER COLUMN birth_month SET NOT NULL;
ALTER TABLE birthdays ALTER COLUMN birth_day SET NOT NULL;
