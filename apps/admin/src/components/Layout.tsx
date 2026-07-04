'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  AuditOutlined,
  FileTextOutlined,
  ShopOutlined,
  UserOutlined,
  TeamOutlined,
  LikeOutlined,
  PictureOutlined,
  ToolOutlined,
  TrophyOutlined,
  WarningOutlined,
  FileSearchOutlined,
  ShareAltOutlined,
  SettingOutlined,
  GroupOutlined,
  MessageOutlined,
  NotificationOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';

const { Sider, Header, Content } = Layout;

const allMenuItems = [
  {
    key: '/dashboard',
    label: '工作台',
    icon: <DashboardOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  {
    key: '/reviews',
    label: '内容审核',
    icon: <AuditOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  {
    key: '/events',
    label: '事件管理',
    icon: <FileTextOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  {
    key: '/topics',
    label: '议事管理',
    icon: <MessageOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  { key: '/market', label: '闲置管理', icon: <ShopOutlined />, roles: ['platform_admin'] },
  { key: '/verifications', label: '用户与认证', icon: <UserOutlined />, roles: ['platform_admin'] },
  {
    key: '/community-applications',
    label: '小区申请',
    icon: <ShopOutlined />,
    roles: ['platform_admin'],
  },
  {
    key: '/committee',
    label: '业委会管理',
    icon: <TeamOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  {
    key: '/committee/announcements',
    label: '公告管理',
    icon: <NotificationOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  {
    key: '/votes',
    label: '投票管理',
    icon: <LikeOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
  { key: '/banners', label: 'Banner广告', icon: <PictureOutlined />, roles: ['platform_admin'] },
  {
    key: '/service-providers',
    label: '服务商推荐',
    icon: <ToolOutlined />,
    roles: ['platform_admin'],
  },
  { key: '/rankings', label: '好人榜与奖章', icon: <TrophyOutlined />, roles: ['platform_admin'] },
  { key: '/reports', label: '举报管理', icon: <WarningOutlined />, roles: ['platform_admin'] },
  {
    key: '/audit-logs',
    label: '审计日志',
    icon: <FileSearchOutlined />,
    roles: ['platform_admin'],
  },
  { key: '/share', label: '分享配置', icon: <ShareAltOutlined />, roles: ['platform_admin'] },
  { key: '/settings', label: '系统设置', icon: <SettingOutlined />, roles: ['platform_admin'] },
  {
    key: '/social-groups',
    label: '社群入口',
    icon: <GroupOutlined />,
    roles: ['platform_admin', 'committee_admin'],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { adminUser, logout } = useAuthStore();

  const role = adminUser?.role || 'platform_admin';

  const filteredMenuItems = allMenuItems
    .filter((item) => item.roles.includes(role))
    .map(({ key, label, icon }) => ({ key, label, icon }));

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(key);
  };

  const selectedKeys = [pathname];
  const openKeys: string[] = [];

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => logout(),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            color: '#fff',
            textAlign: 'center',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 'bold',
            lineHeight: '32px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? '帮' : '小区帮榜棒'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          items={filteredMenuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>
                {adminUser?.username || '管理员'}
                {adminUser?.communityId ? ` (${adminUser.communityId})` : ' (平台)'}
              </Typography.Text>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
