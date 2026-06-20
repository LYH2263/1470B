import type { NextApiResponse } from 'next';
import { getArticleById, updateArticle } from '@/lib/storage';
import { getVersionById, createVersion, generateChangeSummary } from '@/lib/version-storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id, versionId } = req.query;

  if (typeof id !== 'string' || typeof versionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的参数',
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id) || !uuidRegex.test(versionId)) {
    return res.status(400).json({
      success: false,
      error: '无效的 ID 格式',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    const article = await getArticleById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: '文章不存在',
      });
    }

    const version = await getVersionById(versionId);
    if (!version || version.articleId !== id) {
      return res.status(404).json({
        success: false,
        error: '版本不存在',
      });
    }

    const formData = {
      title: version.title,
      author: version.author,
      createdAt: article.createdAt,
      importance: version.importance as 'low' | 'medium' | 'high',
      content: version.content,
    };

    const updatedArticle = await updateArticle(id, formData);

    if (!updatedArticle) {
      return res.status(500).json({
        success: false,
        error: '回滚失败',
      });
    }

    const modifiedBy = req.user?.username || 'system';
    const summary = `回滚至版本 v${version.versionNumber}`;
    await createVersion({
      articleId: id,
      title: version.title,
      content: version.content,
      author: version.author,
      importance: version.importance,
      modifiedBy,
      changeSummary: summary,
    });

    return res.status(200).json({
      success: true,
      data: updatedArticle,
    });
  } catch (error) {
    console.error('回滚失败:', error);
    return res.status(500).json({
      success: false,
      error: '回滚失败',
    });
  }
}

export default composeHandlers(withAuth, withAudit)(handler);
