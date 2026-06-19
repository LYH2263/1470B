import type { NextApiResponse } from 'next';
import { getPopularTags } from '@/lib/storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'GET') {
    try {
      const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : NaN;
      const limit = Number.isNaN(rawLimit) ? 10 : Math.max(1, Math.min(50, rawLimit));

      const tags = await getPopularTags(limit);

      return res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (error) {
      console.error('获取热门标签失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取热门标签失败',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }
}

export default withAuth(handler);
