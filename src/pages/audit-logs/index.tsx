import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  DatePicker,
  Select,
  message,
  Card,
  Tag,
  Tooltip,
  Descriptions,
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import type { AuditLog, AuditLogListResponse, AuditAction } from '@/types/audit-log';
import type { TableProps } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

const { RangePicker } = DatePicker;

const actionLabels: Record<AuditAction, string> = {
  login: '用户登录',
  logout: '用户登出',
  create_article: '创建文章',
  update_article: '更新文章',
  delete_article: '删除文章',
  review_article: '审核文章',
  rollback_article: '回滚文章版本',
  create_tag: '创建标签',
  update_tag: '更新标签',
  delete_tag: '删除标签',
  create_comment: '创建评论',
  update_comment: '审核评论',
  delete_comment: '删除评论',
  add_favorite: '添加收藏',
  remove_favorite: '取消收藏',
  upload_media: '上传媒体文件',
  delete_media: '删除媒体文件',
  create_folder: '创建文件夹',
  delete_folder: '删除文件夹',
  read_notification: '标记通知已读',
  delete_notification: '删除通知',
  other: '其他操作',
};

const actionColors: Record<AuditAction, string> = {
  login: 'green',
  logout: 'default',
  create_article: 'blue',
  update_article: 'cyan',
  delete_article: 'red',
  review_article: 'purple',
  rollback_article: 'geekblue',
  create_tag: 'blue',
  update_tag: 'cyan',
  delete_tag: 'red',
  create_comment: 'blue',
  update_comment: 'cyan',
  delete_comment: 'red',
  add_favorite: 'gold',
  remove_favorite: 'default',
  upload_media: 'blue',
  delete_media: 'red',
  create_folder: 'blue',
  delete_folder: 'red',
  read_notification: 'cyan',
  delete_notification: 'red',
  other: 'default',
};

const methodColors: Record<string, string> = {
  POST: 'blue',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'cyan',
  GET: 'green',
};

const actionOptions = Object.entries(actionLabels).map(([value, label]) => ({
  value,
  label,
}));

const methodOptions = [
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

function formatDate(date: string | Dayjs | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchParams, setSearchParams] = useState({
    dateRange: null as [Dayjs, Dayjs] | null,
    username: '',
    action: undefined as AuditAction | undefined,
    method: undefined as string | undefined,
  });

  const [formValues, setFormValues] = useState({
    dateRange: null as [Dayjs, Dayjs] | null,
    username: '',
    action: undefined as AuditAction | undefined,
    method: undefined as string | undefined,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      void router.replace('/');
    }
  }, [user, router]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(searchParams.dateRange && {
          startDate: searchParams.dateRange[0].format('YYYY-MM-DD'),
          endDate: searchParams.dateRange[1].format('YYYY-MM-DD'),
        }),
        ...(searchParams.username && { username: searchParams.username }),
        ...(searchParams.action && { action: searchParams.action }),
        ...(searchParams.method && { method: searchParams.method }),
      });

      const response = await fetchWithAuth(`/api/audit-logs?${params}`);
      const result = await response.json();

      if (result.success) {
        const listData: AuditLogListResponse = result.data;
        setData(listData.data);
        setTotal(listData.total);
      } else {
        message.error(result.error || '获取审计日志失败');
      }
    } catch (error) {
      console.error('获取审计日志失败:', error);
      message.error('获取审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchParams]);

  useEffect(() => {
    if (user?.role === 'admin') {
      void fetchAuditLogs();
    }
  }, [fetchAuditLogs, user]);

  const handleSearch = () => {
    setSearchParams({ ...formValues });
    setPage(1);
  };

  const handleReset = () => {
    const empty = {
      dateRange: null as [Dayjs, Dayjs] | null,
      username: '',
      action: undefined as AuditAction | undefined,
      method: undefined as string | undefined,
    };
    setFormValues(empty);
    setSearchParams(empty);
    setPage(1);
  };

  const handleRefresh = () => {
    void fetchAuditLogs();
  };

  const handleView = (record: AuditLog) => {
    setSelectedLog(record);
    setDrawerOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        export: 'json',
        ...(searchParams.dateRange && {
          startDate: searchParams.dateRange[0].format('YYYY-MM-DD'),
          endDate: searchParams.dateRange[1].format('YYYY-MM-DD'),
        }),
        ...(searchParams.username && { username: searchParams.username }),
        ...(searchParams.action && { action: searchParams.action }),
        ...(searchParams.method && { method: searchParams.method }),
      });

      const response = await fetchWithAuth(`/api/audit-logs?${params}`);

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1]
        || `audit-logs-${Date.now()}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const renderRequestSummary = (requestBody: string | null) => {
    if (!requestBody) return '-';
    const display = requestBody.length > 80 ? requestBody.slice(0, 80) + '...' : requestBody;
    return (
      <Tooltip title={requestBody}>
        <code style={{ fontSize: '12px', color: '#666' }}>{display}</code>
      </Tooltip>
    );
  };

  const columns: TableProps<AuditLog>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 70,
      fixed: 'left',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => formatDate(text),
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text: string | null) => (
        <Tag color={text ? 'blue' : 'default'}>
          {text || '未登录'}
        </Tag>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: (text: string) => (
        <Tag color={(actionColors as Record<string, string>)[text] || 'default'}>
          {(actionLabels as Record<string, string>)[text] || text}
        </Tag>
      ),
      filters: actionOptions.map(({ label, value }) => ({ text: label, value })),
      onFilter: (value, record) => record.action === value,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 90,
      render: (text: string) => (
        <Tag color={methodColors[text] || 'default'}>{text}</Tag>
      ),
      filters: methodOptions.map(({ label, value }) => ({ text: label, value })),
      onFilter: (value, record) => record.method === value,
    },
    {
      title: '接口',
      dataIndex: 'endpoint',
      key: 'endpoint',
      width: 240,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <code style={{ fontSize: '12px' }}>{text}</code>
        </Tooltip>
      ),
    },
    {
      title: '请求摘要',
      dataIndex: 'requestBody',
      key: 'requestBody',
      width: 200,
      ellipsis: true,
      render: (text: string | null) => renderRequestSummary(text),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (text: string | null) => text || '-',
    },
    {
      title: '响应状态',
      dataIndex: 'responseStatus',
      key: 'responseStatus',
      width: 100,
      render: (status: number) => {
        const color = status >= 500 ? 'red' : status >= 400 ? 'orange' : status >= 300 ? 'cyan' : 'green';
        return <Tag color={color}>{status}</Tag>;
      },
      sorter: (a, b) => a.responseStatus - b.responseStatus,
    },
    {
      title: '操作',
      key: 'action_col',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  if (user && user.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card
          title={
            <Space>
              <SafetyOutlined />
              <span>审计日志</span>
              <Tag color="blue">保留 90 天</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
              >
                导出 JSON
              </Button>
            </Space>
          }
        >
          <div style={{ marginBottom: '16px' }}>
            <Space wrap size="middle">
              <RangePicker
                showTime
                value={formValues.dateRange}
                onChange={(dates) => setFormValues({ ...formValues, dateRange: dates as [Dayjs, Dayjs] | null })}
                placeholder={['开始时间', '结束时间']}
              />
              <Input
                placeholder="搜索用户名"
                allowClear
                prefix={<SafetyOutlined />}
                value={formValues.username}
                onChange={(e) => setFormValues({ ...formValues, username: e.target.value })}
                onPressEnter={handleSearch}
                style={{ width: 200 }}
              />
              <Select
                placeholder="操作类型"
                allowClear
                style={{ width: 180 }}
                value={formValues.action}
                onChange={(value) => setFormValues({ ...formValues, action: value })}
                options={actionOptions}
              />
              <Select
                placeholder="请求方法"
                allowClear
                style={{ width: 120 }}
                value={formValues.method}
                onChange={(value) => setFormValues({ ...formValues, method: value })}
                options={methodOptions}
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
            scroll={{ x: 1400 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
              showTotal: (t, range) => `第 ${range[0]}-${range[1]} 条，共 ${t} 条记录`,
            }}
          />
        </Card>

        <Drawer
          title="审计日志详情"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={640}
          destroyOnClose
        >
          {selectedLog && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="日志ID">
                <code style={{ fontSize: '12px' }}>{selectedLog.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="时间">
                {formatDate(selectedLog.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                {selectedLog.userId ? <code style={{ fontSize: '12px' }}>{selectedLog.userId}</code> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户名">
                <Tag color="blue">{selectedLog.username || '未登录'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                <Tag color={(actionColors as Record<string, string>)[selectedLog.action] || 'default'}>
                  {(actionLabels as Record<string, string>)[selectedLog.action] || selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="请求方法">
                <Tag color={methodColors[selectedLog.method] || 'default'}>
                  {selectedLog.method}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="接口路径">
                <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {selectedLog.endpoint}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="响应状态">
                <Tag color={
                  selectedLog.responseStatus >= 500 ? 'red'
                    : selectedLog.responseStatus >= 400 ? 'orange'
                    : selectedLog.responseStatus >= 300 ? 'cyan' : 'green'
                }>
                  {selectedLog.responseStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="IP 地址">
                {selectedLog.ipAddress || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="User-Agent">
                <div style={{ maxHeight: 80, overflow: 'auto', fontSize: '12px' }}>
                  {selectedLog.userAgent || '-'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="请求体（已脱敏）">
                <div style={{
                  maxHeight: 240,
                  overflow: 'auto',
                  backgroundColor: '#f6f8fa',
                  padding: '12px',
                  borderRadius: 4,
                }}>
                  <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {selectedLog.requestBody || '（空）'}
                  </pre>
                </div>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>
      </div>
    </MainLayout>
  );
}
