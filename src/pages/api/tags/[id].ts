import type { NextApiResponse } from 'next';
import { getTagById, updateTag, deleteTags } from '@/lib/storage';
import { TagSchema } from '@/lib/validation';
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
      error: '无效的标签 ID',
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: '无效的标签 ID 格式',
    });
  }

  if (req.method === 'GET') {
    // 获取标签详情
    try {
      const tag = await getTagById(id);

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: '标签不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: tag,
      });
    } catch (error) {
      console.error('获取标签详情失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取标签详情失败',
      });
    }
  } else if (req.method === 'PUT') {
    // 更新标签
    try {
      const body = req.body;

      const validationResult = TagSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0].message,
        });
      }

      const tag = await updateTag(id, validationResult.data);

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: '标签不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: tag,
      });
    } catch (error) {
      console.error('更新标签失败:', error);
      return res.status(500).json({
        success: false,
        error: '更新标签失败',
      });
    }
  } else if (req.method === 'DELETE') {
    // 删除标签
    try {
      const deletedCount = await deleteTags([id]);

      return res.status(200).json({
        success: true,
        data: { deletedCount },
      });
    } catch (error) {
      console.error('删除标签失败:', error);
      return res.status(500).json({
        success: false,
        error: '删除标签失败',
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
