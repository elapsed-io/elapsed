-- Anonymous usage counts (plan, Privacy): one row per UTC day and event,
-- holding only a total. Nothing about a person, device, address or request.
CREATE TABLE daily_counts (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  event TEXT NOT NULL CHECK (event IN ('visit', 'session')),
  count INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (day, event)
);
