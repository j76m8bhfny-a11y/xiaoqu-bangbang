# 左邻右帮 UI 完整复刻指南

> 设计稿：Ardot 画布 fileId `715840172556822`（40 页全部完成）
> 技术栈：Taro 4 + React 18 + TypeScript + SCSS + Zustand，pnpm monorepo
> designWidth = 750，px 1:1 转 rpx，设计稿 375 基准 → 代码统一 ×2

---

## 总览：差距全景

### ✅ 已对齐（无需改动）

| 层面     | 状态                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 主色系   | #FFF8EE / #5B9E6F / #E89B6C / #2C3A2E — 设计变量与 tokens.scss 完全一致 |
| 氛围装饰 | app.scss 纸纹背景 + 花叶 SVG 可直接沿用                                 |
| 尺寸体系 | designWidth=750，正文 32rpx ≈ 16pt                                      |
| 字重体系 | 400/600/700 三档一致                                                    |

### ❌ 需要替换（5 层）

| 层            | 差距                                                              | 影响范围   | 优先级 |
| ------------- | ----------------------------------------------------------------- | ---------- | ------ |
| L0 Token 微调 | `radius-sm`（设计12 vs 代码16）、`spacing-lg`（设计20 vs 代码24） | 全局       | P0     |
| L1 图标系统   | Emoji 映射 → SVG mask 矢量图标                                    | 全局 40 页 | P0     |
| L2 TabBar     | 原生 PNG → 自定义胶囊激活态                                       | 4 Tab 页   | P0     |
| L3 NavBar     | 无统一组件 → 标准化导航栏                                         | 36 二级页  | P1     |
| L4 页面布局   | 渐变头部/卡片层级/列表样式逐页有出入                              | 40 页      | P1-P2  |

---

## Phase 0：Token 微调（5 分钟）

### 提示词

```
修改 apps/miniapp/src/styles/tokens.scss，对齐设计稿：

1. $radius-sm: 16px → 12px（设计稿小圆角为 12）
2. $spacing-lg: 24px → 20px（设计稿大间距为 20）

其余 token 保持不变，确认所有色值与设计稿一致：
- $color-bg: #fff8ee
- $color-card: #ffffff
- $color-primary: #5b9e6f
- $color-primary-deep: #4a8c5e
- $color-primary-soft: #a8d5b5
- $color-accent: #e89b6c
- $color-accent-deep: #d48050
- $color-accent-soft: #fbf0dd
- $color-cream: #fff3d6
- $color-text: #2c3a2e
- $color-text-secondary: #6b7a6e
- $color-border: #e8e0d0
- $color-bg-green: #eaf4ec
- $color-danger: #d9534f
```

---

## Phase 1：Icon 组件重写（核心，全局生效）

### 当前问题

- `components/icon/index.tsx` 用 Emoji 映射（`bell: '🔔'`），设计稿是统一线宽 SVG 线条图标
- `empty-state/index.tsx` 直接输出 icon 字符串，存在显示 Bug
- 接口签名 `IconName` 类型已定义 73 个图标，遍布 40 个页面

### 替换策略

**保留 `IconName` 类型签名不变，只换内部实现**（mask 渲染替代文本输出），40 个页面零改动。

### 提示词

````
重写 apps/miniapp/src/components/icon/index.tsx：

要求：
1. 保留现有的 `IconName` 类型（73 个图标名）和 `IconProps` 接口不变
2. 保留 `emojiToIconName` 导出函数不变
3. 将内部实现从 Emoji 文本改为 CSS mask + SVG data-uri 方案
4. 每个图标需要一个 SVG data-uri 字符串，从设计稿画布导出
5. 图标风格：1.6px 线宽、圆角端点、填充无、与设计稿一致

实现方式：
- 定义 ICONS: Record<IconName, string> 映射表，value 是 SVG data-uri
- 用 View + WebkitMaskImage 渲染，backgroundColor 作为颜色控制
- 默认 color 保持 '#5B9E6F'
- size 参数直接转为 px（在 Taro 中 px 会自动转 rpx）

代码模板：
```tsx
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';

const ICONS: Record<IconName, string> = {
  back: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ...></svg>',
  // ... 73 个图标，从设计稿导出 SVG 后 URL-encode
};

function Icon({ name, size = 32, color = '#5B9E6F', className = '' }: IconProps) {
  const svg = ICONS[name];
  if (!svg) return null;
  return (
    <View
      className={`xq-icon ${className}`}
      style={{
        width: Taro.pxTransform(size),
        height: Taro.pxTransform(size),
        WebkitMaskImage: `url("${svg}")`,
        maskImage: `url("${svg}")`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        backgroundColor: color,
      }}
    />
  );
}
````

同时修复 components/empty-state/index.tsx：

- 将直接输出 icon 字符串改为使用 Icon 组件
- `import Icon from '@/components/icon'`
- `<Icon name={icon} size={48} color="#6B7A6E" />`

```

### SVG 导出方法

在设计稿画布中，每个图标的 SVG 路径可以直接从节点的 Vector 子节点读取。批量操作：
1. 在 Ardot 编辑器中选中图标节点
2. 右键 → 导出 SVG
3. URL-encode 后填入 ICONS 映射表

---

## Phase 2：自定义 TabBar（4 Tab 页）

### 当前问题
- `app.config.ts` 用原生 tabBar + PNG 图标
- 设计稿是「白色胶囊底 + 绿色激活态 + 图标+文字」，原生做不出胶囊效果

### 替换策略
- `app.config.ts` 中保留 tabBar 配置（不能删除，否则页面不识别 tab 页）
- 添加 `custom: true` 开启自定义模式
- 创建 `custom-tab-bar/` 组件

### 提示词

```

步骤 1：修改 app.config.ts，在 tabBar 中添加 custom: true

```ts
tabBar: {
  custom: true,  // 新增
  color: '#6B7A6E',
  selectedColor: '#5B9E6F',
  backgroundColor: '#FFF8EE',
  borderStyle: 'white',
  list: [/* 保持不变 */],
},
```

步骤 2：创建 apps/miniapp/src/custom-tab-bar/index.tsx

设计规范（从设计稿读取）：

- 外层：白色背景 #FFFFFF，padding 4px，圆角 36px（即 72rpx），margin 16px
- 阴影：0 6px 24px rgba(91,158,111,0.12)
- 边框：1px solid #E8E0D0
- 每个 Tab 项：flex:1，垂直排列图标+文字，gap 3px
- 激活态：背景 #5B9E6F（绿色），圆角 26px（即 52rpx）
- 激活态图标/文字颜色：#FFFFFF
- 非激活态图标/文字颜色：#6B7A6E
- 图标 20×20（即 40rpx），文字 10px（即 20rpx）Medium 字重
- 激活态文字 SemiBold

组件实现：

```tsx
import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import Icon, { type IconName } from '@/components/icon';
import './index.scss';

const TABS = [
  { pagePath: '/pages/plaza/index', text: '小区事', icon: 'community' as IconName },
  { pagePath: '/pages/events/index', text: '邻里帮', icon: 'handshake' as IconName },
  { pagePath: '/pages/ranking/index', text: '光荣榜', icon: 'trophy' as IconName },
  { pagePath: '/pages/home/index', text: '我的', icon: 'person' as IconName },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const index = TABS.findIndex((t) => t.pagePath === `/${current.route}`);
    setSelected(index);
  }, []);

  const handleSwitch = (index: number) => {
    const url = TABS[index].pagePath;
    Taro.switchTab({ url });
  };

  return (
    <View className="tab-bar">
      <View className="tab-bar__pill">
        {TABS.map((tab, i) => (
          <View
            key={tab.pagePath}
            className={`tab-bar__item ${i === selected ? 'tab-bar__item--active' : ''}`}
            onClick={() => handleSwitch(i)}
          >
            <Icon name={tab.icon} size={20} color={i === selected ? '#FFFFFF' : '#6B7A6E'} />
            <Text className={`tab-bar__text ${i === selected ? 'tab-bar__text--active' : ''}`}>
              {tab.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

SCSS（custom-tab-bar/index.scss）：

```scss
@use '../styles/tokens.scss' as *;

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 16px 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 100;

  &__pill {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: $color-card;
    border: 2px solid $color-border;
    border-radius: 72px;
    box-shadow: 0 6px 24px rgba(91, 158, 111, 0.12);
  }

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 0;
    border-radius: 52px;
    transition: all 0.2s;

    &--active {
      background: $color-primary;
    }
  }

  &__text {
    font-size: 20px;
    color: $color-text-secondary;
    font-weight: 500;

    &--active {
      color: #fff;
      font-weight: 600;
    }
  }
}
```

```

---

## Phase 3：NavBar 统一组件（36 二级页）

### 当前问题
- 二级页没有统一导航栏，各自用 View 模拟，样式不统一
- 设计稿规范：32×32 圆角返回按钮 + 居中标题 + 右侧动作/占位

### 提示词

```

创建 apps/miniapp/src/components/navbar/index.tsx，作为二级页统一导航栏。

设计规范（从设计稿读取）：

- 高度：88rpx（含状态栏安全区，StatusBar 62h + NavBar 内容 44h）
- 背景：透明或页面背景色 #FFF8EE
- 左侧：32×32 返回按钮，圆角 16px，点击返回上一页
  - 按钮内：SVG 箭头图标，1.6px 线宽，颜色 #2C3A2E
- 中间：标题文字，16px（32rpx），SemiBold，颜色 #2C3A2E，居中
- 右侧：可选动作按钮（文字或图标），32×32，与左侧对称
- 底部无分割线（设计稿无）

组件接口：

```tsx
interface NavBarProps {
  title: string;
  rightAction?: React.ReactNode;
  onRightClick?: () => void;
  bg?: string; // 默认透明
}
```

实现：

```tsx
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/icon';
import './index.scss';

export default function NavBar({ title, rightAction, onRightClick, bg }: NavBarProps) {
  const handleBack = () => Taro.navigateBack();
  return (
    <View className="navbar" style={bg ? { background: bg } : undefined}>
      <View className="navbar__left" onClick={handleBack}>
        <Icon name="back" size={20} color="#2C3A2E" />
      </View>
      <Text className="navbar__title">{title}</Text>
      <View className="navbar__right" onClick={onRightClick}>
        {rightAction}
      </View>
    </View>
  );
}
```

SCSS：

```scss
@use '../../styles/tokens.scss' as *;

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 88px;
  position: relative;

  &__left,
  &__right {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 32px;
  }

  &__left:active {
    background: rgba(0, 0, 0, 0.05);
  }

  &__title {
    font-size: 32px;
    font-weight: 600;
    color: $color-text;
  }
}
```

每个二级页使用时：

```tsx
import NavBar from '@/components/navbar';
// 在页面顶部
<NavBar title="议题详情" />;
```

```

---

## Phase 4：四个 Tab 主页逐页替换

### 4.1 小区事（plaza）

### 提示词

```

对照设计稿「小区事-首页」（Ardot 节点 2:17），修改 apps/miniapp/src/pages/plaza/index.tsx 和 index.scss。

设计稿关键结构（从上到下）：

1. StatusBar（62h，时间 + 信号图标）
2. Header 渐变区：
   - 背景渐变：linear-gradient(135deg, #E89B6C → #D48050)（暖橙渐变）
   - 左侧：喇叭图标 32×32 + 标题「小区事」22px Bold 白色
   - 右侧：搜索按钮 32×32
   - Tab 行：2 个 tab（最新/热门），激活态白色底 pill，非激活半透明
3. 内容区 ScrollView：
   - 议题列表卡片（每张 100h）：
     - 白底 #FFFFFF，圆角 20px，阴影 0 2px 8px rgba(91,158,111,0.04)
     - padding 16px
     - 标题行：标题 15px Bold #2C3A2E + 日期 12px Regular #6B7A6E
     - Meta 行：点赞/评论/事件 pill（图标+文字，gap 4px）

关键差异修正：

- 卡片高度从原来的 128px → 100px（设计稿已调优）
- 不需要左侧绿色装饰条（已删除）
- Header 渐变方向 135deg
- 搜索图标用 SVG mask 替换 Emoji

```

### 4.2 邻里帮（events）

### 提示词

```

对照设计稿「邻里帮」（Ardot 节点 2:162），修改 apps/miniapp/src/pages/events/index.tsx 和 index.scss。

设计稿关键结构：

1. StatusBar
2. Header 渐变区：
   - 背景渐变：linear-gradient(135deg, #5B9E6F → #4A8C5E)（绿色渐变）
   - 左侧：握手图标 + 标题「邻里帮」+ 副标题「邻里互助，温暖社区」
   - 右侧：发布按钮（白色半透明 pill）
3. Filter 行：
   - 状态筛选 pill 组：全部/进行中/已完成
   - 激活态：#5B9E6F 底 + 白字
   - 非激活：白底 + #6B7A6E 字
4. 互助卡片列表：
   - 白底卡片，圆角 20px
   - 每张卡：头像（48×48 圆形）+ 标题 + 描述 + 状态标签 + 时间 + 响应人数
   - 状态标签用 pill 样式（accentSoft 底 + accentDeep 字）
5. 底部 CTA 按钮居中（与光荣榜一致）

关键修正：

- Header 渐变改为绿色系（当前代码可能无渐变或方向不对）
- 卡片圆角 20px（40rpx）
- 状态 pill 用 accentSoft/accentDeep 配色

```

### 4.3 光荣榜（ranking）

### 提示词

```

对照设计稿「光荣榜」（Ardot 节点 2:319），修改 apps/miniapp/src/pages/ranking/index.tsx 和 index.scss。

设计稿关键结构（当前代码已较接近，微调即可）：

1. Header 渐变区：
   - 背景渐变：linear-gradient(135deg, #E89B6C → #D48050)（暖橙渐变）
   - 奖杯图标 + 「好人榜」标题 + 「1朵小红花=1次有效互助」副标题
   - Tab 行：排行榜/勋章墙（激活态白色底 pill）
2. Period 行：本月/总榜 pill + 「8月榜·还剩14天」右对齐
3. 领奖台卡片（PodiumCard）：
   - 白底，圆角 24px（48rpx），padding 20px
   - 阴影：0 6px 24px rgba(232,155,108,0.10)
   - 3 个位置（2-1-3 排列），第一名最高
   - 头像 48×48（第一名 56×56），圆形带边框
4. 排名列表（R4, R5...）：
   - 白底卡片，圆角 16px（32rpx），padding 12px 16px
   - 阴影：0 2px 8px rgba(91,158,111,0.04)
5. 我的排名卡片（MyCard）：
   - 白底 + 1px 绿色边框 #A8D5B5
   - 圆角 20px，阴影 0 4px 16px rgba(91,158,111,0.08)
   - 进度条：8px 高，#E8E0D0 底，渐变 #5B9E6F→#E89B6C
6. CTA 按钮「今天还能帮谁？」：
   - 居中放置（通过外层 horizontal + fill_container + center 对齐）
   - 绿色 pill，padding 14px 32px，圆角 999px
   - 阴影：0 4px 16px rgba(91,158,111,0.25)
   - 文字 15px Bold 白色 + 0.5px letterSpacing

关键修正（对比当前代码）：

1. CTA 按钮需要居中：外层包一个 fill_container + center 的 wrapper
2. CTA 文字 fontSize 15px（30rpx），加 letterSpacing 1px（2rpx）
3. PodiumCard 阴影颜色用 accent 系 rgba(232,155,108,0.10) 而非绿色系
4. 排名列表卡片圆角 16px（当前可能用的 20px）

```

### 4.4 我的（home）

### 提示词

```

对照设计稿「我的」（Ardot 节点 2:457），修改 apps/miniapp/src/pages/home/index.tsx 和 index.scss。

设计稿关键结构（当前代码已较接近，微调即可）：

1. UserCard 渐变区：
   - 背景渐变：linear-gradient(135deg, #5B9E6F → #4A8C5E)
   - padding 20px
   - 头像 64×64（128rpx）圆形白底，文字 24px Bold 绿色
   - 用户名 20px Bold 白色
   - 标签行：认证状态 pill + 社区名 pill（白色半透明底）
   - 设置按钮 40×40 圆形，白色半透明底，右侧
   - 统计行（3 列）：每列垂直排列
     - 数字 22px ExtraBold 白色
     - 标签：图标 14×14 + 文字 11px Medium 白色
     - 底色：白色 15% 透明度，圆角 16px，padding 12px
2. 四宫格 ActionGrid（2×2）：
   - 每格 161×80，圆角 20px
   - Action1/4 用 cream 底色 #FFF3D6，Action2/3 用 bgGreen 底色 #EAF4EC
   - 阴影：0 4px 16px rgba(232,155,108,0.08) 或 rgba(91,158,111,0.08)
   - 左侧文字组垂直居中（height: fill_container + center）
   - 右侧圆形图标 44×44 白底
3. 待办提醒区：
   - 标题「待办提醒」15px SemiBold
   - 卡片：白底，圆角 16px，56h，padding 0 14px
   - 左侧图标 36×36 圆形（绿色/accent 底）
   - 中间：标题 13px Medium + 副标题 11px Regular
   - 右侧：红色 badge（数字）
4. 菜单组：
   - 分组标题 13px SemiBold #6B7A6E
   - 卡片：白底，圆角 16px，padding 14px
   - 每项 48h，图标 + 文字 + 右箭头
   - 分割线 1px #EEEEEE

关键修正（对比当前代码）：

1. 四宫格卡片左半文字组需要垂直居中：height 从 hug_contents 改为 fill_container + align-items center
2. 头像从 108px → 64px（128rpx），设计稿更小更精致
3. 设置按钮 40×40（当前可能没有或尺寸不对）
4. 统计行每列加白底半透明背景（当前无此效果）
5. 待办卡片高度统一 56px（112rpx）

```

---

## Phase 5：二级页面替换（36 页）

### 通用替换规则（适用于所有二级页）

```

所有二级页面遵循统一规范：

1. 顶部使用 NavBar 组件（Phase 3 创建的）
2. 页面背景 #FFF8EE
3. 卡片样式统一：
   - 白底 #FFFFFF
   - 圆角 20px（40rpx）
   - 阴影 0 2px 8px rgba(91,158,111,0.04)
   - padding 16px（32rpx）
4. 标题层级：
   - 页面标题（NavBar 中）：16px SemiBold
   - 区块标题：15px SemiBold #2C3A2E
   - 卡片标题：14px Bold #2C3A2E
   - 正文：13px Regular #2C3A2E
   - 辅助文字：11px Regular #6B7A6E
5. 按钮样式：
   - 主按钮：绿色 #5B9E6F 底，白字，圆角 999px，padding 14px 32px
   - 次按钮：白底 + 绿色边框，绿字
   - 禁用：灰色底 #E8E0D0，灰字
6. 表单输入：
   - 输入框：白底，圆角 12px（24rpx），padding 12px 16px
   - 边框 1px #E8E0D0
   - focus 时边框 #5B9E6F
7. 标签/Pill：
   - 紧凑写法：display:flex + align-items:center + gap + padding
   - 激活态：#5B9E6F 底 + 白字
   - 非激活：#EAF4EC 底 + #4A8C5E 字
   - 警示：#FBF0DD 底 + #D48050 字
   - 危险：#FFF0F0 底 + #D9534F 字

```

### 分批替换提示词

#### 第一批（8 页：登录 + 议题 + 互助 + 发布 + 通知 + 认证 + 勋章 + 发议题）

```

对照设计稿依次替换以下 8 个页面，每页参考对应的 Ardot 节点：

1. Screen-登录 (22:1) → pages/login/index.tsx + .scss
   - 渐变背景 #5B9E6F→#4A8C5E
   - 手绘插画（需导出 PNG 资产）
   - 微信登录按钮：绿色 pill
   - 社区选择入口

2. Screen-议题详情 (22:33) → pages/topic-detail/index.tsx + .scss
   - NavBar「议题详情」+ 右侧分享按钮
   - 议题卡片：标题 + 发起人 + 标签 + 正文
   - 投票区：赞成/反对 pill 按钮 + 进度条
   - 评论列表

3. Screen-互助详情 (22:99) → pages/event-detail/index.tsx + .scss
   - NavBar「互助详情」
   - 求助卡片：头像 + 标题 + 描述 + 状态
   - 响应列表
   - 底部操作按钮

4. Screen-发布求助 (22:209) → pages/event-create/index.tsx + .scss
   - NavBar「发布求助」
   - 表单：标题输入 + 描述输入 + 图片选择 + 分类选择
   - 底部提交按钮

5. Screen-消息通知 (22:273) → pages/notifications/index.tsx + .scss
   - NavBar「消息通知」+ 右侧全部已读
   - 消息列表：图标 + 标题 + 时间 + 未读 badge

6. Screen-业主认证 (22:329) → pages/verify/index.tsx + .scss
   - NavBar「业主认证」
   - 认证表单：姓名 + 房号 + 手机 + 图片上传
   - 提交按钮

7. Screen-勋章墙 (22:399) → pages/badges/index.tsx + .scss
   - NavBar「勋章墙」
   - 概览卡：已获得/总数 + 下一枚目标
   - 勋章网格 2×N

8. Screen-发议题 (22:515) → pages/topic-create/index.tsx + .scss
   - NavBar「发议题」
   - 表单：标题 + 内容 + 分类
   - 提交按钮

```

#### 第二批（8 页：个人主页 + 设置 + 编辑 + 列表 + 投票 + 市集）

```

对照设计稿依次替换以下 8 个页面：

1. Screen-个人主页 (25:1) → pages/user-profile/index.tsx + .scss
2. Screen-设置 (25:21) → pages/settings/index.tsx + .scss
3. Screen-编辑资料 (25:113) → pages/profile-edit/index.tsx + .scss
4. Screen-议题列表 (25:122) → pages/topics/index.tsx + .scss
5. Screen-投票列表 (25:344) → pages/votes/index.tsx + .scss
6. Screen-投票详情 (25:353) → pages/vote-detail/index.tsx + .scss
7. Screen-市集 (25:390) → pages/market/index.tsx + .scss
8. Screen-市集详情 (25:396) → pages/market-detail/index.tsx + .scss

```

#### 第三批（8 页：宠物 + 指南 + 闲置 + 活动）

```

对照设计稿依次替换以下 8 个页面：

1. Screen-社区选择 (32:1) → pages/community-select/index.tsx + .scss
2. Screen-发布宠物 (32:57) → pages/pet-create/index.tsx + .scss
3. Screen-编辑宠物 (32:114) → pages/pet-edit/index.tsx + .scss
4. Screen-指南详情 (32:170) → pages/guide-detail/index.tsx + .scss
5. Screen-创建指南 (32:243) → pages/guide-create/index.tsx + .scss
6. Screen-发布闲置 (32:295) → pages/market-create/index.tsx + .scss
7. Screen-编辑商品 (32:361) → pages/market-edit/index.tsx + .scss
8. Screen-编辑活动 (32:426) → pages/event-edit/index.tsx + .scss

```

#### 第四批（8 页：团购 + 业委会 + 服务商）

```

对照设计稿依次替换以下 8 个页面：

1. Screen-发起团购 (80:1) → pages/group-buy-create/index.tsx + .scss
2. Screen-团购详情 (80:60) → pages/group-buy-detail/index.tsx + .scss
3. Screen-编辑团购 (80:137) → pages/group-buy-edit/index.tsx + .scss
4. Screen-业委会 (80:182) → pages/committee/index.tsx + .scss
5. Screen-业委会成员 (80:239) → pages/committee-member/index.tsx + .scss
6. Screen-业委会公告 (80:283) → pages/committee-announcement/index.tsx + .scss
7. Screen-服务商列表 (80:323) → pages/service-providers/index.tsx + .scss
8. Screen-服务商详情 (80:389) → pages/service-provider-detail/index.tsx + .scss

```

#### 第五批（4 页：社群 + 小区申请）

```

对照设计稿依次替换以下 4 个页面：

1. Screen-社群列表 (89:1) → pages/social-groups/index.tsx + .scss
2. Screen-小区申请 (89:41) → pages/community-apply/index.tsx + .scss
3. Screen-申请详情 (89:111) → pages/community-application-detail/index.tsx + .scss
4. Screen-我的申请 (89:166) → pages/my-applications/index.tsx + .scss

```

---

## 尺寸换算速查表

设计稿 375 基准 → 代码 rpx（×2）：

| 设计稿 | 代码 rpx | 真机 pt |
|---|---|---|
| 8 | 16 | 8 |
| 10 | 20 | 10 |
| 12 | 24 | 12 |
| 14 | 28 | 14 |
| 15 | 30 | 15 |
| 16 | 32 | 16 |
| 18 | 36 | 18 |
| 20 | 40 | 20 |
| 22 | 44 | 22 |
| 24 | 48 | 24 |
| 28 | 56 | 28 |
| 32 | 64 | 32 |
| 40 | 80 | 40 |
| 44 | 88 | 44 |
| 48 | 96 | 48 |
| 64 | 128 | 64 |
| 80 | 160 | 80 |
| 120 | 240 | 120 |
| 140 | 280 | 140 |
| 999 | 999 | — |

## 圆角换算

| 设计稿 | 代码 rpx | 用途 |
|---|---|---|
| 12 | 24 | 小圆角（输入框/标签） |
| 16 | 32 | 中圆角（排名卡片） |
| 20 | 40 | 卡片主圆角 |
| 24 | 48 | 大卡片（领奖台） |
| 28 | 56 | 超大卡片 |
| 36 | 72 | TabBar 胶囊 |
| 999 | 999 | Pill 按钮 |

## 阴影速查

| 用途 | CSS |
|---|---|
| 卡片淡阴影 | `0 2px 8px rgba(91,158,111,0.04)` |
| 卡片主阴影 | `0 4px 20px rgba(91,158,111,0.08)` |
| 暖色卡片阴影 | `0 4px 16px rgba(232,155,108,0.10)` |
| 按钮阴影 | `0 6px 16px rgba(74,140,94,0.24)` |
| TabBar 阴影 | `0 6px 24px rgba(91,158,111,0.12)` |
| 领奖台阴影 | `0 6px 24px rgba(232,155,108,0.10)` |

## 渐变速查

| 用途 | CSS |
|---|---|
| 绿色头部 | `linear-gradient(135deg, #5B9E6F, #4A8C5E)` |
| 暖橙头部 | `linear-gradient(135deg, #E89B6C, #D48050)` |
| 第一名底座 | `linear-gradient(180deg, #FBF0DD, #E89B6C)` |
| 第二名底座 | `linear-gradient(180deg, #FFF3D6, #F3EAD0)` |
| 第三名底座 | `linear-gradient(180deg, #EAF4EC, #A8D5B5)` |
| 进度条 | `linear-gradient(90deg, #5B9E6F, #E89B6C)` |

---

## 验收清单

每个页面替换后逐项检查：

- [ ] 背景色 #FFF8EE
- [ ] NavBar 标题居中、返回按钮 32×32
- [ ] 卡片圆角 20px（40rpx）、白底、阴影
- [ ] 图标为 SVG 矢量（非 Emoji）
- [ ] 文字色值正确（#2C3A2E / #6B7A6E）
- [ ] 主色 #5B9E6F、点缀色 #E89B6C 使用正确
- [ ] 间距符合设计稿（不能目测，对照设计稿数值）
- [ ] 底部留白足够（避免被 TabBar 遮挡）
- [ ] 真机预览无溢出/裁切
```
