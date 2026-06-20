import { useState, useEffect } from 'react';
import { Layout, Menu, Badge } from 'antd';
import { FileTextOutlined, DashboardOutlined, CommentOutlined, TagsOutlined, PictureOutlined, AuditOutlined, BellOutlined, StarOutlined, SafetyCertificateOutlined, FileSearchOutlined, BarChartOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import type { MenuProps } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';

const { Sider } = Layout;

export default function Sidebar() {
  const router = useRouter();
  const pathname = router.pathname;
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const response = await fetchWithAuth('/api/notifications?pageSize=1');
        const result = await response.json();
        if (result.success) {
          setUnreadCount(result.data.unreadCount || 0);
        }
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const isAdmin = user?.role === 'admin';

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '控制台',
    },
    {
      key: '/',
      icon: <FileTextOutlined />,
      label: '文章管理',
    },
    ...(isAdmin
      ? [
          {
            key: '/reviews',
            icon: <AuditOutlined />,
            label: '文章审核',
          },
          {
            key: '/audit-logs',
            icon: <SafetyCertificateOutlined />,
            label: '审计日志',
          },
        ]
      : []),
    {
      key: '/media',
      icon: <PictureOutlined />,
      label: '媒体库',
    },
    ...(isAdmin
      ? [
          {
            key: '/templates',
            icon: <FileSearchOutlined />,
            label: '模板管理',
          },
        ]
      : []),
    {
      key: '/tags',
      icon: <TagsOutlined />,
      label: '标签管理',
    },
    {
      key: '/comments',
      icon: <CommentOutlined />,
      label: '评论管理',
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '数据报表',
    },
    {
      key: '/favorites',
      icon: <StarOutlined />,
      label: '我的收藏',
    },
    {
      key: '/notifications',
      icon: (
        <Badge count={unreadCount} size="small" offset={[6, -2]}>
          <BellOutlined />
        </Badge>
      ),
      label: '通知',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  const selectedKey = pathname.startsWith('/articles') || pathname === '/' ? '/' : pathname;

  return (
    <Sider
      width={200}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={handleMenuClick}
        items={menuItems}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
}
