export interface AuditLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  method: string;
  endpoint: string;
  requestBody: string | null;
  responseStatus: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogQuery {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  username?: string;
  action?: string;
  method?: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create_article'
  | 'update_article'
  | 'delete_article'
  | 'review_article'
  | 'rollback_article'
  | 'create_tag'
  | 'update_tag'
  | 'delete_tag'
  | 'create_comment'
  | 'update_comment'
  | 'delete_comment'
  | 'add_favorite'
  | 'remove_favorite'
  | 'upload_media'
  | 'delete_media'
  | 'create_folder'
  | 'delete_folder'
  | 'read_notification'
  | 'delete_notification'
  | 'other';

export function determineAction(method: string, endpoint: string): AuditAction {
  const path = endpoint.replace(/\/+$/, '');

  if (path.endsWith('/api/auth/login')) return 'login';
  if (path.endsWith('/api/auth/logout')) return 'logout';

  if (/\/api\/articles\/[^/]+\/comments$/.test(path)) {
    return method === 'POST' ? 'create_comment' : 'other';
  }
  if (/\/api\/comments\/[^/]+$/.test(path)) {
    if (method === 'PUT') return 'update_comment';
    if (method === 'DELETE') return 'delete_comment';
  }
  if (path.endsWith('/api/comments')) {
    if (method === 'POST') return 'create_comment';
    if (method === 'DELETE') return 'delete_comment';
  }

  if (/\/api\/articles\/[^/]+\/favorites$/.test(path)) {
    return method === 'POST' ? 'add_favorite' : 'remove_favorite';
  }
  if (path.endsWith('/api/favorites')) {
    if (method === 'POST') return 'add_favorite';
    if (method === 'DELETE') return 'remove_favorite';
  }

  if (/\/api\/articles\/[^/]+\/versions\/[^/]+\/rollback$/.test(path)) {
    return 'rollback_article';
  }

  if (/\/api\/articles\/[^/]+\/reviews$/.test(path) || /\/api\/articles\/reviews\/[^/]+$/.test(path)) {
    return 'review_article';
  }
  if (path.endsWith('/api/articles/reviews')) {
    return 'review_article';
  }

  if (/\/api\/articles\/[^/]+$/.test(path)) {
    if (method === 'PUT') return 'update_article';
    if (method === 'DELETE') return 'delete_article';
  }
  if (path.endsWith('/api/articles')) {
    if (method === 'POST') return 'create_article';
    if (method === 'DELETE') return 'delete_article';
  }

  if (/\/api\/tags\/[^/]+$/.test(path)) {
    if (method === 'PUT') return 'update_tag';
    if (method === 'DELETE') return 'delete_tag';
  }
  if (path.endsWith('/api/tags')) {
    if (method === 'POST') return 'create_tag';
    if (method === 'DELETE') return 'delete_tag';
  }

  if (/\/api\/media-files\/[^/]+$/.test(path)) {
    return method === 'DELETE' ? 'delete_media' : 'other';
  }
  if (path.endsWith('/api/upload')) {
    return 'upload_media';
  }

  if (/\/api\/media-folders\/[^/]+$/.test(path)) {
    return method === 'DELETE' ? 'delete_folder' : 'other';
  }
  if (path.endsWith('/api/media-folders')) {
    return method === 'POST' ? 'create_folder' : 'other';
  }

  if (/\/api\/notifications\/[^/]+$/.test(path)) {
    if (method === 'PUT') return 'read_notification';
    if (method === 'DELETE') return 'delete_notification';
  }
  if (path.endsWith('/api/notifications')) {
    return method === 'DELETE' ? 'delete_notification' : 'other';
  }

  return 'other';
}
