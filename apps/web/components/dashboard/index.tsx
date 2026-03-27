'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { tr } from '@/lib/i18n-shared'
import type { Locale } from '@/lib/i18n-shared'
import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { useReducedMotion } from '@/components/motion-config'
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Layers,
  Shield,
  Activity,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DashboardProps {
  locale: Locale
  stats: {
    pendingTasks: number
    claimedTasks: number
    completedTasks: number
    pendingApprovals: number
  }
  recentTasks: any[]
  pendingApprovals: any[]
  isAuthenticated: boolean
}

export function Dashboard({
  locale,
  stats,
  recentTasks,
  pendingApprovals,
  isAuthenticated,
}: DashboardProps) {
  const { prefersReducedMotion } = useReducedMotion()
  
  const statCards = [
    {
      key: 'pending',
      label: tr(locale, 'Pending', '待认领'),
      value: stats.pendingTasks,
      icon: Clock,
      href: '/tasks',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100/50 dark:bg-amber-900/20',
    },
    {
      key: 'claimed',
      label: tr(locale, 'In Progress', '进行中'),
      value: stats.claimedTasks,
      icon: Activity,
      href: '/tasks',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100/50 dark:bg-blue-900/20',
    },
    {
      key: 'completed',
      label: tr(locale, 'Completed', '已完成'),
      value: stats.completedTasks,
      icon: CheckCircle2,
      href: '/runs',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100/50 dark:bg-emerald-900/20',
    },
    {
      key: 'approvals',
      label: tr(locale, 'Approvals', '待审批'),
      value: stats.pendingApprovals,
      icon: Shield,
      href: '/approvals',
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-100/50 dark:bg-rose-900/20',
      alert: stats.pendingApprovals > 0,
    },
  ]

  const cardMotionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { y: -2, transition: { duration: 0.2 } },
        whileTap: { scale: 0.98 },
      }

  return (
    <StaggerContainer className="space-y-8">
      {/* Stats Grid - Horizontal layout instead of hero metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <StaggerItem key={card.key}>
            <Link href={card.href}>
              <motion.div {...cardMotionProps}>
                <Card isHoverable className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg shrink-0', card.bgColor)}>
                        <card.icon className={cn('w-4 h-4', card.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                          {card.value}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {card.label}
                        </p>
                      </div>
                      {card.alert && (
                        <span className="absolute top-3 right-3 flex h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          </StaggerItem>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <StaggerItem>
          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-neutral-500" aria-hidden="true" />
                <h3 className="font-medium text-sm text-neutral-900 dark:text-white">
                  {tr(locale, 'Recent Tasks', '最近任务')}
                </h3>
              </div>
              <Link
                href="/tasks"
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                {tr(locale, 'View all', '查看全部')}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {recentTasks.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title={tr(locale, 'No tasks yet', '暂无任务')}
                  description={tr(locale, 'Create your first task to get started', '创建第一个任务开始')}
                />
              ) : (
                recentTasks.map((task, index) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    locale={locale}
                    index={index}
                  />
                ))
              )}
            </div>
          </Card>
        </StaggerItem>

        {/* Pending Approvals */}
        <StaggerItem>
          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-500" aria-hidden="true" />
                <h3 className="font-medium text-sm text-neutral-900 dark:text-white">
                  {tr(locale, 'Pending Approvals', '待审批')}
                </h3>
              </div>
              <Link
                href="/approvals"
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                {tr(locale, 'Review all', '全部审核')}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pendingApprovals.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  iconColor="text-emerald-500"
                  title={tr(locale, 'All caught up!', '全部处理完毕！')}
                  description={tr(locale, 'No pending approvals at the moment', '当前没有待处理的审批')}
                />
              ) : (
                pendingApprovals.map((approval, index) => (
                  <ApprovalItem 
                    key={approval.id} 
                    approval={approval}
                    locale={locale}
                    index={index}
                  />
                ))
              )}
            </div>
          </Card>
        </StaggerItem>
      </div>

      {/* Quick Actions */}
      {isAuthenticated && (
        <StaggerItem>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-medium text-sm text-neutral-900 dark:text-white mb-3">
                {tr(locale, 'Quick Actions', '快速操作')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <QuickActionButton href="/tasks" icon={Layers} label={tr(locale, 'New Task', '新建任务')} />
                <QuickActionButton href="/capabilities" icon={Zap} label={tr(locale, 'New Capability', '新建能力')} />
                <QuickActionButton href="/secrets" icon={Shield} label={tr(locale, 'Add Secret', '添加密钥')} />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}
    </StaggerContainer>
  )
}

function TaskItem({ task, locale, index }: { task: any; locale: Locale; index: number }) {
  const { prefersReducedMotion } = useReducedMotion()
  
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: -10 },
        animate: { opacity: 1, x: 0 },
        transition: { delay: index * 0.03, duration: 0.2 },
      }

  return (
    <motion.div
      {...motionProps}
      className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
    >
      <TaskStatusIcon status={task.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
          {task.title}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {task.task_type} • {task.id.slice(0, 8)}
        </p>
      </div>
      <TaskStatusBadge status={task.status} locale={locale} />
    </motion.div>
  )
}

function ApprovalItem({ approval, locale, index }: { approval: any; locale: Locale; index: number }) {
  const { prefersReducedMotion } = useReducedMotion()
  
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: -10 },
        animate: { opacity: 1, x: 0 },
        transition: { delay: index * 0.03, duration: 0.2 },
      }

  // Deterministic color based on agent_id - using darker shades for better contrast
  const colors = [
    'bg-slate-600',
    'bg-zinc-600',
    'bg-stone-600',
    'bg-neutral-600',
    'bg-gray-600',
    'bg-slate-700',
  ]
  const colorIndex = approval.agent_id 
    ? approval.agent_id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length
    : 0
  const avatarColor = colors[colorIndex]

  return (
    <motion.div
      {...motionProps}
      className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
    >
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full text-white font-medium text-xs shrink-0',
        avatarColor
      )}>
        {approval.agent_id?.[0]?.toUpperCase() || 'A'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {approval.policy_reason || 'Approval Request'}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {approval.agent_id} • {approval.action_type}
        </p>
      </div>
      <Badge variant="warning" size="sm">
        {tr(locale, 'Pending', '待处理')}
      </Badge>
    </motion.div>
  )
}

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
      )
    case 'claimed':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100/50 dark:bg-blue-900/20 shrink-0">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
      )
    case 'pending':
    default:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 shrink-0">
          <Circle className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        </div>
      )
  }
}

function TaskStatusBadge({ status, locale }: { status: string; locale: Locale }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success" size="sm">{tr(locale, 'Done', '完成')}</Badge>
    case 'claimed':
      return <Badge variant="accent" size="sm">{tr(locale, 'Active', '活跃')}</Badge>
    case 'pending':
    default:
      return <Badge variant="neutral" size="sm">{tr(locale, 'Pending', '待处理')}</Badge>
  }
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  iconColor = 'text-neutral-400'
}: { 
  icon: typeof Zap
  title: string
  description: string
  iconColor?: string
}) {
  return (
    <div className="px-5 py-10 text-center">
      <div className={cn('inline-flex mb-2', iconColor)}>
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-neutral-900 dark:text-white">
        {title}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
        {description}
      </p>
    </div>
  )
}

function QuickActionButton({ 
  href, 
  icon: Icon, 
  label 
}: { 
  href: string
  icon: typeof Layers
  label: string 
}) {
  const { prefersReducedMotion } = useReducedMotion()
  
  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      }

  return (
    <Link href={href}>
      <motion.button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        {...motionProps}
        type="button"
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        {label}
      </motion.button>
    </Link>
  )
}
