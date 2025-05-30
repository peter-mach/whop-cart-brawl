"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Clock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ActiveContestProps {
  contest: {
    id: number
    title: string
    prize: number
    endDate: Date
    participants: number
    userParticipating: boolean
    leaderboard?: Array<{
      id: number
      name: string
      revenue: number
      avatar: string
    }>
  }
}

export function ActiveContest({ contest }: ActiveContestProps) {
  const timeRemaining = Math.max(0, contest.endDate.getTime() - Date.now())
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  const maxRevenue = contest.leaderboard ? Math.max(...contest.leaderboard.map((p) => p.revenue)) : 0

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <span>{contest.title}</span>
          <Trophy className="h-6 w-6 text-yellow-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">${contest.prize}</div>
            <div className="text-sm text-gray-600">Prize Pool</div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {daysRemaining}d {hoursRemaining}h left
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{contest.participants} participants</span>
          </div>
        </div>

        {contest.leaderboard && (
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900">Leaderboard</h3>
            {contest.leaderboard.map((participant, index) => (
              <div key={participant.id} className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-500 w-6">#{index + 1}</div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={participant.avatar}>{participant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Progress value={(participant.revenue / maxRevenue) * 100} className="h-2" />
                </div>
                <div className="text-sm font-semibold text-gray-900">${participant.revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {!contest.userParticipating && (
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Enter Contest</Button>
        )}
      </CardContent>
    </Card>
  )
}
