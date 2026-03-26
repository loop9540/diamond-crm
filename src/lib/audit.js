import { supabase } from './supabase'

export async function logAction({ sku_id, item_id, action, actor_name, details }) {
  const { data: { user } } = await supabase.auth.getUser()
  let name = actor_name
  if (!name && user) {
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
    name = profile?.name || user?.user_metadata?.name || user?.email
  }
  await supabase.from('audit_log').insert({
    sku_id,
    item_id,
    action,
    actor_id: user?.id,
    actor_name: name,
    details,
  })
}
