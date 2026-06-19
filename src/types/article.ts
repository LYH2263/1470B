import type { Tag } from './tag';

// 文章数据类型定义

export interface Article {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  importance: 'low' | 'medium' | 'high';
  views: number;
  content: string;
  reviewStatus: 'pending_review' | 'approved' | 'rejected';
  rejectReason?: string;
  tags?: Tag[];
}

export interface ArticleFormData {
  title: string;
  author: string;
  createdAt: string;
  importance: 'low' | 'medium' | 'high';
  content: string;
  tagIds?: string[];
  reviewStatus?: 'pending_review' | 'approved' | 'rejected';
}

export interface ArticleListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  tagId?: string;
  reviewStatus?: string;
}

export interface ArticleListResponse {
  data: Article[];                               // 文章列表
  total: number;                                 // 总条数
  page: number;                                  // 当前页码
  pageSize: number;                              // 每页条数
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
