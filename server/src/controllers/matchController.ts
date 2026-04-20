import type { Request, Response } from 'express';
import { MatchModel } from '../models/Match.js';
import { PlayerModel } from '../models/Player.js';

function normalizePerformance(entry: any) {
  return {
    playerId: entry.playerId,
    runs: Number(entry.runs || 0),
    wickets: Number(entry.wickets || 0),
    ballsPlayed: Number(entry.ballsPlayed || 0),
    oversBowled: Number(entry.oversBowled || 0),
  };
}

async function finalizeMatchStats(match: any) {
  if (match.statsFinalized) {
    return match;
  }

  const totalsByPlayer = new Map<string, { matchesPlayed: number; totalRuns: number; totalWickets: number }>();

  for (const performance of match.performances || []) {
    const playerId = String(performance.playerId);
    const current = totalsByPlayer.get(playerId) || {
      matchesPlayed: 0,
      totalRuns: 0,
      totalWickets: 0,
    };

    current.matchesPlayed = 1;
    current.totalRuns += Number(performance.runs || 0);
    current.totalWickets += Number(performance.wickets || 0);
    totalsByPlayer.set(playerId, current);
  }

  for (const [playerId, totals] of totalsByPlayer.entries()) {
    await PlayerModel.updateOne(
      { _id: playerId },
      {
        $inc: {
          matchesPlayed: totals.matchesPlayed,
          totalRuns: totals.totalRuns,
          totalWickets: totals.totalWickets,
        },
      }
    );
  }

  match.statsFinalized = true;
  await match.save();
  return match;
}

export async function createMatch(req: Request, res: Response) {
  const performances = Array.isArray(req.body?.performances)
    ? req.body.performances.map(normalizePerformance)
    : [];
  const players = Array.from(
    new Set(
      (Array.isArray(req.body?.players) ? req.body.players : performances.map((entry: any) => entry.playerId))
        .filter(Boolean)
        .map((playerId: any) => String(playerId))
    )
  );

  if (players.length === 0) {
    return res.status(400).json({ error: 'At least one player is required' });
  }

  const match = await MatchModel.create({
    teamA: String(req.body?.teamA || 'Team A'),
    teamB: String(req.body?.teamB || 'Team B'),
    tournamentId: String(req.body?.tournamentId || ''),
    status: String(req.body?.status || 'completed'),
    tossWinner: String(req.body?.tossWinner || ''),
    tossDecision: req.body?.tossDecision === 'bowl' ? 'bowl' : req.body?.tossDecision === 'bat' ? 'bat' : '',
    overs: Number(req.body?.overs || 0),
    players,
    performances,
    matchDate: req.body?.matchDate ? new Date(req.body.matchDate) : new Date(),
    createdBy: req.authUser?.uid || 'system',
    scoreA: req.body?.scoreA || undefined,
    scoreB: req.body?.scoreB || undefined,
    currentInnings: req.body?.currentInnings || 1,
    playerStats: req.body?.playerStats || {},
    fallOfWickets: req.body?.fallOfWickets || [],
  });

  await finalizeMatchStats(match);
  return res.status(201).json({ match });
}

export async function finalizeMatch(req: Request, res: Response) {
  const matchId = String(req.params.matchId || '');
  const match = await MatchModel.findById(matchId);

  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  if (Array.isArray(req.body?.performances)) {
    match.performances = req.body.performances.map(normalizePerformance);
    match.players = Array.from(
      new Set(match.performances.map((entry: any) => String(entry.playerId)).filter(Boolean))
    ) as any;
  }

  if (req.body?.matchDate) {
    match.matchDate = new Date(req.body.matchDate);
  }

  match.status = 'completed';
  await match.save();
  await finalizeMatchStats(match);

  return res.json({ match });
}
