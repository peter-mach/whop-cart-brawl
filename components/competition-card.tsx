'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Users, Calendar, DollarSign } from 'lucide-react';
import { CountdownTimer } from './countdown-timer';
import { RevenueDisplay } from './revenue-display';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Competition {
  id: string;
  title: string;
  description?: string;
  prizeAmount: number;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  participantCount: number;
  userParticipating?: boolean;
  userWon?: boolean;
  winner?: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  revenue: number;
  avatar: string;
}

interface CompetitionCardProps {
  competition: Competition;
  leaderboard?: LeaderboardEntry[];
  onJoin?: (competitionId: string) => void;
  onView?: (competitionId: string) => void;
  showLeaderboard?: boolean;
  compact?: boolean;
}

export function CompetitionCard({
  competition,
  leaderboard = [],
  onJoin,
  onView,
  showLeaderboard = true,
  compact = false,
}: CompetitionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'Upcoming';
      case 'ACTIVE':
        return 'Live';
      case 'COMPLETED':
        return 'Ended';
      default:
        return status;
    }
  };

  const maxRevenue =
    leaderboard.length > 0 ? Math.max(...leaderboard.map((p) => p.revenue)) : 0;
  const userPosition = leaderboard.findIndex((p) => p.name === 'You') + 1;

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader
        className={`${
          competition.status === 'ACTIVE'
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            : 'bg-gray-50'
        } rounded-t-lg`}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={compact ? 'text-lg' : 'text-xl'}>
              {competition.title}
            </span>
            <Badge className={getStatusColor(competition.status)}>
              {getStatusText(competition.status)}
            </Badge>
          </div>
          <Trophy
            className={`h-5 w-5 ${
              competition.status === 'ACTIVE'
                ? 'text-yellow-300'
                : 'text-gray-400'
            }`}
          />
        </CardTitle>
        {competition.description && !compact && (
          <p
            className={`text-sm ${
              competition.status === 'ACTIVE'
                ? 'text-white/80'
                : 'text-gray-600'
            }`}
          >
            {competition.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6">
        {/* Prize Amount */}
        <div className="flex justify-center mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-6 w-6 text-green-600" />
              <div className="text-2xl font-bold text-gray-900">
                ${competition.prizeAmount.toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-gray-600">Prize Pool</div>
          </div>
        </div>

        {/* Competition Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{competition.participantCount} participants</span>
          </div>

          {competition.status === 'UPCOMING' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                Starts {format(new Date(competition.startDate), 'MMM d')}
              </span>
            </div>
          )}

          {competition.status === 'ACTIVE' && (
            <CountdownTimer
              endDate={competition.endDate}
              className="text-sm text-gray-600"
            />
          )}

          {competition.status === 'COMPLETED' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                Ended {format(new Date(competition.endDate), 'MMM d')}
              </span>
            </div>
          )}
        </div>

        {/* User Status */}
        {competition.userParticipating && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                You're participating
              </span>
              {userPosition > 0 && (
                <Badge
                  variant="outline"
                  className="text-blue-800 border-blue-300"
                >
                  #{userPosition}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Winner Display */}
        {competition.status === 'COMPLETED' && competition.winner && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Winner: {competition.winner}
              </span>
              {competition.userWon && (
                <Badge className="bg-yellow-600 text-white">You Won!</Badge>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {showLeaderboard && leaderboard.length > 0 && !compact && (
          <div className="space-y-3 mb-4">
            <h4 className="font-semibold text-gray-900">Top Performers</h4>
            {leaderboard.slice(0, 3).map((participant, index) => (
              <div key={participant.id} className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-500 w-6">
                  #{index + 1}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={participant.avatar}>
                    {participant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium">{participant.name}</div>
                  <Progress
                    value={
                      maxRevenue > 0
                        ? (participant.revenue / maxRevenue) * 100
                        : 0
                    }
                    className="h-2 mt-1"
                  />
                </div>
                <RevenueDisplay
                  amount={participant.revenue}
                  className="text-sm"
                  showIcon={false}
                  animated={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!competition.userParticipating &&
            competition.status === 'UPCOMING' &&
            onJoin && (
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => onJoin(competition.id)}
              >
                Join Competition
              </Button>
            )}

          {onView && (
            <Button
              variant="outline"
              className={
                competition.userParticipating ||
                competition.status !== 'UPCOMING'
                  ? 'flex-1'
                  : ''
              }
              onClick={() => onView(competition.id)}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
