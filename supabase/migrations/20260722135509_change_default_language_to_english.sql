/*
# Change default preferred_language to English

## Overview
Changes the default value of `profiles.preferred_language` from 'ml' (Malayalam) to 'en' (English).
New users will now default to English instead of Malayalam.

## Changes
- ALTER TABLE profiles ALTER COLUMN preferred_language SET DEFAULT 'en'
*/

ALTER TABLE profiles ALTER COLUMN preferred_language SET DEFAULT 'en';