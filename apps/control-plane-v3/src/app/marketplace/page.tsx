'use client';

import { Layout } from '../../interfaces/human/layout';
import { Card } from '../../shared/ui-primitives/card';
import { Button } from '../../shared/ui-primitives/button';
import { Sparkles, Search } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-pink-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Asset Marketplace</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Discover, share, and install assets created by the community. 
            Both humans and agents can publish here.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search marketplace..."
              className="w-full pl-12 pr-4 py-4 rounded-full bg-white border border-pink-200 text-base focus:ring-2 focus:ring-pink-200 outline-none shadow-soft"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Popular', count: '128 items' },
            { name: 'New', count: '24 items' },
            { name: 'Agent-Created', count: '56 items' },
          ].map((category) => (
            <Card key={category.name} hover className="p-6 text-center cursor-pointer">
              <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
              <p className="text-gray-500">{category.count}</p>
            </Card>
          ))}
        </div>

        <div className="text-center py-12">
          <p className="text-gray-400">🚧 Marketplace coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}
