import type { NextApiRequest, NextApiResponse } from 'next';
import { createComment, getApprovedCommentsByArticleId } from '@/lib/comment-storage';
import { CommentSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import type { ApiResponse } from '@/types/article';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '无效的文章 ID',
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: '无效的文章 ID 格式',
    });
  }

  if (req.method === 'GET') {
    try {
      const comments = await getApprovedCommentsByArticleId(id);

      return res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      console.error('获取评论失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取评论失败',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || 'unknown';

      const { allowed, remaining } = checkRateLimit(`comment:${clientIp}`);

      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (!allowed) {
        return res.status(429).json({
          success: false,
          error: '评论过于频繁，请稍后再试',
        });
      }

      const body = req.body;

      const validationResult = CommentSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0].message,
        });
      }

      const comment = await createComment(id, validationResult.data);

      return res.status(200).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      console.error('提交评论失败:', error);
      return res.status(500).json({
        success: false,
        error: '提交评论失败',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }
}

export default handler;
