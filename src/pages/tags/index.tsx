import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, message, Tag, Card, Form, ColorPicker } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Tag as TagType, TagListResponse } from '@/types/tag';
import { formatDate } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import type { TableProps } from 'antd';

interface TagFormValues {
  name: string;
  color: string;
  description?: string;
}

const presetColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

export default function TagsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TagType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [form] = Form.useForm<TagFormValues>();

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(keyword && { keyword }),
      });

      const response = await fetchWithAuth(`/api/tags?${params}`);
      const result = await response.json();

      if (result.success) {
        const listData: TagListResponse = result.data;
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
  }, [page, pageSize, keyword]);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setKeyword('');
    setPage(1);
  };

  const handleAdd = () => {
    setEditingTag(null);
    form.resetFields();
    form.setFieldsValue({ color: '#1890ff' });
    setModalVisible(true);
  };

  const handleEdit = (record: TagType) => {
    setEditingTag(record);
    form.setFieldsValue({
      name: record.name,
      color: record.color,
      description: record.description || '',
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个标签吗？删除后关联的文章标签也会被移除。',
      onOk: async () => {
        try {
          const response = await fetchWithAuth(`/api/tags/${id}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (result.success) {
            message.success('删除成功');
            fetchTags();
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
      message.warning('请选择要删除的标签');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个标签吗？`,
      onOk: async () => {
        try {
          const response = await fetchWithAuth('/api/tags', {
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
            fetchTags();
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
      const colorValue = typeof values.color === 'string' ? values.color : values.color;

      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
      const method = editingTag ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          color: colorValue,
          description: values.description,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(editingTag ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchTags();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const columns: TableProps<TagType>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TagType) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 120,
      render: (text: string) => (
        <Space>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              backgroundColor: text,
              border: '1px solid #d9d9d9',
            }}
          />
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
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
        <Card title="标签管理">
          <div style={{ marginBottom: '16px' }}>
            <Space>
              <Input
                placeholder="搜索标签名称"
                allowClear
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 300 }}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增标签
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
          title={editingTag ? '编辑标签' : '新增标签'}
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={() => setModalVisible(false)}
          destroyOnClose
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="标签名称"
              name="name"
              rules={[
                { required: true, message: '请输入标签名称' },
                { max: 50, message: '标签名称不能超过50个字符' },
              ]}
            >
              <Input placeholder="请输入标签名称" />
            </Form.Item>

            <Form.Item
              label="标签颜色"
              name="color"
              rules={[{ required: true, message: '请选择标签颜色' }]}
              getValueFromEvent={(e) => {
                if (e && typeof e === 'object' && 'toHexString' in e) {
                  return (e as { toHexString: () => string }).toHexString();
                }
                return e;
              }}
            >
              <ColorPicker
                showText
                presets={[
                  {
                    label: '推荐颜色',
                    colors: presetColors,
                  },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="描述"
              name="description"
              rules={[{ max: 200, message: '描述不能超过200个字符' }]}
            >
              <Input.TextArea
                placeholder="请输入标签描述（可选）"
                rows={3}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
