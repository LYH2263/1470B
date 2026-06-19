import { useEffect, useState } from 'react';
import { Modal, Spin, Empty, Tag, Descriptions, Typography } from 'antd';
import { fetchWithAuth } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { ArticleVersion, VersionDiffResult, DiffLine } from '@/types/article-version';

interface VersionDiffProps {
  articleId: string;
  oldVersionId: string;
  newVersionId: string;
  onClose: () => void;
}

function DiffLineView({ line, side }: { line: DiffLine; side: 'old' | 'new' }) {
  const bgColor =
    line.type === 'added'
      ? side === 'new'
        ? '#e6ffec'
        : 'transparent'
      : line.type === 'removed'
        ? side === 'old'
          ? '#ffebe9'
          : 'transparent'
        : 'transparent';

  const textColor =
    line.type === 'added'
      ? side === 'new'
        ? '#22863a'
        : '#aaa'
      : line.type === 'removed'
        ? side === 'old'
          ? '#cb2431'
          : '#aaa'
        : '#333';

  const prefix =
    line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: '1px 8px',
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: '20px',
        color: textColor,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        borderLeft: line.type !== 'unchanged' ? `3px solid ${line.type === 'added' ? '#22863a' : '#cb2431'}` : '3px solid transparent',
      }}
    >
      <span style={{ display: 'inline-block', width: 32, color: '#999', userSelect: 'none' }}>
        {line.lineNumber}
      </span>
      <span style={{ display: 'inline-block', width: 16, color: textColor }}>{prefix}</span>
      {line.content}
    </div>
  );
}

function DiffPanel({
  title,
  lines,
  side,
  versionInfo,
}: {
  title: string;
  lines: DiffLine[];
  side: 'old' | 'new';
  versionInfo: ArticleVersion;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          padding: '8px 12px',
          background: '#fafafa',
          borderBottom: '1px solid #f0f0f0',
          fontWeight: 500,
          fontSize: 13,
        }}
      >
        <Tag color="blue">v{versionInfo.versionNumber}</Tag>
        {title} — {versionInfo.modifiedBy} · {formatDate(versionInfo.createdAt)}
      </div>
      <div
        style={{
          border: '1px solid #f0f0f0',
          borderTop: 'none',
          maxHeight: 400,
          overflowY: 'auto',
          backgroundColor: '#fff',
        }}
      >
        {lines.map((line, i) => (
          <DiffLineView key={i} line={line} side={side} />
        ))}
      </div>
    </div>
  );
}

export default function VersionDiff({
  articleId,
  oldVersionId,
  newVersionId,
  onClose,
}: VersionDiffProps) {
  const [loading, setLoading] = useState(true);
  const [diffResult, setDiffResult] = useState<VersionDiffResult | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/articles/${articleId}/versions?action=diff&oldVersionId=${oldVersionId}&newVersionId=${newVersionId}`
        );
        const result = await response.json();
        if (result.success) {
          setDiffResult(result.data);
        }
      } catch (error) {
        console.error('获取版本对比失败:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchDiff();
  }, [articleId, oldVersionId, newVersionId]);

  const renderDiffContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      );
    }

    if (!diffResult) {
      return <Empty description="无法获取版本对比" />;
    }

    if (!diffResult.hasChanges) {
      return (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          两个版本内容完全相同
        </div>
      );
    }

    return (
      <div>
        <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="旧版本">
            <Tag color="blue">v{diffResult.oldVersion.versionNumber}</Tag>
            {diffResult.oldVersion.modifiedBy} · {formatDate(diffResult.oldVersion.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="新版本">
            <Tag color="blue">v{diffResult.newVersion.versionNumber}</Tag>
            {diffResult.newVersion.modifiedBy} · {formatDate(diffResult.newVersion.createdAt)}
          </Descriptions.Item>
        </Descriptions>

        {diffResult.diffs.map((diff) => {
          if (!diff.hasChanges) return null;
          return (
            <div key={diff.field} style={{ marginBottom: 16 }}>
              <Typography.Text strong style={{ fontSize: 14 }}>
                {diff.label}
              </Typography.Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <DiffPanel
                  title="旧版本"
                  lines={diff.oldLines}
                  side="old"
                  versionInfo={diffResult.oldVersion}
                />
                <DiffPanel
                  title="新版本"
                  lines={diff.newLines}
                  side="new"
                  versionInfo={diffResult.newVersion}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      title="版本对比"
      open={true}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      {renderDiffContent()}
    </Modal>
  );
}
