"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Calendar } from "lucide-react"

interface UpcomingContestProps {
  contest: {
    id: number
    title: string
    prize: number
    startDate: Date
    endDate: Date
    participants: number
    userParticipating: boolean
  }
}

export function UpcomingContest({ contest }: UpcomingContestProps) {
  const timeUntilStart = Math.max(0, contest.startDate.getTime() - Date.now())
  const daysUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24))
  const hoursUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  const duration = Math.floor((contest.endDate.getTime() - contest.startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className="w-full border-orange-200 bg-orange-50">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <span>{contest.title}</span>
          <Calendar className="h-6 w-6" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2 opacity-70" />
            <div className="text-xl font-bold text-gray-900">${contest.prize}</div>
            <div className="text-sm text-gray-600">Prize Pool</div>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-orange-600 mb-1">
            Starts in {daysUntilStart}d {hoursUntilStart}h
          </div>
          <div className="text-sm text-gray-600">Duration: {duration} days</div>
        </div>

        <div className="flex justify-center items-center gap-1 mb-6 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{contest.participants} registered</span>
        </div>

        {!contest.userParticipating ? (
          <Button className="w-full bg-orange-500 hover:bg-orange-600">Register for Contest</Button>
        ) : (
          <Button className="w-full" variant="outline" disabled>
            Registered ✓
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
