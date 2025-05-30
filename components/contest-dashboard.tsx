"use client"

import { useState } from "react"
import { ActiveContest } from "./active-contest"
import { UpcomingContest } from "./upcoming-contest"
import { CompletedContest } from "./completed-contest"
import { EmptyState } from "./empty-state"
import { NotificationBanner } from "./notification-banner"

const mockContests = [
  {
    id: 1,
    title: "Revenue Contest",
    prize: 1000,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    participants: 4,
    status: "active" as const,
    userParticipating: true,
    leaderboard: [
      { id: 1, name: "Alex", revenue: 5430, avatar: "bg-blue-500" },
      { id: 2, name: "Sarah", revenue: 4210, avatar: "bg-green-500" },
      { id: 3, name: "Mike", revenue: 3950, avatar: "bg-purple-500" },
      { id: 4, name: "Emma", revenue: 3100, avatar: "bg-red-500" },
    ],
  },
  {
    id: 2,
    title: "Summer Sales Challenge",
    prize: 500,
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    participants: 0,
    status: "upcoming" as const,
    userParticipating: false,
  },
  {
    id: 3,
    title: "Spring Revenue Race",
    prize: 750,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    participants: 8,
    status: "completed" as const,
    userParticipating: true,
    userWon: false,
    winner: "John Doe",
  },
]

export function ContestDashboard() {
  const [contests] = useState(mockContests)
  const [notification, setNotification] = useState<string | null>("New contest starting in 2 days!")

  const activeContests = contests.filter((c) => c.status === "active")
  const upcomingContests = contests.filter((c) => c.status === "upcoming")
  const completedContests = contests.filter((c) => c.status === "completed")

  if (contests.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {notification && <NotificationBanner message={notification} onDismiss={() => setNotification(null)} />}

      {activeContests.map((contest) => (
        <ActiveContest key={contest.id} contest={contest} />
      ))}

      {upcomingContests.map((contest) => (
        <UpcomingContest key={contest.id} contest={contest} />
      ))}

      {completedContests.map((contest) => (
        <CompletedContest key={contest.id} contest={contest} />
      ))}
    </div>
  )
}
