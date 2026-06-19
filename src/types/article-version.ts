export interface ArticleVersion {
  id: string;
  articleId: string;
  versionNumber: number;
  title: string;
  content: string;
  author: string;
  importance: string;
  modifiedBy: string;
  changeSummary?: string;
  createdAt: string;
}

export interface ArticleVersionListQuery {
  page?: number;
  pageSize?: number;
}

export interface ArticleVersionListResponse {
  data: ArticleVersion[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface FieldDiff {
  field: string;
  label: string;
  oldLines: DiffLine[];
  newLines: DiffLine[];
  hasChanges: boolean;
}

export interface VersionDiffResult {
  oldVersion: ArticleVersion;
  newVersion: ArticleVersion;
  diffs: FieldDiff[];
  hasChanges: boolean;
}
