# UI/UX 重构实施计划 v2.0

> 目标：打造简洁大方、极具现代感的 Agent Control Plane 界面
> 设计灵感：Linear × Vercel × Notion × Raycast
> 核心原则：极简主义、 purposeful motion、微妙的高级感

---

## 🎨 设计系统规范

### 视觉语言

```
┌─────────────────────────────────────────────────────────────────┐
│  设计原则                                                         │
├─────────────────────────────────────────────────────────────────┤
│  1. 呼吸感 ─ 大量留白，内容为王                                    │
│  2. 层次性 ─ 微妙的阴影和边框创造深度                              │
│  3. 流动性 ─ 所有交互都有平滑过渡                                  │
│  4. 精致感 ─ 1px 边框、圆角、毛玻璃效果                            │
│  5. 一致性 ─ 统一的动效语言和节奏                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 色彩系统（现代化升级）

```typescript
// lib/design-tokens.ts
export const designTokens = {
  // 主色调 - 更冷静的蓝色
  accent: {
    50: '#f0f4ff',
    100: '#e0eaff',
    200: '#c7d8fe',
    300: '#a5befd',
    400: '#809bfa',
    500: '#5f78f4',  // Primary
    600: '#4b5ce8',
    700: '#3d48cd',
    800: '#343da6',
    900: '#303882',
  },
  
  // 中性色 - 更温暖的灰
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // 语义色
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // 深色模式专用
  dark: {
    bg: '#09090b',
    surface: '#18181b',
    elevated: '#27272a',
    border: '#3f3f46',
  }
}
```

### 间距系统（8px 基准）

```css
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

### 圆角系统

```css
:root {
  --radius-none: 0;
  --radius-sm: 6px;    /* 小按钮、标签 */
  --radius-md: 8px;    /* 输入框、卡片 */
  --radius-lg: 12px;   /* 大卡片、模态框 */
  --radius-xl: 16px;   /* 页面容器 */
  --radius-2xl: 24px;  /* 特殊强调 */
  --radius-full: 9999px; /* 完全圆角 */
}
```

### 阴影系统（层次化）

```css
:root {
  /* 浅色模式 */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -2px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.04), 0 8px 10px -6px rgb(0 0 0 / 0.04);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.12);
  
  /* 发光效果（深色模式） */
  --glow-accent: 0 0 20px -5px var(--accent-500);
  --glow-success: 0 0 20px -5px var(--success);
  --glow-error: 0 0 20px -5px var(--error);
}
```

---

## ✨ 动画系统设计

### 动画原则

```
┌─────────────────────────────────────────────────────────────────┐
│  动效哲学： purposeful motion（有意义的运动）                      │
├─────────────────────────────────────────────────────────────────┤
│  • 快速响应 - 交互反馈 < 100ms                                   │
│  • 平滑过渡 - 状态变化 200-300ms                                 │
│  • 自然缓动 - 使用 spring 和 cubic-bezier                        │
│  • 尊重用户 - 支持 prefers-reduced-motion                        │
└─────────────────────────────────────────────────────────────────┘
```

### 动画库选择

```bash
npm install framer-motion
```

### 动画配置

```typescript
// lib/animations.ts
export const transitions = {
  // 快速反馈
  fast: {
    duration: 0.15,
    ease: [0.4, 0, 0.2, 1]
  },
  
  // 标准过渡
  default: {
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1]
  },
  
  // 强调动画
  emphasis: {
    duration: 0.35,
    ease: [0.34, 1.56, 0.64, 1]  // 弹性效果
  },
  
  // 平滑进入
  enter: {
    duration: 0.4,
    ease: [0, 0, 0.2, 1]
  },
  
  // 平滑退出
  exit: {
    duration: 0.2,
    ease: [0.4, 0, 1, 1]
  },
  
  // Spring 动画
  spring: {
    type: "spring",
    stiffness: 400,
    damping: 30
  },
  
  // 柔和 Spring
  springSoft: {
    type: "spring",
    stiffness: 300,
    damping: 25
  }
}

// 常用动画变体
export const variants = {
  // 淡入上移
  fadeInUp: {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: transitions.enter
    }
  },
  
  // 淡入缩放
  fadeInScale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: transitions.springSoft
    }
  },
  
  //  stagger 子元素
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },
  
  // 列表项
  listItem: {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: transitions.default
    }
  },
  
  // 卡片悬停
  cardHover: {
    rest: { 
      scale: 1, 
      boxShadow: 'var(--shadow-sm)',
      y: 0
    },
    hover: { 
      scale: 1.01, 
      boxShadow: 'var(--shadow-lg)',
      y: -2,
      transition: transitions.springSoft
    }
  },
  
  // 按钮点击
  buttonTap: {
    scale: 0.97,
    transition: transitions.fast
  },
  
  // 模态框
  modal: {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 10 
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: transitions.springSoft
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      y: 10,
      transition: transitions.exit
    }
  },
  
  // 侧边栏滑入
  slideIn: {
    hidden: { x: '100%' },
    visible: { 
      x: 0,
      transition: transitions.springSoft
    },
    exit: { 
      x: '100%',
      transition: transitions.exit
    }
  },
  
  // 数字滚动
  countUp: {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1]
      }
    })
  }
}
```

---

## 🎯 第一阶段：设计系统 + 动画基础 (Week 1)

### 1.1 建立设计系统

**文件结构**：
```
apps/web/
├── lib/
│   ├── design-tokens.ts       # 设计令牌
│   ├── animations.ts          # 动画配置
│   └── utils/
│       └── cn.ts              # className 合并工具
├── components/
│   └── ui/
│       ├── index.ts           # 组件统一导出
│       ├── button.tsx         # 现代化按钮
│       ├── card.tsx           # 卡片组件
│       ├── input.tsx          # 输入框组件
│       ├── badge.tsx          # 徽章组件
│       ├── skeleton.tsx       # 骨架屏
│       ├── tooltip.tsx        # 工具提示
│       ├── dropdown.tsx       # 下拉菜单
│       └── tabs.tsx           # 标签页
```

**现代化按钮组件** (`components/ui/button.tsx`)：

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { transitions } from '@/lib/animations'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2'
  
  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950',
    secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-sm rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-lg'
  }

  return (
    <motion.button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      whileTap={{ scale: 0.97 }}
      transition={transitions.fast}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  )
}
```

**现代化卡片组件** (`components/ui/card.tsx`)：

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { variants } from '@/lib/animations'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isHoverable?: boolean
  isPressable?: boolean
}

export function Card({
  children,
  className,
  isHoverable = false,
  isPressable = false,
  ...props
}: CardProps) {
  return (
    <motion.div
      className={cn(
        'bg-white rounded-xl border border-neutral-200/60 shadow-sm',
        className
      )}
      initial="rest"
      whileHover={isHoverable ? "hover" : undefined}
      whileTap={isPressable ? { scale: 0.995 } : undefined}
      variants={isHoverable ? variants.cardHover : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-b border-neutral-100', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-xl', className)} {...props}>
      {children}
    </div>
  )
}
```

**毛玻璃效果导航栏** (`components/ui/glass-nav.tsx`)：

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

export function GlassNav({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.nav
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50',
        'px-2 py-2 rounded-full',
        'bg-white/80 backdrop-blur-xl',
        'border border-white/20',
        'shadow-lg shadow-black/5',
        className
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {children}
    </motion.nav>
  )
}
```

**CSS 现代化样式** (`app/globals.css` 重写)：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* 颜色系统 */
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --accent: 0 0% 96%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 0 0% 64%;
    --radius: 0.5rem;
    
    /* 自定义属性 */
    --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 98%;
    --card: 0 0% 6%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 6%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 64%;
    --accent: 0 0% 15%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62% 30%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 15%;
    --input: 0 0% 15%;
    --ring: 0 0% 40%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
  
  /* 平滑滚动 */
  html {
    scroll-behavior: smooth;
  }
  
  /* 选中文本样式 */
  ::selection {
    @apply bg-neutral-900 text-white;
  }
  
  /* 深色模式选中文本 */
  .dark ::selection {
    @apply bg-white text-neutral-900;
  }
}

@layer utilities {
  /* 文字渐变 */
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900;
  }
  
  .dark .text-gradient {
    @apply from-white via-neutral-300 to-white;
  }
  
  /* 毛玻璃效果 */
  .glass {
    @apply bg-white/80 backdrop-blur-xl border border-white/20;
  }
  
  .dark .glass {
    @apply bg-neutral-900/80 border-neutral-800/50;
  }
  
  /* 微妙阴影 */
  .shadow-subtle {
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  }
  
  .shadow-elevated {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  }
  
  /* 发光效果 */
  .glow-accent {
    box-shadow: 0 0 20px -5px hsl(var(--primary));
  }
  
  /* 动画工具类 */
  .animate-in {
    animation: animateIn 0.3s var(--ease-out-expo) forwards;
  }
  
  @keyframes animateIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* 脉冲光环 */
  .ring-pulse {
    animation: ringPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes ringPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px hsl(var(--primary) / 0);
    }
  }
}
```

**验收标准**：
- [ ] 所有基础组件符合设计系统规范
- [ ] 按钮、卡片有流畅的交互动画
- [ ] 毛玻璃效果导航栏实现
- [ ] 深色/浅色模式切换正常

---

## 🎯 第二阶段：现代化导航 + Dashboard (Week 2)

### 2.1 极简主义导航

**设计要点**：
- 悬浮式导航栏（类似 Linear）
- 图标 + 文字组合
- 徽章微动效
- 活动状态指示器

**文件**：`components/navigation/floating-nav.tsx`

```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { transitions, variants } from '@/lib/animations'
import { 
  Home, 
  Layers, 
  Shield, 
  Code2,
  Bell 
} from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'Overview', badge: null },
  { href: '/tasks', icon: Layers, label: 'Tasks', badge: 'tasks' },
  { href: '/approvals', icon: Shield, label: 'Approvals', badge: 'approvals' },
  { href: '/playground', icon: Code2, label: 'Playground', badge: null },
]

export function FloatingNav({
  badgeCounts
}: {
  badgeCounts: { tasks: number; approvals: number }
}) {
  const pathname = usePathname()

  return (
    <motion.nav
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: transitions.emphasis.ease }}
    >
      <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg shadow-black/5">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          const badge = item.badge ? badgeCounts[item.badge] : null
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' 
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                
                {/* 活动状态指示器 */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-inherit -z-10"
                    layoutId="activeNav"
                    transition={transitions.springSoft}
                  />
                )}
                
                {/* 徽章 */}
                <AnimatePresence>
                  {badge ? (
                    <motion.span
                      className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={transitions.emphasis}
                    >
                      {badge > 99 ? '99+' : badge}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}
        
        {/* 分隔线 */}
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />
        
        {/* 通知按钮 */}
        <motion.button
          className="relative p-2 rounded-full text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.nav>
  )
}
```

### 2.2 现代化 Dashboard

**设计要点**：
- 大字体标题（类似 Notion）
- 卡片网格布局
- 悬停微动效
- 实时数据指示器

**文件**：`app/page.tsx` + `components/dashboard/`

```typescript
// components/dashboard/stat-card.tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import { transitions, variants } from '@/lib/animations'
import { tr } from '@/lib/i18n-shared'
import type { Locale } from '@/lib/i18n-shared'

interface StatCardProps {
  title: string
  value: number
  trend?: { value: number; isPositive: boolean }
  href: string
  locale: Locale
  index: number
}

export function StatCard({
  title,
  value,
  trend,
  href,
  locale,
  index
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transitions.enter, delay: index * 0.1 }}
    >
      <Link href={href}>
        <motion.div
          className="group relative p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm"
          whileHover={{ 
            y: -4, 
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
            transition: transitions.springSoft
          }}
        >
          {/* 悬停时的背景光效 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neutral-900/[0.02] to-transparent dark:from-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {title}
              </span>
              <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -5 }}
                whileHover={{ x: 0 }}
              >
                <ArrowUpRight className="w-4 h-4 text-neutral-400" />
              </motion.div>
            </div>
            
            {/* 数值 */}
            <div className="flex items-end gap-3">
              <motion.span 
                className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white"
                key={value}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={transitions.spring}
              >
                {value}
              </motion.span>
              
              {/* 趋势 */}
              {trend && (
                <motion.div
                  className={`flex items-center gap-1 text-sm font-medium mb-1 ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(trend.value)}%</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}
```

**任务预览卡片** (`components/dashboard/task-preview.tsx`)：

```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, Circle } from 'lucide-react'
import { transitions } from '@/lib/animations'
import type { Task } from '@/lib/api'
import type { Locale } from '@/lib/i18n-shared'

export function TaskPreview({
  tasks,
  locale
}: {
  tasks: Task[]
  locale: Locale
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'claimed':
        return <Clock className="w-4 h-4 text-amber-500" />
      default:
        return <Circle className="w-4 h-4 text-neutral-400" />
    }
  }

  return (
    <motion.div
      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transitions.enter, delay: 0.3 }}
    >
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Recent Tasks
        </h3>
      </div>
      
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        <AnimatePresence mode="popLayout">
          {tasks.slice(0, 5).map((task, index) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ ...transitions.default, delay: index * 0.05 }}
              className="group flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={transitions.spring}
              >
                {getStatusIcon(task.status)}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                  {task.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {task.task_type} • {task.id.slice(0, 8)}...
                </p>
              </div>
              
              <motion.span
                className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                whileHover={{ scale: 1.05 }}
              >
                {task.status}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {tasks.length === 0 && (
        <div className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={transitions.emphasis}
            className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
          >
            <CheckCircle2 className="w-6 h-6 text-neutral-400" />
          </motion.div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No tasks yet
          </p>
        </div>
      )}
    </motion.div>
  )
}
```

**验收标准**：
- [ ] 悬浮导航栏有活动状态平滑切换动画
- [ ] 统计卡片有数字滚动动画
- [ ] 任务列表有过渡动画
- [ ] 所有卡片有悬停微动效

---

## 🎯 第三阶段：精致审批流程 (Week 3)

### 3.1 滑动式审批卡片

**设计要点**：
- 类 Tinder 卡片滑动（或按钮操作）
- 手势支持
- 流畅的消失动画
- 撤销操作

**文件**：`components/approvals/swipeable-card.tsx`

```typescript
'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Check, X, RotateCcw } from 'lucide-react'
import { transitions } from '@/lib/animations'

interface SwipeableApprovalCardProps {
  approval: ApprovalRequest
  onApprove: () => void
  onReject: () => void
  onUndo?: () => void
}

export function SwipeableApprovalCard({
  approval,
  onApprove,
  onReject,
  onUndo
}: SwipeableApprovalCardProps) {
  const [isProcessed, setIsProcessed] = useState(false)
  const [action, setAction] = useState<'approved' | 'rejected' | null>(null)
  const constraintsRef = useRef(null)
  
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-10, 10])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])
  
  // 背景色随滑动变化
  const background = useTransform(
    x,
    [-200, -50, 0, 50, 200],
    [
      'rgba(239, 68, 68, 0.2)',  // 红色（拒绝）
      'rgba(239, 68, 68, 0.05)',
      'rgba(0, 0, 0, 0)',
      'rgba(34, 197, 94, 0.05)',
      'rgba(34, 197, 94, 0.2)'   // 绿色（批准）
    ]
  )

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100
    
    if (info.offset.x > threshold) {
      // 向右滑 - 批准
      setAction('approved')
      setIsProcessed(true)
      onApprove()
    } else if (info.offset.x < -threshold) {
      // 向左滑 - 拒绝
      setAction('rejected')
      setIsProcessed(true)
      onReject()
    }
  }

  if (isProcessed) {
    return (
      <motion.div
        className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center">
          <motion.div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
              action === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={transitions.emphasis}
          >
            {action === 'approved' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
          </motion.div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white capitalize">
            {action}
          </p>
          {onUndo && (
            <motion.button
              className="mt-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 mx-auto"
              onClick={() => {
                setIsProcessed(false)
                onUndo()
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </motion.button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div ref={constraintsRef} className="relative">
      {/* 背景提示 */}
      <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
        <motion.div 
          className="flex items-center gap-2 text-red-500"
          style={{ opacity: useTransform(x, [-200, -50], [1, 0]) }}
        >
          <X className="w-8 h-8" />
          <span className="font-semibold">Reject</span>
        </motion.div>
        <motion.div 
          className="flex items-center gap-2 text-green-500"
          style={{ opacity: useTransform(x, [50, 200], [0, 1]) }}
        >
          <span className="font-semibold">Approve</span>
          <Check className="w-8 h-8" />
        </motion.div>
      </div>

      {/* 可滑动卡片 */}
      <motion.div
        style={{ x, rotate, opacity, background }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: 'grabbing' }}
        className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-lg p-6 cursor-grab active:cursor-grabbing"
      >
        {/* 卡片内容 */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {approval.agent_id[0].toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
              {approval.policy_reason || 'Approval Request'}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
              Agent <span className="font-medium text-neutral-700 dark:text-neutral-300">{approval.agent_id}</span> requests access to{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{approval.capability_id}</span>
            </p>
            
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                {approval.action_type}
              </span>
              <span>•</span>
              <span>{formatTimeAgo(approval.created_at)}</span>
            </div>
          </div>
        </div>

        {/* 按钮操作区（桌面端） */}
        <div className="flex gap-3 mt-6">
          <motion.button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            onClick={() => {
              setAction('rejected')
              setIsProcessed(true)
              onReject()
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="w-4 h-4" />
            Reject
          </motion.button>
          <motion.button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            onClick={() => {
              setAction('approved')
              setIsProcessed(true)
              onApprove()
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Check className="w-4 h-4" />
            Approve
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
```

**验收标准**：
- [ ] 审批卡片可左右滑动
- [ ] 滑动时有视觉反馈（背景色变化）
- [ ] 处理后显示成功状态 + 撤销按钮
- [ ] 按钮操作也有流畅动画

---

## 🎯 第四阶段：微交互 + 细节打磨 (Week 4)

### 4.1 精致加载状态

**骨架屏动画** (`components/ui/skeleton.tsx`)：

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

export function Skeleton({
  className,
  animate = true
}: {
  className?: string
  animate?: boolean
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800', className)}>
      {animate && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          animate={{
            translateX: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  )
}
```

### 4.2 Toast 通知系统

```typescript
// components/ui/toast.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { transitions } from '@/lib/animations'

interface ToastProps {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  onClose: () => void
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
  warning: AlertCircle
}

const styles = {
  success: 'bg-white dark:bg-neutral-900 border-green-200 dark:border-green-800',
  error: 'bg-white dark:bg-neutral-900 border-red-200 dark:border-red-800',
  info: 'bg-white dark:bg-neutral-900 border-blue-200 dark:border-blue-800',
  warning: 'bg-white dark:bg-neutral-900 border-amber-200 dark:border-amber-800'
}

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500'
}

export function Toast({ id, type, title, message, onClose }: ToastProps) {
  const Icon = icons[type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={transitions.springSoft}
      className={`w-full max-w-sm rounded-xl border shadow-lg p-4 ${styles[type]}`}
    >
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[type]}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {title}
          </h4>
          {message && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {message}
            </p>
          )}
        </div>
        <motion.button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
      
      {/* 自动关闭进度条 */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${iconColors[type].replace('text-', 'bg-')}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  )
}
```

### 4.3 页面过渡动画

```typescript
// components/page-transition.tsx
'use client'

import { motion } from 'framer-motion'
import { transitions } from '@/lib/animations'

export function PageTransition({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={transitions.enter}
    >
      {children}
    </motion.div>
  )
}
```

---

## 🎯 第五阶段：深色模式 + 响应式 (Week 5)

### 5.1 完美深色模式

确保所有组件都有深色模式适配：

```css
/* 全局深色模式优化 */
.dark {
  color-scheme: dark;
}

/* 滚动条 */
.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dark ::-webkit-scrollbar-track {
  background: var(--neutral-800);
}

.dark ::-webkit-scrollbar-thumb {
  background: var(--neutral-700);
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--neutral-600);
}
```

### 5.2 响应式设计

```typescript
// hooks/use-media-query.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

// 使用
const isMobile = useMediaQuery('(max-width: 768px)')
const isTablet = useMediaQuery('(max-width: 1024px)')
```

---

## 📁 完整文件结构

```
apps/web/
├── app/
│   ├── globals.css              # 现代化样式系统
│   ├── layout.tsx               # 根布局 + Provider
│   ├── page.tsx                 # 新 Dashboard
│   ├── tasks/page.tsx           # 任务页面
│   ├── approvals/page.tsx       # 审批页面
│   └── playground/page.tsx      # Playground
│
├── components/
│   ├── ui/                      # 基础组件库
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   └── glass-nav.tsx
│   │
│   ├── navigation/
│   │   └── floating-nav.tsx     # 悬浮式导航
│   │
│   ├── dashboard/
│   │   ├── stat-card.tsx
│   │   ├── task-preview.tsx
│   │   ├── approval-preview.tsx
│   │   └── activity-chart.tsx
│   │
│   ├── approvals/
│   │   └── swipeable-card.tsx   # 滑动审批卡片
│   │
│   └── page-transition.tsx
│
├── lib/
│   ├── design-tokens.ts         # 设计令牌
│   ├── animations.ts            # 动画配置
│   ├── utils/
│   │   └── cn.ts               # className 合并
│   └── hooks/
│       └── use-media-query.ts
│
└── package.json                 # 添加 framer-motion
```

---

## ✅ 最终验收标准

### 视觉
- [ ] 整体风格简洁现代，参考 Linear/Vercel
- [ ] 所有组件有悬停、点击状态
- [ ] 深色模式完美适配
- [ ] 移动端响应式正常

### 动画
- [ ] 页面进入有淡入上移动画
- [ ] 卡片悬停有微动效
- [ ] 导航活动状态有平滑切换
- [ ] 审批卡片可滑动操作
- [ ] Toast 通知有过渡动画
- [ ] 数字变化有滚动效果
- [ ] 支持 `prefers-reduced-motion`

### 交互
- [ ] 所有按钮有即时反馈
- [ ] 加载状态有骨架屏
- [ ] 操作成功有 Toast 提示
- [ ] 错误状态友好提示
- [ ] 实时数据更新有视觉提示

---

## 🚀 技术依赖

```bash
npm install framer-motion lucide-react clsx tailwind-merge
```

## 📚 参考资源

- [Linear Design](https://linear.app/design)
- [Vercel Design System](https://vercel.com/design)
- [Framer Motion Examples](https://www.framer.com/motion/examples/)
