import { useState } from 'react';
import { Table, Tag, Button, Space, Popconfirm, message, Card } from 'antd';
import { RollbackOutlined, DiffOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatDate } from '@/lib/utils';
import { fetchWithAuth } from '@/lib/api';
import type { ArticleVersion } from '@/types/article-version';
import VersionDiff from './VersionDiff';

interface VersionHistoryProps {
  articleId: string;
}

export default function VersionHistory({ articleId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  const fetchVersions = async (p: number) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `/api/articles/${articleId}/versions?page=${p}&pageSize=20`
      );
      const result = await response.json();
      if (result.success) {
        setVersions(result.data.data);
        setTotal(result.data.total);
        setPage(p);
      }
    } catch (error) {
      console.error('获取版本列表失败:', error);
      message.error('获取版本列表失败');
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    void fetchVersions(1);
  });

  const handleRollback = async (version: ArticleVersion) => {
    try {
      const response = await fetchWithAuth(
        `/api/articles/${articleId}/versions/${version.id}/rollback`,
        { method: 'POST' }
      );
      const result = await response.json();
      if (result.success) {
        message.success(`已回滚至版本 v${version.versionNumber}`);
        void fetchVersions(1);
      } else {
        message.error(result.error || '回滚失败');
      }
    } catch (error) {
      console.error('回滚失败:', error);
      message.error('回滚失败');
    }
  };

  const handleDiffCompare = () => {
    if (selectedVersions.length !== 2) {
      message.warning('请选择两个版本进行对比');
      return;
    }
    setShowDiff(true);
  };

  const columns: ColumnsType<ArticleVersion> = [
    {
      title: '版本号',
      dataIndex: 'versionNumber',
      key: 'versionNumber',
      width: 80,
      render: (v: number) => <Tag color="blue">v{v}</Tag>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '修改人',
      dataIndex: 'modifiedBy',
      key: 'modifiedBy',
      width: 100,
    },
    {
      title: '变更摘要',
      dataIndex: 'changeSummary',
      key: 'changeSummary',
      width: 120,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '修改时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => formatDate(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ArticleVersion) => (
        <Popconfirm
          title={`确定回滚至版本 v${record.versionNumber}？`}
          description="回滚将创建新版本记录"
          onConfirm={() => handleRollback(record)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" icon={<RollbackOutlined />}>
            回滚
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="版本历史"
      extra={
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<DiffOutlined />}
            disabled={selectedVersions.length !== 2}
            onClick={handleDiffCompare}
          >
            对比所选版本
          </Button>
          <Button size="small" onClick={() => void fetchVersions(page)}>
            刷新
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={versions}
        loading={loading}
        size="small"
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => void fetchVersions(p),
          showTotal: (t) => `共 ${t} 个版本`,
          size: 'small',
        }}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: selectedVersions,
          onChange: (keys) => {
            if (keys.length <= 2) {
              setSelectedVersions(keys as string[]);
            } else {
              setSelectedVersions((keys as string[]).slice(-2));
            }
          },
        }}
      />

      {showDiff && selectedVersions.length === 2 && (
        <VersionDiff
          articleId={articleId}
          oldVersionId={selectedVersions[0]}
          newVersionId={selectedVersions[1]}
          onClose={() => setShowDiff(false)}
        />
      )}
    </Card>
  );
}
