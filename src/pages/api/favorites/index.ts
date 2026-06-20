import type { NextApiResponse } from 'next';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';
import { createFavorite, deleteFavoriteById, deleteFavorite, getFavoritesByUserId } from '@/lib/favorite-storage';
import type { ApiResponse } from '@/types/article';
import { PAGINATION } from '@/lib/constants';
import { z } from 'zod';

const FavoriteCreateSchema = z.object({
  articleId: z.string().uuid('无效的文章 ID 格式'),
});

const FavoriteDeleteSchema = z.union([
  z.object({
    id: z.string().uuid('无效的收藏 ID 格式'),
  }),
  z.object({
    articleId: z.string().uuid('无效的文章 ID 格式'),
  }),
]);

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '未授权',
    });
  }

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

      const result = await getFavoritesByUserId(userId, { page, pageSize });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取收藏列表失败',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const body = req.body;
      const validationResult = FavoriteCreateSchema.safeParse(body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0].message,
        });
      }

      const { articleId } = validationResult.data;
      const favorite = await createFavorite(userId, articleId);

      if (!favorite) {
        return res.status(400).json({
          success: false,
          error: '已收藏该文章',
        });
      }

      return res.status(200).json({
        success: true,
        data: favorite,
      });
    } catch (error) {
      console.error('收藏失败:', error);
      return res.status(500).json({
        success: false,
        error: '收藏失败',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const body = req.body;
      const validationResult = FavoriteDeleteSchema.safeParse(body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0].message,
        });
      }

      let deleted: boolean;
      if ('id' in validationResult.data) {
        deleted = await deleteFavoriteById(validationResult.data.id, userId);
      } else {
        deleted = await deleteFavorite(userId, validationResult.data.articleId);
      }

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: '收藏不存在',
        });
      }

      return res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      console.error('取消收藏失败:', error);
      return res.status(500).json({
        success: false,
        error: '取消收藏失败',
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
