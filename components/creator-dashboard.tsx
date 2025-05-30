'use client';

import { useState } from 'react';
import {
  useMyCompetitions,
  useUserBalance,
  useCreateCompetition,
} from '@/hooks/use-competitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarIcon,
  DollarSign,
  Trophy,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  format,
  addDays,
  addHours,
  isBefore,
  isAfter,
  differenceInDays,
  differenceInHours,
} from 'date-fns';
import { CompetitionCard } from './competition-card';

export function CreatorDashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    balance,
    loading: balanceLoading,
    refetch: refetchBalance,
  } = useUserBalance();
  const {
    competitions,
    loading: competitionsLoading,
    refetch: refetchCompetitions,
  } = useMyCompetitions();
  const {
    createCompetition,
    loading: creating,
    error: createError,
  } = useCreateCompetition();
  const { toast } = useToast();

  // Validation logic
  const validateForm = () => {
    const errors: string[] = [];
    const now = new Date();
    const minStartDate = addHours(now, 1); // Must start at least 1 hour in future
    const prizeAmount = Number(prize);

    if (!title.trim()) {
      errors.push('Title is required');
    }

    if (!prizeAmount || prizeAmount <= 0) {
      errors.push('Prize amount must be greater than 0');
    }

    if (prizeAmount > balance) {
      errors.push(`Prize amount cannot exceed your balance ($${balance})`);
    }

    if (!startDate) {
      errors.push('Start date is required');
    } else if (isBefore(startDate, minStartDate)) {
      errors.push('Competition must start at least 1 hour in the future');
    }

    if (!endDate) {
      errors.push('End date is required');
    } else if (startDate && !isAfter(endDate, startDate)) {
      errors.push('End date must be after start date');
    }

    if (startDate && endDate) {
      const durationDays = differenceInDays(endDate, startDate);
      const durationHours = differenceInHours(endDate, startDate) % 24;

      if (durationHours < 1) {
        errors.push('Competition must run for at least 1 hour');
      }

      if (durationDays > 60) {
        errors.push('Competition cannot run for more than 60 days');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getDurationText = () => {
    if (!startDate || !endDate) return '';

    const days = differenceInDays(endDate, startDate);
    const hours = differenceInHours(endDate, startDate) % 24;

    if (days > 0) {
      return `Duration: ${days} day${days > 1 ? 's' : ''} ${
        hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''
      }`;
    } else {
      return `Duration: ${differenceInHours(endDate, startDate)} hour${
        differenceInHours(endDate, startDate) > 1 ? 's' : ''
      }`;
    }
  };

  const handleCreateCompetition = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const newCompetition = await createCompetition({
        title: title.trim(),
        description: description.trim() || undefined,
        prizeAmount: Number(prize),
        startDate: startDate!.toISOString(),
        endDate: endDate!.toISOString(),
      });

      toast({
        title: 'Competition created!',
        description: `"${title}" has been created successfully.`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPrize('');
      setStartDate(undefined);
      setEndDate(undefined);
      setValidationErrors([]);

      // Refresh data
      refetchCompetitions();
      refetchBalance();
    } catch (error) {
      toast({
        title: 'Failed to create competition',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const canCreate =
    title &&
    prize &&
    startDate &&
    endDate &&
    Number(prize) <= balance &&
    validationErrors.length === 0;

  const activeCompetitions = competitions.filter((c) => c.status === 'ACTIVE');
  const upcomingCompetitions = competitions.filter(
    (c) => c.status === 'UPCOMING'
  );
  const completedCompetitions = competitions.filter(
    (c) => c.status === 'COMPLETED'
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Competition</TabsTrigger>
          <TabsTrigger value="manage">My Competitions</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {/* Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Whop Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${balance.toLocaleString()}
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Available for competition prizes
              </p>
              <Button variant="outline" className="w-full">
                Add Funds
              </Button>
            </CardContent>
          </Card>

          {/* Create Competition Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600" />
                Create New Competition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Create Error */}
              {createError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="title">Competition Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter a catchy title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {title.length}/100 characters
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what makes this competition special"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </div>
              </div>

              <div>
                <Label htmlFor="prize">Prize Amount ($) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="prize"
                    type="number"
                    placeholder="0"
                    className="pl-10"
                    value={prize}
                    onChange={(e) => {
                      setPrize(e.target.value);
                      setTimeout(validateForm, 100);
                    }}
                    min="1"
                    max={balance}
                  />
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Available balance: ${balance.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          setTimeout(validateForm, 100);
                        }}
                        disabled={(date) => isBefore(date, new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setTimeout(validateForm, 100);
                        }}
                        disabled={(date) =>
                          startDate
                            ? isBefore(date, startDate)
                            : isBefore(date, new Date())
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Duration Display */}
              {startDate && endDate && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{getDurationText()}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreateCompetition}
                disabled={!canCreate || creating}
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Competition
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {competitionsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Active Competitions */}
              {activeCompetitions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {activeCompetitions.length} Active
                    </Badge>
                  </h3>
                  {activeCompetitions.map((competition) => (
                    <CompetitionCard
                      key={competition.id}
                      competition={competition}
                      showLeaderboard={true}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming Competitions */}
              {upcomingCompetitions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      {upcomingCompetitions.length} Upcoming
                    </Badge>
                  </h3>
                  {upcomingCompetitions.map((competition) => (
                    <CompetitionCard
                      key={competition.id}
                      competition={competition}
                      showLeaderboard={false}
                    />
                  ))}
                </div>
              )}

              {/* Completed Competitions */}
              {completedCompetitions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-800">
                      {completedCompetitions.length} Completed
                    </Badge>
                  </h3>
                  {completedCompetitions.map((competition) => (
                    <CompetitionCard
                      key={competition.id}
                      competition={competition}
                      showLeaderboard={true}
                      compact={true}
                    />
                  ))}
                </div>
              )}

              {competitions.length === 0 && (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No competitions yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first competition to get started
                  </p>
                  <Button
                    onClick={() =>
                      (
                        document.querySelector(
                          '[value="create"]'
                        ) as HTMLElement
                      )?.click()
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Competition
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
