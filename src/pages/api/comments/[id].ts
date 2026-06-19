import type { NextApiResponse } from 'next';
import { updateCommentStatus, deleteComments } from '@/lib/comment-storage';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';
import type { ApiResponse } from '@/types/article';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的评论 ID',
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: '无效的评论 ID 格式',
    });
  }

  if (req.method === 'PUT') {
    try {
      const { status } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: '审核状态必须是 approved 或 rejected',
        });
      }

      const comment = await updateCommentStatus(id, status);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: '评论不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      console.error('审核评论失败:', error);
      return res.status(500).json({
        success: false,
        error: '审核评论失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const deletedCount = await deleteComments([id]);

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
