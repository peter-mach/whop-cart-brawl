'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { RevenueDisplay } from './revenue-display';

interface LeaderboardEntry {
  id: string;
  name: string;
  revenue: number;
  avatar: string;
  isCurrentUser?: boolean;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showPositions?: boolean;
  showTrophies?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function LeaderboardTable({
  entries,
  showPositions = true,
  showTrophies = true,
  className = '',
  emptyMessage = 'No participants yet',
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  const getTrophyIcon = (position: number) => {
    if (!showTrophies) return null;

    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getPositionBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className={`rounded-lg border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {showPositions && (
              <TableHead className="w-16 text-center">Rank</TableHead>
            )}
            <TableHead>Participant</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const position = index + 1;
            const isTopThree = position <= 3;

            return (
              <TableRow
                key={entry.id}
                className={`
                  ${entry.isCurrentUser ? 'bg-blue-50 border-blue-200' : ''}
                  ${
                    isTopThree
                      ? 'bg-gradient-to-r from-yellow-50 to-transparent'
                      : ''
                  }
                  hover:bg-gray-50 transition-colors
                `}
              >
                {showPositions && (
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getTrophyIcon(position)}
                      <Badge
                        variant="outline"
                        className={`${getPositionBadgeColor(
                          position
                        )} font-medium`}
                      >
                        #{position}
                      </Badge>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={entry.avatar}>
                        {entry.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={`font-medium ${
                          entry.isCurrentUser
                            ? 'text-blue-700'
                            : 'text-gray-900'
                        }`}
                      >
                        {entry.name}
                        {entry.isCurrentUser && (
                          <Badge className="ml-2 bg-blue-600 text-white">
                            You
                          </Badge>
                        )}
                      </div>
                      {isTopThree && position === 1 && (
                        <div className="text-xs text-yellow-600 font-medium">
                          🎉 Leading!
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <RevenueDisplay
                    amount={entry.revenue}
                    className={`justify-end ${
                      isTopThree ? 'text-yellow-700 font-bold' : ''
                    }`}
                    showIcon={false}
                    animated={false}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
