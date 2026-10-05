-- The revoke in 0002 only removed the anon/authenticated grants; Postgres
-- grants EXECUTE to the PUBLIC pseudo-role by default on function creation,
-- and every role implicitly has whatever PUBLIC is granted regardless of
-- its own specific grants/revokes. Revoking from PUBLIC is what actually
-- locks this down to postgres/service_role only. (0002 has been corrected
-- in place too, so a fresh apply from scratch doesn't need this file — kept
-- for parity with what was actually run against the live project.)
revoke execute on function public.mark_live_stream_live(uuid, text, text, text) from public;
