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
    if (!input.trim()) return;
    
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
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/10">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Collaboration prototype
        </p>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          This space is for chat and collaboration experiments with local state. It is not the inbox or events-backed operations workspace.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sandbox Directory
          </Link>
          <Link
            href="/spaces"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-[#252540] dark:text-stone-100 dark:hover:bg-[#2A2A45]"
          >
            View live spaces
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="h-[calc(100vh-260px)] flex gap-4">
        {/* 侧边栏 - 空间列表 */}
        <div className="w-64 flex-shrink-0 bg-white dark:bg-[#252540] rounded-2xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden">
          <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C]">
            <h2 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">Spaces</h2>
          </div>
          <div className="p-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 dark:bg-[#3D3D5C] text-pink-700 dark:text-[#E891C0] text-left">
              <Hash className="w-4 h-4" />
              <span className="font-medium">general</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-[#3D3D5C]/50 text-left">
              <Hash className="w-4 h-4" />
              <span>random</span>
            </button>
          </div>
        </div>
        
        {/* 主聊天区域 */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#252540] rounded-2xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden">
          {/* 头部 */}
          <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">general</h2>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
              <Users className="w-4 h-4" />
              <span>2 members</span>
            </div>
          </div>
          
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  msg.isAgent 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                }`}>
                  {msg.isAgent ? '🤖' : '👤'}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                      {msg.author}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-[#666]">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-[#9CA3AF]">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* 输入框 */}
          <div className="p-4 border-t border-pink-100 dark:border-[#3D3D5C]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message... (Demo mode)"
                className="flex-1 px-4 py-2 rounded-xl border border-pink-200 dark:border-[#3D3D5C] bg-white dark:bg-[#1A1A2E] text-gray-800 dark:text-[#E8E8EC] focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-[#666]">
              💡 This is demonstration data. Messages are stored in local state only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
