export interface Comment {
  id: string;
  articleId: string;
  nickname: string;
  email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  articleTitle?: string;
}

export interface CommentFormData {
  nickname: string;
  email: string;
  content: string;
}

export interface CommentListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface CommentListResponse {
  data: Comment[];
  total: number;
  page: number;
  pageSize: number;
}
