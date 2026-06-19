import type { NextApiResponse } from 'next';
import { markNotificationRead } from '@/lib/notification-storage';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: '无效的通知 ID',
      });
    }

    const notification = await markNotificationRead(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: '通知不存在',
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('标记通知失败:', error);
    return res.status(500).json({
      success: false,
      error: '标记通知失败',
    });
  }
}

export default withAuth(handler);
