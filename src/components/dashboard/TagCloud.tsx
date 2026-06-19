import { useState, useEffect } from 'react';
import { Card, Tag, Spin, Empty, Space } from 'antd';
import type { TagWithCount } from '@/types/tag';
import { fetchWithAuth } from '@/lib/api';

interface TagCloudProps {
  limit?: number;
}

export default function TagCloud({ limit = 10 }: TagCloudProps) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<TagWithCount[]>([]);

  useEffect(() => {
    const fetchPopularTags = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
        });
        const response = await fetchWithAuth(`/api/tags/popular?${params}`);
        const result = await response.json();
        if (result.success) {
          setTags(result.data);
        }
      } catch (error) {
        console.error('获取热门标签失败:', error);
      } finally {
        setLoading(false);
      }
    };
    void fetchPopularTags();
  }, [limit]);

  if (loading) {
    return (
      <Card title="热门标签" style={{ height: '100%' }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (tags.length === 0) {
    return (
      <Card title="热门标签" style={{ height: '100%' }}>
        <Empty description="暂无标签数据" />
      </Card>
    );
  }

  const maxCount = Math.max(...tags.map((t) => t.articleCount), 1);
  const minCount = Math.min(...tags.map((t) => t.articleCount), 1);

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return 16;
    const minSize = 14;
    const maxSize = 28;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minSize + ratio * (maxSize - minSize);
  };

  return (
    <Card title={`热门标签 Top${tags.length}`} style={{ height: '100%' }}>
      <Space wrap size={[12, 12]} style={{ padding: '16px 0' }}>
        {tags.map((tag) => (
          <Tag
            key={tag.id}
            color={tag.color}
            style={{
              fontSize: `${getFontSize(tag.articleCount)}px`,
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {tag.name}
            <span
              style={{
                marginLeft: '8px',
                fontSize: '12px',
                opacity: 0.8,
              }}
            >
              {tag.articleCount}
            </span>
          </Tag>
        ))}
      </Space>
    </Card>
  );
}
