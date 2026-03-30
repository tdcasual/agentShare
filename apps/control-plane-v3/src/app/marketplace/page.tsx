'use client';

import { Layout } from '@/interfaces/human/layout';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { useI18n } from '@/components/i18n-provider';
import { Sparkles, Search } from 'lucide-react';

export default function MarketplacePage() {
  const { t } = useI18n();

  const categories = [
    { name: t('marketplace.categories.popular'), count: `128 ${t('marketplace.items')}` },
    { name: t('marketplace.categories.new'), count: `24 ${t('marketplace.items')}` },
    { name: t('marketplace.categories.agentCreated'), count: `56 ${t('marketplace.items')}` },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-pink-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">{t('marketplace.title')}</h1>
          <p className="text-gray-600 dark:text-[#9CA3AF] max-w-md mx-auto">
            {t('marketplace.description')}
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[#9CA3AF]" />
            <input
              type="text"
              placeholder={t('marketplace.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-4 rounded-full bg-white border border-pink-200 text-base focus:ring-2 focus:ring-pink-200 outline-none shadow-soft"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.name} hover className="p-6 text-center cursor-pointer">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">{category.name}</h3>
              <p className="text-gray-500 dark:text-[#9CA3AF]">{category.count}</p>
            </Card>
          ))}
        </div>

        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-[#9CA3AF]">🚧 {t('marketplace.comingSoon')}</p>
        </div>
      </div>
    </Layout>
  );
}
