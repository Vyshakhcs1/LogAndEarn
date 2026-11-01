create table if not exists public.log_and_earn_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_id text not null,
  goal_title text not null,
  goal_start_date date not null default current_date,
  goal_target_days integer not null check (goal_target_days > 0),
  opening_coins integer not null default 0 check (opening_coins >= 0),
  monthly_lifeline_limit integer not null default 0 check (monthly_lifeline_limit >= 0),
  reward_pause_days integer not null default 0 check (reward_pause_days >= 0),
  reward_pause_message text not null default '',
  reward_pause_action_label text not null default '',
  time_zone text not null default 'Asia/Kolkata'
);

create table if not exists public.log_and_earn_routine_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  image_asset_key text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  dose_labels jsonb not null default '[]'::jsonb,
  schedule_label text,
  is_active boolean not null default true,
  primary key (user_id, id),
  check (
    (frequency = 'daily' and jsonb_typeof(dose_labels) = 'array')
    or (frequency = 'weekly' and schedule_label is not null)
  )
);

create table if not exists public.log_and_earn_checkins (
  user_id uuid not null,
  routine_item_id text not null,
  check_date date not null,
  slot text not null check (slot in ('morning', 'evening', 'weekly')),
  checked boolean not null default false,
  primary key (user_id, routine_item_id, check_date, slot),
  foreign key (user_id, routine_item_id)
    references public.log_and_earn_routine_items(user_id, id)
    on delete cascade
);

create table if not exists public.log_and_earn_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('logged', 'lifeline', 'missed')),
  coins_earned integer not null default 0 check (coins_earned >= 0),
  coins_missed integer not null default 0 check (coins_missed >= 0),
  primary key (user_id, log_date)
);

alter table public.log_and_earn_days
  add column if not exists coins_missed integer not null default 0
  check (coins_missed >= 0);

create table if not exists public.log_and_earn_coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('daily_log', 'scratch_card')),
  source_id text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create table if not exists public.log_and_earn_reward_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  card_type text not null check (card_type in ('scratch', 'product', 'coins')),
  payload jsonb not null,
  expires_on date,
  claimed_at timestamptz,
  primary key (user_id, id)
);

alter table public.log_and_earn_profiles enable row level security;
alter table public.log_and_earn_routine_items enable row level security;
alter table public.log_and_earn_checkins enable row level security;
alter table public.log_and_earn_days enable row level security;
alter table public.log_and_earn_coin_transactions enable row level security;
alter table public.log_and_earn_reward_cards enable row level security;

drop policy if exists "Users read own Log and Earn profile"
  on public.log_and_earn_profiles;
create policy "Users read own Log and Earn profile"
  on public.log_and_earn_profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own Log and Earn routine"
  on public.log_and_earn_routine_items;
create policy "Users read own Log and Earn routine"
  on public.log_and_earn_routine_items for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own Log and Earn checkins"
  on public.log_and_earn_checkins;
create policy "Users read own Log and Earn checkins"
  on public.log_and_earn_checkins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own Log and Earn days"
  on public.log_and_earn_days;
create policy "Users read own Log and Earn days"
  on public.log_and_earn_days for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own Log and Earn coin transactions"
  on public.log_and_earn_coin_transactions;
create policy "Users read own Log and Earn coin transactions"
  on public.log_and_earn_coin_transactions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own Log and Earn rewards"
  on public.log_and_earn_reward_cards;
create policy "Users read own Log and Earn rewards"
  on public.log_and_earn_reward_cards for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.log_and_earn_profiles from anon, authenticated;
revoke all on public.log_and_earn_routine_items from anon, authenticated;
revoke all on public.log_and_earn_checkins from anon, authenticated;
revoke all on public.log_and_earn_days from anon, authenticated;
revoke all on public.log_and_earn_coin_transactions from anon, authenticated;
revoke all on public.log_and_earn_reward_cards from anon, authenticated;
grant select on public.log_and_earn_profiles to authenticated;
grant select on public.log_and_earn_routine_items to authenticated;
grant select on public.log_and_earn_checkins to authenticated;
grant select on public.log_and_earn_days to authenticated;
grant select on public.log_and_earn_coin_transactions to authenticated;
grant select on public.log_and_earn_reward_cards to authenticated;

create or replace function public.get_log_and_earn_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.log_and_earn_profiles%rowtype;
  v_today date;
  v_month_start date;
  v_month_calendar_start date;
  v_calendar_start date;
  v_week_start date;
  v_week_end date;
  v_streak integer := 0;
  v_cursor date;
  v_daily_coins integer;
  v_days_logged integer;
  v_cards jsonb;
  v_claimed_cards jsonb;
  v_daily jsonb;
  v_weekly jsonb;
  v_week_days jsonb;
  v_calendar_days jsonb;
  v_total_coins integer;
  v_used_lifelines integer;
  v_goal_logged integer;
  v_available_scratch integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to load Log and Earn data.';
  end if;

  select * into v_profile
  from public.log_and_earn_profiles
  where user_id = v_user_id;

  if not found then
    raise exception 'Log and Earn is not configured for this account.';
  end if;

  v_today := (now() at time zone v_profile.time_zone)::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_calendar_start := v_profile.goal_start_date;
  v_month_calendar_start := greatest(v_month_start, v_profile.goal_start_date);
  v_week_start := date_trunc('week', v_today)::date;
  v_week_end := v_week_start + 6;

  v_cursor := v_today - 1;
  while v_cursor >= v_today - 60 loop
    exit when not exists (
      select 1 from public.log_and_earn_days d
      where d.user_id = v_user_id
        and d.log_date = v_cursor
        and d.status in ('logged', 'lifeline')
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;
  if exists (
    select 1 from public.log_and_earn_days d
    where d.user_id = v_user_id
      and d.log_date = v_today
      and d.status in ('logged', 'lifeline')
  ) then
    v_streak := v_streak + 1;
  end if;

  v_daily_coins := case
    when v_streak + 1 between 1 and 7 then 30
    when v_streak + 1 between 8 and 14 then 40
    when v_streak + 1 between 15 and 21 then 50
    when v_streak + 1 between 22 and 28 then 60
    when v_streak + 1 between 29 and 35 then 70
    else 0
  end;
  if exists (
    select 1 from public.log_and_earn_days d
    where d.user_id = v_user_id and d.log_date = v_today and d.status = 'logged'
  ) then
    v_daily_coins := 0;
  end if;

  select count(*) filter (where status = 'logged')
    into v_days_logged
  from public.log_and_earn_days
  where user_id = v_user_id
    and log_date >= v_month_calendar_start
    and log_date <= v_today;

  select count(*) into v_goal_logged
  from public.log_and_earn_days
  where user_id = v_user_id
    and status = 'logged'
    and log_date >= v_profile.goal_start_date
    and log_date <= v_today;

  select count(*) into v_used_lifelines
  from public.log_and_earn_days
  where user_id = v_user_id
    and status = 'lifeline'
    and log_date >= date_trunc('month', v_today)::date
    and log_date <= v_today;

  select v_profile.opening_coins + coalesce(sum(amount), 0)
  into v_total_coins
  from public.log_and_earn_coin_transactions
  where user_id = v_user_id;

  select count(*) into v_available_scratch
  from public.log_and_earn_reward_cards
  where user_id = v_user_id
    and card_type = 'scratch'
    and claimed_at is null
    and (expires_on is null or expires_on >= v_today);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id, 'name', i.name, 'imageAssetKey', i.image_asset_key,
      'doses', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'slot', dose.value->>'slot',
          'label', dose.value->>'label',
          'checked', coalesce(c.checked, false)
        ) order by dose.ordinality), '[]'::jsonb)
        from jsonb_array_elements(i.dose_labels) with ordinality as dose(value, ordinality)
        left join public.log_and_earn_checkins c
          on c.user_id = i.user_id
          and c.routine_item_id = i.id
          and c.check_date = v_today
          and c.slot = dose.value->>'slot'
      )
    ) order by i.id
  ), '[]'::jsonb)
  into v_daily
  from public.log_and_earn_routine_items i
  where i.user_id = v_user_id and i.frequency = 'daily' and i.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'name', i.name, 'imageAssetKey', i.image_asset_key,
    'scheduleLabel', i.schedule_label,
    'checked', coalesce(c.checked, false)
  ) order by i.id), '[]'::jsonb)
  into v_weekly
  from public.log_and_earn_routine_items i
  left join public.log_and_earn_checkins c
    on c.user_id = i.user_id and c.routine_item_id = i.id
    and c.check_date = v_today and c.slot = 'weekly'
  where i.user_id = v_user_id and i.frequency = 'weekly' and i.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', dates.day_date::date,
    'status', coalesce(log.status, case
      when dates.day_date > v_today and extract(isodow from dates.day_date) = 7 then 'reward'
      when dates.day_date >= v_today then 'pending'
      else 'missed'
    end),
    'coinsEarned', coalesce(log.coins_earned, 0)
  ) order by dates.day_date), '[]'::jsonb)
  into v_week_days
  from generate_series(v_week_start, v_week_end, interval '1 day') as dates(day_date)
  left join public.log_and_earn_days log
    on log.user_id = v_user_id and log.log_date = dates.day_date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', dates.day_date::date,
    'status', coalesce(activity.status, case
      when dates.day_date >= v_today then 'pending'
      else 'missed'
    end),
    'coinsEarned', coalesce(activity.coins_earned, 0),
    'coinsMissed', coalesce(activity.coins_missed, 0),
    'rewardsMissed', (
      select count(*)
      from public.log_and_earn_reward_cards expired_card
      where expired_card.user_id = v_user_id
        and expired_card.expires_on = dates.day_date::date
        and expired_card.expires_on < v_today
        and expired_card.claimed_at is null
    )
  ) order by dates.day_date), '[]'::jsonb)
  into v_calendar_days
  from generate_series(v_calendar_start, v_today, interval '1 day') as dates(day_date)
  left join public.log_and_earn_days activity
    on activity.user_id = v_user_id
    and activity.log_date = dates.day_date;

  select coalesce(jsonb_agg(card_data.payload order by card_data.sort_key), '[]'::jsonb)
  into v_cards
  from (
    select c.id as sort_key,
      case
        when c.card_type = 'scratch' then c.payload || jsonb_build_object(
          'status', case
            when c.claimed_at is not null then 'available'
            when c.expires_on is not null and c.expires_on < v_today then 'expired'
            else 'available'
          end
        )
        else c.payload
      end as payload
    from public.log_and_earn_reward_cards c
    where c.user_id = v_user_id
    union all
    select 'coin-' || t.id::text,
      jsonb_build_object(
        'id', 'coin-' || t.id::text,
        'type', 'coins',
        'status', 'earned',
        'amount', t.amount,
        'earnedDate', (t.created_at at time zone v_profile.time_zone)::date
      )
    from public.log_and_earn_coin_transactions t
    where t.user_id = v_user_id
  ) card_data;

  select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
  into v_claimed_cards
  from public.log_and_earn_reward_cards
  where user_id = v_user_id and card_type = 'scratch' and claimed_at is not null;

  return jsonb_build_object('success', true, 'data', jsonb_build_object(
    'kitGoal', jsonb_build_object(
      'id', v_profile.goal_id,
      'title', v_profile.goal_title,
      'loggedDays', least(v_goal_logged, v_profile.goal_target_days),
      'targetDays', v_profile.goal_target_days
    ),
    'stats', jsonb_build_object(
      'totalCoins', v_total_coins,
      'currentStreakDays', v_streak,
      'lifelines', jsonb_build_object(
        'monthlyLimit', v_profile.monthly_lifeline_limit,
        'usedThisMonth', v_used_lifelines,
        'availableThisMonth', greatest(0, v_profile.monthly_lifeline_limit - v_used_lifelines)
      )
    ),
    'rewardPause', jsonb_build_object(
      'daysUntilPause', v_profile.reward_pause_days,
      'message', v_profile.reward_pause_message,
      'actionLabel', v_profile.reward_pause_action_label
    ),
    'today', jsonb_build_object(
      'date', v_today,
      'coinsAvailableForLogging', v_daily_coins
    ),
    'weeklyProgress', jsonb_build_object(
      'weekStartsOn', v_week_start,
      'weekEndsOn', v_week_end,
      'daysToReward', greatest(0, 7 - (
        select count(*) from public.log_and_earn_days
        where user_id = v_user_id and log_date between v_week_start and v_today and status = 'logged'
      )),
      'rewardDay', v_week_end,
      'days', v_week_days
    ),
    'supplementRoutine', jsonb_build_object('daily', v_daily, 'weekly', v_weekly),
    'calendarHistory', jsonb_build_object(
      'month', v_month_start,
      'selectedDate', v_today,
      'coinsPerLoggedDay', v_daily_coins,
      'statuses', jsonb_build_object(
        'logged', 'Dose logged; award daily coins',
        'lifeline', 'Missed logging; a monthly lifeline was used',
        'missed', 'No log or lifeline; coins and streak progress missed',
        'reward', 'Streak reward day',
        'pending', 'Date has not yet been completed'
      ),
      'days', v_calendar_days,
      'summary', jsonb_build_object(
        'daysLogged', v_days_logged,
        'daysMissed', (
          select count(*) from generate_series(v_month_calendar_start, v_today, interval '1 day') as dates(day_date)
          left join public.log_and_earn_days log
            on log.user_id = v_user_id and log.log_date = dates.day_date
          where dates.day_date < v_today
            and coalesce(log.status, 'missed') = 'missed'
        ),
        'coinsMissed', (
          select coalesce(sum(log.coins_missed), 0)
          from public.log_and_earn_days log
          where log.user_id = v_user_id
            and log.log_date >= v_month_calendar_start
            and log.log_date <= v_today
            and log.status = 'missed'
        ),
        'rewardsMissed', (
          select count(*)
          from public.log_and_earn_reward_cards card
          where card.user_id = v_user_id
            and card.expires_on >= v_month_start
            and card.expires_on < v_today
            and card.claimed_at is null
        )
      )
    ),
    'rewards', jsonb_build_object(
      'availableScratchCardCount', v_available_scratch,
      'claimedScratchCardIds', v_claimed_cards,
      'cards', v_cards
    )
  ));
end;
$$;

create or replace function public.set_log_and_earn_checkin(
  p_routine_item_id text,
  p_slot text,
  p_checked boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_frequency text;
begin
  select (now() at time zone p.time_zone)::date into v_today
  from public.log_and_earn_profiles p where p.user_id = v_user_id;
  if v_today is null then raise exception 'Log and Earn is not configured for this account.'; end if;
  if exists (select 1 from public.log_and_earn_days d where d.user_id = v_user_id and d.log_date = v_today and d.status = 'logged') then
    raise exception 'Today has already been logged.';
  end if;
  select frequency into v_frequency
  from public.log_and_earn_routine_items
  where user_id = v_user_id and id = p_routine_item_id and is_active;
  if not found then raise exception 'Routine item was not found.'; end if;
  if (p_slot = 'weekly' and v_frequency <> 'weekly')
     or (p_slot in ('morning', 'evening') and v_frequency <> 'daily')
     or p_slot not in ('morning', 'evening', 'weekly') then
    raise exception 'Invalid check-in slot for this routine item.';
  end if;
  insert into public.log_and_earn_checkins(user_id, routine_item_id, check_date, slot, checked)
  values (v_user_id, p_routine_item_id, v_today, p_slot, p_checked)
  on conflict (user_id, routine_item_id, check_date, slot)
  do update set checked = excluded.checked;
end;
$$;

create or replace function public.set_all_log_and_earn_daily_checkins(p_checked boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
begin
  select (now() at time zone p.time_zone)::date into v_today
  from public.log_and_earn_profiles p where p.user_id = v_user_id;
  if v_today is null then raise exception 'Log and Earn is not configured for this account.'; end if;
  if exists (select 1 from public.log_and_earn_days d where d.user_id = v_user_id and d.log_date = v_today and d.status = 'logged') then
    raise exception 'Today has already been logged.';
  end if;
  insert into public.log_and_earn_checkins(user_id, routine_item_id, check_date, slot, checked)
  select v_user_id, i.id, v_today, slots.slot, p_checked
  from public.log_and_earn_routine_items i
  cross join (values ('morning'), ('evening')) as slots(slot)
  where i.user_id = v_user_id and i.frequency = 'daily' and i.is_active
  on conflict (user_id, routine_item_id, check_date, slot)
  do update set checked = excluded.checked;
end;
$$;

create or replace function public.remove_log_and_earn_routine_items(p_ids text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to update your routine.'; end if;
  if coalesce(cardinality(p_ids), 0) = 0 then return; end if;
  update public.log_and_earn_routine_items
  set is_active = false
  where user_id = auth.uid() and id = any(p_ids) and is_active;
  if not found then raise exception 'No active routine items were selected.'; end if;
end;
$$;

create or replace function public.log_and_earn_log_today()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.log_and_earn_profiles%rowtype;
  v_today date;
  v_streak integer := 0;
  v_cursor date;
  v_coins integer;
  v_weekly_bonus integer;
begin
  select * into v_profile
  from public.log_and_earn_profiles where user_id = v_user_id;
  if not found then raise exception 'Log and Earn is not configured for this account.'; end if;
  v_today := (now() at time zone v_profile.time_zone)::date;
  if exists (select 1 from public.log_and_earn_days where user_id = v_user_id and log_date = v_today) then
    return jsonb_build_object('coinsEarned', 0, 'weeklyRewardCoins', 0);
  end if;
  v_cursor := v_today - 1;
  while v_cursor >= v_today - 60 loop
    exit when not exists (
      select 1 from public.log_and_earn_days
      where user_id = v_user_id and log_date = v_cursor and status in ('logged', 'lifeline')
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;
  v_coins := case
    when v_streak + 1 between 1 and 7 then 30
    when v_streak + 1 between 8 and 14 then 40
    when v_streak + 1 between 15 and 21 then 50
    when v_streak + 1 between 22 and 28 then 60
    when v_streak + 1 between 29 and 35 then 70
    else 0
  end;
  v_weekly_bonus := case v_streak + 1
    when 7 then 100 when 14 then 150 when 21 then 200 when 28 then 250 when 35 then 300
    else 0
  end;
  insert into public.log_and_earn_days(user_id, log_date, status, coins_earned)
  values (v_user_id, v_today, 'logged', v_coins + v_weekly_bonus)
  on conflict (user_id, log_date) do nothing;
  if not found then
    return jsonb_build_object('coinsEarned', 0, 'weeklyRewardCoins', 0);
  end if;
  if v_coins + v_weekly_bonus > 0 then
    insert into public.log_and_earn_coin_transactions(user_id, source, source_id, amount)
    values (v_user_id, 'daily_log', v_today::text, v_coins + v_weekly_bonus)
    on conflict (user_id, source, source_id) do nothing;
  end if;
  return jsonb_build_object(
    'coinsEarned', v_coins + v_weekly_bonus,
    'weeklyRewardCoins', v_weekly_bonus
  );
end;
$$;

create or replace function public.claim_log_and_earn_scratch_card(p_card_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_card public.log_and_earn_reward_cards%rowtype;
  v_today date;
  v_amount integer;
begin
  select (now() at time zone time_zone)::date into v_today
  from public.log_and_earn_profiles where user_id = v_user_id;
  if v_today is null then raise exception 'Log and Earn is not configured for this account.'; end if;
  select * into v_card
  from public.log_and_earn_reward_cards
  where user_id = v_user_id and id = p_card_id and card_type = 'scratch'
  for update;
  if not found then raise exception 'Scratch card was not found.'; end if;
  if v_card.claimed_at is not null then return; end if;
  if v_card.expires_on is not null and v_card.expires_on < v_today then
    raise exception 'This scratch card has expired.';
  end if;
  v_amount := (v_card.payload #>> '{reward,amount}')::integer;
  if v_amount is null or v_amount <= 0 then raise exception 'Scratch card reward is invalid.'; end if;
  update public.log_and_earn_reward_cards
  set claimed_at = now()
  where user_id = v_user_id and id = p_card_id;
  insert into public.log_and_earn_coin_transactions(user_id, source, source_id, amount)
  values (v_user_id, 'scratch_card', p_card_id, v_amount)
  on conflict (user_id, source, source_id) do nothing;
end;
$$;

revoke all on function public.get_log_and_earn_data() from public, anon;
revoke all on function public.set_log_and_earn_checkin(text, text, boolean) from public, anon;
revoke all on function public.set_all_log_and_earn_daily_checkins(boolean) from public, anon;
revoke all on function public.remove_log_and_earn_routine_items(text[]) from public, anon;
revoke all on function public.log_and_earn_log_today() from public, anon;
revoke all on function public.claim_log_and_earn_scratch_card(text) from public, anon;
grant execute on function public.get_log_and_earn_data() to authenticated;
grant execute on function public.set_log_and_earn_checkin(text, text, boolean) to authenticated;
grant execute on function public.set_all_log_and_earn_daily_checkins(boolean) to authenticated;
grant execute on function public.remove_log_and_earn_routine_items(text[]) to authenticated;
grant execute on function public.log_and_earn_log_today() to authenticated;
grant execute on function public.claim_log_and_earn_scratch_card(text) to authenticated;

notify pgrst, 'reload schema';
