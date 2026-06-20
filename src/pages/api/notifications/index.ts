import type { NextApiResponse } from 'next';
import { getNotifications, markAllNotificationsRead } from '@/lib/notification-storage';
import { PAGINATION } from '@/lib/constants';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未授权',
        });
      }

      const rawPage = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : NaN;
      const rawPageSize = typeof req.query.pageSize === 'string' ? parseInt(req.query.pageSize, 10) : NaN;

      const page = Math.max(
        PAGINATION.DEFAULT_PAGE,
        Number.isNaN(rawPage) ? PAGINATION.DEFAULT_PAGE : rawPage
      );
      const pageSize = Math.min(
        PAGINATION.MAX_PAGE_SIZE,
        Math.max(
          PAGINATION.MIN_PAGE_SIZE,
          Number.isNaN(rawPageSize) ? PAGINATION.DEFAULT_PAGE_SIZE : rawPageSize
        )
      );

      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await getNotifications(userId, { page, pageSize, unreadOnly });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取通知失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取通知失败',
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未授权',
        });
      }

      const count = await markAllNotificationsRead(userId);

      return res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('标记通知失败:', error);
      return res.status(500).json({
        success: false,
        error: '标记通知失败',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }
}

export default composeHandlers(withAuth, withAudit)(handler);
