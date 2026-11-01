update public.log_and_earn_profiles
set reward_pause_days = case
      when reward_pause_days <= 0 then 8
      else reward_pause_days
    end,
    reward_pause_message = case
      when btrim(reward_pause_message) = '' then format(
        'Reward pause in the next %s days. Order to keep earning',
        case when reward_pause_days <= 0 then 8 else reward_pause_days end
      )
      else reward_pause_message
    end,
    reward_pause_action_label = case
      when btrim(reward_pause_action_label) = '' then 'Order Next Kit'
      else reward_pause_action_label
    end
where reward_pause_days <= 0
   or btrim(reward_pause_message) = ''
   or btrim(reward_pause_action_label) = '';

notify pgrst, 'reload schema';
