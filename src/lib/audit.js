import { supabase } from './supabase'

export async function logAction({ sku_id, item_id, action, actor_name, details }) {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    sku_id,
    item_id,
    action,
    actor_id: user?.id,
    actor_name: actor_name || user?.user_metadata?.name || user?.email,
    details,
  })
}
