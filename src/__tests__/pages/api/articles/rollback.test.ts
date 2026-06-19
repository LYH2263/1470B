import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/articles/[id]/versions/[versionId]/rollback';
import type { ApiResponse } from '@/types/article';

vi.mock('@/lib/storage', () => ({
  getArticleById: vi.fn(),
  updateArticle: vi.fn(),
}));

vi.mock('@/lib/version-storage', () => ({
  getVersionById: vi.fn(),
  createVersion: vi.fn(),
  generateChangeSummary: vi.fn(),
}));

import { getArticleById, updateArticle } from '@/lib/storage';
import { getVersionById, createVersion } from '@/lib/version-storage';

const validId = '123e4567-e89b-12d3-a456-426614174000';
const validVersionId = '223e4567-e89b-12d3-a456-426614174001';

const mockArticle = {
  id: validId,
  title: '当前标题',
  author: '测试作者',
  createdAt: '2024-01-01T00:00:00.000Z',
  importance: 'medium',
  views: 5,
  content: '<p>当前内容</p>',
};

const mockVersion = {
  id: validVersionId,
  articleId: validId,
  versionNumber: 1,
  title: '旧标题',
  content: '<p>旧内容</p>',
  author: '测试作者',
  importance: 'medium',
  modifiedBy: 'admin',
  changeSummary: '初始版本',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('API /api/articles/[id]/versions/[versionId]/rollback - 回滚', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该成功回滚到指定版本', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);
    vi.mocked(getVersionById).mockResolvedValue(mockVersion as never);
    vi.mocked(updateArticle).mockResolvedValue({
      ...mockArticle,
      title: '旧标题',
      content: '<p>旧内容</p>',
    } as never);
    vi.mocked(createVersion).mockResolvedValue({
      ...mockVersion,
      id: 'new-version-id',
      versionNumber: 2,
      changeSummary: '回滚至版本 v1',
    } as never);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'POST',
      query: { id: validId, versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(true);
    expect(updateArticle).toHaveBeenCalledWith(validId, expect.objectContaining({
      title: '旧标题',
      content: '<p>旧内容</p>',
    }));
    expect(createVersion).toHaveBeenCalledWith(expect.objectContaining({
      changeSummary: '回滚至版本 v1',
    }));
  });

  it('应该返回 404 当文章不存在', async () => {
    vi.mocked(getArticleById).mockResolvedValue(null);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'POST',
      query: { id: validId, versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(false);
    expect(jsonData.error).toBe('文章不存在');
  });

  it('应该返回 404 当版本不存在', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);
    vi.mocked(getVersionById).mockResolvedValue(null);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'POST',
      query: { id: validId, versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(false);
    expect(jsonData.error).toBe('版本不存在');
  });

  it('应该拒绝无效的 ID 格式', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'POST',
      query: { id: 'invalid', versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('应该拒绝非 POST 方法', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'GET',
      query: { id: validId, versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('版本 articleId 不匹配时应返回 404', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);
    vi.mocked(getVersionById).mockResolvedValue({
      ...mockVersion,
      articleId: 'different-article-id',
    } as never);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'POST',
      query: { id: validId, versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(false);
    expect(jsonData.error).toBe('版本不存在');
  });
});
