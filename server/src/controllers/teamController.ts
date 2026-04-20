import type { Request, Response } from 'express';
import TeamModel from '../models/Team.js';
import PlayerModel  from '../models/Player.js';
import { resolveOrCreatePlayer, sanitizePlayer } from '../utils/playerAuth.js';

export async function createTeam(req: Request, res: Response) {
  const name = String(req.body?.name || '').trim();
  const logo = String(req.body?.logo || '').trim();
  const captainId = String(req.body?.captainId || '').trim() || null;

  if (!name) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const team = await TeamModel.create({
    name,
    logo,
    captainId,
    createdBy: req.authUser?.uid || 'system',
  });

  return res.status(201).json({ team });
}

export async function addPlayerToTeam(req: Request, res: Response) {
  const teamId = String(req.params.teamId || '');
  const team = await TeamModel.findById(teamId).exec();

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { phone, email, name } = req.body || {};
  const { player, existed } = await resolveOrCreatePlayer({ phone, email, name });
  const alreadyInTeam = team.players.some((id: any) => String(id) === String(player._id));

  if (!alreadyInTeam) {
    await TeamModel.updateOne({ _id: team._id }, { $addToSet: { players: player._id } });
    await PlayerModel.updateOne({ _id: player._id }, { $addToSet: { teams: team._id } });
  }

  return res.status(existed ? 200 : 201).json({
    existed,
    alreadyInTeam,
    player: sanitizePlayer(player),
    teamId: String(team._id),
  });
}
