import type { NextApiResponse } from 'next';
import { copyArticleTemplate, getArticleTemplateById } from '@/lib/storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';
import { resolveTemplate, resolveTemplateVariables, getDefaultTemplateVariables } from '@/lib/utils';
import type { TemplateVariables } from '@/types/article-template';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id, action } = req.query;

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

  if (action === 'copy') {
    if (req.method === 'POST') {
      try {
        const copied = await copyArticleTemplate(id);

        if (!copied) {
          return res.status(404).json({
            success: false,
            error: '模板不存在',
          });
        }

        return res.status(200).json({
          success: true,
          data: copied,
        });
      } catch (error) {
        console.error('复制模板失败:', error);
        return res.status(500).json({
          success: false,
          error: '复制模板失败',
        });
      }
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method Not Allowed',
      });
    }
  }

  if (action === 'apply') {
    if (req.method === 'POST') {
      try {
        const template = await getArticleTemplateById(id);

        if (!template) {
          return res.status(404).json({
            success: false,
            error: '模板不存在',
          });
        }

        const variables: TemplateVariables = req.body?.variables || {};
        const resolved = resolveTemplate(template, variables);

        return res.status(200).json({
          success: true,
          data: resolved,
        });
      } catch (error) {
        console.error('应用模板失败:', error);
        return res.status(500).json({
          success: false,
          error: '应用模板失败',
        });
      }
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method Not Allowed',
      });
    }
  }

  return res.status(400).json({
    success: false,
    error: '无效的操作',
  });
}

export default composeHandlers(withAuth, withAudit)(handler);
