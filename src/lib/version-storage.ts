import { prisma } from './prisma';
import { PAGINATION } from './constants';
import type {
  ArticleVersion,
  ArticleVersionListQuery,
  ArticleVersionListResponse,
  DiffLine,
  FieldDiff,
  VersionDiffResult,
} from '@/types/article-version';

function mapVersionToDTO(version: {
  id: string;
  articleId: string;
  versionNumber: number;
  title: string;
  content: string;
  author: string;
  importance: string;
  modifiedBy: string;
  changeSummary: string | null;
  createdAt: Date;
}): ArticleVersion {
  return {
    id: version.id,
    articleId: version.articleId,
    versionNumber: version.versionNumber,
    title: version.title,
    content: version.content,
    author: version.author,
    importance: version.importance,
    modifiedBy: version.modifiedBy,
    changeSummary: version.changeSummary ?? undefined,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function createVersion(params: {
  articleId: string;
  title: string;
  content: string;
  author: string;
  importance: string;
  modifiedBy: string;
  changeSummary?: string;
}): Promise<ArticleVersion> {
  const lastVersion = await prisma.articleVersion.findFirst({
    where: { articleId: params.articleId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const version = await prisma.articleVersion.create({
    data: {
      articleId: params.articleId,
      versionNumber,
      title: params.title,
      content: params.content,
      author: params.author,
      importance: params.importance,
      modifiedBy: params.modifiedBy,
      changeSummary: params.changeSummary ?? null,
    },
  });

  return mapVersionToDTO(version);
}

export async function getVersionsByArticleId(
  articleId: string,
  query: ArticleVersionListQuery = {},
): Promise<ArticleVersionListResponse> {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  } = query;

  const where = { articleId };

  const [total, versions] = await Promise.all([
    prisma.articleVersion.count({ where }),
    prisma.articleVersion.findMany({
      where,
      orderBy: { versionNumber: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: versions.map(mapVersionToDTO),
    total,
    page,
    pageSize,
  };
}

export async function getVersionById(id: string): Promise<ArticleVersion | null> {
  const version = await prisma.articleVersion.findUnique({
    where: { id },
  });

  if (!version) return null;
  return mapVersionToDTO(version);
}

export async function getVersionByNumber(
  articleId: string,
  versionNumber: number,
): Promise<ArticleVersion | null> {
  const version = await prisma.articleVersion.findUnique({
    where: {
      articleId_versionNumber: { articleId, versionNumber },
    },
  });

  if (!version) return null;
  return mapVersionToDTO(version);
}

function computeLineDiff(oldText: string, newText: string): { oldLines: DiffLine[]; newLines: DiffLine[] } {
  const oldArr = oldText.split('\n');
  const newArr = newText.split('\n');

  const lcs = computeLCS(oldArr, newArr);

  const oldLines: DiffLine[] = [];
  const newLines: DiffLine[] = [];

  let oi = 0, ni = 0, li = 0;
  while (oi < oldArr.length || ni < newArr.length) {
    if (li < lcs.length && oi < oldArr.length && ni < newArr.length && oldArr[oi] === lcs[li] && newArr[ni] === lcs[li]) {
      oldLines.push({ type: 'unchanged', content: oldArr[oi], lineNumber: oi + 1 });
      newLines.push({ type: 'unchanged', content: newArr[ni], lineNumber: ni + 1 });
      oi++; ni++; li++;
    } else if (oi < oldArr.length && (li >= lcs.length || oldArr[oi] !== lcs[li])) {
      oldLines.push({ type: 'removed', content: oldArr[oi], lineNumber: oi + 1 });
      oi++;
    } else if (ni < newArr.length && (li >= lcs.length || newArr[ni] !== lcs[li])) {
      newLines.push({ type: 'added', content: newArr[ni], lineNumber: ni + 1 });
      ni++;
    } else {
      if (oi < oldArr.length) { oldLines.push({ type: 'removed', content: oldArr[oi], lineNumber: oi + 1 }); oi++; }
      if (ni < newArr.length) { newLines.push({ type: 'added', content: newArr[ni], lineNumber: ni + 1 }); ni++; }
    }
  }

  return { oldLines, newLines };
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  if (m === 0 || n === 0) return [];
  if (m * n > 5_000_000) {
    return computeLCSPatience(a, b);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

function computeLCSPatience(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  const common: { ai: number; bi: number; val: string }[] = [];

  for (let ai = 0; ai < a.length; ai++) {
    if (!bSet.has(a[ai])) continue;
    for (let bi = 0; bi < b.length; bi++) {
      if (a[ai] === b[bi]) {
        common.push({ ai, bi, val: a[ai] });
        break;
      }
    }
  }

  common.sort((x, y) => x.ai - y.ai || x.bi - y.bi);

  const patienceResult: { ai: number; bi: number; val: string }[] = [];
  for (const item of common) {
    let lo = 0, hi = patienceResult.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (patienceResult[mid].bi < item.bi) lo = mid + 1;
      else hi = mid;
    }
    if (lo === patienceResult.length) patienceResult.push(item);
    else patienceResult[lo] = item;
  }

  return patienceResult.map((x) => x.val);
}

function computeFieldDiff(
  field: string,
  label: string,
  oldValue: string,
  newValue: string,
): FieldDiff {
  if (oldValue === newValue) {
    const lines = oldValue.split('\n');
    return {
      field,
      label,
      oldLines: lines.map((c, i) => ({ type: 'unchanged' as const, content: c, lineNumber: i + 1 })),
      newLines: lines.map((c, i) => ({ type: 'unchanged' as const, content: c, lineNumber: i + 1 })),
      hasChanges: false,
    };
  }

  const { oldLines, newLines } = computeLineDiff(oldValue, newValue);
  return { field, label, oldLines, newLines, hasChanges: true };
}

export async function diffVersions(
  articleId: string,
  oldVersionId: string,
  newVersionId: string,
): Promise<VersionDiffResult | null> {
  const [oldVer, newVer] = await Promise.all([
    prisma.articleVersion.findUnique({ where: { id: oldVersionId } }),
    prisma.articleVersion.findUnique({ where: { id: newVersionId } }),
  ]);

  if (!oldVer || !newVer) return null;
  if (oldVer.articleId !== articleId || newVer.articleId !== articleId) return null;

  const oldDTO = mapVersionToDTO(oldVer);
  const newDTO = mapVersionToDTO(newVer);

  const diffs: FieldDiff[] = [
    computeFieldDiff('title', '标题', oldVer.title, newVer.title),
    computeFieldDiff('content', '正文', oldVer.content, newVer.content),
  ];

  return {
    oldVersion: oldDTO,
    newVersion: newDTO,
    diffs,
    hasChanges: diffs.some((d) => d.hasChanges),
  };
}

export async function generateChangeSummary(
  articleId: string,
  newTitle: string,
  newContent: string,
): Promise<string> {
  const lastVersion = await prisma.articleVersion.findFirst({
    where: { articleId },
    orderBy: { versionNumber: 'desc' },
  });

  if (!lastVersion) return '初始版本';

  const changes: string[] = [];
  if (lastVersion.title !== newTitle) changes.push('标题已修改');
  if (lastVersion.content !== newContent) changes.push('正文已修改');

  if (changes.length === 0) return '无变更';
  return changes.join('，');
}
