import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Input,
  Button,
  Space,
  Empty,
  message,
  Pagination,
  Upload,
  Typography,
  Tabs,
} from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { fetchWithAuth } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import type { MediaFile, MediaFileListResponse } from '@/types/media';

const { Text } = Typography;

interface MediaLibraryPickerProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (url: string) => void;
}

export default function MediaLibraryPicker({ open, onCancel, onSelect }: MediaLibraryPickerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('library');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(keyword && { keyword }),
      });

      const response = await fetchWithAuth(`/api/media-files?${params}`);
      const result = await response.json();

      if (result.success) {
        const listData: MediaFileListResponse = result.data;
        setFiles(listData.data);
        setTotal(listData.total);
      } else {
        message.error(result.error || '获取文件列表失败');
      }
    } catch (error) {
      console.error('获取文件列表失败:', error);
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setKeyword('');
      setSearchInput('');
      void fetchFiles();
    }
  }, [open, fetchFiles]);

  useEffect(() => {
    if (open) {
      void fetchFiles();
    }
  }, [open, fetchFiles]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setKeyword('');
    setPage(1);
  };

  const handleSelectFile = (file: MediaFile) => {
    onSelect(file.url);
    onCancel();
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: 'image/*',
    multiple: true,
    showUploadList: true,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        const formData = new FormData();
        formData.append('file', file as File);

        const response = await fetchWithAuth('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();

        if (result.success) {
          onSuccess?.(result, file as File);
          void fetchFiles();
          message.success('上传成功');
        } else {
          onError?.(new Error(result.error || '上传失败'));
          message.error(result.error || '上传失败');
        }
      } catch (error) {
        console.error('上传失败:', error);
        onError?.(error as Error);
        message.error('上传失败');
      }
    },
  };

  const tabItems = [
    {
      key: 'library',
      label: '媒体库',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="搜索文件名"
                allowClear
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 240 }}
                prefix={<SearchOutlined />}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>

          {files.length === 0 && !loading ? (
            <Empty description="暂无图片，请上传或切换到上传标签" style={{ marginTop: 40 }} />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#1890ff';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(24,144,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#f0f0f0';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '100%',
                      background: '#f5f5f5',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={file.url}
                      alt={file.filename}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <FileImageOutlined
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 32,
                        color: '#ccc',
                        zIndex: 1,
                      }}
                    />
                  </div>
                  <div style={{ padding: 8 }}>
                    <Text ellipsis style={{ fontSize: 12, display: 'block' }}>
                      {file.filename}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatFileSize(file.size)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > 0 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Pagination
                size="small"
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'upload',
      label: '上传图片',
      children: (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Upload.Dragger {...uploadProps} style={{ maxWidth: 400, margin: '0 auto' }}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
            <p className="ant-upload-hint">支持 JPG、PNG、GIF、WebP 格式，单个文件不超过 10MB</p>
          </Upload.Dragger>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="从媒体库选择图片"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Modal>
  );
}
