import { z } from 'zod';

// 文章数据验证 Schema
export const ArticleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过200个字符'),
  author: z
    .string()
    .trim()
    .min(1, '作者不能为空')
    .max(50, '作者不能超过50个字符'),
  createdAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: '创建时间格式不正确',
    }),
  importance: z.enum(['low', 'medium', 'high'], {
    message: '重要性必须是 low、medium 或 high',
  }),
  content: z
    .string()
    .min(1, '内容不能为空'),
});

export type ArticleInput = z.infer<typeof ArticleSchema>;

export const CommentSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '昵称不能为空')
    .max(50, '昵称不能超过50个字符'),
  email: z
    .string()
    .trim()
    .min(1, '邮箱不能为空')
    .max(100, '邮箱不能超过100个字符')
    .email('邮箱格式不正确'),
  content: z
    .string()
    .trim()
    .min(1, '评论内容不能为空')
    .max(2000, '评论内容不能超过2000个字符'),
});

export type CommentInput = z.infer<typeof CommentSchema>;

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const TagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '标签名称不能为空')
    .max(50, '标签名称不能超过50个字符'),
  color: z
    .string()
    .trim()
    .min(1, '标签颜色不能为空')
    .regex(hexColorRegex, '颜色格式不正确，请使用十六进制颜色码（如 #1890ff）'),
  description: z
    .string()
    .trim()
    .max(200, '描述不能超过200个字符')
    .optional()
    .or(z.literal('')),
});

export type TagInput = z.infer<typeof TagSchema>;

export const ArticleWithTagsSchema = ArticleSchema.extend({
  tagIds: z.array(z.string().uuid('标签ID格式不正确')).optional(),
  reviewStatus: z.enum(['pending_review', 'approved', 'rejected']).optional(),
});

export type ArticleWithTagsInput = z.infer<typeof ArticleWithTagsSchema>;

export const ArticleTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '模板名称不能为空')
    .max(100, '模板名称不能超过100个字符'),
  category: z
    .string()
    .trim()
    .max(50, '分类不能超过50个字符')
    .optional()
    .or(z.literal('')),
  titleFormat: z
    .string()
    .trim()
    .min(1, '预设标题格式不能为空')
    .max(200, '预设标题格式不能超过200个字符'),
  content: z
    .string()
    .min(1, '正文模板内容不能为空'),
});

export type ArticleTemplateInput = z.infer<typeof ArticleTemplateSchema>;
