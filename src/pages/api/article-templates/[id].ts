import type { NextApiResponse } from 'next';
import { getArticleTemplateById, updateArticleTemplate, deleteArticleTemplates } from '@/lib/storage';
import { ArticleTemplateSchema } from '@/lib/validation';
import type { ApiResponse } from '@/types/article';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的模板 ID',
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: '无效的模板 ID 格式',
    });
  }

  if (req.method === 'GET') {
    try {
      const template = await getArticleTemplateById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: '模板不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('获取模板详情失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取模板详情失败',
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const body = req.body;

      const validationResult = ArticleTemplateSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0].message,
        });
      }

      const template = await updateArticleTemplate(id, validationResult.data);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: '模板不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('更新模板失败:', error);
      return res.status(500).json({
        success: false,
        error: '更新模板失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const deletedCount = await deleteArticleTemplates([id]);

      return res.status(200).json({
        success: true,
        data: { deletedCount },
      });
    } catch (error) {
      console.error('删除模板失败:', error);
      return res.status(500).json({
        success: false,
        error: '删除模板失败',
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
