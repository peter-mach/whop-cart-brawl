'use client';
import { ContestDashboard } from '@/components/contest-dashboard';
import { CreatorDashboard } from '@/components/creator-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 max-w-md">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">CartBrawl</h1>
          </div>
          <p className="text-center text-gray-600 mt-1 text-sm">
            Shopify Revenue Competitions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Tabs defaultValue="contests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contests" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Competitions
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contests" className="mt-6">
            <ContestDashboard />
          </TabsContent>
          <TabsContent value="create" className="mt-6">
            <CreatorDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
