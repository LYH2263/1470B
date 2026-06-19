import { useState, useEffect, useCallback } from 'react';
import { Card, List, Button, Space, Tag, Empty, Spin, message } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  articleId: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await fetchWithAuth(`/api/notifications?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data.data);
        setTotal(result.data.total);
        setUnreadCount(result.data.unreadCount);
      } else {
        message.error(result.error || '获取通知失败');
      }
    } catch (error) {
      console.error('获取通知失败:', error);
      message.error('获取通知失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${id}`, {
        method: 'PUT',
      });

      const result = await response.json();

      if (result.success) {
        fetchNotifications();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetchWithAuth('/api/notifications', {
        method: 'PUT',
      });

      const result = await response.json();

      if (result.success) {
        message.success('已全部标记为已读');
        fetchNotifications();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleClickNotification = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }
    if (notification.articleId) {
      router.push(`/articles/${notification.articleId}/edit`);
    }
  };

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card
          title={
            <Space>
              <BellOutlined />
              <span>通知</span>
              {unreadCount > 0 && <Tag color="red">{unreadCount} 条未读</Tag>}
            </Space>
          }
          extra={
            unreadCount > 0 && (
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={handleMarkAllRead}
              >
                全部标记已读
              </Button>
            )
          }
        >
          <Spin spinning={loading}>
            {data.length === 0 ? (
              <Empty description="暂无通知" />
            ) : (
              <List
                dataSource={data}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      background: item.isRead ? 'transparent' : '#f6ffed',
                      padding: '12px 16px',
                      cursor: item.articleId ? 'pointer' : 'default',
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                    onClick={() => handleClickNotification(item)}
                    actions={[
                      !item.isRead && (
                        <Button
                          key="read"
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(item.id);
                          }}
                        >
                          标记已读
                        </Button>
                      ),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span style={{ fontWeight: item.isRead ? 400 : 600 }}>
                            {item.title}
                          </span>
                          {!item.isRead && <Tag color="blue" style={{ marginLeft: 4 }}>新</Tag>}
                        </Space>
                      }
                      description={
                        <div>
                          <div>{item.content}</div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: setPage,
                  showSizeChanger: false,
                  showTotal: (t) => `共 ${t} 条`,
                }}
              />
            )}
          </Spin>
        </Card>
      </div>
    </MainLayout>
  );
}
