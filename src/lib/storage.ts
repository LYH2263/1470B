import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Article, ArticleFormData, ArticleListQuery, ArticleListResponse } from '@/types/article';
import type { Tag, TagFormData, TagListQuery, TagListResponse, TagWithCount } from '@/types/tag';
import type {
  MediaFile,
  MediaFileFormData,
  MediaFileListQuery,
  MediaFileListResponse,
  MediaFolder,
  MediaFolderFormData,
} from '@/types/media';
import type {
  ArticleTemplate,
  ArticleTemplateFormData,
  ArticleTemplateListQuery,
  ArticleTemplateListResponse,
} from '@/types/article-template';
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
  const { page, pageSize, keyword, tagId, reviewStatus } = query;

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

  if (reviewStatus) {
    where.reviewStatus = reviewStatus;
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
      reviewStatus: data.reviewStatus || 'pending_review',
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
          reviewStatus: data.reviewStatus,
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

// 媒体文件 DTO 转换
function mapMediaFileToDTO(file: {
  id: string;
  filename: string;
  storedName: string;
  url: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MediaFile {
  return {
    id: file.id,
    filename: file.filename,
    storedName: file.storedName,
    url: file.url,
    mimeType: file.mimeType,
    size: file.size,
    folderId: file.folderId,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

// 媒体文件夹 DTO 转换
function mapMediaFolderToDTO(folder: {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MediaFolder {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

// 创建媒体文件记录
export async function createMediaFile(data: MediaFileFormData): Promise<MediaFile> {
  const file = await prisma.mediaFile.create({
    data: {
      filename: data.filename,
      storedName: data.storedName,
      url: data.url,
      mimeType: data.mimeType,
      size: data.size,
      folderId: data.folderId || null,
    },
  });

  return mapMediaFileToDTO(file);
}

// 获取媒体文件列表（支持分页、搜索、按文件夹筛选）
export async function getMediaFiles(query: MediaFileListQuery = {}): Promise<MediaFileListResponse> {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    keyword,
    folderId,
  } = query;

  const where: Prisma.MediaFileWhereInput = {};

  if (keyword) {
    where.filename = {
      contains: keyword,
    };
  }

  if (folderId !== undefined && folderId !== null) {
    where.folderId = folderId;
  } else if (folderId === null) {
    where.folderId = null;
  }

  const [total, files] = await Promise.all([
    prisma.mediaFile.count({ where }),
    prisma.mediaFile.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = files.map(mapMediaFileToDTO);

  return {
    data,
    total,
    page,
    pageSize,
  };
}

// 根据 ID 获取单个媒体文件
export async function getMediaFileById(id: string): Promise<MediaFile | null> {
  const file = await prisma.mediaFile.findUnique({
    where: { id },
  });

  if (!file) return null;

  return mapMediaFileToDTO(file);
}

// 删除媒体文件（支持批量），不删除实际文件（可根据需求扩展）
export async function deleteMediaFiles(ids: string[]): Promise<number> {
  const result = await prisma.mediaFile.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return result.count;
}

// 获取所有文件夹（树形结构）
export async function getAllMediaFolders(): Promise<MediaFolder[]> {
  const folders = await prisma.mediaFolder.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: { files: true },
      },
    },
  });

  const folderMap = new Map<string, MediaFolder>();
  const rootFolders: MediaFolder[] = [];

  folders.forEach((folder) => {
    const dto: MediaFolder = {
      ...mapMediaFolderToDTO(folder),
      children: [],
      fileCount: folder._count.files,
    };
    folderMap.set(folder.id, dto);
  });

  folders.forEach((folder) => {
    const dto = folderMap.get(folder.id)!;
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children!.push(dto);
    } else {
      rootFolders.push(dto);
    }
  });

  return rootFolders;
}

// 获取扁平列表的所有文件夹
export async function getFlatMediaFolders(): Promise<MediaFolder[]> {
  const folders = await prisma.mediaFolder.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: { files: true },
      },
    },
  });

  return folders.map((folder) => ({
    ...mapMediaFolderToDTO(folder),
    fileCount: folder._count.files,
  }));
}

// 创建文件夹
export async function createMediaFolder(data: MediaFolderFormData): Promise<MediaFolder> {
  const folder = await prisma.mediaFolder.create({
    data: {
      name: data.name,
      parentId: data.parentId || null,
    },
  });

  return mapMediaFolderToDTO(folder);
}

// 更新文件夹
export async function updateMediaFolder(id: string, data: MediaFolderFormData): Promise<MediaFolder | null> {
  try {
    const folder = await prisma.mediaFolder.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId || null,
      },
    });

    return mapMediaFolderToDTO(folder);
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

    console.error('更新文件夹失败:', error);
    throw error;
  }
}

// 删除文件夹（级联删除子文件夹和文件记录）
export async function deleteMediaFolder(id: string): Promise<boolean> {
  try {
    await prisma.mediaFolder.delete({
      where: { id },
    });
    return true;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === 'P2025'
    ) {
      return false;
    }

    console.error('删除文件夹失败:', error);
    throw error;
  }
}

// 文章模板 DTO 转换
function mapArticleTemplateToDTO(template: {
  id: string;
  name: string;
  category: string | null;
  titleFormat: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): ArticleTemplate {
  return {
    id: template.id,
    name: template.name,
    category: template.category ?? undefined,
    titleFormat: template.titleFormat,
    content: template.content,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

// 获取模板列表（支持分页、搜索、分类筛选）
export async function getArticleTemplates(
  query: ArticleTemplateListQuery = {}
): Promise<ArticleTemplateListResponse> {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    keyword,
    category,
  } = query;

  const where: Prisma.ArticleTemplateWhereInput = {};

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { titleFormat: { contains: keyword } },
    ];
  }

  if (category) {
    where.category = category;
  }

  const [total, templates] = await Promise.all([
    prisma.articleTemplate.count({ where }),
    prisma.articleTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = templates.map(mapArticleTemplateToDTO);

  return {
    data,
    total,
    page,
    pageSize,
  };
}

// 获取所有模板（无分页，用于下拉选择）
export async function getAllArticleTemplates(): Promise<ArticleTemplate[]> {
  const templates = await prisma.articleTemplate.findMany({
    orderBy: { name: 'asc' },
  });

  return templates.map(mapArticleTemplateToDTO);
}

// 根据 ID 获取模板
export async function getArticleTemplateById(id: string): Promise<ArticleTemplate | null> {
  const template = await prisma.articleTemplate.findUnique({
    where: { id },
  });

  if (!template) return null;

  return mapArticleTemplateToDTO(template);
}

// 创建模板
export async function createArticleTemplate(
  data: ArticleTemplateFormData
): Promise<ArticleTemplate> {
  const template = await prisma.articleTemplate.create({
    data: {
      name: data.name,
      category: data.category || null,
      titleFormat: data.titleFormat,
      content: data.content,
    },
  });

  return mapArticleTemplateToDTO(template);
}

// 更新模板
export async function updateArticleTemplate(
  id: string,
  data: ArticleTemplateFormData
): Promise<ArticleTemplate | null> {
  try {
    const template = await prisma.articleTemplate.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category || null,
        titleFormat: data.titleFormat,
        content: data.content,
      },
    });

    return mapArticleTemplateToDTO(template);
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

    console.error('更新模板失败:', error);
    throw error;
  }
}

// 删除模板（支持批量）
export async function deleteArticleTemplates(ids: string[]): Promise<number> {
  const result = await prisma.articleTemplate.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return result.count;
}

// 复制模板
export async function copyArticleTemplate(id: string): Promise<ArticleTemplate | null> {
  const template = await prisma.articleTemplate.findUnique({
    where: { id },
  });

  if (!template) return null;

  const copied = await prisma.articleTemplate.create({
    data: {
      name: `${template.name} (副本)`,
      category: template.category,
      titleFormat: template.titleFormat,
      content: template.content,
    },
  });

  return mapArticleTemplateToDTO(copied);
}
