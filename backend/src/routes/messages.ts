// backend/src/routes/messages.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { sendNotification } from '../services/notifications';

const router = Router();

const SendMessageSchema = z.object({
  receiver_id: z.string().uuid(),
  content: z.string().max(5000).optional(),
  image_url: z.string().url().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  booking_id: z.string().uuid().optional(),
}).refine(
  (d) => d.content !== undefined || d.image_url !== undefined || d.location !== undefined,
  { message: 'At least one of content, image_url, or location must be provided' }
);

// ─── POST /messages — send a direct message ───────────────────

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const body = SendMessageSchema.parse(req.body);
  const senderId = req.user!.id;

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: body.receiver_id,
      content: body.content ?? null,
      image_url: body.image_url ?? null,
      location: body.location ?? null,
      booking_id: body.booking_id ?? null,
    })
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, name, profile_image)
    `)
    .single();

  if (error) throw new AppError('Failed to send message', 500);

  // Push notification to receiver
  const { data: receiver } = await supabaseAdmin
    .from('users')
    .select('fcm_token')
    .eq('id', body.receiver_id)
    .single();

  if (receiver?.fcm_token) {
    const { data: sender } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', senderId)
      .single();

    const preview = body.content
      ? body.content.slice(0, 80)
      : body.image_url
      ? 'Image'
      : 'Location';

    await sendNotification({
      token: receiver.fcm_token,
      title: sender?.name || 'New message',
      body: preview,
      data: { type: 'message', sender_id: senderId },
    });
  }

  res.status(201).json({ success: true, data: message });
});

// ─── GET /messages/conversations — inbox list ─────────────────

router.get('/conversations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Get distinct users this user has exchanged messages with
  const { data: sent } = await supabaseAdmin
    .from('messages')
    .select('receiver_id, created_at, content, image_url')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });

  const { data: received } = await supabaseAdmin
    .from('messages')
    .select('sender_id, created_at, content, image_url')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  // Collect unique partner IDs
  const partnerMap = new Map<string, { partner_id: string; last_message_at: string; preview: string }>();

  for (const m of (sent || [])) {
    const existing = partnerMap.get(m.receiver_id);
    if (!existing || m.created_at > existing.last_message_at) {
      partnerMap.set(m.receiver_id, {
        partner_id: m.receiver_id,
        last_message_at: m.created_at,
        preview: m.content || (m.image_url ? 'Image' : 'Location'),
      });
    }
  }

  for (const m of (received || [])) {
    const existing = partnerMap.get(m.sender_id);
    if (!existing || m.created_at > existing.last_message_at) {
      partnerMap.set(m.sender_id, {
        partner_id: m.sender_id,
        last_message_at: m.created_at,
        preview: m.content || (m.image_url ? 'Image' : 'Location'),
      });
    }
  }

  const partnerIds = Array.from(partnerMap.keys());
  if (partnerIds.length === 0) {
    res.json({ success: true, data: [] });
    return;
  }

  const { data: partners } = await supabaseAdmin
    .from('users')
    .select('id, name, profile_image')
    .in('id', partnerIds);

  const conversations = (partners || []).map((p) => {
    const thread = partnerMap.get(p.id)!;
    return {
      partner: p,
      last_message_at: thread.last_message_at,
      preview: thread.preview,
    };
  }).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));

  res.json({ success: true, data: conversations });
});

// ─── GET /messages/:userId — thread with a specific user ──────

router.get('/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { userId: otherId } = req.params;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabaseAdmin
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, name, profile_image)
    `, { count: 'exact' })
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),` +
      `and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError('Failed to fetch messages', 500);

  // Mark fetched messages as read where current user is receiver
  await supabaseAdmin
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', otherId)
    .eq('receiver_id', userId)
    .eq('is_read', false);

  res.json({
    success: true,
    data: data || [],
    total: count ?? 0,
    page,
    limit,
    has_more: (count ?? 0) > offset + limit,
  });
});

export default router;
