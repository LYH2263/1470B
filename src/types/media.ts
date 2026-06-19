export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  children?: MediaFolder[];
  fileCount?: number;
}

export interface MediaFolderFormData {
  name: string;
  parentId?: string | null;
}

export interface MediaFile {
  id: string;
  filename: string;
  storedName: string;
  url: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFileFormData {
  filename: string;
  storedName: string;
  url: string;
  mimeType: string;
  size: number;
  folderId?: string | null;
}

export interface MediaFileListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  folderId?: string | null;
}

export interface MediaFileListResponse {
  data: MediaFile[];
  total: number;
  page: number;
  pageSize: number;
}
