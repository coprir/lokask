// backend/src/routes/messages.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { sendNotification } from '../services/notifications';

const router = Router();

const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  type: z.enum(['text', 'image', 'location']).default('text'),
  content: z.string().max(5000),
  image_url: z.string().url().optional(),
  location_data: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }).optional(),
});

const CreateConversationSchema = z.object({
  recipient_id: z.string().uuid(),
  booking_id: z.string().uuid().optional(),
  initial_message: z.string().max(1000).optional(),
});

// ─── GET /messages/conversations ─────────────────────────────

router.get('/conversations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(`
      *,
      last_message:messages(
        id, content, type, created_at, sender_id
      )
    `)
    .contains('participants', [userId])
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) throw new AppError('Failed to fetch conversations', 500);

  // Enrich with other participant info
  const enriched = await Promise.all(
    (data || []).map(async (conv) => {
      const otherId = conv.participants.find((p: string) => p !== userId);
      if (!otherId) return conv;

      const { data: other } = await supabaseAdmin
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', otherId)
        .single();

      // Unread count
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', userId);

      return { ...conv, other_user: other, unread_count: count ?? 0 };
    })
  );

  res.json({ success: true, data: enriched });
});

// ─── POST /messages/conversations — start conversation ────────

router.post('/conversations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { recipient_id, booking_id, initial_message } = CreateConversationSchema.parse(req.body);
  const userId = req.user!.id;

  // Check if conversation already exists
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .contains('participants', [userId, recipient_id])
    .maybeSingle();

  let conversationId: string;

  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: conv, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        participants: [userId, recipient_id],
        booking_id: booking_id || null,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError('Failed to create conversation', 500);
    conversationId = conv.id;
  }

  // Send initial message if provided
  if (initial_message) {
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      type: 'text',
      content: initial_message,
    });
  }

  res.status(201).json({ success: true, data: { conversation_id: conversationId } });
});

// ─── GET /messages/:conversationId ───────────────────────────

router.get('/:conversationId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user!.id;
  const { before, limit = 50 } = req.query;

  // Verify participant
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('participants')
    .eq('id', conversationId)
    .single();

  if (!conv || !conv.participants.includes(userId)) {
    throw new AppError('Conversation not found', 404);
  }

  let query = supabaseAdmin
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (before) {
    query = query.lt('created_at', before as string);
  }

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch messages', 500);

  // Mark messages as read
  await supabaseAdmin
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
    .neq('sender_id', userId);

  res.json({ success: true, data: (data || []).reverse() });
});

// ─── POST /messages — send message ───────────────────────────

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const body = SendMessageSchema.parse(req.body);
  const userId = req.user!.id;

  // Verify participant
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('participants')
    .eq('id', body.conversation_id)
    .single();

  if (!conv || !conv.participants.includes(userId)) {
    throw new AppError('Conversation not found', 404);
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: body.conversation_id,
      sender_id: userId,
      type: body.type,
      content: body.content,
      image_url: body.image_url,
      location_data: body.location_data,
    })
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw new AppError('Failed to send message', 500);

  // Update conversation timestamp
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', body.conversation_id);

  // Push notification to recipient
  const recipientId = conv.participants.find((p: string) => p !== userId);
  if (recipientId) {
    const { data: sender } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: recipient } = await supabaseAdmin
      .from('users')
      .select('fcm_token')
      .eq('id', recipientId)
      .single();

    if (recipient?.fcm_token) {
      const preview = body.type === 'text'
        ? body.content.slice(0, 80)
        : body.type === 'image'
        ? '📷 Image'
        : '📍 Location';

      await sendNotification({
        token: recipient.fcm_token,
        title: sender?.full_name || 'New message',
        body: preview,
        data: {
          type: 'message',
          conversation_id: body.conversation_id,
        },
      });
    }
  }

  res.status(201).json({ success: true, data: message });
});

export default router;
