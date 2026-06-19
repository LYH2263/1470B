import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Article, ArticleFormData, ArticleListQuery, ArticleListResponse } from '@/types/article';
import type { Tag, TagFormData, TagListQuery, TagListResponse, TagWithCount } from '@/types/tag';
import { PAGINATION } from './constants';

// 辅助函数：将 Prisma 模型转换为 DTO
function mapArticleToDTO(article: {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  importance: string;
  views: number;
  content: string;
  updatedAt?: Date;
  tags?: {
    tag: {
      id: string;
      name: string;
      color: string;
      description?: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  }[];
}): Article {
  return {
    id: article.id,
    title: article.title,
    author: article.author,
    createdAt: article.createdAt.toISOString(),
    importance: article.importance as 'low' | 'medium' | 'high',
    views: article.views,
    content: article.content,
    tags: article.tags?.map((at) => mapTagToDTO(at.tag)),
  };
}

function mapTagToDTO(tag: {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Tag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    description: tag.description ?? undefined,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

// 获取文章列表（支持分页、搜索和标签筛选）
export async function getArticles(query: ArticleListQuery): Promise<ArticleListResponse> {
  const { page, pageSize, keyword, tagId } = query;

  const where: Prisma.ArticleWhereInput = {};

  if (keyword) {
    where.title = {
      contains: keyword,
    };
  }

  if (tagId) {
    where.tags = {
      some: {
        tagId,
      },
    };
  }

  // 获取总数和分页数据（并行执行）
  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // 转换数据格式
  const data = articles.map(mapArticleToDTO);

  return {
    data,
    total,
    page,
    pageSize,
  };
}

// 根据 ID 获取文章
export async function getArticleById(id: string): Promise<Article | null> {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!article) {
    return null;
  }

  return mapArticleToDTO(article);
}

// 创建文章（支持关联标签）
export async function createArticle(data: ArticleFormData): Promise<Article> {
  const article = await prisma.article.create({
    data: {
      title: data.title,
      author: data.author,
      createdAt: new Date(data.createdAt),
      importance: data.importance,
      content: data.content,
      views: 0,
      tags: data.tagIds && data.tagIds.length > 0
        ? {
            create: data.tagIds.map((tagId) => ({
              tag: {
                connect: { id: tagId },
              },
            })),
          }
        : undefined,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return mapArticleToDTO(article);
}

// 更新文章（支持更新标签关联）
export async function updateArticle(id: string, data: ArticleFormData): Promise<Article | null> {
  try {
    const article = await prisma.$transaction(async (tx) => {
      await tx.articleTag.deleteMany({
        where: { articleId: id },
      });

      const updatedArticle = await tx.article.update({
        where: { id },
        data: {
          title: data.title,
          author: data.author,
          createdAt: new Date(data.createdAt),
          importance: data.importance,
          content: data.content,
          tags: data.tagIds && data.tagIds.length > 0
            ? {
                create: data.tagIds.map((tagId) => ({
                  tag: {
                    connect: { id: tagId },
                  },
                })),
              }
            : undefined,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      return updatedArticle;
    });

    return mapArticleToDTO(article);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === 'P2025'
    ) {
      return null;
    }

    console.error('更新文章失败:', error);
    throw error;
  }
}

// 删除文章（支持批量删除）
export async function deleteArticles(ids: string[]): Promise<number> {
  const result = await prisma.article.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return result.count;
}

// 获取标签列表（支持分页和搜索）
export async function getTags(query: TagListQuery = {}): Promise<TagListResponse> {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    pageSize = PAGINATION.MAX_PAGE_SIZE,
    keyword,
  } = query;

  const where: Prisma.TagWhereInput = {};

  if (keyword) {
    where.name = {
      contains: keyword,
    };
  }

  const [total, tags] = await Promise.all([
    prisma.tag.count({ where }),
    prisma.tag.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = tags.map(mapTagToDTO);

  return {
    data,
    total,
    page,
    pageSize,
  };
}

// 获取所有标签（无分页）
export async function getAllTags(): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return tags.map(mapTagToDTO);
}

// 根据 ID 获取标签
export async function getTagById(id: string): Promise<Tag | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
  });

  if (!tag) {
    return null;
  }

  return mapTagToDTO(tag);
}

// 创建标签
export async function createTag(data: TagFormData): Promise<Tag> {
  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      color: data.color,
      description: data.description || null,
    },
  });

  return mapTagToDTO(tag);
}

// 更新标签
export async function updateTag(id: string, data: TagFormData): Promise<Tag | null> {
  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        description: data.description || null,
      },
    });

    return mapTagToDTO(tag);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === 'P2025'
    ) {
      return null;
    }

    console.error('更新标签失败:', error);
    throw error;
  }
}

// 删除标签（支持批量删除）
export async function deleteTags(ids: string[]): Promise<number> {
  const result = await prisma.tag.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return result.count;
}

// 获取热门标签（Top N）
export async function getPopularTags(limit: number = 10): Promise<TagWithCount[]> {
  const tagCounts = await prisma.articleTag.groupBy({
    by: ['tagId'],
    _count: {
      tagId: true,
    },
    orderBy: {
      _count: {
        tagId: 'desc',
      },
    },
    take: limit,
  });

  const tagIds = tagCounts.map((tc) => tc.tagId);

  const tags = await prisma.tag.findMany({
    where: {
      id: {
        in: tagIds,
      },
    },
  });

  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  return tagCounts
    .map((tc) => {
      const tag = tagMap.get(tc.tagId);
      if (!tag) return null;
      return {
        ...mapTagToDTO(tag),
        articleCount: tc._count.tagId,
      };
    })
    .filter((item): item is TagWithCount => item !== null);
}
