import { Card, Button, Space, Select, message, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ArticleForm from '@/components/articles/ArticleForm';
import MainLayout from '@/components/layout/MainLayout';
import { fetchWithAuth } from '@/lib/api';
import { resolveTemplate, getDefaultTemplateVariables } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { ArticleTemplate, ResolvedTemplate } from '@/types/article-template';

export default function CreateArticlePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [templateData, setTemplateData] = useState<ResolvedTemplate | undefined>();
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const response = await fetchWithAuth('/api/article-templates?all=true');
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data);
        }
      } catch (error) {
        console.error('获取模板列表失败:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };
    void fetchTemplates();
  }, []);

  const handleApplyTemplate = async (templateId: string | undefined) => {
    if (!templateId) {
      setTemplateData(undefined);
      setSelectedTemplateId(undefined);
      return;
    }

    setApplying(true);
    try {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        const variables = getDefaultTemplateVariables(user?.name);
        const resolved = resolveTemplate(template, variables);
        setTemplateData(resolved);
        setSelectedTemplateId(templateId);
        message.success('模板已应用，表单已自动填充');
      }
    } catch (error) {
      console.error('应用模板失败:', error);
      message.error('应用模板失败');
    } finally {
      setApplying(false);
    }
  };

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card
          title="创建文章"
          extra={
            <Space>
              <Button type="primary" form="article-form" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => router.back()}>返回</Button>
            </Space>
          }
        >
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div style={{ color: 'rgba(0, 0, 0, 0.88)', marginBottom: 8, fontWeight: 500 }}>
                  从模板创建（可选）
                </div>
                <Space.Compact style={{ width: '100%' }}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择一个模板以自动填充标题和内容"
                    allowClear
                    loading={templatesLoading}
                    value={selectedTemplateId}
                    onChange={handleApplyTemplate}
                    options={templates.map((t) => ({
                      value: t.id,
                      label: t.category ? `[${t.category}] ${t.name}` : t.name,
                    }))}
                    notFoundContent="暂无模板"
                  />
                  <Button
                    type="primary"
                    onClick={() => handleApplyTemplate(selectedTemplateId)}
                    loading={applying}
                    disabled={!selectedTemplateId}
                  >
                    应用模板
                  </Button>
                </Space.Compact>
              </div>
              {templateData && (
                <Alert
                  type="success"
                  showIcon
                  message="模板已应用"
                  description="您可以继续编辑下方的表单内容，模板内容仅作为初始填充。"
                />
              )}
            </Space>
          </div>

          <ArticleForm mode="create" formId="article-form" templateData={templateData} />
        </Card>
      </div>
    </MainLayout>
  );
}
