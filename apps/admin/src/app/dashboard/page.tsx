'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, List, Typography, Tag, Space, Spin } from 'antd';
import {
  AuditOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  WarningOutlined,
  FileTextOutlined,
  UserOutlined,
  FlagOutlined,
  HomeOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { AdminDashboardDto, ApiResponse } from '@xiaoqu-bangbang/shared';

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<null, ApiResponse<AdminDashboardDto>>('/admin/dashboard'),
  });

  const dashboard = data?.data;

  const stats = [
    {
      title: '待审核内容',
      value: dashboard?.pendingReviews ?? 0,
      icon: <AuditOutlined />,
      color: '#1890ff',
      href: '/reviews',
    },
    {
      title: '待认证',
      value: dashboard?.pendingVerifications ?? 0,
      icon: <SafetyCertificateOutlined />,
      color: '#52c41a',
      href: '/verifications',
    },
    {
      title: '待认领',
      value: dashboard?.pendingClaims ?? 0,
      icon: <TeamOutlined />,
      color: '#722ed1',
      href: '/committee',
    },
    {
      title: '高风险反馈',
      value: dashboard?.highRiskFeedback ?? 0,
      icon: <WarningOutlined />,
      color: '#ff4d4f',
      href: '/events',
    },
    {
      title: '待处理举报',
      value: dashboard?.pendingReports ?? 0,
      icon: <FileTextOutlined />,
      color: '#fa8c16',
      href: '/reports',
    },
    {
      title: '总用户数',
      value: dashboard?.totalUsers ?? 0,
      icon: <UserOutlined />,
      color: '#13c2c2',
    },
    {
      title: '总事件数',
      value: dashboard?.totalEvents ?? 0,
      icon: <FlagOutlined />,
      color: '#2f54eb',
    },
    {
      title: '总小区数',
      value: dashboard?.totalCommunities ?? 0,
      icon: <HomeOutlined />,
      color: '#eb2f96',
    },
    {
      title: '今日互助',
      value: dashboard?.todayMutualHelp ?? 0,
      icon: <HeartOutlined />,
      color: '#f5222d',
    },
  ];

  const typeColorMap: Record<string, string> = {
    pending_review: 'blue',
    pending_verification: 'green',
    pending_claim: 'purple',
    high_risk_feedback: 'red',
    pending_report: 'orange',
  };

  const typeLinkMap: Record<string, string> = {
    pending_review: '/reviews',
    pending_verification: '/verifications',
    pending_claim: '/committee',
    high_risk_feedback: '/events',
    pending_report: '/reports',
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              {stats.map((s) => (
                <Col xs={24} sm={12} md={8} key={s.title}>
                  <Card
                    hoverable={!!s.href}
                    onClick={() => s.href && router.push(s.href)}
                    style={{ cursor: s.href ? 'pointer' : 'default' }}
                  >
                    <Statistic
                      title={s.title}
                      value={s.value}
                      valueStyle={{ color: s.color }}
                      prefix={s.icon}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
            <Card title="待办事项">
              <List
                dataSource={dashboard?.todoItems ?? []}
                locale={{ emptyText: '暂无待办' }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Link href={typeLinkMap[item.type] || '/dashboard'} key="action">
                        去处理
                      </Link>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {item.summary}
                          <Tag color={typeColorMap[item.type] || 'default'}>{item.type}</Tag>
                        </Space>
                      }
                      description={item.createdAt}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}
