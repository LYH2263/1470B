import { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, message, Tag, Button, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs, { type Dayjs } from 'dayjs';
import RichTextEditor from '@/components/common/RichTextEditor';
import type { Article, ArticleFormData } from '@/types/article';
import type { Tag as TagType } from '@/types/tag';
import type { ResolvedTemplate } from '@/types/article-template';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ArticleFormProps {
  initialValues?: Article;
  mode: 'create' | 'edit';
  formId?: string;
  templateData?: ResolvedTemplate;
}

interface ArticleFormValues {
  title: string;
  author: string;
  createdAt: Dayjs;
  importance: ArticleFormData['importance'];
  content: string;
  tagIds?: string[];
}

export default function ArticleForm({ initialValues, mode, formId, templateData }: ArticleFormProps) {
  const router = useRouter();
  const [form] = Form.useForm<ArticleFormValues>();
  const [tags, setTags] = useState<TagType[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (mode === 'create' && templateData) {
      form.setFieldsValue({
        title: templateData.title,
        content: templateData.content,
        author: user?.name || '',
      });
    }
  }, [mode, templateData, form, user]);

  useEffect(() => {
    const fetchTags = async () => {
      setTagsLoading(true);
      try {
        const response = await fetchWithAuth('/api/tags?all=true');
        const result = await response.json();
        if (result.success) {
          setTags(result.data);
        }
      } catch (error) {
        console.error('获取标签列表失败:', error);
      } finally {
        setTagsLoading(false);
      }
    };
    void fetchTags();
  }, []);

  const tagOptions = tags.map((tag) => ({
    value: tag.id,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag color={tag.color}>{tag.name}</Tag>
      </span>
    ),
  }));

  const onSubmit = async (values: ArticleFormValues, reviewStatus?: ArticleFormData['reviewStatus']) => {
    setSubmitting(true);
    try {
      const formData: ArticleFormData = {
        title: values.title,
        author: values.author,
        createdAt: values.createdAt.toDate().toISOString(),
        importance: values.importance,
        content: values.content,
        tagIds: values.tagIds,
        reviewStatus,
      };

      const url = mode === 'create'
        ? '/api/articles'
        : `/api/articles/${initialValues?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        message.success(mode === 'create' ? '创建成功' : '更新成功');
        router.push('/');
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onFinish = async (values: ArticleFormValues) => {
    const isAdmin = user?.role === 'admin';
    await onSubmit(values, isAdmin ? 'approved' : 'pending_review');
  };

  const handleSubmitForReview = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values, 'pending_review');
    } catch {
      // validation errors are shown by form
    }
  };

  const getInitialTagIds = () => {
    if (initialValues?.tags) {
      return initialValues.tags.map((tag) => tag.id);
    }
    return undefined;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Form
      id={formId}
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={
        initialValues
          ? {
              ...initialValues,
              createdAt: dayjs(initialValues.createdAt),
              tagIds: getInitialTagIds(),
            }
          : {
              importance: 'medium',
              createdAt: dayjs(),
            }
      }
    >
      <Form.Item
        label="标题"
        name="title"
        rules={[
          { required: true, message: '请输入标题' },
          { max: 200, message: '标题不能超过200个字符' },
        ]}
      >
        <Input placeholder="请输入文章标题" />
      </Form.Item>

      <Form.Item
        label="作者"
        name="author"
        rules={[
          { required: true, message: '请输入作者' },
          { max: 50, message: '作者不能超过50个字符' },
        ]}
      >
        <Input placeholder="请输入作者名称" />
      </Form.Item>

      <Form.Item
        label="创建时间"
        name="createdAt"
        rules={[{ required: true, message: '请选择创建时间' }]}
      >
        <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="重要性"
        name="importance"
        rules={[{ required: true, message: '请选择重要性' }]}
      >
        <Select
          options={[
            { value: 'low', label: '低' },
            { value: 'medium', label: '中' },
            { value: 'high', label: '高' },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="标签"
        name="tagIds"
      >
        <Select
          mode="multiple"
          placeholder="请选择标签（可多选）"
          loading={tagsLoading}
          options={tagOptions}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          allowClear
        />
      </Form.Item>

      <Form.Item
        label="内容"
        name="content"
        rules={[{ required: true, message: '请输入内容' }]}
      >
        <RichTextEditor placeholder="请输入文章内容" />
      </Form.Item>

      {!isAdmin && (
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存并提交审核
            </Button>
            <Button
              icon={<SendOutlined />}
              onClick={handleSubmitForReview}
              loading={submitting}
            >
              提交审核
            </Button>
          </Space>
        </Form.Item>
      )}
    </Form>
  );
}
