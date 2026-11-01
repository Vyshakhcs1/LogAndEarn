# Log & Earn Supabase setup

## Apply the migration

Run `migrations/20261031000000_log_and_earn.sql` in the Supabase SQL Editor (or apply it through the Supabase CLI). It creates the per-user tables, RLS read policies, and authenticated RPCs used by the app.

If the app reports `Could not find the function public.get_log_and_earn_data without parameters in the schema cache`, the function has not been installed in the project the app is calling, or PostgREST has not refreshed its schema cache. Confirm the Dashboard project URL matches `src/shared/components/config/supabase.ts`, run the complete latest migration in that project's SQL Editor, ensure it finishes without an error, and retry after the schema cache reload. The migration sends a PostgREST schema reload notification at the end.

The mobile app calls:

- `get_log_and_earn_data`
- `set_log_and_earn_checkin`
- `set_all_log_and_earn_daily_checkins`
- `remove_log_and_earn_routine_items`
- `log_and_earn_log_today`
- `claim_log_and_earn_scratch_card`

The RPCs derive the owner from `auth.uid()`. Do not send another user's ID, and do not add a service-role key to the mobile app.

## New-account setup

Apply `migrations/20261031200000_log_and_earn_first_login_bootstrap.sql` after the original migration. On the first authenticated Log & Earn data request, the backend creates the user's profile with the `kit-1` goal, a 30-day target, zero opening coins, three lifelines for that goal, and the six active routine items below. The daily doses start unchecked. It creates no history, claimed rewards, or scratch cards. Returning requests do not reset progress or re-add products the user removed.

Apply `migrations/20261101190000_enforce_daily_log_once.sql` after the bootstrap migration to ensure a user's daily log can only be recorded once per local date. The app disables the Log button during the request and after a successful log; the database also serializes concurrent requests and rejects a repeat log without awarding coins again.

If the reward-pause notice or its button label is blank for accounts already initialized, also run `migrations/20261031210000_log_and_earn_reward_pause_defaults.sql`. It fills missing reward-pause values with the current configured default of 8 days and `Order Next Kit`, while preserving non-empty values.

The initial goal title and target come from the current product requirements (`Hair gets thick & strong`, 30 days). Future goals can be added to `log_and_earn_goal_catalog`; logging the final day of a goal advances the profile to the next active goal and starts its three-lifeline allowance.

The shared routine catalog is seeded with:

- Four daily `Hair Ras` entries with morning and evening dose labels.
- Two weekly `Hair Ras` entries with the `Log for the day` schedule.

Users receive all six items by default, can check individual doses, and can remove items. Catalog/profile changes should happen through a trusted admin/backend workflow; the app has no direct client write access to these tables. Users can update today's check-ins, log the day, remove active routine items, and claim their own available scratch cards through protected RPCs.

## Important business rules

The migration uses the coin tiers and weekly streak bonuses already present in the app's Log & Earn model. It currently uses `Asia/Kolkata` as the profile time zone. Lifeline usage is counted from the current goal's start date rather than the calendar month. Review the reward rules and configured time zone with the product owner before production.
