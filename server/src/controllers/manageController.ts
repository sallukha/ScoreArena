import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import MatchModel from '../models/Match.js';
import PlayerModel from '../models/Player.js';
import TeamModel from '../models/Team.js';

// Delete a match by ID
export async function deleteMatch(req: Request, res: Response) {
  const matchId = req.params.id;
  if (!matchId) {
    return res.status(400).json({ error: 'Match ID is required' });
  }
  const match = await MatchModel.findById(matchId) as any;
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  if (match.statsFinalized && Array.isArray(match.performances) && match.performances.length > 0) {
    const totalsByPlayer = new Map<string, { matchesPlayed: number; totalRuns: number; totalWickets: number }>();

    for (const performance of match.performances) {
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
            matchesPlayed: -totals.matchesPlayed,
            totalRuns: -totals.totalRuns,
            totalWickets: -totals.totalWickets,
          },
        }
      );
    }
  }

  await MatchModel.deleteOne({ _id: matchId });
  return res.json({ success: true, message: 'Match deleted successfully.' });
}

// Delete a player by ID
export async function deletePlayer(req: Request, res: Response) {
  const playerId = req.params.id;
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required' });
  }
  const player = await PlayerModel.findById(playerId).exec();
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const playerObjectId = new mongoose.Types.ObjectId(playerId);
  const playerIdValues = [playerObjectId, playerId];

  await TeamModel.updateMany(
    { players: { $in: playerIdValues } },
    {
      $pull: { players: { $in: playerIdValues } },
    }
  );

  await TeamModel.updateMany(
    { captainId: { $in: playerIdValues } },
    {
      $set: { captainId: null },
    }
  );

  await PlayerModel.updateOne({ _id: playerObjectId }, { $set: { teams: [] } });

  await MatchModel.updateMany(
    { players: { $in: playerIdValues } },
    {
      $pull: {
        players: { $in: playerIdValues },
        performances: { playerId: { $in: playerIdValues } },
      },
    }
  );

  await MatchModel.updateMany(
    {
      $or: [
        { striker: playerId },
        { nonStriker: playerId },
        { bowler: playerId },
      ],
    },
    [
      {
        $set: {
          striker: { $cond: [{ $eq: ['$striker', playerId] }, '', '$striker'] },
          strikerName: { $cond: [{ $eq: ['$striker', playerId] }, '', '$strikerName'] },
          nonStriker: { $cond: [{ $eq: ['$nonStriker', playerId] }, '', '$nonStriker'] },
          nonStrikerName: { $cond: [{ $eq: ['$nonStriker', playerId] }, '', '$nonStrikerName'] },
          bowler: { $cond: [{ $eq: ['$bowler', playerId] }, '', '$bowler'] },
          bowlerName: { $cond: [{ $eq: ['$bowler', playerId] }, '', '$bowlerName'] },
        },
      },
    ] as any
  );

  await PlayerModel.deleteOne({ _id: playerId });
  return res.json({ success: true, message: 'Player deleted successfully.' });
}
