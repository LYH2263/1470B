import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/articles/[id]/versions/index';
import type { ApiResponse } from '@/types/article';

vi.mock('@/lib/version-storage', () => ({
  getVersionsByArticleId: vi.fn(),
  getVersionById: vi.fn(),
  diffVersions: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  getArticleById: vi.fn(),
}));

import { getVersionsByArticleId, getVersionById, diffVersions } from '@/lib/version-storage';
import { getArticleById } from '@/lib/storage';

const validId = '123e4567-e89b-12d3-a456-426614174000';
const validVersionId = '223e4567-e89b-12d3-a456-426614174001';

const mockArticle = {
  id: validId,
  title: '测试文章',
  author: '测试作者',
  createdAt: '2024-01-01T00:00:00.000Z',
  importance: 'medium',
  views: 0,
  content: '<p>测试内容</p>',
};

const mockVersion = {
  id: validVersionId,
  articleId: validId,
  versionNumber: 1,
  title: '测试文章',
  content: '<p>测试内容</p>',
  author: '测试作者',
  importance: 'medium',
  modifiedBy: 'admin',
  changeSummary: '初始版本',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('API /api/articles/[id]/versions - 版本列表', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该返回版本列表', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);
    vi.mocked(getVersionsByArticleId).mockResolvedValue({
      data: [mockVersion],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'GET',
      query: { id: validId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(true);
    expect(jsonData.data.data).toHaveLength(1);
    expect(jsonData.data.data[0].versionNumber).toBe(1);
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

  it('应该返回 404 当文章不存在', async () => {
    vi.mocked(getArticleById).mockResolvedValue(null);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'GET',
      query: { id: validId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(false);
    expect(jsonData.error).toBe('文章不存在');
  });

  it('应该处理 diff 请求', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);
    const mockDiffResult = {
      oldVersion: mockVersion,
      newVersion: { ...mockVersion, id: '333', versionNumber: 2 },
      diffs: [
        {
          field: 'title',
          label: '标题',
          oldLines: [{ type: 'unchanged', content: '测试文章', lineNumber: 1 }],
          newLines: [{ type: 'unchanged', content: '测试文章', lineNumber: 1 }],
          hasChanges: false,
        },
        {
          field: 'content',
          label: '正文',
          oldLines: [{ type: 'removed', content: '旧内容', lineNumber: 1 }],
          newLines: [{ type: 'added', content: '新内容', lineNumber: 1 }],
          hasChanges: true,
        },
      ],
      hasChanges: true,
    };
    vi.mocked(diffVersions).mockResolvedValue(mockDiffResult as never);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'GET',
      query: {
        id: validId,
        action: 'diff',
        oldVersionId: validVersionId,
        newVersionId: '333e4567-e89b-12d3-a456-426614174002',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(true);
    expect(jsonData.data.hasChanges).toBe(true);
  });

  it('应该拒绝缺少版本 ID 的 diff 请求', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'GET',
      query: { id: validId, action: 'diff' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(false);
  });

  it('应该处理版本详情请求', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);
    vi.mocked(getVersionById).mockResolvedValue(mockVersion as never);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'GET',
      query: { id: validId, action: 'detail', versionId: validVersionId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.success).toBe(true);
    expect(jsonData.data.versionNumber).toBe(1);
  });

  it('应该拒绝不支持的 HTTP 方法', async () => {
    vi.mocked(getArticleById).mockResolvedValue(mockArticle as never);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse<ApiResponse>>({
      method: 'POST',
      query: { id: validId },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
