import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  message,
  Card,
  Form,
  Tag,
  Select,
  Tabs,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type {
  ArticleTemplate,
  ArticleTemplateListResponse,
} from '@/types/article-template';
import { formatDate, resolveTemplate, getDefaultTemplateVariables } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import RichTextEditor from '@/components/common/RichTextEditor';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { TableProps } from 'antd';

interface TemplateFormValues {
  name: string;
  category?: string;
  titleFormat: string;
  content: string;
}

const PRESET_CATEGORIES = ['通知公告', '技术文档', '新闻资讯', '产品介绍', '其他'];

export default function TemplatesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ArticleTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ArticleTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ArticleTemplate | null>(null);
  const [form] = Form.useForm<TemplateFormValues>();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(keyword && { keyword }),
        ...(categoryFilter && { category: categoryFilter }),
      });

      const response = await fetchWithAuth(`/api/article-templates?${params}`);
      const result = await response.json();

      if (result.success) {
        const listData: ArticleTemplateListResponse = result.data;
        setData(listData.data);
        setTotal(listData.total);
      } else {
        message.error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, categoryFilter]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setKeyword('');
    setCategoryFilter(undefined);
    setPage(1);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ArticleTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      name: record.name,
      category: record.category || '',
      titleFormat: record.titleFormat,
      content: record.content,
    });
    setModalVisible(true);
  };

  const handlePreview = (record: ArticleTemplate) => {
    setPreviewTemplate(record);
    setPreviewVisible(true);
  };

  const handleCopy = async (id: string) => {
    try {
      const response = await fetchWithAuth(`/api/article-templates/${id}/copy`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        message.success('复制成功');
        fetchTemplates();
      } else {
        message.error(result.error || '复制失败');
      }
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败');
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个模板吗？',
      onOk: async () => {
        try {
          const response = await fetchWithAuth(`/api/article-templates/${id}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (result.success) {
            message.success('删除成功');
            fetchTemplates();
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
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的模板');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个模板吗？`,
      onOk: async () => {
        try {
          const response = await fetchWithAuth('/api/article-templates', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: selectedRowKeys }),
          });

          const result = await response.json();

          if (result.success) {
            message.success('删除成功');
            setSelectedRowKeys([]);
            fetchTemplates();
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

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      const url = editingTemplate
        ? `/api/article-templates/${editingTemplate.id}`
        : '/api/article-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          category: values.category,
          titleFormat: values.titleFormat,
          content: values.content,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(editingTemplate ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchTemplates();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const renderPreview = () => {
    if (!previewTemplate) return null;
    const variables = getDefaultTemplateVariables(user?.name);
    const resolved = resolveTemplate(previewTemplate, variables);

    return (
      <div>
        <Tabs
          items={[
            {
              key: 'raw',
              label: '原始模板',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>标题格式：</div>
                    <Input value={previewTemplate.titleFormat} readOnly />
                  </div>
                  <div>
                    <div style={{ color: '#666', marginBottom: 4 }}>正文骨架：</div>
                    <div
                      style={{
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        padding: 12,
                        minHeight: 200,
                        background: '#fafafa',
                      }}
                      dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'resolved',
              label: '渲染预览',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>解析后标题：</div>
                    <Input value={resolved.title} readOnly />
                  </div>
                  <div>
                    <div style={{ color: '#666', marginBottom: 4 }}>解析后内容：</div>
                    <div
                      style={{
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        padding: 12,
                        minHeight: 200,
                      }}
                      dangerouslySetInnerHTML={{ __html: resolved.content }}
                    />
                  </div>
                  <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
                    可用变量：{' '}
                    <code>{'{{date}}'}</code> 日期，
                    <code>{'{{author}}'}</code> 作者
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  };

  const columns: TableProps<ArticleTemplate>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text?: string) =>
        text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '标题格式',
      dataIndex: 'titleFormat',
      key: 'titleFormat',
      ellipsis: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record.id)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card title="文章模板管理">
          <div style={{ marginBottom: '16px' }}>
            <Space wrap>
              <Input
                placeholder="搜索模板名称或标题"
                allowClear
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 280 }}
              />
              <Select
                placeholder="筛选分类"
                allowClear
                style={{ width: 160 }}
                value={categoryFilter}
                onChange={(val) => {
                  setCategoryFilter(val);
                  setPage(1);
                }}
                options={PRESET_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增模板
              </Button>
              <Button
                danger
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
            </Space>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </Card>

        <Modal
          title={editingTemplate ? '编辑模板' : '新增模板'}
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={() => setModalVisible(false)}
          destroyOnClose
          width={720}
          okText="保存"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="模板名称"
              name="name"
              rules={[
                { required: true, message: '请输入模板名称' },
                { max: 100, message: '模板名称不能超过100个字符' },
              ]}
            >
              <Input placeholder="请输入模板名称，如：月度汇报模板" />
            </Form.Item>

            <Form.Item
              label="分类"
              name="category"
              rules={[{ max: 50, message: '分类不能超过50个字符' }]}
            >
              <Select
                placeholder="选择或输入分类（可选）"
                allowClear
                mode="tags"
                maxTagCount={1}
                options={PRESET_CATEGORIES.map((c) => ({ value: c, label: c }))}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="预设标题格式"
              name="titleFormat"
              rules={[
                { required: true, message: '请输入预设标题格式' },
                { max: 200, message: '标题格式不能超过200个字符' },
              ]}
              extra="可用变量：{{date}} 当前日期，{{author}} 当前作者"
            >
              <Input placeholder="例如：【{{date}}】月度工作汇报 - {{author}}" />
            </Form.Item>

            <Form.Item
              label="正文 HTML 骨架"
              name="content"
              rules={[{ required: true, message: '请输入正文模板内容' }]}
              extra="支持使用 {{date}}、{{author}} 等变量占位符"
            >
              <RichTextEditor placeholder="请输入正文模板内容..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="模板预览"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              关闭
            </Button>,
          ]}
          width={720}
          destroyOnClose
        >
          {renderPreview()}
        </Modal>
      </div>
    </MainLayout>
  );
}
