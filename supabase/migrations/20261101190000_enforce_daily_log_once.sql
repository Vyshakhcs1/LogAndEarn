create or replace function public.log_and_earn_log_today()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_profile public.log_and_earn_profiles%rowtype;
  v_today date;
  v_next_goal public.log_and_earn_goal_catalog%rowtype;
  v_goal_logged integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to log today.';
  end if;

  select * into v_profile
  from public.log_and_earn_profiles
  where user_id = v_user_id
  for update;
  if not found then
    raise exception 'Log and Earn is not configured for this account.';
  end if;

  v_today := (now() at time zone v_profile.time_zone)::date;
  if exists (
    select 1
    from public.log_and_earn_days
    where user_id = v_user_id
      and log_date = v_today
  ) then
    raise exception 'Today has already been logged.';
  end if;

  v_result := public.log_and_earn_log_today_before_goal_progression();

  select count(*) into v_goal_logged
  from public.log_and_earn_days
  where user_id = v_user_id
    and status = 'logged'
    and log_date >= v_profile.goal_start_date
    and log_date <= v_today;

  if v_goal_logged >= v_profile.goal_target_days then
    select * into v_next_goal
    from public.log_and_earn_goal_catalog
    where is_active
      and sort_order > coalesce((
        select sort_order
        from public.log_and_earn_goal_catalog
        where goal_id = v_profile.goal_id
      ), 0)
    order by sort_order
    limit 1;

    if found then
      update public.log_and_earn_profiles
      set goal_id = v_next_goal.goal_id,
          goal_title = v_next_goal.title,
          goal_start_date = v_today + 1,
          goal_target_days = v_next_goal.target_days
      where user_id = v_user_id;
    end if;
  end if;

  return v_result;
end;
$$;

notify pgrst, 'reload schema';
