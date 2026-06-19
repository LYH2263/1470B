import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Favorite, FavoriteWithArticle, FavoriteListQuery, FavoriteListResponse } from '@/types/favorite';
import { generateSummary } from './utils';

function mapFavoriteToDTO(favorite: {
  id: string;
  userId: string;
  articleId: string;
  createdAt: Date;
}): Favorite {
  return {
    id: favorite.id,
    userId: favorite.userId,
    articleId: favorite.articleId,
    createdAt: favorite.createdAt.toISOString(),
  };
}

function mapFavoriteWithArticleToDTO(favorite: {
  id: string;
  userId: string;
  articleId: string;
  createdAt: Date;
  article: {
    id: string;
    title: string;
    author: string;
    content: string;
    createdAt: Date;
  };
}): FavoriteWithArticle {
  return {
    id: favorite.id,
    userId: favorite.userId,
    articleId: favorite.articleId,
    createdAt: favorite.createdAt.toISOString(),
    article: {
      id: favorite.article.id,
      title: favorite.article.title,
      author: favorite.article.author,
      content: favorite.article.content,
      createdAt: favorite.article.createdAt.toISOString(),
    },
    summary: generateSummary(favorite.article.content, 100),
  };
}

export async function createFavorite(userId: string, articleId: string): Promise<Favorite | null> {
  try {
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    if (existing) {
      return null;
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        articleId,
      },
    });

    return mapFavoriteToDTO(favorite);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return null;
      }
    }
    console.error('创建收藏失败:', error);
    throw error;
  }
}

export async function deleteFavorite(userId: string, articleId: string): Promise<boolean> {
  try {
    await prisma.favorite.delete({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });
    return true;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    console.error('删除收藏失败:', error);
    throw error;
  }
}

export async function deleteFavoriteById(id: string, userId: string): Promise<boolean> {
  try {
    await prisma.favorite.delete({
      where: {
        id,
        userId,
      },
    });
    return true;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    console.error('删除收藏失败:', error);
    throw error;
  }
}

export async function getFavoritesByUserId(userId: string, query: FavoriteListQuery): Promise<FavoriteListResponse> {
  const { page, pageSize } = query;

  const where: Prisma.FavoriteWhereInput = {
    userId,
  };

  const [total, favorites] = await Promise.all([
    prisma.favorite.count({ where }),
    prisma.favorite.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            author: true,
            content: true,
            createdAt: true,
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

  const data = favorites
    .filter((f) => f.article !== null)
    .map(mapFavoriteWithArticleToDTO);

  return {
    data,
    total,
    page,
    pageSize,
  };
}

export async function isFavorited(userId: string, articleId: string): Promise<boolean> {
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_articleId: {
        userId,
        articleId,
      },
    },
    select: {
      id: true,
    },
  });

  return favorite !== null;
}

export async function getFavoriteCount(articleId: string): Promise<number> {
  return prisma.favorite.count({
    where: {
      articleId,
    },
  });
}
