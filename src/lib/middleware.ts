import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, getUserById, type JWTPayload } from './auth';
import { logAuditEvent, getClientIp, getUserAgent } from './audit-log';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: JWTPayload;
}

type ApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未提供认证令牌',
          },
        });
      }

      const token = authHeader.substring(7);

      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: '认证令牌无效或已过期',
          },
        });
      }

      const user = await getUserById(payload.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在',
          },
        });
      }

      req.user = payload;

      return handler(req, res);
    } catch (error) {
      console.error('认证中间件错误:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
        },
      });
    }
  };
}

export function withRole(roles: string[], handler: ApiHandler): ApiHandler {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权限执行此操作',
        },
      });
    }

    return handler(req, res);
  });
}

export function withAudit(handler: ApiHandler): ApiHandler {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const method = req.method || 'UNKNOWN';
    const endpoint = req.url || 'unknown';
    const isWriteOperation = WRITE_METHODS.includes(method);

    if (!isWriteOperation) {
      return handler(req, res);
    }

    const originalStatus = res.status.bind(res);
    let responseStatus = 200;
    const requestBody = req.body;

    const proxiedStatus = (code: number) => {
      responseStatus = code;
      return originalStatus(code);
    };

    (res as NextApiResponse & { status: (code: number) => NextApiResponse }).status = proxiedStatus;

    const originalJson = res.json.bind(res) as (body: unknown) => NextApiResponse;
    const proxiedJson = (body: unknown): NextApiResponse => {
      const result = originalJson(body);

      if (isWriteOperation) {
        queueMicrotask(() => {
          logAuditEvent({
            method,
            endpoint,
            requestBody,
            responseStatus,
            user: req.user || null,
            ipAddress: getClientIp(req) ?? undefined,
            userAgent: getUserAgent(req) ?? undefined,
          });
        });
      }

      return result;
    };

    (res as NextApiResponse & { json: (body: unknown) => NextApiResponse }).json = proxiedJson;

    try {
      await handler(req, res);
    } catch (error) {
      if (isWriteOperation) {
        queueMicrotask(() => {
          logAuditEvent({
            method,
            endpoint,
            requestBody,
            responseStatus: responseStatus || 500,
            user: req.user || null,
            ipAddress: getClientIp(req) ?? undefined,
            userAgent: getUserAgent(req) ?? undefined,
          });
        });
      }
      throw error;
    }
  };
}

export function composeHandlers(...middlewares: Array<(h: ApiHandler) => ApiHandler>): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight<ApiHandler>(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
