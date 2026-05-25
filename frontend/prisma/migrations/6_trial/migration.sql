-- Migration 6: 14-day free trial
-- Adds trialEndsAt to User. Nullable — null means the trial has not started
-- (user has not verified email yet). Set once at email verification; never
-- updated afterwards. Existing users get null and are NOT auto-enrolled.
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
