import { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Tree,
  Input,
  Button,
  Space,
  Card,
  Empty,
  message,
  Modal,
  Form,
  Pagination,
  Checkbox,
  Dropdown,
  Typography,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlusOutlined,
  FolderOutlined,
  FileImageOutlined,
  EditOutlined,
  MoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { MediaFile, MediaFolder, MediaFileListResponse } from '@/types/media';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface FolderFormValues {
  name: string;
}

function buildTreeData(folders: MediaFolder[]): DataNode[] {
  return folders.map((folder) => ({
    key: folder.id,
    title: (
      <span>
        <FolderOutlined style={{ marginRight: 4 }} />
        {folder.name}
        {folder.fileCount !== undefined && folder.fileCount > 0 && (
          <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>
            ({folder.fileCount})
          </span>
        )}
      </span>
    ),
    children: folder.children && folder.children.length > 0 ? buildTreeData(folder.children) : undefined,
  }));
}

export default function MediaPage() {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MediaFolder | null>(null);
  const [folderForm] = Form.useForm<FolderFormValues>();
  const [uploading, setUploading] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/media-folders');
      const result = await response.json();
      if (result.success) {
        setFolders(result.data);
      }
    } catch (error) {
      console.error('获取文件夹失败:', error);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(keyword && { keyword }),
        ...(selectedFolderId !== null && { folderId: selectedFolderId }),
        ...(selectedFolderId === null && keyword === '' && { folderId: 'null' }),
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
  }, [page, pageSize, keyword, selectedFolderId]);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setKeyword('');
    setPage(1);
  };

  const handleFolderSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) {
      setSelectedFolderId(null);
    } else {
      setSelectedFolderId(selectedKeys[0] as string);
    }
    setPage(1);
    setSelectedFileIds([]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        if (selectedFolderId) {
          formData.append('folderId', selectedFolderId);
        }

        try {
          const response = await fetchWithAuth('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            message.error(`${file.name}: ${result.error || '上传失败'}`);
          }
        } catch {
          message.error(`${file.name}: 上传失败`);
        }
      }

      if (successCount > 0) {
        message.success(`成功上传 ${successCount} 个文件`);
        void fetchFiles();
        void fetchFolders();
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCopyUrl = async (file: MediaFile) => {
    try {
      const fullUrl = window.location.origin + file.url;
      await navigator.clipboard.writeText(fullUrl);
      message.success('已复制 URL');
    } catch {
      message.error('复制失败');
    }
  };

  const handleDeleteFile = (file: MediaFile) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 "${file.filename}" 吗？`,
      onOk: async () => {
        try {
          const response = await fetchWithAuth(`/api/media-files/${file.id}`, {
            method: 'DELETE',
          });
          const result = await response.json();
          if (result.success) {
            message.success('删除成功');
            void fetchFiles();
            void fetchFolders();
            setSelectedFileIds((prev) => prev.filter((id) => id !== file.id));
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedFileIds.length === 0) {
      message.warning('请选择要删除的文件');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedFileIds.length} 个文件吗？`,
      onOk: async () => {
        try {
          const response = await fetchWithAuth('/api/media-files', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedFileIds }),
          });
          const result = await response.json();
          if (result.success) {
            message.success('删除成功');
            setSelectedFileIds([]);
            void fetchFiles();
            void fetchFolders();
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleAddFolder = () => {
    setEditingFolder(null);
    folderForm.resetFields();
    setFolderModalVisible(true);
  };

  const handleEditFolder = () => {
    if (!selectedFolderId) return;
    const findFolder = (list: MediaFolder[]): MediaFolder | null => {
      for (const f of list) {
        if (f.id === selectedFolderId) return f;
        if (f.children) {
          const found = findFolder(f.children);
          if (found) return found;
        }
      }
      return null;
    };
    const folder = findFolder(folders);
    if (folder) {
      setEditingFolder(folder);
      folderForm.setFieldsValue({ name: folder.name });
      setFolderModalVisible(true);
    }
  };

  const handleDeleteFolder = () => {
    if (!selectedFolderId) return;
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该文件夹吗？子文件夹和文件记录也会被删除。',
      onOk: async () => {
        try {
          const response = await fetchWithAuth(`/api/media-folders/${selectedFolderId}`, {
            method: 'DELETE',
          });
          const result = await response.json();
          if (result.success) {
            message.success('删除成功');
            setSelectedFolderId(null);
            void fetchFolders();
            void fetchFiles();
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleFolderModalOk = async () => {
    try {
      const values = await folderForm.validateFields();
      const url = editingFolder ? `/api/media-folders/${editingFolder.id}` : '/api/media-folders';
      const method = editingFolder ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          parentId: editingFolder ? editingFolder.parentId : selectedFolderId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success(editingFolder ? '更新成功' : '创建成功');
        setFolderModalVisible(false);
        void fetchFolders();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleFileSelect = (fileId: string, checked: boolean) => {
    setSelectedFileIds((prev) =>
      checked ? [...prev, fileId] : prev.filter((id) => id !== fileId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFileIds(files.map((f) => f.id));
    } else {
      setSelectedFileIds([]);
    }
  };

  const folderMenuItems: MenuProps['items'] = [
    {
      key: 'add',
      icon: <PlusOutlined />,
      label: '新建子文件夹',
      onClick: handleAddFolder,
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '重命名',
      disabled: !selectedFolderId,
      onClick: handleEditFolder,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除文件夹',
      disabled: !selectedFolderId,
      danger: true,
      onClick: handleDeleteFolder,
    },
  ];

  const treeData: DataNode[] = [
    {
      key: 'root',
      title: (
        <span>
          <FolderOutlined style={{ marginRight: 4 }} />
          全部文件
        </span>
      ),
      children: buildTreeData(folders),
    },
  ];

  return (
    <MainLayout>
      <Layout style={{ height: 'calc(100vh - 64px - 48px)', background: '#fff' }}>
        <Sider
          width={240}
          style={{
            background: '#fafafa',
            borderRight: '1px solid #f0f0f0',
            padding: '12px',
            overflow: 'auto',
          }}
        >
          <Space style={{ marginBottom: 12, width: '100%' }} direction="vertical">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFolder} block>
              新建文件夹
            </Button>
            {selectedFolderId && (
              <Dropdown menu={{ items: folderMenuItems }}>
                <Button icon={<MoreOutlined />} block>
                  文件夹操作
                </Button>
              </Dropdown>
            )}
          </Space>
          <Tree
            showLine
            defaultExpandAll
            selectedKeys={selectedFolderId ? [selectedFolderId] : ['root']}
            onSelect={handleFolderSelect}
            treeData={treeData}
          />
        </Sider>
        <Layout style={{ padding: '16px 24px', overflow: 'auto' }}>
          <Header
            style={{
              background: 'transparent',
              padding: 0,
              marginBottom: 16,
              height: 'auto',
              lineHeight: 'normal',
            }}
          >
            <Space wrap>
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
              <Button icon={<ReloadOutlined />} onClick={() => { void fetchFiles(); }}>
                刷新
              </Button>
              <div style={{ flex: 1 }} />
              <label style={{ display: 'inline-block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={uploading}
                  onClick={(e) => { e.preventDefault(); }}
                >
                  上传图片
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { void handleUpload(e); }}
                  disabled={uploading}
                />
              </label>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                disabled={selectedFileIds.length === 0}
              >
                批量删除 {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
              </Button>
            </Space>
            {selectedFileIds.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Checkbox
                  checked={selectedFileIds.length === files.length && files.length > 0}
                  indeterminate={selectedFileIds.length > 0 && selectedFileIds.length < files.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  全选当前页
                </Checkbox>
              </div>
            )}
          </Header>
          <Content>
            {files.length === 0 && !loading ? (
              <Empty description="暂无图片" style={{ marginTop: 80 }}>
                <label style={{ cursor: 'pointer' }}>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={(e) => { e.preventDefault(); }}
                  >
                    上传图片
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => { void handleUpload(e); }}
                  />
                </label>
              </Empty>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                {files.map((file) => (
                  <Card
                    key={file.id}
                    hoverable
                    styles={{ body: { padding: 8 } }}
                    cover={
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          paddingTop: '100%',
                          background: '#f5f5f5',
                          overflow: 'hidden',
                        }}
                      >
                        <Checkbox
                          style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 10,
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: 2,
                            padding: '2px 4px',
                          }}
                          checked={selectedFileIds.includes(file.id)}
                          onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                        />
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
                            fontSize: 48,
                            color: '#ccc',
                            zIndex: 1,
                          }}
                        />
                      </div>
                    }
                    actions={[
                      <Tooltip title="复制 URL" key="copy">
                        <CopyOutlined onClick={() => { void handleCopyUrl(file); }} />
                      </Tooltip>,
                      <Tooltip title="删除" key="delete">
                        <DeleteOutlined style={{ color: '#ff4d4f' }} onClick={() => handleDeleteFile(file)} />
                      </Tooltip>,
                    ]}
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis style={{ fontSize: 13 }}>
                          {file.filename}
                        </Text>
                      }
                      description={
                        <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>
                          <div>{formatFileSize(file.size)}</div>
                          <div>{formatDate(file.createdAt)}</div>
                        </div>
                      }
                    />
                  </Card>
                ))}
              </div>
            )}
            {total > 0 && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p) => {
                    setPage(p);
                    setSelectedFileIds([]);
                  }}
                  showTotal={(t) => `共 ${t} 个文件`}
                />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title={editingFolder ? '重命名文件夹' : '新建文件夹'}
        open={folderModalVisible}
        onOk={() => { void handleFolderModalOk(); }}
        onCancel={() => setFolderModalVisible(false)}
        destroyOnClose
      >
        <Form form={folderForm} layout="vertical">
          <Form.Item
            label="文件夹名称"
            name="name"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { max: 50, message: '名称不能超过 50 个字符' },
            ]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
        </Form>
      </Modal>
    </MainLayout>
  );
}
