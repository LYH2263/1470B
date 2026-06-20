import { prisma } from './prisma';
import { determineAction, type AuditLogQuery, type AuditLogListResponse } from '@/types/audit-log';
import type { JWTPayload } from './auth';

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'authorization'];
const SENSITIVE_REPLACEMENT = '***REDACTED***';
const REQUEST_BODY_MAX_LENGTH = 5000;
const RETENTION_DAYS = 90;

interface AuditLogData {
  userId?: string;
  username?: string;
  action?: string;
  method: string;
  endpoint: string;
  requestBody?: unknown;
  responseStatus: number;
  ipAddress?: string;
  userAgent?: string;
}

const auditQueue: AuditLogData[] = [];
let isProcessing = false;
let cleanupLastRun = 0;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

function maskSensitiveFields(obj: unknown, depth = 0): unknown {
  if (depth > 10 || obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveFields(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
        result[key] = SENSITIVE_REPLACEMENT;
      } else {
        result[key] = maskSensitiveFields(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

export function sanitizeRequestBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;

  try {
    const masked = maskSensitiveFields(body);
    let serialized = typeof masked === 'string' ? masked : JSON.stringify(masked);

    if (serialized.length > REQUEST_BODY_MAX_LENGTH) {
      serialized = serialized.slice(0, REQUEST_BODY_MAX_LENGTH) + '...(truncated)';
    }

    return serialized;
  } catch {
    return '[Unserializable body]';
  }
}

export function getClientIp(req: { headers?: Record<string, string | string[] | undefined>; connection?: { remoteAddress?: string } }): string | null {
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    return ips.split(',')[0].trim();
  }

  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }

  return req.connection?.remoteAddress || null;
}

export function getUserAgent(req: { headers?: Record<string, string | string[] | undefined> }): string | null {
  const ua = req.headers?.['user-agent'];
  if (!ua) return null;
  return Array.isArray(ua) ? ua[0] : ua;
}

async function processQueue(): Promise<void> {
  if (isProcessing || auditQueue.length === 0) return;

  isProcessing = true;

  try {
    const batch = auditQueue.splice(0, 100);

    const records = batch.map((item) => ({
      userId: item.userId || null,
      username: item.username || null,
      action: item.action || determineAction(item.method, item.endpoint),
      method: item.method,
      endpoint: item.endpoint,
      requestBody: sanitizeRequestBody(item.requestBody),
      responseStatus: item.responseStatus,
      ipAddress: item.ipAddress || null,
      userAgent: item.userAgent || null,
    }));

    await prisma.auditLog.createMany({ data: records });
  } catch (error) {
    console.error('审计日志批量写入失败:', error);
  } finally {
    isProcessing = false;

    if (auditQueue.length > 0) {
      setImmediate(processQueue);
    }
  }
}

export function queueAuditLog(data: AuditLogData): void {
  auditQueue.push(data);

  if (!isProcessing) {
    setImmediate(processQueue);
  }
}

async function cleanupOldLogs(): Promise<void> {
  const now = Date.now();
  if (now - cleanupLastRun < CLEANUP_INTERVAL) return;

  cleanupLastRun = now;

  try {
    const cutoffDate = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    if (result.count > 0) {
      console.log(`[AuditLog] 清理了 ${result.count} 条超过 ${RETENTION_DAYS} 天的审计日志`);
    }
  } catch (error) {
    console.error('清理过期审计日志失败:', error);
  }
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  queueAuditLog(data);
  cleanupOldLogs().catch(() => {});
}

export interface AuditLogInput {
  method: string;
  endpoint: string;
  requestBody?: unknown;
  responseStatus: number;
  user?: JWTPayload | null;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
}

export function logAuditEvent(input: AuditLogInput): void {
  createAuditLog({
    userId: input.user?.userId,
    username: input.user?.username,
    action: input.action,
    method: input.method,
    endpoint: input.endpoint,
    requestBody: input.requestBody,
    responseStatus: input.responseStatus,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

export async function getAuditLogs(query: AuditLogQuery): Promise<AuditLogListResponse> {
  const { page, pageSize, startDate, endDate, username, action, method } = query;

  const where: Record<string, unknown> = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = end;
    }
  }

  if (username) {
    where.username = { contains: username, mode: 'insensitive' };
  }

  if (action) {
    where.action = action;
  }

  if (method) {
    where.method = method;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function exportAuditLogs(query: Omit<AuditLogQuery, 'page' | 'pageSize'>): Promise<unknown[]> {
  const { startDate, endDate, username, action, method } = query;

  const where: Record<string, unknown> = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = end;
    }
  }

  if (username) {
    where.username = { contains: username, mode: 'insensitive' };
  }

  if (action) {
    where.action = action;
  }

  if (method) {
    where.method = method;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    username: log.username,
    action: log.action,
    method: log.method,
    endpoint: log.endpoint,
    requestBody: log.requestBody,
    responseStatus: log.responseStatus,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  }));
}

export { RETENTION_DAYS };
