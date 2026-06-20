import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, withAudit, composeHandlers, type AuthenticatedRequest } from '@/lib/middleware';
import type { ReportSummary, Granularity, ReportApiResponse } from '@/types/report';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getPeriodKey(date: Date, granularity: Granularity): string {
  const d = dayjs(date);
  switch (granularity) {
    case 'week': {
      const year = d.isoWeekYear();
      const week = d.isoWeek();
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    case 'month': {
      return d.format('YYYY-MM');
    }
    case 'quarter': {
      const year = d.year();
      const quarter = d.quarter();
      return `${year}-Q${quarter}`;
    }
    default:
      return d.format('YYYY-MM');
  }
}

function generatePeriodKeys(startDate: string, endDate: string, granularity: Granularity): string[] {
  const periods: string[] = [];
  let current: dayjs.Dayjs;
  let end: dayjs.Dayjs;

  if (granularity === 'week') {
    current = dayjs(startDate).startOf('isoWeek' as any);
    end = dayjs(endDate).endOf('isoWeek' as any);
  } else if (granularity === 'month') {
    current = dayjs(startDate).startOf('month');
    end = dayjs(endDate).endOf('month');
  } else {
    current = dayjs(startDate).startOf('quarter' as any);
    end = dayjs(endDate).endOf('quarter' as any);
  }

  while (current.isBefore(end) || current.isSame(end)) {
    periods.push(getPeriodKey(current.toDate(), granularity));
    switch (granularity) {
      case 'week':
        current = current.add(1, 'week');
        break;
      case 'month':
        current = current.add(1, 'month');
        break;
      case 'quarter':
        current = current.add(3, 'month');
        break;
    }
  }

  return periods;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ReportApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    const { startDate, endDate, granularity } = req.query;

    const parsedGranularity: Granularity =
      granularity === 'week' || granularity === 'month' || granularity === 'quarter'
        ? granularity
        : 'month';

    let start: string;
    let end: string;

    if (startDate && endDate) {
      start = dayjs(startDate as string).startOf('day').toISOString();
      end = dayjs(endDate as string).endOf('day').toISOString();
    } else {
      end = dayjs().endOf('day').toISOString();
      start = dayjs().subtract(3, 'month').startOf('day').toISOString();
    }

    const whereClause = {
      createdAt: {
        gte: new Date(start),
        lte: new Date(end),
      },
    };

    const periodKeys = generatePeriodKeys(
      dayjs(start).format('YYYY-MM-DD'),
      dayjs(end).format('YYYY-MM-DD'),
      parsedGranularity
    );

    const articlesInRange = await prisma.article.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        createdAt: true,
        importance: true,
        views: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const outputMap = new Map<string, number>();
    periodKeys.forEach((key) => outputMap.set(key, 0));

    articlesInRange.forEach((article) => {
      const periodKey = getPeriodKey(article.createdAt, parsedGranularity);
      if (outputMap.has(periodKey)) {
        outputMap.set(periodKey, outputMap.get(periodKey)! + 1);
      }
    });

    const articleOutput = periodKeys.map((period) => ({
      period,
      count: outputMap.get(period) || 0,
    }));

    const authorMap = new Map<
      string,
      { author: string; count: number; totalViews: number }
    >();

    articlesInRange.forEach((article) => {
      const existing = authorMap.get(article.author);
      if (existing) {
        existing.count += 1;
        existing.totalViews += article.views;
      } else {
        authorMap.set(article.author, {
          author: article.author,
          count: 1,
          totalViews: article.views,
        });
      }
    });

    const authorRanking = Array.from(authorMap.values()).sort((a, b) => b.count - a.count);

    const importanceMap = new Map<'low' | 'medium' | 'high', number>();
    importanceMap.set('low', 0);
    importanceMap.set('medium', 0);
    importanceMap.set('high', 0);

    articlesInRange.forEach((article) => {
      const imp = article.importance as 'low' | 'medium' | 'high';
      if (importanceMap.has(imp)) {
        importanceMap.set(imp, importanceMap.get(imp)! + 1);
      }
    });

    const importanceDistribution = Array.from(importanceMap.entries())
      .map(([importance, count]) => ({
        importance,
        count,
      }))
      .filter((item) => item.count > 0);

    const topViews = articlesInRange
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map((article) => ({
        id: article.id,
        title: article.title,
        author: article.author,
        views: article.views,
        createdAt: formatDate(article.createdAt),
      }));

    const totalArticles = articlesInRange.length;
    const totalViews = articlesInRange.reduce((sum, a) => sum + a.views, 0);
    const totalAuthors = authorMap.size;
    const avgViewsPerArticle = totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0;

    const result: ReportSummary = {
      articleOutput,
      authorRanking,
      importanceDistribution,
      topViews,
      summary: {
        totalArticles,
        totalAuthors,
        totalViews,
        avgViewsPerArticle,
      },
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取报表数据失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取报表数据失败',
    });
  }
}

export default composeHandlers(withAuth, withAudit)(handler);
