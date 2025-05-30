'use client';

import { useState, useEffect } from 'react';
import {
  useCompetitions,
  useLeaderboard,
  useJoinCompetition,
} from '@/hooks/use-competitions';
import { CompetitionCard } from './competition-card';
import { EmptyState } from './empty-state';
import { NotificationBanner } from './notification-banner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ContestDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const { competitions, loading, error, refetch } = useCompetitions(
    statusFilter,
    searchTerm
  );
  const { joinCompetition, loading: joining } = useJoinCompetition();

  // Auto-refresh every 30 seconds for active competitions
  useEffect(() => {
    const interval = setInterval(() => {
      if (competitions.some((c) => c.status === 'ACTIVE')) {
        refetch();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [competitions, refetch]);

  const handleJoin = async (competitionId: string) => {
    try {
      // In a real app, you would get this from a form or OAuth flow
      const shopifyDomain = prompt(
        'Enter your Shopify store domain (e.g., mystore.myshopify.com):'
      );

      if (!shopifyDomain) {
        return;
      }

      await joinCompetition(competitionId, shopifyDomain);

      toast({
        title: 'Successfully joined!',
        description: "You've been added to the competition.",
      });

      refetch(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Failed to join',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const handleView = (competitionId: string) => {
    // For now, just show more details in a dialog or expand the card
    // In a real app, this would navigate to a dedicated page
    toast({
      title: 'Competition Details',
      description: 'Opening detailed view...',
    });
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Refreshed',
      description: 'Competition data has been updated.',
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">
            Failed to load competitions: {error}
          </p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <NotificationBanner
          message={notification}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search competitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitions</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Competition List */}
      {!loading && (
        <>
          {competitions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {competitions.map((competition) => (
                <CompetitionCardWithLeaderboard
                  key={competition.id}
                  competition={competition}
                  onJoin={handleJoin}
                  onView={handleView}
                  joining={joining}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper component to fetch leaderboard for each competition
function CompetitionCardWithLeaderboard({
  competition,
  onJoin,
  onView,
  joining,
}: {
  competition: any;
  onJoin: (id: string) => void;
  onView: (id: string) => void;
  joining: boolean;
}) {
  const { leaderboard } = useLeaderboard(competition.id);

  return (
    <CompetitionCard
      competition={competition}
      leaderboard={leaderboard}
      onJoin={joining ? undefined : onJoin}
      onView={onView}
      showLeaderboard={competition.status === 'ACTIVE'}
    />
  );
}
