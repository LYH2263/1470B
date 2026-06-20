import type { NextApiResponse } from 'next';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware';
import { getAuditLogs, exportAuditLogs } from '@/lib/audit-log';
import { PAGINATION, SEARCH } from '@/lib/constants';
import type { ApiResponse } from '@/types/article';
import type { AuditLogListResponse } from '@/types/audit-log';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<AuditLogListResponse | unknown[]>>
) {
  if (req.method === 'GET') {
    try {
      const { export: exportFlag } = req.query;

      const rawPage = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : NaN;
      const rawPageSize = typeof req.query.pageSize === 'string' ? parseInt(req.query.pageSize, 10) : NaN;

      const page = Math.max(
        PAGINATION.DEFAULT_PAGE,
        Number.isNaN(rawPage) ? PAGINATION.DEFAULT_PAGE : rawPage
      );
      const pageSize = Math.min(
        PAGINATION.MAX_PAGE_SIZE,
        Math.max(
          PAGINATION.MIN_PAGE_SIZE,
          Number.isNaN(rawPageSize) ? PAGINATION.DEFAULT_PAGE_SIZE : rawPageSize
        )
      );

      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const username = typeof req.query.username === 'string'
        ? req.query.username.trim().slice(0, SEARCH.MAX_KEYWORD_LENGTH)
        : undefined;
      const action = typeof req.query.action === 'string' ? req.query.action : undefined;
      const method = typeof req.query.method === 'string' ? req.query.method : undefined;

      if (exportFlag === 'json') {
        const result = await exportAuditLogs({
          startDate,
          endDate,
          username,
          action,
          method,
        });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);

        return (res as NextApiResponse).status(200).json(result);
      }

      const result = await getAuditLogs({
        page,
        pageSize,
        startDate,
        endDate,
        username,
        action,
        method,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取审计日志失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取审计日志失败',
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method Not Allowed',
  });
}

export default withRole(['admin'], handler);
