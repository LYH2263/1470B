import type { NextApiResponse } from 'next';
import { getPendingReviewArticles, getReviewArticlesByStatus, approveArticle, rejectArticle } from '@/lib/review-storage';
import { getArticleAuthorUserId } from '@/lib/review-storage';
import { createNotification } from '@/lib/notification-storage';
import type { ApiResponse } from '@/types/article';
import { PAGINATION, SEARCH } from '@/lib/constants';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>
) {
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

      const keyword = req.query.keyword
        ? (req.query.keyword as string).trim().slice(0, SEARCH.MAX_KEYWORD_LENGTH)
        : undefined;

      const status = typeof req.query.status === 'string' ? req.query.status : undefined;

      let result;
      if (status && status !== 'pending_review') {
        result = await getReviewArticlesByStatus({ page, pageSize, keyword }, status);
      } else {
        result = await getPendingReviewArticles({ page, pageSize, keyword });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取审核列表失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取审核列表失败',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { articleId, action, reason } = req.body;

      if (!articleId || !action) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数',
        });
      }

      if (action === 'approve') {
        const article = await approveArticle(articleId);

        if (!article) {
          return res.status(404).json({
            success: false,
            error: '文章不存在',
          });
        }

        const authorUserId = await getArticleAuthorUserId(articleId);
        if (authorUserId) {
          await createNotification({
            userId: authorUserId,
            title: '文章审核通过',
            content: `您的文章「${article.title}」已通过审核`,
            type: 'review',
            articleId,
          });
        }

        return res.status(200).json({
          success: true,
          data: article,
        });
      } else if (action === 'reject') {
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: '驳回理由不能为空',
          });
        }

        if (reason.trim().length > 500) {
          return res.status(400).json({
            success: false,
            error: '驳回理由不能超过500个字符',
          });
        }

        const article = await rejectArticle(articleId, reason.trim());

        if (!article) {
          return res.status(404).json({
            success: false,
            error: '文章不存在',
          });
        }

        const authorUserId = await getArticleAuthorUserId(articleId);
        if (authorUserId) {
          await createNotification({
            userId: authorUserId,
            title: '文章审核驳回',
            content: `您的文章「${article.title}」被驳回，理由：${reason.trim()}`,
            type: 'review',
            articleId,
          });
        }

        return res.status(200).json({
          success: true,
          data: article,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: '无效的操作类型',
        });
      }
    } catch (error) {
      console.error('审核操作失败:', error);
      return res.status(500).json({
        success: false,
        error: '审核操作失败',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }
}

export default withRole(['admin'], handler);
