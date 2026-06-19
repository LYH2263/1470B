export interface Favorite {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
  article?: {
    id: string;
    title: string;
    author: string;
    content: string;
    createdAt: string;
  };
}

export interface FavoriteWithArticle extends Favorite {
  article: {
    id: string;
    title: string;
    author: string;
    content: string;
    createdAt: string;
  };
  summary: string;
}

export interface FavoriteListQuery {
  page: number;
  pageSize: number;
}

export interface FavoriteListResponse {
  data: FavoriteWithArticle[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FavoriteCountResponse {
  count: number;
  isFavorited: boolean;
}
