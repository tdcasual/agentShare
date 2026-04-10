/**
 * Demo Spaces - 演示模式协作空间
 *
 * 使用本地运行时数据，不与后端管理状态混淆
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Send, Users, Hash, ArrowLeft, ArrowRight } from 'lucide-react';

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isAgent: boolean;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    author: 'Demo Operator',
    content: 'Welcome to the collaboration space demo!',
    timestamp: '2m ago',
    isAgent: false,
  },
  {
    id: '2',
    author: 'Demo Agent',
    content: 'Hello! I am a demonstration agent. This is local runtime data.',
    timestamp: '1m ago',
    isAgent: true,
  },
];

export default function DemoSpacesPage() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) {
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      author: 'You (Demo)',
      content: input,
      timestamp: 'just now',
      isAgent: false,
    };

    setMessages([...messages, newMessage]);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-[var(--kw-amber-surface)]/80 p-4 dark:border-[var(--kw-dark-amber-surface)] dark:bg-amber-900/10">
        <p className="text-sm font-medium text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
          Collaboration prototype
        </p>
        <p className="mt-2 text-sm text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
          This space is for chat and collaboration experiments with local state. It is not the inbox
          or events-backed operations workspace.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/40 dark:text-[var(--kw-warning)] dark:hover:bg-amber-900/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sandbox Directory
          </Link>
          <Link
            href="/spaces"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
          >
            View live spaces
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex h-[calc(100vh-260px)] gap-4">
        {/* 侧边栏 - 空间列表 */}
        <div className="w-64 flex-shrink-0 overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
          <div className="border-b border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
            <h2 className="font-semibold text-[var(--kw-text)]">Spaces</h2>
          </div>
          <div className="p-2">
            <button className="flex w-full items-center gap-2 rounded-xl bg-[var(--kw-primary-50)] px-3 py-2 text-left text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
              <Hash className="h-4 w-4" />
              <span className="font-medium">general</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[var(--kw-text-muted)] hover:bg-[var(--kw-surface-alt)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-surface-alt)]/50">
              <Hash className="h-4 w-4" />
              <span>random</span>
            </button>
          </div>
        </div>

        {/* 主聊天区域 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-[var(--kw-text-muted)]" />
              <h2 className="font-semibold text-[var(--kw-text)]">general</h2>
            </div>
            <div className="flex items-center gap-1 text-sm text-[var(--kw-text-muted)]">
              <Users className="h-4 w-4" />
              <span>2 members</span>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    msg.isAgent
                      ? 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-success-surface)]/30 dark:text-[var(--kw-dark-mint)]'
                      : 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] dark:bg-[var(--kw-dark-sky-accent-surface)]/30 dark:text-[var(--kw-dark-sky)]'
                  }`}
                >
                  {msg.isAgent ? '🤖' : '👤'}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-[var(--kw-text)]">
                      {msg.author}
                    </span>
                    <span className="text-xs text-[var(--kw-text-muted)]">{msg.timestamp}</span>
                  </div>
                  <p className="text-[var(--kw-text)] dark:text-[var(--kw-dark-text-muted)]">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 输入框 */}
          <div className="border-t border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message... (Demo mode)"
                className="flex-1 rounded-xl border border-[var(--kw-primary-200)] bg-white px-4 py-2 text-[var(--kw-text)] focus:outline-none focus:ring-2 focus:ring-[var(--kw-primary-400)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
              />
              <button
                onClick={sendMessage}
                className="rounded-xl bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-600)] px-4 py-2 text-white transition-shadow hover:shadow-lg"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--kw-text-muted)]">
              💡 This is demonstration data. Messages are stored in local state only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
