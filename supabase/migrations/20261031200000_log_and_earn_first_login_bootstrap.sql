create table if not exists public.log_and_earn_goal_catalog (
  goal_id text primary key,
  title text not null,
  target_days integer not null check (target_days > 0),
  sort_order integer not null unique,
  is_active boolean not null default true
);

insert into public.log_and_earn_goal_catalog (
  goal_id,
  title,
  target_days,
  sort_order,
  is_active
)
values ('kit-1', 'Hair gets thick & strong', 30, 1, true)
on conflict (goal_id) do nothing;

create table if not exists public.log_and_earn_routine_catalog (
  id text primary key,
  name text not null,
  image_asset_key text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  dose_labels jsonb not null default '[]'::jsonb,
  schedule_label text,
  sort_order integer not null unique,
  is_active boolean not null default true,
  check (
    (frequency = 'daily' and jsonb_typeof(dose_labels) = 'array')
    or (frequency = 'weekly' and schedule_label is not null)
  )
);

insert into public.log_and_earn_routine_catalog (
  id, name, image_asset_key, frequency, dose_labels, schedule_label, sort_order
)
values
  (
    'daily-1', 'Hair Ras', 'product', 'daily',
    '[{"slot":"morning","label":"1 Tablet (Morning)"},{"slot":"evening","label":"1 Tablet (Evening)"}]'::jsonb,
    null, 1
  ),
  (
    'daily-2', 'Hair Ras', 'product', 'daily',
    '[{"slot":"morning","label":"1 Tablet (Morning)"},{"slot":"evening","label":"1 Tablet (Evening)"}]'::jsonb,
    null, 2
  ),
  (
    'daily-3', 'Hair Ras', 'product', 'daily',
    '[{"slot":"morning","label":"1 Tablet (Morning)"},{"slot":"evening","label":"1 Tablet (Evening)"}]'::jsonb,
    null, 3
  ),
  (
    'daily-4', 'Hair Ras', 'product', 'daily',
    '[{"slot":"morning","label":"1 Tablet (Morning)"},{"slot":"evening","label":"1 Tablet (Evening)"}]'::jsonb,
    null, 4
  ),
  ('weekly-1', 'Hair Ras', 'product', 'weekly', '[]'::jsonb, 'Log for the day', 5),
  ('weekly-2', 'Hair Ras', 'product', 'weekly', '[]'::jsonb, 'Log for the day', 6)
on conflict (id) do nothing;

alter table public.log_and_earn_profiles
  add column if not exists routine_initialized boolean not null default false;

alter table public.log_and_earn_profiles
  alter column monthly_lifeline_limit set default 3;

alter table public.log_and_earn_goal_catalog enable row level security;
alter table public.log_and_earn_routine_catalog enable row level security;
revoke all on public.log_and_earn_goal_catalog from anon, authenticated;
revoke all on public.log_and_earn_routine_catalog from anon, authenticated;

create or replace function public.ensure_log_and_earn_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.log_and_earn_goal_catalog%rowtype;
  v_profile public.log_and_earn_profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to set up Log and Earn.';
  end if;

  select * into v_goal
  from public.log_and_earn_goal_catalog
  where is_active
  order by sort_order
  limit 1;
  if not found then
    raise exception 'No active Log and Earn goal is configured.';
  end if;

  insert into public.log_and_earn_profiles (
    user_id,
    goal_id,
    goal_title,
    goal_start_date,
    goal_target_days,
    opening_coins,
    monthly_lifeline_limit,
    reward_pause_days,
    reward_pause_message,
    reward_pause_action_label,
    time_zone,
    routine_initialized
  )
  values (
    v_user_id,
    v_goal.goal_id,
    v_goal.title,
    (now() at time zone 'Asia/Kolkata')::date,
    v_goal.target_days,
    0,
    3,
    8,
    'Reward pause in the next 8 days. Order to keep earning',
    'Order Next Kit',
    'Asia/Kolkata',
    false
  )
  on conflict (user_id) do nothing;

  select * into v_profile
  from public.log_and_earn_profiles
  where user_id = v_user_id
  for update;

  if not v_profile.routine_initialized then
    insert into public.log_and_earn_routine_items (
      user_id,
      id,
      name,
      image_asset_key,
      frequency,
      dose_labels,
      schedule_label,
      is_active
    )
    select
      v_user_id,
      routine.id,
      routine.name,
      routine.image_asset_key,
      routine.frequency,
      routine.dose_labels,
      routine.schedule_label,
      true
    from public.log_and_earn_routine_catalog routine
    where routine.is_active
    order by routine.sort_order
    on conflict (user_id, id) do nothing;

    update public.log_and_earn_profiles
    set routine_initialized = true
    where user_id = v_user_id;
  end if;
end;
$$;

create or replace function public.get_log_and_earn_lifeline_usage()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.log_and_earn_profiles%rowtype;
  v_today date;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to load lifeline data.';
  end if;
  select * into v_profile
  from public.log_and_earn_profiles
  where user_id = v_user_id;
  if not found then
    raise exception 'Log and Earn is not configured for this account.';
  end if;
  v_today := (now() at time zone v_profile.time_zone)::date;
  select count(*) into v_used
  from public.log_and_earn_days
  where user_id = v_user_id
    and status = 'lifeline'
    and log_date >= v_profile.goal_start_date
    and log_date <= v_today;
  return jsonb_build_object(
    'monthlyLimit', v_profile.monthly_lifeline_limit,
    'usedThisMonth', v_used,
    'availableThisMonth', greatest(0, v_profile.monthly_lifeline_limit - v_used),
    'usedThisGoal', v_used,
    'availableThisGoal', greatest(0, v_profile.monthly_lifeline_limit - v_used)
  );
end;
$$;

alter function public.log_and_earn_log_today()
  rename to log_and_earn_log_today_before_goal_progression;

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
  v_next_goal public.log_and_earn_goal_catalog%rowtype;
  v_goal_logged integer;
begin
  v_result := public.log_and_earn_log_today_before_goal_progression();

  select * into v_profile
  from public.log_and_earn_profiles
  where user_id = v_user_id
  for update;

  select count(*) into v_goal_logged
  from public.log_and_earn_days
  where user_id = v_user_id
    and status = 'logged'
    and log_date >= v_profile.goal_start_date;

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
          goal_start_date = (now() at time zone time_zone)::date + 1,
          goal_target_days = v_next_goal.target_days
      where user_id = v_user_id;
    end if;
  end if;

  return v_result;
end;
$$;

alter function public.get_log_and_earn_data()
  rename to get_log_and_earn_data_before_bootstrap;

create or replace function public.get_log_and_earn_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_data jsonb;
  v_lifelines jsonb;
begin
  perform public.ensure_log_and_earn_account();
  v_data := public.get_log_and_earn_data_before_bootstrap();
  v_lifelines := public.get_log_and_earn_lifeline_usage();

  return jsonb_set(
    jsonb_set(
      jsonb_set(
        v_data,
        '{data,weeklyProgress,days}',
        coalesce((
          select jsonb_agg(
            entry.value || jsonb_build_object(
              'date', substring(entry.value->>'date' from 1 for 10)
            )
            order by entry.ordinality
          )
          from jsonb_array_elements(v_data #> '{data,weeklyProgress,days}')
            with ordinality as entry(value, ordinality)
        ), '[]'::jsonb)
      ),
      '{data,calendarHistory,days}',
      coalesce((
        select jsonb_agg(
          entry.value || jsonb_build_object(
            'date', substring(entry.value->>'date' from 1 for 10)
          )
          order by entry.ordinality
        )
        from jsonb_array_elements(v_data #> '{data,calendarHistory,days}')
          with ordinality as entry(value, ordinality)
      ), '[]'::jsonb)
    ),
    '{data,stats,lifelines}',
    v_lifelines
  );
end;
$$;

revoke all on function public.ensure_log_and_earn_account() from public, anon;
revoke all on function public.get_log_and_earn_lifeline_usage() from public, anon;
revoke all on function public.log_and_earn_log_today_before_goal_progression() from public, anon, authenticated;
revoke all on function public.get_log_and_earn_data_before_bootstrap() from public, anon, authenticated;
revoke all on function public.get_log_and_earn_data() from public, anon;
revoke all on function public.log_and_earn_log_today() from public, anon;
grant execute on function public.ensure_log_and_earn_account() to authenticated;
grant execute on function public.get_log_and_earn_lifeline_usage() to authenticated;
grant execute on function public.get_log_and_earn_data() to authenticated;
grant execute on function public.log_and_earn_log_today() to authenticated;

notify pgrst, 'reload schema';
