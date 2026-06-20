import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TemplateVariables, ResolvedTemplate, ArticleTemplate } from '@/types/article-template';
import dayjs from 'dayjs';

// 合并 Tailwind CSS 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化日期
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 重要性等级映射
export const importanceMap = {
  low: { label: '低', color: 'success' },
  medium: { label: '中', color: 'warning' },
  high: { label: '高', color: 'error' },
} as const;

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// HTML 转纯文本
export function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// 生成文章摘要（前 N 字纯文本）
export function generateSummary(content: string, maxLength: number = 100): string {
  const plainText = htmlToPlainText(content);
  const trimmed = plainText.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, maxLength) + '...';
}

// 替换模板中的变量占位符
export function resolveTemplateVariables(text: string, variables: TemplateVariables): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value !== undefined ? value : match;
  });
}

// 获取默认模板变量
export function getDefaultTemplateVariables(author?: string): TemplateVariables {
  return {
    date: dayjs().format('YYYY-MM-DD'),
    author: author || '',
  };
}

// 解析完整模板，替换标题和内容中的变量
export function resolveTemplate(
  template: Pick<ArticleTemplate, 'titleFormat' | 'content'>,
  variables: TemplateVariables
): ResolvedTemplate {
  const mergedVariables = { ...getDefaultTemplateVariables(variables.author), ...variables };
  return {
    title: resolveTemplateVariables(template.titleFormat, mergedVariables),
    content: resolveTemplateVariables(template.content, mergedVariables),
  };
}
