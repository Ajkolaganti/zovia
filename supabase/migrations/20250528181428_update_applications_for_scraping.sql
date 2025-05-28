-- Alter status column: remove default and allow NULL (or set a new default like 'scraped')
ALTER TABLE applications
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE TEXT; -- Ensure it's TEXT if not already, can set to NULL

-- Alter application_date column: remove default and allow NULL
ALTER TABLE applications
  ALTER COLUMN application_date DROP DEFAULT,
  ALTER COLUMN application_date SET NULL;

-- Optionally, you might want to add new columns relevant to scraped jobs, e.g.:
-- ALTER TABLE applications
--   ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT now(),
--   ADD COLUMN IF NOT EXISTS source_platform TEXT; -- To store LinkedIn, Monster etc.

-- If you change the status to allow more generic terms, 
-- you might want to update existing 'Applied' statuses if they need to be more specific
-- or if the old default no longer makes sense.
-- For example, if you had a default of 'Applied' and now you want 'pending_review' for new scrapes:
-- UPDATE applications SET status = 'user_reviewed_applied' WHERE status = 'Applied'; 
-- This is just an example, tailor it to your new status logic.
