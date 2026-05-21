import mongoose from 'mongoose';
import MatchModel from '../models/Match.js';
import PlayerModel from '../models/Player.js';

type PlayerTotals = {
  matches: number;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  balls: number;
  ballsBowled: number;
  runsConceded: number;
  fifties: number;
  centuries: number;
  highestScore: number;
};

function emptyTotals(): PlayerTotals {
  return {
    matches: 0,
    runs: 0,
    wickets: 0,
    fours: 0,
    sixes: 0,
    balls: 0,
    ballsBowled: 0,
    runsConceded: 0,
    fifties: 0,
    centuries: 0,
    highestScore: 0,
  };
}

function toNumber(value: any) {
  return Number(value || 0);
}

export function buildPerformancesFromPlayerStats(playerStats: Record<string, any> = {}) {
  return Object.entries(playerStats)
    .filter(([playerId]) => mongoose.isValidObjectId(playerId))
    .map(([playerId, stats]: [string, any]) => ({
      playerId,
      runs: toNumber(stats?.runs),
      wickets: toNumber(stats?.wickets),
      ballsPlayed: toNumber(stats?.balls),
      oversBowled: toNumber(stats?.overs) + toNumber(stats?.ballsBowled) / 6,
    }));
}

function addStats(totals: PlayerTotals, stats: any) {
  const runs = toNumber(stats?.runs);
  totals.matches += 1;
  totals.runs += runs;
  totals.wickets += toNumber(stats?.wickets);
  totals.fours += toNumber(stats?.fours);
  totals.sixes += toNumber(stats?.sixes);
  totals.balls += toNumber(stats?.balls);
  totals.ballsBowled += toNumber(stats?.ballsBowled);
  totals.runsConceded += toNumber(stats?.runsConceded);
  totals.fifties += runs >= 50 && runs < 100 ? 1 : 0;
  totals.centuries += runs >= 100 ? 1 : 0;
  totals.highestScore = Math.max(totals.highestScore, runs);
}

function collectMatchTotals(match: any) {
  const totalsByPlayer = new Map<string, PlayerTotals>();
  const playerStats = match?.playerStats || {};

  for (const [playerId, stats] of Object.entries(playerStats)) {
    if (!mongoose.isValidObjectId(playerId)) continue;
    const totals = totalsByPlayer.get(playerId) || emptyTotals();
    addStats(totals, stats);
    totalsByPlayer.set(playerId, totals);
  }

  if (totalsByPlayer.size === 0) {
    for (const performance of match?.performances || []) {
      const playerId = String(performance.playerId || '');
      if (!mongoose.isValidObjectId(playerId)) continue;
      const totals = totalsByPlayer.get(playerId) || emptyTotals();
      addStats(totals, {
        runs: performance.runs,
        wickets: performance.wickets,
        balls: performance.ballsPlayed,
      });
      totalsByPlayer.set(playerId, totals);
    }
  }

  return totalsByPlayer;
}

async function applyTotals(playerId: string, totals: PlayerTotals) {
  const player = await PlayerModel.findById(playerId);
  if (!player) return;

  const currentStats: any = player.stats || {};
  const nextMatches = toNumber(currentStats.matches) + totals.matches;
  const nextRuns = toNumber(currentStats.runs) + totals.runs;
  const nextWickets = toNumber(currentStats.wickets) + totals.wickets;
  const nextBalls = toNumber(currentStats.balls) + totals.balls;
  const nextBallsBowled = toNumber(currentStats.ballsBowled) + totals.ballsBowled;
  const nextRunsConceded = toNumber(currentStats.runsConceded) + totals.runsConceded;

  await PlayerModel.updateOne(
    { _id: playerId },
    {
      $inc: {
        matchesPlayed: totals.matches,
        totalRuns: totals.runs,
        totalWickets: totals.wickets,
        'stats.matches': totals.matches,
        'stats.runs': totals.runs,
        'stats.wickets': totals.wickets,
        'stats.fours': totals.fours,
        'stats.sixes': totals.sixes,
        'stats.balls': totals.balls,
        'stats.ballsBowled': totals.ballsBowled,
        'stats.runsConceded': totals.runsConceded,
        'stats.fifties': totals.fifties,
        'stats.centuries': totals.centuries,
      },
      $set: {
        'stats.average': nextMatches > 0 ? nextRuns / nextMatches : 0,
        'stats.strikeRate': nextBalls > 0 ? (nextRuns / nextBalls) * 100 : 0,
        'stats.economy': nextBallsBowled > 0 ? (nextRunsConceded / nextBallsBowled) * 6 : 0,
        'stats.highestScore': Math.max(toNumber(currentStats.highestScore), totals.highestScore),
      },
    }
  );
}

export async function finalizeMatchStats(match: any) {
  if (!match || match.statsFinalized) {
    return match;
  }

  const totalsByPlayer = collectMatchTotals(match);
  for (const [playerId, totals] of totalsByPlayer.entries()) {
    await applyTotals(playerId, totals);
  }

  if (!Array.isArray(match.performances) || match.performances.length === 0) {
    match.performances = buildPerformancesFromPlayerStats(match.playerStats || {}) as any;
  }
  match.players = Array.from(new Set([
    ...(Array.isArray(match.players) ? match.players.map(String) : []),
    ...Array.from(totalsByPlayer.keys()),
  ])) as any;
  match.statsFinalized = true;
  await match.save();
  return match;
}

export async function rebuildAllPlayerStats() {
  await PlayerModel.updateMany(
    {},
    {
      $set: {
        matchesPlayed: 0,
        totalRuns: 0,
        totalWickets: 0,
        stats: emptyTotals(),
      },
    }
  );

  const matches = await MatchModel.find({ status: 'completed' }).sort({ matchDate: 1, createdAt: 1 });
  for (const match of matches as any[]) {
    match.statsFinalized = false;
    await finalizeMatchStats(match);
  }

  return { players: await PlayerModel.countDocuments(), matches: matches.length };
}
