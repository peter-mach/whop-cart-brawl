"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyState() {
  return (
    <Card className="w-full">
      <CardContent className="p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-gray-100 p-6">
            <Trophy className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Contests</h3>

        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          There are no contests available right now. Check back later or create your own contest to get started.
        </p>

        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Contest
        </Button>
      </CardContent>
    </Card>
  )
}
