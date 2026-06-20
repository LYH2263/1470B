import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { EDITOR_CONFIG } from '@/lib/constants';
import { fetchWithAuth } from '@/lib/api';
import { Button, Dropdown, message } from 'antd';
import { PictureOutlined, UploadOutlined, FolderOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import MediaLibraryPicker from './MediaLibraryPicker';
import { getWordStats } from '@/lib/utils';
import 'react-quill/dist/quill.snow.css';

// 动态导入 ReactQuill，禁用 SSR
// @ts-ignore - react-quill 类型定义问题
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value = '', onChange, placeholder }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const editorRef = useRef<any>(null);

  const wordStats = useMemo(() => getWordStats(value), [value]);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 自定义图片上传处理 - 同时保存 editor 引用
  const imageHandler = useCallback(function (this: any) {
    // 在 handler 中，this 指向 toolbar，this.quill 是编辑器实例
    editorRef.current = this.quill;
  }, []);

  // 从本地文件上传
  const handleUploadLocal = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      message.warning('编辑器未就绪，请稍后重试');
      return;
    }

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchWithAuth('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          const range = editor.getSelection();
          editor.insertEmbed(range?.index ?? 0, 'image', result.data.url);
        } else {
          message.error(result.error || '上传失败');
        }
      } catch (error) {
        console.error('上传图片失败:', error);
        message.error('上传图片失败');
      }
    };
  }, []);

  // 打开媒体库选择器
  const handleOpenLibrary = useCallback(() => {
    setPickerOpen(true);
  }, []);

  // 从媒体库选择图片后插入
  const handleSelectFromLibrary = useCallback((url: string) => {
    const editor = editorRef.current;
    if (!editor) {
      message.warning('编辑器未就绪，请稍后重试');
      return;
    }

    const range = editor.getSelection();
    editor.insertEmbed(range?.index ?? 0, 'image', url);
  }, []);

  const imageMenuItems: MenuProps['items'] = [
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: '本地上传',
      onClick: handleUploadLocal,
    },
    {
      key: 'library',
      icon: <FolderOutlined />,
      label: '从媒体库选择',
      onClick: handleOpenLibrary,
    },
  ];

  // Quill 编辑器配置
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  const formats = useMemo(
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'list',
      'bullet',
      'color',
      'background',
      'align',
      'link',
      'image',
    ],
    []
  );

  // 在客户端挂载前不渲染编辑器
  if (!mounted) {
    return (
      <div
        style={{
          height: `${EDITOR_CONFIG.HEIGHT}px`,
          marginBottom: `${EDITOR_CONFIG.MARGIN_BOTTOM}px`,
          border: '1px solid #d9d9d9',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
        }}
      >
        加载编辑器...
      </div>
    );
  }

  return (
    <div className="rich-text-editor" style={{ position: 'relative' }}>
      {/* @ts-ignore - react-quill 类型定义问题 */}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{
          height: `${EDITOR_CONFIG.HEIGHT}px`,
        }}
      />
      {/* 自定义图片下拉按钮，覆盖默认 image 按钮 */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 48,
          zIndex: 10,
        }}
      >
        <Dropdown menu={{ items: imageMenuItems }} placement="bottomLeft" trigger={['click']}>
          <Button
            type="text"
            icon={<PictureOutlined />}
            size="small"
            title="插入图片"
            style={{ height: 28 }}
          />
        </Dropdown>
      </div>

      {/* 字数与阅读时长统计栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 16,
          padding: '8px 12px',
          backgroundColor: '#fafafa',
          border: '1px solid #d9d9d9',
          borderTop: 'none',
          borderRadius: '0 0 2px 2px',
          fontSize: 12,
          color: '#666',
        }}
      >
        <span>
          <FileTextOutlined style={{ marginRight: 4 }} />
          字数: {wordStats.totalChars}
        </span>
        <span>
          中文: {wordStats.chineseChars} 字
        </span>
        <span>
          英文: {wordStats.englishWords} 词
        </span>
        {wordStats.imageCount > 0 && (
          <span>
            图片: {wordStats.imageCount} 张
          </span>
        )}
        <span style={{ color: '#1890ff' }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          阅读时长: 约 {wordStats.readingTimeMinutes || 1} 分钟
        </span>
      </div>

      <MediaLibraryPicker
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onSelect={handleSelectFromLibrary}
      />
    </div>
  );
}
