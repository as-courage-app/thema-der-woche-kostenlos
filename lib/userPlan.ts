import { supabase } from '@/lib/supabaseClient';

export type PlanTier = 'A' | 'B' | 'C';

type UserPlanRow = {
  user_id: string;
  plan_code: PlanTier;
};

export async function readCurrentUserPlan(): Promise<PlanTier | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_plan')
    .select('user_id, plan_code')
    .eq('user_id', session.user.id)
    .maybeSingle<UserPlanRow>();

  if (error || !data) {
    return null;
  }

  return data.plan_code;
}