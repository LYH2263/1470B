import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  DatePicker,
  Radio,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  message,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  FileTextOutlined,
  TeamOutlined,
  EyeOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RadioChangeEvent } from 'antd';
import { Line, Pie, Column } from '@ant-design/charts';
import dayjs, { Dayjs } from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { fetchWithAuth } from '@/lib/api';
import type {
  ReportSummary,
  Granularity,
  AuthorRankItem,
  TopViewItem,
} from '@/types/report';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const IMPORTANCE_COLORS: Record<string, string> = {
  high: '#f5222d',
  medium: '#faad14',
  low: '#52c41a',
};

const IMPORTANCE_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(3, 'month'),
    dayjs(),
  ]);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReportData = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        granularity,
      });

      const response = await fetchWithAuth(`/api/reports/summary?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        message.error(result.error || '获取报表数据失败');
      }
    } catch (error) {
      console.error('获取报表数据失败:', error);
      message.error('获取报表数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange, granularity]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  const handleGranularityChange = (e: RadioChangeEvent) => {
    setGranularity(e.target.value);
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) {
      message.error('无法获取报表内容');
      return;
    }

    message.loading({ content: '正在生成 PDF...', key: 'pdf-export' });

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      const imgH = imgHeight * ratio;

      let heightLeft = imgH;
      let position = imgY;

      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgH);
      heightLeft -= pdfHeight - 20;

      while (heightLeft >= 0) {
        position = heightLeft - imgH + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgH);
        heightLeft -= pdfHeight - 20;
      }

      const fileName = `报表_${dateRange[0].format('YYYYMMDD')}-${dateRange[1].format('YYYYMMDD')}.pdf`;
      pdf.save(fileName);
      message.success({ content: 'PDF 导出成功', key: 'pdf-export' });
    } catch (error) {
      console.error('PDF 导出失败:', error);
      message.error({ content: 'PDF 导出失败', key: 'pdf-export' });
    }
  };

  const authorColumns: ColumnsType<AuthorRankItem> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (_text, _record, index) => {
        const rank = index + 1;
        if (rank === 1) return <Tag color="gold">🥇 1</Tag>;
        if (rank === 2) return <Tag color="silver">🥈 2</Tag>;
        if (rank === 3) return <Tag color="bronze">🥉 3</Tag>;
        return <Text>{rank}</Text>;
      },
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: '文章数',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: '总阅读量',
      dataIndex: 'totalViews',
      key: 'totalViews',
      align: 'right',
      sorter: (a, b) => a.totalViews - b.totalViews,
    },
  ];

  const topViewColumns: ColumnsType<TopViewItem> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (_text, _record, index) => {
        const rank = index + 1;
        if (rank === 1) return <Tag color="gold">🥇 1</Tag>;
        if (rank === 2) return <Tag color="silver">🥈 2</Tag>;
        if (rank === 3) return <Tag color="bronze">🥉 3</Tag>;
        return <Text>{rank}</Text>;
      },
    },
    {
      title: '文章标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
    },
    {
      title: '阅读量',
      dataIndex: 'views',
      key: 'views',
      align: 'right',
      width: 120,
      sorter: (a, b) => a.views - b.views,
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
    },
  ];

  const lineChartData = reportData?.articleOutput.map((item) => ({
    period: item.period,
    count: item.count,
  })) || [];

  const pieChartData = reportData?.importanceDistribution.map((item) => ({
    type: IMPORTANCE_LABELS[item.importance] || item.importance,
    value: item.count,
  })) || [];

  const columnChartData = reportData?.topViews.map((item) => ({
    title: item.title.length > 15 ? item.title.slice(0, 15) + '...' : item.title,
    fullTitle: item.title,
    views: item.views,
  })) || [];

  const lineConfig = {
    data: lineChartData,
    xField: 'period',
    yField: 'count',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
    color: '#1677ff',
    smooth: true,
    height: 300,
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
  };

  const pieConfig = {
    data: pieChartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    height: 300,
    color: ['#52c41a', '#faad14', '#f5222d'],
    label: {
      text: 'value',
      style: {
        fontWeight: 'bold',
      },
    },
    legend: {
      color: {
        title: false,
        position: 'bottom',
        rowPadding: 5,
      },
    },
    interactions: [
      {
        type: 'pie-legend-active',
      },
      {
        type: 'element-active',
      },
    ],
  };

  const columnConfig = {
    data: columnChartData,
    xField: 'title',
    yField: 'views',
    seriesField: 'title',
    height: 350,
    color: '#1677ff',
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: true,
      },
    },
    label: {
      position: 'top',
      style: {
        fill: '#000',
        opacity: 0.8,
      },
    },
  };

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={16}>
              <Space wrap size="large">
                <Space>
                  <Text strong>时间范围：</Text>
                  <RangePicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    allowClear={false}
                  />
                </Space>
                <Space>
                  <Text strong>统计维度：</Text>
                  <Radio.Group
                    value={granularity}
                    onChange={handleGranularityChange}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="week">周</Radio.Button>
                    <Radio.Button value="month">月</Radio.Button>
                    <Radio.Button value="quarter">季</Radio.Button>
                  </Radio.Group>
                </Space>
              </Space>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleExportPDF}
                  loading={loading}
                >
                  导出 PDF
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <div ref={reportRef}>
          <Spin spinning={loading} tip="加载中...">
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  <span>数据报表</span>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    （{dateRange[0].format('YYYY-MM-DD')} ~ {dateRange[1].format('YYYY-MM-DD')}）
                  </Text>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title={<Space><FileTextOutlined />总文章数</Space>}
                    value={reportData?.summary.totalArticles || 0}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title={<Space><TeamOutlined />参与作者</Space>}
                    value={reportData?.summary.totalAuthors || 0}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title={<Space><EyeOutlined />总阅读量</Space>}
                    value={reportData?.summary.totalViews || 0}
                    valueStyle={{ color: '#13c2c2' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title={<Space><RiseOutlined />平均阅读量</Space>}
                    value={reportData?.summary.avgViewsPerArticle || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </Card>

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={24}>
                <Card title="文章产出趋势">
                  {lineChartData.length > 0 ? (
                    <Line {...lineConfig} />
                  ) : (
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text type="secondary">暂无数据</Text>
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card title="重要性分布">
                  {pieChartData.length > 0 ? (
                    <Pie {...pieConfig} />
                  ) : (
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text type="secondary">暂无数据</Text>
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={14}>
                <Card title="阅读量 Top10">
                  {columnChartData.length > 0 ? (
                    <Column {...columnConfig} />
                  ) : (
                    <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text type="secondary">暂无数据</Text>
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card title="作者产出排行">
                  <Table
                    columns={authorColumns}
                    dataSource={reportData?.authorRanking || []}
                    rowKey="author"
                    pagination={false}
                    scroll={{ y: 400 }}
                    size="middle"
                  />
                </Card>
              </Col>

              <Col xs={24} lg={14}>
                <Card title="阅读量 Top10 详情">
                  <Table
                    columns={topViewColumns}
                    dataSource={reportData?.topViews || []}
                    rowKey="id"
                    pagination={false}
                    scroll={{ y: 400 }}
                    size="middle"
                  />
                </Card>
              </Col>
            </Row>
          </Spin>
        </div>
      </div>
    </MainLayout>
  );
}

export default function ReportsPageWithAuth() {
  return (
    <ProtectedRoute>
      <ReportsPage />
    </ProtectedRoute>
  );
}
