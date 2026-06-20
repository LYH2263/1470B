import type { NextApiResponse } from 'next';
import { deleteMediaFiles, getMediaFileById } from '@/lib/storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的媒体文件 ID',
    });
  }

  if (req.method === 'GET') {
    try {
      const file = await getMediaFileById(id);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: '媒体文件不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: file,
      });
    } catch (error) {
      console.error('获取媒体文件失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取媒体文件失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const deletedCount = await deleteMediaFiles([id]);

      if (deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: '媒体文件不存在',
        });
      }

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

export default composeHandlers(withAuth, withAudit)(handler);
