export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  role: 'user' | 'admin';
}

export interface Player {
  id: string;
  name: string;
  email?: string; // Link to user account
  phoneNumber?: string; // Unique identifier for linking
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  battingStyle?: string;
  bowlingStyle?: string;
  createdBy: string;
  scope?: 'general' | 'tournament';
  tournamentId?: string;
  stats?: {
    matches: number;
    runs: number;
    wickets: number;
    highestScore: number;
    bestBowling: string;
    average: number;
    strikeRate: number;
    fours: number;
    sixes: number;
    balls?: number;
    ballsBowled?: number;
    runsConceded?: number;
    fifties?: number;
    centuries?: number;
  };
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  players: string[]; // Array of player IDs
  captainId?: string;
  createdBy: string;
  scope?: 'general' | 'tournament';
  tournamentId?: string;
}

export interface Tournament {
  id: string;
  name: string;
  organizer: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  status?: 'upcoming' | 'live' | 'completed';
  format?: string;
  overs?: number;
  description?: string;
  teams: string[]; // Array of team IDs
  maxTeams?: number | null;
  teamCount?: number;
  playerCount?: number;
  createdBy: string;
  createdAt?: any;
}

export interface MatchScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: number;
}

export interface PlayerMatchStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  overs: number;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
}

export interface RecentBallEntry {
  runs: number;
  isExtra?: boolean;
  extraType?: string | null;
  isWicket?: boolean;
  wicketType?: string;
  wicketFielderName?: string | null;
  freeHit?: boolean;
}

export interface Match {
  id: string;
  teamA: string; // Team ID
  teamB: string; // Team ID
  tournamentId?: string;
  status: 'upcoming' | 'live' | 'completed';
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  overs: number;
  scoreA: MatchScore;
  scoreB: MatchScore;
  currentInnings: 1 | 2;
  striker?: string; // Player ID
  strikerName?: string;
  nonStriker?: string; // Player ID
  nonStrikerName?: string;
  bowler?: string; // Player ID
  bowlerName?: string;
  recentBalls?: RecentBallEntry[];
  playerStats?: Record<string, PlayerMatchStats>; // Map of Player ID to stats
  fallOfWickets?: {
    player: string;
    type: string;
    bowler: string;
    fielder?: string;
    fielderName?: string;
    score: number;
    balls: number;
    innings: number;
  }[];
  isFreeHit?: boolean;
  createdBy: string;
  createdAt: any;
}

export interface Ball {
  id: string;
  matchId: string;
  innings: 1 | 2;
  over: number;
  ball: number;
  runs: number;
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
  wicket?: {
    type: string;
    player: string;
    fielder?: string | null;
    fielderName?: string | null;
  };
  freeHit?: boolean;
  batsman: string;
  bowler: string;
}
