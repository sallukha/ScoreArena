export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'admin';
}

export interface Player {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  battingStyle?: string;
  bowlingStyle?: string;
  createdBy: string;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  players: string[]; // Array of player IDs
  createdBy: string;
}

export interface Tournament {
  id: string;
  name: string;
  organizer: string;
  teams: string[]; // Array of team IDs
  createdBy: string;
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

export interface Match {
  id: string;
  teamA: string; // Team ID
  teamB: string; // Team ID
  status: 'upcoming' | 'live' | 'completed';
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  overs: number;
  scoreA: MatchScore;
  scoreB: MatchScore;
  currentInnings: 1 | 2;
  striker?: string; // Player ID
  nonStriker?: string; // Player ID
  bowler?: string; // Player ID
  playerStats?: Record<string, PlayerMatchStats>; // Map of Player ID to stats
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
  };
  batsman: string;
  bowler: string;
}
