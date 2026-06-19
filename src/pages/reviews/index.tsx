import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, message, Tag, Card, Select, InputNumber } from 'antd';
import { SearchOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import type { Article, ArticleListResponse } from '@/types/article';
import { formatDate, importanceMap } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { TableProps } from 'antd';

const reviewStatusMap: Record<string, { label: string; color: string }> = {
  pending_review: { label: '待审核', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

export default function ReviewsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending_review');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(keyword && { keyword }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetchWithAuth(`/api/articles/reviews?${params}`);
      const result = await response.json();

      if (result.success) {
        const listData: ArticleListResponse = result.data;
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
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/');
      return;
    }
    void fetchReviews();
  }, [fetchReviews, user, router]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setKeyword('');
    setStatusFilter('pending_review');
    setPage(1);
  };

  const handleApprove = (id: string) => {
    Modal.confirm({
      title: '确认通过',
      content: '确定要通过这篇文章的审核吗？',
      onOk: async () => {
        try {
          const response = await fetchWithAuth('/api/articles/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ articleId: id, action: 'approve' }),
          });

          const result = await response.json();

          if (result.success) {
            message.success('审核通过');
            fetchReviews();
          } else {
            message.error(result.error || '操作失败');
          }
        } catch (error) {
          console.error('操作失败:', error);
          message.error('操作失败');
        }
      },
    });
  };

  const handleReject = (id: string, title: string) => {
    let rejectReason = '';

    Modal.confirm({
      title: `驳回文章：${title}`,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>请填写驳回理由：</p>
          <Input.TextArea
            id="reject-reason-input"
            rows={3}
            maxLength={500}
            placeholder="请输入驳回理由（必填）"
            onChange={(e) => {
              rejectReason = e.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        if (!rejectReason.trim()) {
          message.error('驳回理由不能为空');
          return Promise.reject();
        }

        try {
          const response = await fetchWithAuth('/api/articles/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ articleId: id, action: 'reject', reason: rejectReason.trim() }),
          });

          const result = await response.json();

          if (result.success) {
            message.success('已驳回');
            fetchReviews();
          } else {
            message.error(result.error || '操作失败');
          }
        } catch (error) {
          console.error('操作失败:', error);
          message.error('操作失败');
        }
      },
    });
  };

  const columns: TableProps<Article>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
    },
    {
      title: '审核状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 100,
      render: (status: string) => {
        const config = reviewStatusMap[status];
        return config ? <Tag color={config.color}>{config.label}</Tag> : status;
      },
    },
    {
      title: '驳回理由',
      dataIndex: 'rejectReason',
      key: 'rejectReason',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => formatDate(text),
    },
    {
      title: '重要性',
      dataIndex: 'importance',
      key: 'importance',
      width: 100,
      render: (importance: 'low' | 'medium' | 'high') => {
        const config = importanceMap[importance];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/articles/${record.id}`)}
          >
            查看
          </Button>
          {record.reviewStatus === 'pending_review' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleApprove(record.id)}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                danger
                onClick={() => handleReject(record.id, record.title)}
              >
                驳回
              </Button>
            </>
          )}
          {record.reviewStatus === 'rejected' && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleApprove(record.id)}
            >
              重新通过
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card title="文章审核">
          <div style={{ marginBottom: '16px' }}>
            <Space wrap>
              <Input
                placeholder="搜索标题"
                allowClear
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 220 }}
              />
              <Select
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                style={{ width: 120 }}
                options={[
                  { label: '待审核', value: 'pending_review' },
                  { label: '已通过', value: 'approved' },
                  { label: '已驳回', value: 'rejected' },
                ]}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
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
      </div>
    </MainLayout>
  );
}
