-- Opt-in crash reports (plan, Privacy): the error, the build and the browser
-- family and major version, with the UTC day it arrived. Nothing about a
-- person, device, address or request. Rows are deleted after 14 days.
CREATE TABLE crash_reports (
  id INTEGER PRIMARY KEY,
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  version TEXT NOT NULL CHECK (length(version) BETWEEN 1 AND 40),
  browser TEXT NOT NULL CHECK (browser IN ('chrome', 'edge', 'firefox', 'safari', 'samsung', 'opera', 'other')),
  browser_version INTEGER NOT NULL CHECK (browser_version BETWEEN 0 AND 999),
  message TEXT NOT NULL CHECK (length(message) <= 500),
  stack TEXT NOT NULL CHECK (length(stack) <= 6000)
);
CREATE INDEX crash_reports_day ON crash_reports (day);
