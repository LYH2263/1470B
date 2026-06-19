import { useState, useEffect, useCallback } from 'react';
import { List, Button, Space, Card, Empty, message, Modal, Tag, Typography } from 'antd';
import { DeleteOutlined, EyeOutlined, StarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { FavoriteWithArticle, FavoriteListResponse } from '@/types/favorite';

const { Text, Paragraph } = Typography;

export default function FavoritesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FavoriteWithArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await fetchWithAuth(`/api/favorites?${params}`);
      const result = await response.json();

      if (result.success) {
        const listData: FavoriteListResponse = result.data;
        setData(listData.data);
        setTotal(listData.total);
      } else {
        message.error(result.error || '获取收藏列表失败');
      }
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      message.error('获取收藏列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  const handleDelete = (favorite: FavoriteWithArticle) => {
    Modal.confirm({
      title: '取消收藏',
      content: `确定要取消收藏「${favorite.article.title}」吗？`,
      okText: '确定取消',
      cancelText: '保留收藏',
      onOk: async () => {
        try {
          const response = await fetchWithAuth('/api/favorites', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: favorite.id }),
          });

          const result = await response.json();

          if (result.success) {
            message.success('已取消收藏');
            fetchFavorites();
          } else {
            message.error(result.error || '取消收藏失败');
          }
        } catch (error) {
          console.error('取消收藏失败:', error);
          message.error('取消收藏失败');
        }
      },
    });
  };

  const handleViewArticle = (articleId: string) => {
    router.push(`/articles/${articleId}`);
  };

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card
          title={
            <Space>
              <StarOutlined style={{ color: '#faad14' }} />
              <span>我的收藏</span>
              <Tag color="blue">{total} 篇</Tag>
            </Space>
          }
        >
          {!loading && data.length === 0 ? (
            <Empty description="暂无收藏的文章" />
          ) : (
            <List
              loading={loading}
              dataSource={data}
              pagination={{
                current: page,
                pageSize,
                total,
                onChange: setPage,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条收藏`,
              }}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewArticle(item.article.id)}
                    >
                      查看详情
                    </Button>,
                    <Button
                      key="delete"
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(item)}
                    >
                      取消收藏
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 16, cursor: 'pointer' }} onClick={() => handleViewArticle(item.article.id)}>
                          {item.article.title}
                        </Text>
                      </Space>
                    }
                    description={
                      <div style={{ width: '100%' }}>
                        <Space size="large" style={{ marginBottom: 8 }}>
                          <span>作者：{item.article.author}</span>
                          <span>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            收藏时间：{formatDate(item.createdAt)}
                          </span>
                        </Space>
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: false }}
                          style={{ marginBottom: 0, color: '#666' }}
                        >
                          {item.summary}
                        </Paragraph>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
