import { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Spin, Tag, message, Space, Divider, List, Form, Input, Avatar, Empty } from 'antd';
import { UserOutlined, MessageOutlined, HistoryOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useRouter } from 'next/router';
import DOMPurify from 'isomorphic-dompurify';
import MainLayout from '@/components/layout/MainLayout';
import VersionHistory from '@/components/articles/VersionHistory';
import type { Article } from '@/types/article';
import type { Comment, CommentFormData } from '@/types/comment';
import { formatDate, importanceMap, formatReadingTime } from '@/lib/utils';
import { fetchWithAuth } from '@/lib/api';
import type { FavoriteCountResponse } from '@/types/favorite';

const reviewStatusMap: Record<string, { label: string; color: string }> = {
  pending_review: { label: '待审核', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

export default function ArticleDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [form] = Form.useForm<CommentFormData>();
  const [favoriteInfo, setFavoriteInfo] = useState<FavoriteCountResponse>({ count: 0, isFavorited: false });
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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

  useEffect(() => {
    if (!id) return;

    const fetchComments = async () => {
      setCommentsLoading(true);
      try {
        const response = await fetch(`/api/articles/${id}/comments`);
        const result = await response.json();

        if (result.success) {
          setComments(result.data);
        }
      } catch (error) {
        console.error('获取评论失败:', error);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchComments();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchFavoriteInfo = async () => {
      try {
        const response = await fetchWithAuth(`/api/articles/${id}/favorites`);
        const result = await response.json();

        if (result.success) {
          setFavoriteInfo(result.data);
        }
      } catch (error) {
        console.error('获取收藏信息失败:', error);
      }
    };

    fetchFavoriteInfo();
  }, [id]);

  const handleFavorite = async () => {
    if (!id || typeof id !== 'string') return;

    setFavoriteLoading(true);
    try {
      if (favoriteInfo.isFavorited) {
        const response = await fetchWithAuth('/api/favorites', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ articleId: id }),
        });
        const result = await response.json();
        if (result.success) {
          message.success('已取消收藏');
          setFavoriteInfo((prev) => ({ ...prev, isFavorited: false, count: prev.count - 1 }));
        } else {
          message.error(result.error || '取消收藏失败');
        }
      } else {
        const response = await fetchWithAuth('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ articleId: id }),
        });
        const result = await response.json();

        if (result.success) {
          message.success('收藏成功');
          setFavoriteInfo((prev) => ({ ...prev, isFavorited: true, count: prev.count + 1 }));
        } else {
          message.error(result.error || '收藏失败');
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSubmitComment = async (values: CommentFormData) => {
    if (!id) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/articles/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success('评论已提交，等待审核');
        form.resetFields();
      } else if (response.status === 429) {
        message.warning(result.error || '评论过于频繁，请稍后再试');
      } else {
        message.error(result.error || '提交评论失败');
      }
    } catch (error) {
      console.error('提交评论失败:', error);
      message.error('提交评论失败');
    } finally {
      setSubmitting(false);
    }
  };

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
          <Card>
            <p>文章不存在</p>
            <Button onClick={() => router.back()}>返回</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const importanceConfig = importanceMap[article.importance];

  const sanitizedContent = DOMPurify.sanitize(article.content);

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card
          title="文章详情"
          extra={
            <Space>
              <Button
                icon={favoriteInfo.isFavorited ? <StarFilled /> : <StarOutlined />}
                onClick={handleFavorite}
                loading={favoriteLoading}
                type={favoriteInfo.isFavorited ? 'primary' : 'default'}
                style={{ color: favoriteInfo.isFavorited ? '#faad14' : undefined }}
              >
                {favoriteInfo.isFavorited ? '已收藏' : '收藏'}
                <Tag color="gold" style={{ marginLeft: 8 }}>{favoriteInfo.count}</Tag>
              </Button>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                type={showVersionHistory ? 'primary' : 'default'}
              >
                版本历史
              </Button>
              <Button onClick={() => router.push(`/articles/${id}/edit`)}>编辑</Button>
              <Button onClick={() => router.back()}>返回</Button>
            </Space>
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="标题" span={2}>
              {article.title}
            </Descriptions.Item>
            <Descriptions.Item label="作者">
              {article.author}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDate(article.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="重要性">
              <Tag color={importanceConfig.color}>{importanceConfig.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="审核状态">
              <Tag color={reviewStatusMap[article.reviewStatus]?.color}>
                {reviewStatusMap[article.reviewStatus]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="阅读数">{article.views}</Descriptions.Item>
            <Descriptions.Item label="阅读时长">{formatReadingTime(article.content)}</Descriptions.Item>
            {article.reviewStatus === 'rejected' && article.rejectReason && (
              <Descriptions.Item label="驳回理由" span={2}>
                <span style={{ color: '#ff4d4f' }}>{article.rejectReason}</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="内容" span={2}>
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {showVersionHistory && typeof id === 'string' && (
          <div style={{ marginTop: 16 }}>
            <VersionHistory articleId={id} />
          </div>
        )}

        <Card
          title={
            <Space>
              <MessageOutlined />
              <span>评论区</span>
              <Tag>{comments.length}</Tag>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <div style={{ marginBottom: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitComment}
            >
              <Space style={{ width: '100%' }} size="middle">
                <Form.Item
                  name="nickname"
                  rules={[{ required: true, message: '请输入昵称' }, { max: 50, message: '昵称不超过50个字符' }]}
                  style={{ width: 200, marginBottom: 12 }}
                >
                  <Input placeholder="昵称" prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '邮箱格式不正确' },
                    { max: 100, message: '邮箱不超过100个字符' },
                  ]}
                  style={{ flex: 1, marginBottom: 12 }}
                >
                  <Input placeholder="邮箱" />
                </Form.Item>
              </Space>
              <Form.Item
                name="content"
                rules={[{ required: true, message: '请输入评论内容' }, { max: 2000, message: '评论内容不超过2000个字符' }]}
                style={{ marginBottom: 12 }}
              >
                <Input.TextArea rows={3} placeholder="写下你的评论..." />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交评论
                </Button>
                <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                  提交后需审核通过才会显示
                </span>
              </Form.Item>
            </Form>
          </div>

          <Divider />

          <Spin spinning={commentsLoading}>
            {comments.length === 0 ? (
              <Empty description="暂无评论" />
            ) : (
              <List
                dataSource={comments}
                renderItem={(comment) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space>
                          <span>{comment.nickname}</span>
                          <span style={{ fontSize: 12, color: '#999' }}>
                            {formatDate(comment.createdAt)}
                          </span>
                        </Space>
                      }
                      description={comment.content}
                    />
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </Card>
      </div>
    </MainLayout>
  );
}
