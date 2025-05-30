import { useState, useEffect } from 'react';

interface Competition {
  id: string;
  title: string;
  description?: string;
  prizeAmount: number;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  creatorId: string;
  participantCount: number;
  userParticipating?: boolean;
  userWon?: boolean;
  winner?: string;
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  id: string;
  userId: string;
  shopifyDomain: string;
  totalRevenue: number;
  joinedAt: string;
  user?: {
    id: string;
    username?: string;
  };
}

interface LeaderboardEntry {
  id: string;
  name: string;
  revenue: number;
  avatar: string;
}

export function useCompetitions(status?: string, search?: string) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);

      const response = await fetch(`/api/competitions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch competitions');
      }

      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch competitions'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, [status, search]);

  return { competitions, loading, error, refetch: fetchCompetitions };
}

export function useMyCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyCompetitions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/competitions/my-competitions');
      if (!response.ok) {
        throw new Error('Failed to fetch my competitions');
      }

      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch my competitions'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCompetitions();
  }, []);

  return { competitions, loading, error, refetch: fetchMyCompetitions };
}

export function useCompetition(id: string) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetition = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/competitions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch competition');
      }

      const data = await response.json();
      setCompetition(data.competition);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch competition'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetition();
  }, [id]);

  return { competition, loading, error, refetch: fetchCompetition };
}

export function useLeaderboard(competitionId: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    if (!competitionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/competitions/${competitionId}/leaderboard`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      const participants = data.participants || [];

      // Transform to leaderboard format
      const leaderboardData = participants.map(
        (p: Participant, index: number) => ({
          id: p.id,
          name: p.user?.username || p.shopifyDomain,
          revenue: p.totalRevenue,
          avatar: `bg-${
            ['blue', 'green', 'purple', 'red', 'yellow', 'indigo'][index % 6]
          }-500`,
        })
      );

      setLeaderboard(leaderboardData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch leaderboard'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [competitionId]);

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}

export function useUserBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      setBalance(data.balance || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return { balance, loading, error, refetch: fetchBalance };
}

export function useCreateCompetition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCompetition = async (competitionData: {
    title: string;
    description?: string;
    prizeAmount: number;
    startDate: string;
    endDate: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(competitionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create competition');
      }

      const data = await response.json();
      return data.competition;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create competition';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createCompetition, loading, error };
}

export function useJoinCompetition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinCompetition = async (
    competitionId: string,
    shopifyDomain: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/competitions/${competitionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shopifyDomain }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join competition');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join competition';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { joinCompetition, loading, error };
}
