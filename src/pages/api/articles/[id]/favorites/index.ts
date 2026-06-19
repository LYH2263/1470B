import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';
import { getFavoriteCount, isFavorited } from '@/lib/favorite-storage';
import type { ApiResponse } from '@/types/article';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的文章 ID',
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: '无效的文章 ID 格式',
    });
  }

  if (req.method === 'GET') {
    try {
      const userId = req.user?.userId;

      const [count, favorited] = await Promise.all([
        getFavoriteCount(id),
        userId ? isFavorited(userId, id) : false,
      ]);

      return res.status(200).json({
        success: true,
        data: {
          count,
          isFavorited: favorited,
        },
      });
    } catch (error) {
      console.error('获取收藏信息失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取收藏信息失败',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }
}

export default function wrapper(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return withAuth(handler)(req, res);
  }
  return res.status(405).json({
    success: false,
    error: 'Method Not Allowed',
  });
}
