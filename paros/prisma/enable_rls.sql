-- ==============================================================================
-- PAROS OS: SUPABASE POSTGRES ROW-LEVEL SECURITY (RLS) LOCKDOWN SCRIPT
-- Project ID: jbzzyclrklrlpnvgoqwp
-- Description:
--   Enables Row-Level Security on all public tables and revokes anon/authenticated
--   PostgREST role permissions to eliminate the `rls_disabled_in_public` vulnerability.
--   Prisma communicates via direct connection (postgres user), which bypasses RLS.
-- ==============================================================================

-- 1. Enable RLS on all current database tables
ALTER TABLE IF EXISTS public."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Zone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."MenuItemIngredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Bill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CashShift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Coupon" ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all permissions on public schema from anon and authenticated roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;

-- 3. Ensure future tables created in public do not grant permissions to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
