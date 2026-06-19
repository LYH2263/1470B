import { useEffect, useState } from 'react';
import { Card, Spin, message, Button, Space, Collapse, Alert, Tag } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import ArticleForm from '@/components/articles/ArticleForm';
import VersionHistory from '@/components/articles/VersionHistory';
import MainLayout from '@/components/layout/MainLayout';
import type { Article } from '@/types/article';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const reviewStatusMap: Record<string, { label: string; color: string }> = {
  pending_review: { label: '待审核', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;

    const fetchArticle = async () => {
      try {
        const response = await fetchWithAuth(`/api/articles/${id}`);
        const result = await response.json();

        if (result.success) {
          setArticle(result.data);
        } else {
          message.error(result.error || '获取文章失败');
        }
      } catch (error) {
        console.error('获取文章失败:', error);
        message.error('获取文章失败');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      </MainLayout>
    );
  }

  if (!article) {
    return (
      <MainLayout>
        <div style={{ padding: '24px' }}>
          <Card>文章不存在</Card>
        </div>
      </MainLayout>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        {article.reviewStatus === 'rejected' && article.rejectReason && (
          <Alert
            message="文章被驳回"
            description={`驳回理由：${article.rejectReason}`}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {article.reviewStatus === 'pending_review' && (
          <Alert
            message="文章待审核"
            description="此文章正在等待管理员审核"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Card
          title={
            <Space>
              <span>编辑文章</span>
              <Tag color={reviewStatusMap[article.reviewStatus]?.color}>
                {reviewStatusMap[article.reviewStatus]?.label}
              </Tag>
            </Space>
          }
          extra={
            <Space>
              {isAdmin && (
                <Button type="primary" form="article-form" htmlType="submit">
                  保存
                </Button>
              )}
              <Button onClick={() => router.back()}>返回</Button>
            </Space>
          }
        >
          <ArticleForm mode="edit" initialValues={article} formId="article-form" />
        </Card>

        {typeof id === 'string' && (
          <Collapse
            style={{ marginTop: 16 }}
            items={[
              {
                key: 'versions',
                label: (
                  <span>
                    <HistoryOutlined style={{ marginRight: 8 }} />
                    版本历史
                  </span>
                ),
                children: <VersionHistory articleId={id} />,
              },
            ]}
          />
        )}
      </div>
    </MainLayout>
  );
}
