import type { NextApiResponse } from 'next';
import { getMediaFiles, deleteMediaFiles } from '@/lib/storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';
import { PAGINATION, SEARCH } from '@/lib/constants';

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

      const folderId = req.query.folderId
        ? (req.query.folderId as string)
        : req.query.folderId === 'null'
          ? null
          : undefined;

      const result = await getMediaFiles({ page, pageSize, keyword, folderId });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取媒体文件列表失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取媒体文件列表失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供要删除的媒体文件 ID',
        });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validIds = ids.filter((id) => typeof id === 'string' && uuidRegex.test(id));

      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '无效的媒体文件 ID 格式',
        });
      }

      const deletedCount = await deleteMediaFiles(validIds);

      return res.status(200).json({
        success: true,
        data: { deletedCount },
      });
    } catch (error) {
      console.error('删除媒体文件失败:', error);
      return res.status(500).json({
        success: false,
        error: '删除媒体文件失败',
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
