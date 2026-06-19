export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagFormData {
  name: string;
  color: string;
  description?: string;
}

export interface TagListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface TagListResponse {
  data: Tag[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TagWithCount extends Tag {
  articleCount: number;
}

export interface ArticleTag {
  articleId: string;
  tagId: string;
}
