import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { page = 1, limit = 30 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const { data, count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  const unreadCount = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  res.json({
    success: true,
    data,
    total: count ?? 0,
    unread_count: unreadCount.count ?? 0,
  });
});

router.post('/read-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  await supabaseAdmin.rpc('mark_notifications_read', { p_user_id: userId });

  res.json({ success: true, message: 'All notifications marked as read' });
});

export default router;
