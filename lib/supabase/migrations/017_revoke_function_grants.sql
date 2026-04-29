-- Tighten EXECUTE grants on SECURITY DEFINER functions.
--
-- Supabase grants EXECUTE on every function in the `public` schema to the
-- `anon` and `authenticated` roles by default. The Supabase advisor flags
-- this for SECURITY DEFINER functions because anyone can call them via
-- /rest/v1/rpc/<name>. Lock both down:
--
-- - handle_new_user() is a trigger, not a public RPC. Revoke entirely.
-- - reset_user_progress() should be callable by signed-in users only.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.reset_user_progress() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reset_user_progress() TO authenticated;
