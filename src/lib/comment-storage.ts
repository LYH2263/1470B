import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import DOMPurify from 'isomorphic-dompurify';
import type { Comment, CommentFormData, CommentListQuery, CommentListResponse } from '@/types/comment';

function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

function mapCommentToDTO(comment: {
  id: string;
  articleId: string;
  nickname: string;
  email: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  article?: { title: string };
}): Comment {
  return {
    id: comment.id,
    articleId: comment.articleId,
    nickname: comment.nickname,
    email: comment.email,
    content: comment.content,
    status: comment.status as 'pending' | 'approved' | 'rejected',
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    articleTitle: comment.article?.title,
  };
}

export async function createComment(articleId: string, data: CommentFormData): Promise<Comment> {
  const comment = await prisma.comment.create({
    data: {
      articleId,
      nickname: sanitizeText(data.nickname),
      email: sanitizeText(data.email),
      content: sanitizeText(data.content),
      status: 'pending',
    },
  });

  return mapCommentToDTO(comment);
}

export async function getApprovedCommentsByArticleId(articleId: string): Promise<Comment[]> {
  const comments = await prisma.comment.findMany({
    where: {
      articleId,
      status: 'approved',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return comments.map(mapCommentToDTO);
}

export async function getComments(query: CommentListQuery): Promise<CommentListResponse> {
  const { page, pageSize, keyword, status } = query;

  const where: Prisma.CommentWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (keyword) {
    where.article = {
      title: {
        contains: keyword,
      },
    };
  }

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        article: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  return {
    data: comments.map(mapCommentToDTO),
    total,
    page,
    pageSize,
  };
}

export async function updateCommentStatus(id: string, status: 'approved' | 'rejected'): Promise<Comment | null> {
  try {
    const comment = await prisma.comment.update({
      where: { id },
      data: { status },
      include: {
        article: {
          select: {
            title: true,
          },
        },
      },
    });

    return mapCommentToDTO(comment);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function deleteComments(ids: string[]): Promise<number> {
  const result = await prisma.comment.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return result.count;
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      article: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!comment) {
    return null;
  }

  return mapCommentToDTO(comment);
}
