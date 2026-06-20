export type Granularity = 'week' | 'month' | 'quarter';

export interface ReportQuery {
  startDate: string;
  endDate: string;
  granularity: Granularity;
}

export interface ArticleOutputItem {
  period: string;
  count: number;
}

export interface AuthorRankItem {
  author: string;
  count: number;
  totalViews: number;
}

export interface ImportanceDistItem {
  importance: 'low' | 'medium' | 'high';
  count: number;
}

export interface TopViewItem {
  id: string;
  title: string;
  author: string;
  views: number;
  createdAt: string;
}

export interface ReportSummary {
  articleOutput: ArticleOutputItem[];
  authorRanking: AuthorRankItem[];
  importanceDistribution: ImportanceDistItem[];
  topViews: TopViewItem[];
  summary: {
    totalArticles: number;
    totalAuthors: number;
    totalViews: number;
    avgViewsPerArticle: number;
  };
}

export interface ReportApiResponse {
  success: boolean;
  data?: ReportSummary;
  error?: string;
  message?: string;
}
