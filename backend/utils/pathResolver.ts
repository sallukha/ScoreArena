import { BallModel } from '../models/Ball';
import { MatchModel } from '../models/Match';
import { NotificationModel } from '../models/Notification';
import { PlayerModel } from '../models/Player';
import { TeamModel } from '../models/Team';
import { TournamentModel } from '../models/Tournament';
import { UserModel } from '../models/User';

const topLevelModels = {
  users: UserModel,
  players: PlayerModel,
  teams: TeamModel,
  tournaments: TournamentModel,
  matches: MatchModel,
  notifications: NotificationModel,
} as const;

type ModelKey = keyof typeof topLevelModels | 'balls';

export function getPathMeta(rawPath: string) {
  const segments = rawPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Path is required');
  }

  if (segments[0] === 'matches' && segments[2] === 'balls') {
    const matchId = segments[1];
    if (!matchId) throw new Error('Match id is required for balls path');

    return {
      modelKey: 'balls' as ModelKey,
      model: BallModel,
      matchId,
      docId: segments[3] || null,
      path: segments.join('/'),
      isDocument: segments.length === 4,
      isCollection: segments.length === 3,
      baseFilter: { matchId },
    };
  }

  const collection = segments[0] as keyof typeof topLevelModels;
  const model = topLevelModels[collection];
  if (!model) throw new Error(`Unsupported collection: ${collection}`);

  return {
    modelKey: collection as ModelKey,
    model,
    matchId: null,
    docId: segments[1] || null,
    path: segments.join('/'),
    isDocument: segments.length === 2,
    isCollection: segments.length === 1,
    baseFilter: {},
  };
}
