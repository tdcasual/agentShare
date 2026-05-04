/**
 * Kawaii Emoji Map - 双生宇宙的可爱 emoji 系统
 *
 * 为每个场景配置对应的可爱 emoji，保持一致的视觉语言
 */

export const kawaiiEmojis = {
  // 加载 & 等待
  loading: ['🌸', '✨', '💫', '⭐', '🎀', '🌷', '🍥'],
  spinner: ['🌸', '🌸', '🌸'],

  // 状态
  success: ['🎉', '✨', '🌟', '💖', '🌈', '🎊'],
  error: ['💔', '🥺', '😿', '💥', '🌩️', '😵'],
  warning: ['⚠️', '💫', '🌙', '🔔'],
  info: ['💡', '✨', '📌', '🔍'],
  empty: ['🍃', '🌱', '📭', '🕊️', '☁️'],

  // 页面 & 导航
  home: ['🏠', '🌈', '✨'],
  dashboard: ['📊', '✨', '📈'],
  login: ['🔐', '🔑', '🌸'],
  logout: ['👋', '🌙', '☁️'],
  setup: ['🛠️', '⚙️', '🔧', '🎀'],
  offline: ['🌙', '☁️', '📡', '🌌'],
  notFound: ['🔍', '🌫️', '🗺️', '🚪'],

  // 业务领域
  identities: ['🧑', '👤', '💁', '🤖', '🦄', '🦊', '🐱'],
  agents: ['🤖', '🦄', '🦊', '🚀', '⚡'],
  humans: ['🧑', '👩', '💁', '✨'],
  tasks: ['📋', '✅', '📌', '🎯', '⏰'],
  assets: ['🔐', '🔑', '🗝️', '💎', '📦'],
  secrets: ['🔐', '🤫', '🗝️', '💎'],
  capabilities: ['⚡', '🚀', '💡', '🔮', '🎯'],
  spaces: ['🏠', '🌐', '🗺️', '📍', '🌍'],
  marketplace: ['🛒', '🏪', '🎁', '🛍️', '✨'],
  playbooks: ['📚', '📖', '📄', '📋', '🗂️'],
  runs: ['🏃', '⚡', '🚀', '🔥', '💨'],
  reviews: ['👀', '🔍', '✅', '📋'],
  approvals: ['✅', '📋', '👍', '🔏'],
  tokens: ['🎫', '🔖', '🏷️', '🔐', '🎟️'],
  events: ['📬', '💌', '🔔', '📨', '✉️'],
  inbox: ['📬', '💌', '📨', '🔔', '📮'],
  search: ['🔍', '🔎', '✨', '🕵️'],
  settings: ['⚙️', '🔧', '🎛️', '🛠️', '📐'],
  docs: ['📚', '📖', '📄', '📑', '🔖'],
  admin: ['👑', '⚡', '🔐', '🛡️'],

  // 动作
  create: ['✨', '➕', '🆕', '🌟'],
  delete: ['🗑️', '💥', '❌', '🚫'],
  edit: ['✏️', '📝', '🔧', '💫'],
  save: ['💾', '✅', '💫', '✨'],
  publish: ['🚀', '📤', '✨', '🎉'],
  sync: ['🔄', '💫', '⚡', '✨'],
  refresh: ['🔄', '✨', '💫', '🔁'],
  back: ['👈', '⬅️', '🔙', '🏠'],
  next: ['👉', '➡️', '🔜', '✨'],

  // 角色
  roleOwner: ['👑', '✨', '💎'],
  roleAdmin: ['🛡️', '⚡', '🔐'],
  roleOperator: ['🔧', '⚙️', '💪'],
  roleViewer: ['👁️', '🔍', '📖'],

  // 时间
  recent: ['⏰', '🕐', '✨'],
  scheduled: ['📅', '⏳', '📆'],
  expired: ['⌛', '💨', '🌫️'],

  // 特殊
  dream: ['🌙', '💤', '✨', '🌌', '🔮'],
  workbench: ['🛠️', '🔧', '⚙️', '📐'],
  cosmos: ['🌌', '✨', '🌠', '🔮', '🪐'],
  dual: ['☯️', '🔗', '✨', '🌓'],
} as const;

/** 获取随机 emoji */
export function randomEmoji(category: keyof typeof kawaiiEmojis): string {
  const list = kawaiiEmojis[category];
  return list[Math.floor(Math.random() * list.length)];
}

/** 获取第一个 emoji（用于稳定展示） */
export function emoji(category: keyof typeof kawaiiEmojis): string {
  return kawaiiEmojis[category][0];
}

/** 获取 emoji 组合 */
export function emojiCombo(category: keyof typeof kawaiiEmojis, count: number = 3): string {
  const list = kawaiiEmojis[category];
  return Array.from({ length: count })
    .map(() => list[Math.floor(Math.random() * list.length)])
    .join(' ');
}

/** 页面标题装饰 - 给标题加 emoji */
export function pageTitle(title: string, category: keyof typeof kawaiiEmojis): string {
  return `${emoji(category)} ${title}`;
}

/** 空状态消息 */
export function emptyMessage(category: keyof typeof kawaiiEmojis, text: string): string {
  return `${emoji('empty')} ${text}`;
}

/** 加载消息 */
export function loadingMessage(text?: string): string {
  return `${emoji('loading')} ${text ?? '加载中...'}`;
}
