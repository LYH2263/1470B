import type { NextApiResponse } from 'next';
import { getComments, deleteComments } from '@/lib/comment-storage';
import { PAGINATION, SEARCH } from '@/lib/constants';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';
import type { ApiResponse } from '@/types/article';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'GET') {
    try {
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

      const keyword = req.query.keyword
        ? (req.query.keyword as string)
            .trim()
            .slice(0, SEARCH.MAX_KEYWORD_LENGTH)
        : undefined;

      const statusParam = req.query.status as string | undefined;
      const validStatuses = ['pending', 'approved', 'rejected'];
      const status = statusParam && validStatuses.includes(statusParam)
        ? statusParam as 'pending' | 'approved' | 'rejected'
        : undefined;

      const result = await getComments({ page, pageSize, keyword, status });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取评论列表失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取评论列表失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供要删除的评论 ID',
        });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validIds = ids.filter((id: unknown) => typeof id === 'string' && uuidRegex.test(id));

      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '无效的评论 ID 格式',
        });
      }

      const deletedCount = await deleteComments(validIds);

      return res.status(200).json({
        success: true,
        data: { deletedCount },
      });
    } catch (error) {
      console.error('删除评论失败:', error);
      return res.status(500).json({
        success: false,
        error: '删除评论失败',
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
