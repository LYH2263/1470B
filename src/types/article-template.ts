export interface ArticleTemplate {
  id: string;
  name: string;
  category?: string;
  titleFormat: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleTemplateFormData {
  name: string;
  category?: string;
  titleFormat: string;
  content: string;
}

export interface ArticleTemplateListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}

export interface ArticleTemplateListResponse {
  data: ArticleTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ResolvedTemplate {
  title: string;
  content: string;
}

export interface TemplateVariables {
  date?: string;
  author?: string;
  [key: string]: string | undefined;
}
