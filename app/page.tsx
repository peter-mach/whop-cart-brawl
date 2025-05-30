'use client';
import { ContestDashboard } from '@/components/contest-dashboard';
import { CreatorDashboard } from '@/components/creator-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Tabs defaultValue="contests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contests">Contests</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
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
