# DESIGN.md — 左邻右帮 视觉规范

> **平台**: Taro 微信小程序 (designWidth=750, 源码 px = rpx, 真机 ≈ px/2 pt)
> **设计基调**: 草木绿、老年友好、柔和圆润、大字号充足留白

---

## 1. 品牌与语义色彩 (Color Palette & Semantic Tokens)

### Primary（主品牌色 — 草木绿）

| Token                  | Hex       | 用途                                 |
| ---------------------- | --------- | ------------------------------------ |
| `--color-primary`      | `#5B9E6F` | 主按钮、高亮强调、选中态、链接       |
| `--color-primary-deep` | `#4A8C5E` | 按钮底色（配白字对比达标）、渐变深端 |
| `--color-primary-soft` | `#A8D5B5` | 标签浅底、辅助点缀                   |

### Surface（表面色）

| Token               | Hex       | 用途            |
| ------------------- | --------- | --------------- |
| `--color-bg`        | `#F5F8F2` | 页面全局背景    |
| `--color-card`      | `#FFFFFF` | 卡片底色        |
| `--color-bg-green`  | `#EAF4EC` | 浅绿信息区背景  |
| `--color-bg-orange` | `#FBF0DD` | 浅橙信息区背景  |
| `--color-cream`     | `#F3EAD0` | 米色装饰/暖色块 |

### Accent / Secondary（辅助色）

| Token            | Hex       | 用途                               |
| ---------------- | --------- | ---------------------------------- |
| `--color-accent` | `#E0A458` | 暖橙点缀（勋章、闲置价格、辅按钮） |

### Text（文本色彩阶梯）

| Token                     | Hex       | 用途                   |
| ------------------------- | --------- | ---------------------- |
| `--color-text`            | `#2C3A2E` | 正文主色               |
| `--color-text-secondary`  | `#6B7A6E` | 次要文字、标签、时间戳 |
| `--color-text-on-primary` | `#FFFFFF` | 主色背景上的文字       |
| `--color-dark`            | `#171717` | 极深文字（特殊场景）   |

### State / Semantic（语义色）

| Token             | Hex       | 用途               |
| ----------------- | --------- | ------------------ |
| `--color-success` | `#5B9E6F` | 成功（同 Primary） |
| `--color-danger`  | `#D9534F` | 危险/删除/错误     |
| `--color-border`  | `#E2EAE0` | 分割线、边框       |

### 常见渐变

```css
/* 用户卡片头部、页面 Hero 区域 */
background: linear-gradient(135deg, #5b9e6f 0%, #4a8c5e 100%);
```

---

## 2. 排版规范 (Typography)

### 字体家族

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  'Helvetica Neue',
  Helvetica,
  Segoe UI,
  Arial,
  Roboto,
  'PingFang SC',
  'miui',
  'Hiragino Sans GB',
  'Microsoft Yahei',
  sans-serif;
```

### 字号阶梯

> 源码数值 = rpx（designWidth 750），真机 ≈ 数值/2 pt。正文 32rpx ≈ 16pt。

| Token             | px (rpx) | 真机 pt | 用途                         |
| ----------------- | -------- | ------- | ---------------------------- |
| `--font-size-xs`  | 26px     | 13pt    | 时间戳、统计数字、元信息     |
| `--font-size-sm`  | 28px     | 14pt    | 次要正文、描述文字、按钮文字 |
| `--font-size-md`  | 32px     | 16pt    | **正文基准**（页面全局默认） |
| `--font-size-lg`  | 36px     | 18pt    | 卡片标题、小节标题           |
| `--font-size-xl`  | 40px     | 20pt    | 页面标题、用户昵称           |
| `--font-size-xxl` | 48px     | 24pt    | Hero 区域大标题              |

特殊固定字号：标签/状态文字 `22px`（11pt），头像 fallback 字 `20px`。

### 字重

| Token                  | Value | 用途                     |
| ---------------------- | ----- | ------------------------ |
| `--font-weight-normal` | 400   | 正文                     |
| `--font-weight-medium` | 600   | 标题、强调文字、按钮文字 |
| `--font-weight-bold`   | 700   | 大标题、CTA 文字         |

### 行高

| 场景             | Line Height |
| ---------------- | ----------- |
| 全局基准         | 1.6         |
| 标题（紧凑）     | 1.4         |
| 描述文字（紧凑） | 1.5         |

---

## 3. 间距与布局 (Spacing Scale & Grid)

### 间距步长

| Token          | px (rpx) | 真机 pt | 用途                       |
| -------------- | -------- | ------- | -------------------------- |
| `--spacing-xs` | 8px      | 4pt     | 图标与文字间距、极小间隙   |
| `--spacing-sm` | 12px     | 6pt     | 卡片间距、元素内间距       |
| `--spacing-md` | 16px     | 8pt     | 标准内边距、卡片 padding   |
| `--spacing-lg` | 24px     | 12pt    | 区块间距、页面小节间距     |
| `--spacing-xl` | 32px     | 16pt    | 大区块间距、空状态 padding |

### 页面布局

| 场景           | 规则                                |
| -------------- | ----------------------------------- |
| 页面水平内边距 | `24px`（卡片左右 margin）           |
| 卡片内边距     | `16px` 或 `32px 24px`               |
| 页面底部留白   | `80px–120px`（避开 tabBar / FAB）   |
| 列表高度       | `calc(100vh - Npx)` 动态计算        |
| ScrollView     | 全页 `scrollY`，`min-height: 100vh` |

### 布局习惯

- **Flexbox 优先**：`display: flex; flex-direction: column` 为默认
- **水平排列**：`align-items: center; justify-content: space-between`（两端对齐）
- **居中排列**：`align-items: center; justify-content: center`
- **卡片堆叠**：垂直方向 `margin-bottom: 12px` 或 `gap: 16px`
- **网格**：手动 flex 平分，`width: calc((100% - gap*N) / N)`
- **绝对定位**：仅用于头像悬浮在渐变底色上、角标徽章

---

## 4. 形状与阴影 (Borders & Shadows)

### 圆角

| Token           | px (rpx) | 用途                       |
| --------------- | -------- | -------------------------- |
| `--radius-sm`   | 16px     | 小型元素、输入框           |
| `--radius-md`   | 20px     | 中型卡片                   |
| `--radius-lg`   | 28px     | 大型卡片（EventCard 等）   |
| `--radius-pill` | 999px    | 标签、按钮、胶囊形筛选 tab |

### 阴影

| Token           | CSS                                   | 用途                 |
| --------------- | ------------------------------------- | -------------------- |
| `--shadow-card` | `0 4px 20px rgba(91, 158, 111, 0.08)` | 卡片（淡绿色调阴影） |
| `--shadow-btn`  | `0 6px 16px rgba(74, 140, 94, 0.24)`  | 主按钮、FAB          |
| 浅阴影          | `0 2px 8px rgba(0, 0, 0, 0.04)`       | 轻量卡片             |
| 中阴影          | `0 2px 6px rgba(0, 0, 0, 0.06)`       | 议题卡片             |
| 头像阴影        | `0 4px 12px rgba(0, 0, 0, 0.12)`      | 圆形头像             |

### 边框

- 分割线：`border-bottom: 1px solid #E2EAE0`
- 卡片一般无边框，仅用阴影区分层级

---

## 5. 核心组件基准 (Component Baselines)

### 命名规范

- **BEM**：`block__element--modifier`，SCSS 中用 `&__element` / `&--modifier` 嵌套
- **不使用原生 `<button>`**：所有可点击元素用 `<View onClick>` + `<Text>` 组合
- **不使用自定义 Navbar**：使用微信小程序原生导航栏

### 组件 1: Card（event-card）

```tsx
<View className="event-card" onClick={handleClick}>
  <View className="event-card__header">
    <View className="event-card__type-tag">
      <Text className="event-card__type-text">类型标签</Text>
    </View>
    <View className="event-card__status-tag">
      <Text className="event-card__status-text">状态</Text>
    </View>
  </View>
  <Text className="event-card__title">标题</Text>
  <Text className="event-card__desc">描述文字（2行截断）</Text>
  <View className="event-card__meta">
    <View className="event-card__meta-left">
      <View className="event-card__creator-avatar">
        <Text className="event-card__creator-avatar-fallback">姓</Text>
      </View>
      <Text className="event-card__creator">用户名</Text>
      <Text className="event-card__dot">·</Text>
      <Text className="event-card__time">时间</Text>
    </View>
    <View className="event-card__stats">
      <Text className="event-card__stat">❤️ 12</Text>
    </View>
  </View>
  <View className="event-card__footer">
    <View className="event-card__cta">
      <Text className="event-card__cta-text">行动按钮</Text>
    </View>
  </View>
</View>
```

```scss
.event-card {
  background: #fff;
  border-radius: $radius-lg; /* 28px */
  padding: $spacing-md; /* 16px */
  margin-bottom: $spacing-sm; /* 12px */
  box-shadow: $shadow-card;

  &__title {
    font-size: $font-size-lg; /* 36px */
    font-weight: $font-weight-bold; /* 700 */
    color: $color-text;
    line-height: 1.4;
  }

  &__desc {
    font-size: $font-size-sm; /* 28px */
    color: $color-text-secondary;
    line-height: 1.5;
    -webkit-line-clamp: 2; /* 2行截断 */
  }

  &__type-tag {
    padding: 4px 14px;
    border-radius: $radius-pill; /* 999px */
  }

  &__cta {
    padding: 12px 30px;
    border-radius: $radius-pill;
    background: $color-primary;
  }

  &__cta-text {
    font-size: $font-size-sm; /* 28px */
    color: #fff;
    font-weight: $font-weight-bold;
  }
}
```

### 组件 2: Button（BEM View+Text 模式）

```tsx
{
  /* 主按钮 */
}
<View className="page__btn" onClick={handleClick}>
  <Text className="page__btn-text">按钮文字</Text>
</View>;

{
  /* 变体用 modifier */
}
<View className="page__btn page__btn--wechat" onClick={handleWechatLogin}>
  <Text className="page__btn-text">微信登录</Text>
</View>;
```

```scss
.page__btn {
  padding: 12px 32px;
  border-radius: $radius-pill; /* 999px 胶囊形 */
  background: $color-primary; /* #5B9E6F */
  box-shadow: $shadow-btn;
  display: flex;
  align-items: center;
  justify-content: center;

  &--wechat {
    background: #07c160; /* 微信品牌绿 */
  }

  &--active {
    background: $color-primary-deep;
  }
}

.page__btn-text {
  font-size: $font-size-sm; /* 28px */
  color: #fff;
  font-weight: $font-weight-medium; /* 600 */
}
```

### 组件 3: EmptyState / Loading（状态占位）

```tsx
{
  /* 空状态 */
}
<View className="empty-state">
  <Text className="empty-state__icon">📭</Text>
  <Text className="empty-state__text">暂无内容</Text>
</View>;

{
  /* 加载中 */
}
<View className="loading">
  <View className="loading__spinner" />
  <Text className="loading__text">加载中...</Text>
</View>;
```

```scss
/* 空状态：垂直居中，大 emoji + 灰色文字 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl; /* 32px */

  &__icon {
    font-size: 80px;
    margin-bottom: $spacing-md;
  }
  &__text {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }
}

/* 加载中：旋转圆环 + 文字 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl;

  &__spinner {
    width: 48px;
    height: 48px;
    border: 4px solid $color-border;
    border-top-color: $color-primary;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__text {
    font-size: $font-size-xs;
    color: $color-text-secondary;
  }
}
```

---

## 附录: 页面结构模板

```tsx
<ScrollView scrollY className="page">
  {/* Hero / 渐变头部（可选） */}
  <View className="page__hero">
    <Text className="page__hero-title">标题</Text>
  </View>

  {/* 统计卡片悬浮区（可选，position: relative; z-index: 1） */}
  <View className="page__stats">…</View>

  {/* 白底圆角内容区（主承载） */}
  <View className="page__section">
    <Text className="page__section-title">🏅 小节标题</Text>
    {/* 列表 / 卡片 / 空状态 */}
  </View>

  {/* 底部提示 */}
  <View className="page__footer-tip">
    <Text className="page__footer-tip-text">提示文字</Text>
  </View>
</ScrollView>
```

```scss
@use '../../styles/tokens.scss' as *;

.page {
  min-height: 100vh;
  background: $color-bg;
  padding-bottom: 80px;

  &__hero {
    background: linear-gradient(135deg, $color-primary 0%, $color-primary-deep 100%);
    padding: 80px 32px 48px;
  }

  &__section {
    background: #fff;
    margin: 24px;
    border-radius: $radius-md; /* 20px */
    padding: 32px 24px;
  }

  &__section-title {
    font-size: $font-size-lg; /* 36px */
    font-weight: $font-weight-medium;
    color: $color-text;
    margin-bottom: 24px;
  }
}
```
