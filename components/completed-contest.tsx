"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, CheckCircle, XCircle } from "lucide-react"

interface CompletedContestProps {
  contest: {
    id: number
    title: string
    prize: number
    participants: number
    userParticipating: boolean
    userWon?: boolean
    winner?: string
  }
}

export function CompletedContest({ contest }: CompletedContestProps) {
  return (
    <Card className="w-full border-gray-200 bg-gray-50">
      <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <span>{contest.title}</span>
          <Trophy className="h-6 w-6 text-gray-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-700">${contest.prize}</div>
            <div className="text-sm text-gray-500">Prize Pool</div>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-gray-600 mb-1">Contest Completed</div>
          {contest.winner && <div className="text-sm text-gray-600">Winner: {contest.winner}</div>}
        </div>

        <div className="flex justify-center items-center gap-1 mb-6 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{contest.participants} participants</span>
        </div>

        {contest.userParticipating && (
          <div className="text-center">
            {contest.userWon ? (
              <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                <CheckCircle className="h-5 w-5" />
                Congratulations! You won!
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-red-500">
                <XCircle className="h-5 w-5" />
                Better luck next time
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
