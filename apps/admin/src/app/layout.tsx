import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import QueryProvider from '@/components/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: '小区帮榜棒 - 管理后台',
  description: '小区帮榜棒管理后台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='zh-CN'>
      <body>
        <AntdRegistry>
          <QueryProvider>{children}</QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
