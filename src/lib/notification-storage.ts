import { prisma } from './prisma';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  articleId: string | null;
  createdAt: string;
}

export interface NotificationListQuery {
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

function mapNotificationToDTO(notification: {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  articleId: string | null;
  createdAt: Date;
}): Notification {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    content: notification.content,
    type: notification.type,
    isRead: notification.isRead,
    articleId: notification.articleId,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function createNotification(data: {
  userId: string;
  title: string;
  content: string;
  type?: string;
  articleId?: string;
}): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      content: data.content,
      type: data.type || 'review',
      articleId: data.articleId || null,
    },
  });

  return mapNotificationToDTO(notification);
}

export async function getNotifications(
  userId: string,
  query: NotificationListQuery
): Promise<NotificationListResponse> {
  const { page, pageSize, unreadOnly } = query;

  const where: { userId: string; isRead?: boolean } = { userId };

  if (unreadOnly) {
    where.isRead = false;
  }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: notifications.map(mapNotificationToDTO),
    total,
    page,
    pageSize,
    unreadCount,
  };
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return mapNotificationToDTO(notification);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
