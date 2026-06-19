import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/comments/index';
import singleHandler from '@/pages/api/comments/[id]';
import type { ApiResponse } from '@/types/article';

vi.mock('@/lib/comment-storage', () => ({
  getComments: vi.fn(),
  deleteComments: vi.fn(),
  updateCommentStatus: vi.fn(),
}));

vi.mock('@/lib/middleware', () => ({
  withAuth: (handler: any) => handler,
  withPermission: (perm: string, handler: any) => handler,
}));

import { getComments, deleteComments, updateCommentStatus } from '@/lib/comment-storage';

const validCommentId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockComment = {
  id: validCommentId,
  articleId: '123e4567-e89b-12d3-a456-426614174000',
  nickname: '测试用户',
  email: 'test@example.com',
  content: '测试评论',
  status: 'pending' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  articleTitle: '测试文章',
};

describe('API /api/comments - 管理端评论列表', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('应该返回评论列表', async () => {
      vi.mocked(getComments).mockResolvedValue({
        data: [mockComment],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'GET',
        query: { page: '1', pageSize: '10' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
      expect(jsonData.data).toHaveProperty('data');
      expect(jsonData.data).toHaveProperty('total');
    });

    it('应该支持按状态筛选', async () => {
      vi.mocked(getComments).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'GET',
        query: { status: 'pending' },
      });

      await handler(req, res);

      expect(getComments).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('应该忽略无效的状态值', async () => {
      vi.mocked(getComments).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'GET',
        query: { status: 'invalid' },
      });

      await handler(req, res);

      expect(getComments).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      );
    });
  });

  describe('DELETE', () => {
    it('应该成功删除评论', async () => {
      vi.mocked(deleteComments).mockResolvedValue(1);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'DELETE',
        body: { ids: [validCommentId] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
    });

    it('应该拒绝空 ID 数组', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'DELETE',
        body: { ids: [] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('应该拒绝无效的 ID 格式', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'DELETE',
        body: { ids: ['invalid-id'] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});

describe('API /api/comments/[id] - 单条评论操作', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT - 审核评论', () => {
    it('应该成功通过评论', async () => {
      vi.mocked(updateCommentStatus).mockResolvedValue({
        ...mockComment,
        status: 'approved',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'PUT',
        query: { id: validCommentId },
        body: { status: 'approved' },
      });

      await singleHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
    });

    it('应该成功拒绝评论', async () => {
      vi.mocked(updateCommentStatus).mockResolvedValue({
        ...mockComment,
        status: 'rejected',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'PUT',
        query: { id: validCommentId },
        body: { status: 'rejected' },
      });

      await singleHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('应该拒绝无效的审核状态', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'PUT',
        query: { id: validCommentId },
        body: { status: 'invalid' },
      });

      await singleHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('应该对不存在的评论返回404', async () => {
      vi.mocked(updateCommentStatus).mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'PUT',
        query: { id: validCommentId },
        body: { status: 'approved' },
      });

      await singleHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('DELETE - 删除单条评论', () => {
    it('应该成功删除评论', async () => {
      vi.mocked(deleteComments).mockResolvedValue(1);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'DELETE',
        query: { id: validCommentId },
      });

      await singleHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
    });

    it('应该拒绝无效的评论 ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
        method: 'DELETE',
        query: { id: 'invalid-id' },
      });

      await singleHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});
