import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Article, ArticleListQuery, ArticleListResponse } from '@/types/article';
import { PAGINATION } from './constants';

function mapArticleToDTO(article: {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  importance: string;
  views: number;
  content: string;
  updatedAt?: Date;
  reviewStatus: string;
  rejectReason?: string | null;
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
    reviewStatus: article.reviewStatus as 'pending_review' | 'approved' | 'rejected',
    rejectReason: article.rejectReason ?? undefined,
    tags: article.tags?.map((at) => ({
      id: at.tag.id,
      name: at.tag.name,
      color: at.tag.color,
      description: at.tag.description ?? undefined,
      createdAt: at.tag.createdAt.toISOString(),
      updatedAt: at.tag.updatedAt.toISOString(),
    })),
  };
}

export async function getPendingReviewArticles(query: ArticleListQuery): Promise<ArticleListResponse> {
  const { page, pageSize, keyword } = query;

  const where: Prisma.ArticleWhereInput = {
    reviewStatus: 'pending_review',
  };

  if (keyword) {
    where.title = { contains: keyword };
  }

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

  return {
    data: articles.map(mapArticleToDTO),
    total,
    page,
    pageSize,
  };
}

export async function approveArticle(id: string): Promise<Article | null> {
  try {
    const article = await prisma.article.update({
      where: { id },
      data: {
        reviewStatus: 'approved',
        rejectReason: null,
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
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function rejectArticle(id: string, reason: string): Promise<Article | null> {
  try {
    const article = await prisma.article.update({
      where: { id },
      data: {
        reviewStatus: 'rejected',
        rejectReason: reason,
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
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function getArticleAuthorUserId(articleId: string): Promise<string | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { author: true },
  });

  if (!article) return null;

  const user = await prisma.user.findFirst({
    where: { username: article.author },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function resubmitArticle(id: string): Promise<Article | null> {
  try {
    const article = await prisma.article.update({
      where: { id },
      data: {
        reviewStatus: 'pending_review',
        rejectReason: null,
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
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function getReviewArticlesByStatus(
  query: ArticleListQuery,
  status: string
): Promise<ArticleListResponse> {
  const { page = PAGINATION.DEFAULT_PAGE, pageSize = PAGINATION.DEFAULT_PAGE_SIZE, keyword } = query;

  const where: Prisma.ArticleWhereInput = {
    reviewStatus: status,
  };

  if (keyword) {
    where.title = { contains: keyword };
  }

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

  return {
    data: articles.map(mapArticleToDTO),
    total,
    page,
    pageSize,
  };
}
