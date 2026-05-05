import { supabaseAdmin } from '../config/supabase';

export async function createConversation(
  userId1: string,
  userId2: string,
  bookingId?: string
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .contains('participants', [userId1, userId2])
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      participants: [userId1, userId2],
      booking_id: bookingId || null,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error('Failed to create conversation');
  return data.id;
}
