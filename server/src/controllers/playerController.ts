import type { Request, Response } from 'express';
import { MatchModel } from '../models/Match.js';
import { PlayerModel } from '../models/Player.js';
import { escapeRegex, findPlayerByIdentifiers, resolveOrCreatePlayer, sanitizePlayer } from '../utils/playerAuth.js';

export async function resolvePlayer(req: Request, res: Response) {
  const { phone, email, name } = req.body || {};
  const { player, existed } = await resolveOrCreatePlayer({ phone, email, name });
  return res.status(existed ? 200 : 201).json({ existed, player: sanitizePlayer(player) });
}

export async function searchPlayers(req: Request, res: Response) {
  const rawQuery = String(req.query.q || '').trim();
  if (!rawQuery) {
    return res.json({ players: [] });
  }

  const safeRegex = new RegExp(escapeRegex(rawQuery), 'i');
  const digits = rawQuery.replace(/\D/g, '');
  const phoneRegex = digits ? new RegExp(escapeRegex(digits)) : null;

  const players = await PlayerModel.find({
    $or: [
      { name: safeRegex },
      { email: safeRegex },
      ...(phoneRegex ? [{ phone: phoneRegex }] : []),
    ],
  })
    .sort({ matchesPlayed: -1, totalRuns: -1, createdAt: -1 })
    .limit(10)
    .lean();

  return res.json({ players: players.map(sanitizePlayer) });
}

export async function getPlayerHistory(req: Request, res: Response) {
  const player = await findPlayerByIdentifiers({
    phone: String(req.query.phone || ''),
    email: String(req.query.email || ''),
  });

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const matches = await MatchModel.find({
    $or: [{ players: player._id }, { 'performances.playerId': player._id }],
  })
    .sort({ matchDate: -1, createdAt: -1 })
    .limit(10)
    .lean();

  const recentMatches = matches.map((match: any) => {
    const performance = Array.isArray(match.performances)
      ? match.performances.find((entry: any) => String(entry.playerId) === String(player._id))
      : null;

    return {
      id: String(match._id),
      matchDate: match.matchDate || match.createdAt,
      status: match.status,
      teamA: match.teamA,
      teamB: match.teamB,
      performance: performance || {
        playerId: String(player._id),
        runs: 0,
        wickets: 0,
        ballsPlayed: 0,
        oversBowled: 0,
      },
    };
  });

  return res.json({
    player: sanitizePlayer(player),
    totalStats: {
      matchesPlayed: Number(player.matchesPlayed || 0),
      totalRuns: Number(player.totalRuns || 0),
      totalWickets: Number(player.totalWickets || 0),
    },
    recentMatches,
    performanceBreakdown: recentMatches.map((match) => ({
      matchId: match.id,
      matchDate: match.matchDate,
      ...match.performance,
    })),
  });
}
