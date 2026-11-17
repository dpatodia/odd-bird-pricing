// Filled in by scripts/deploy.sh. The anon key is designed to be public: row-level security protects the data.
// Leave both empty to run in DEMO mode (sample costs, nothing saved).
export const SUPABASE_URL = "https://lcayptdmchhbqvkfggqj.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_iyy-yU47ADG3iPCWhtoDDg_bFAX6dgW";
export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
