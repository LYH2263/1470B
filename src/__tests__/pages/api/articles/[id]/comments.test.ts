import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/articles/[id]/comments/index';
import type { ApiResponse } from '@/types/article';

vi.mock('@/lib/comment-storage', () => ({
  createComment: vi.fn(),
  getApprovedCommentsByArticleId: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 2 })),
}));

import { createComment, getApprovedCommentsByArticleId } from '@/lib/comment-storage';
import { checkRateLimit } from '@/lib/rate-limit';

const validArticleId = '123e4567-e89b-12d3-a456-426614174000';

const mockComment = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  articleId: validArticleId,
  nickname: '测试用户',
  email: 'test@example.com',
  content: '这是一条测试评论',
  status: 'pending' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('API /api/articles/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - 获取已通过评论', () => {
    it('应该返回指定文章的已通过评论', async () => {
      vi.mocked(getApprovedCommentsByArticleId).mockResolvedValue([mockComment]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'GET',
        query: { id: validArticleId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
      expect(Array.isArray(jsonData.data)).toBe(true);
      expect(getApprovedCommentsByArticleId).toHaveBeenCalledWith(validArticleId);
    });

    it('应该拒绝无效的文章 ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'GET',
        query: { id: 'invalid-id' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(false);
    });

    it('应该处理数据库错误', async () => {
      vi.mocked(getApprovedCommentsByArticleId).mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'GET',
        query: { id: validArticleId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(false);
    });
  });

  describe('POST - 提交评论', () => {
    it('应该成功提交评论', async () => {
      vi.mocked(createComment).mockResolvedValue(mockComment);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'POST',
        query: { id: validArticleId },
        body: {
          nickname: '测试用户',
          email: 'test@example.com',
          content: '这是一条测试评论',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
    });

    it('应该验证必填字段', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'POST',
        query: { id: validArticleId },
        body: {
          nickname: '测试用户',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(false);
    });

    it('应该验证邮箱格式', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'POST',
        query: { id: validArticleId },
        body: {
          nickname: '测试用户',
          email: 'invalid-email',
          content: '评论内容',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(false);
    });

    it('应该在频率限制时返回429', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0 });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'POST',
        query: { id: validArticleId },
        body: {
          nickname: '测试用户',
          email: 'test@example.com',
          content: '评论内容',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(429);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(false);
      expect(jsonData.error).toContain('频繁');
    });

    it('应该拒绝空昵称', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'POST',
        query: { id: validArticleId },
        body: {
          nickname: '',
          email: 'test@example.com',
          content: '评论内容',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('应该拒绝空格昵称', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'POST',
        query: { id: validArticleId },
        body: {
          nickname: '   ',
          email: 'test@example.com',
          content: '评论内容',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('不支持的 HTTP 方法', () => {
    it('应该拒绝 PUT 请求', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'PUT',
        query: { id: validArticleId },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});
