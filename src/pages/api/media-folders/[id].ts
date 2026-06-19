import type { NextApiResponse } from 'next';
import { updateMediaFolder, deleteMediaFolder } from '@/lib/storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的文件夹 ID',
    });
  }

  if (req.method === 'PUT') {
    try {
      const { name, parentId } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: '文件夹名称不能为空',
        });
      }

      const folder = await updateMediaFolder(id, {
        name: name.trim(),
        parentId: parentId || null,
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: '文件夹不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: folder,
      });
    } catch (error) {
      console.error('更新文件夹失败:', error);
      return res.status(500).json({
        success: false,
        error: '更新文件夹失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await deleteMediaFolder(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: '文件夹不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      console.error('删除文件夹失败:', error);
      return res.status(500).json({
        success: false,
        error: '删除文件夹失败',
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
