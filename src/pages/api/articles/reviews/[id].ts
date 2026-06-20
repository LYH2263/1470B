import type { NextApiResponse } from 'next';
import { resubmitArticle, getArticleAuthorUserId } from '@/lib/review-storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
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
        error: '无效的文章 ID',
      });
    }

    const article = await resubmitArticle(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: '文章不存在',
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('重新提交审核失败:', error);
    return res.status(500).json({
      success: false,
      error: '重新提交审核失败',
    });
  }
}

export default composeHandlers(withAuth, withAudit)(handler);
