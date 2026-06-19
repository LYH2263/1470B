import { Button, Card, Space, Typography, Row, Col } from 'antd';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import TagCloud from '@/components/dashboard/TagCloud';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="控制台">
              <Typography.Paragraph>
                这是一个示例控制台页面。你可以在这里扩展统计信息、快捷入口等内容。
              </Typography.Paragraph>
              <Space>
                <Button type="primary" onClick={() => router.push('/')}>
                  前往文章管理
                </Button>
                <Button onClick={() => router.push('/articles/create')}>创建新文章</Button>
                <Button onClick={() => router.push('/tags')}>管理标签</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <TagCloud limit={10} />
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
}
