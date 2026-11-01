import { supabase } from '../../shared/components/config/supabase';
import { DoseSlot } from '../../features/logAndEarn/model/logAndEarnData';

type CheckinSlot = DoseSlot | 'weekly';

async function fetchData(): Promise<unknown> {
  const { data, error } = await supabase.rpc('get_log_and_earn_data');
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function runMutation(
  rpcName: string,
  parameters: Record<string, unknown>,
): Promise<unknown> {
  const { error } = await supabase.rpc(rpcName, parameters);
  if (error) {
    throw new Error(error.message);
  }
  return fetchData();
}

function setCheckin(
  id: string,
  slot: CheckinSlot,
  checked: boolean,
): Promise<unknown> {
  return runMutation('set_log_and_earn_checkin', {
    p_routine_item_id: id,
    p_slot: slot,
    p_checked: checked,
  });
}

function setAllDailyCheckins(checked: boolean): Promise<unknown> {
  return runMutation('set_all_log_and_earn_daily_checkins', {
    p_checked: checked,
  });
}

function removeRoutineItems(ids: string[]): Promise<unknown> {
  return runMutation('remove_log_and_earn_routine_items', { p_ids: ids });
}

async function logToday(): Promise<{ result: unknown; data: unknown }> {
  const { data: result, error } = await supabase.rpc(
    'log_and_earn_log_today',
  );
  if (error) {
    throw new Error(error.message);
  }
  return { result, data: await fetchData() };
}

function claimScratchCard(id: string): Promise<unknown> {
  return runMutation('claim_log_and_earn_scratch_card', { p_card_id: id });
}

export const logAndEarnService = {
  claimScratchCard,
  fetchData,
  logToday,
  removeRoutineItems,
  setAllDailyCheckins,
  setCheckin,
};
