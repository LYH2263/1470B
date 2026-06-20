import type { NextApiResponse } from 'next';
import {
  getAllMediaFolders,
  getFlatMediaFolders,
  createMediaFolder,
} from '@/lib/storage';
import type { ApiResponse } from '@/types/article';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'GET') {
    try {
      const { flat } = req.query;

      if (flat === 'true') {
        const folders = await getFlatMediaFolders();
        return res.status(200).json({
          success: true,
          data: folders,
        });
      }

      const folders = await getAllMediaFolders();
      return res.status(200).json({
        success: true,
        data: folders,
      });
    } catch (error) {
      console.error('获取文件夹列表失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取文件夹列表失败',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, parentId } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: '文件夹名称不能为空',
        });
      }

      const folder = await createMediaFolder({
        name: name.trim(),
        parentId: parentId || null,
      });

      return res.status(200).json({
        success: true,
        data: folder,
      });
    } catch (error) {
      console.error('创建文件夹失败:', error);
      return res.status(500).json({
        success: false,
        error: '创建文件夹失败',
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
