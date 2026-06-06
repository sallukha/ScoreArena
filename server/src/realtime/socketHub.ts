import type { Server as HttpServer } from 'http';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import {
  getDocumentByPath,
  queryDocumentsByPath,
  type QueryConstraint,
} from '../services/dataService.js';

type SubscriptionDescriptor = {
  id: string;
  mode: 'document' | 'query';
  path: string;
  constraints: QueryConstraint[];
};

type SocketAuth = {
  uid: string;
  role: string;
};

type SocketSubscription = SubscriptionDescriptor & {
  auth: SocketAuth;
};

type SnapshotPayload =
  | { kind: 'document'; id: string; path: string; doc: any | null }
  | { kind: 'query'; id: string; path: string; constraints: QueryConstraint[]; docs: any[] };

const subscriptions = new Map<string, Map<string, SocketSubscription>>();
const broadcastersByMatch = new Map<string, string>();
const viewerMatchesBySocket = new Map<string, Set<string>>();

function getWebRtcRoom(matchId: string) {
  return `webrtc:match:${matchId}`;
}

function getMatchId(raw: any) {
  return String(raw?.matchId || '').trim();
}

function getCollectionPath(path: string) {
  const segments = String(path || '').split('/').filter(Boolean);
  if (segments.length <= 1) return segments.join('/');
  return segments.slice(0, -1).join('/');
}

function matchesMutation(subscription: SocketSubscription, changedPath: string) {
  if (subscription.mode === 'document') {
    return subscription.path === changedPath;
  }

  return subscription.path === getCollectionPath(changedPath) || subscription.path === changedPath;
}

async function loadSnapshot(subscription: SubscriptionDescriptor): Promise<SnapshotPayload> {
  if (subscription.mode === 'document') {
    const doc = await getDocumentByPath(subscription.path).catch((error) => {
      if (error instanceof Error && error.message === 'Document not found') {
        return null;
      }
      throw error;
    });

    return {
      kind: 'document',
      id: subscription.id,
      path: subscription.path,
      doc,
    };
  }

  const docs = await queryDocumentsByPath(subscription.path, subscription.constraints);
  return {
    kind: 'query',
    id: subscription.id,
    path: subscription.path,
    constraints: subscription.constraints,
    docs,
  };
}

async function emitSnapshot(socket: Socket, subscription: SubscriptionDescriptor) {
  const payload = await loadSnapshot(subscription);
  socket.emit('snapshot:data', payload);
}

export function createSocketHub(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : typeof socket.handshake.headers.authorization === 'string' &&
            socket.handshake.headers.authorization.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice('Bearer '.length)
          : null;

    if (!token) {
      next(new Error('Authorization token is required'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.authUser = {
        uid: payload.sub,
        role: payload.role,
      };
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    subscriptions.set(socket.id, new Map());

    socket.on('snapshot:subscribe', async (raw: SubscriptionDescriptor) => {
      try {
        const subscription: SocketSubscription = {
          id: String(raw?.id || ''),
          mode: raw?.mode === 'document' ? 'document' : 'query',
          path: String(raw?.path || ''),
          constraints: Array.isArray(raw?.constraints) ? raw.constraints : [],
          auth: socket.data.authUser as SocketAuth,
        };

        if (!subscription.id || !subscription.path) {
          throw new Error('Subscription id and path are required');
        }

        subscriptions.get(socket.id)?.set(subscription.id, subscription);
        await emitSnapshot(socket, subscription);
      } catch (error) {
        socket.emit('snapshot:error', {
          id: raw?.id || '',
          message: error instanceof Error ? error.message : 'Subscription failed',
        });
      }
    });

    socket.on('snapshot:unsubscribe', (subscriptionId: string) => {
      subscriptions.get(socket.id)?.delete(String(subscriptionId || ''));
    });

    socket.on('webrtc:broadcaster:join', (raw: { matchId?: string }) => {
      const matchId = getMatchId(raw);
      if (!matchId) return;

      const previousBroadcaster = broadcastersByMatch.get(matchId);
      if (previousBroadcaster && previousBroadcaster !== socket.id) {
        io.to(previousBroadcaster).emit('webrtc:broadcaster:replaced', { matchId });
      }

      broadcastersByMatch.set(matchId, socket.id);
      socket.join(getWebRtcRoom(matchId));
      socket.to(getWebRtcRoom(matchId)).emit('webrtc:broadcaster:ready', { matchId });

      const room = io.sockets.adapter.rooms.get(getWebRtcRoom(matchId));
      for (const viewerId of room || []) {
        if (viewerId !== socket.id) {
          io.to(socket.id).emit('webrtc:viewer:joined', { matchId, viewerId });
        }
      }
    });

    socket.on('webrtc:broadcaster:leave', (raw: { matchId?: string }) => {
      const matchId = getMatchId(raw);
      if (!matchId || broadcastersByMatch.get(matchId) !== socket.id) return;

      broadcastersByMatch.delete(matchId);
      socket.to(getWebRtcRoom(matchId)).emit('webrtc:broadcaster:left', { matchId });
      socket.leave(getWebRtcRoom(matchId));
    });

    socket.on('webrtc:viewer:join', (raw: { matchId?: string }) => {
      const matchId = getMatchId(raw);
      if (!matchId) return;

      socket.join(getWebRtcRoom(matchId));
      const matches = viewerMatchesBySocket.get(socket.id) || new Set<string>();
      matches.add(matchId);
      viewerMatchesBySocket.set(socket.id, matches);

      const broadcasterId = broadcastersByMatch.get(matchId);
      if (broadcasterId) {
        io.to(socket.id).emit('webrtc:broadcaster:ready', { matchId });
        io.to(broadcasterId).emit('webrtc:viewer:joined', { matchId, viewerId: socket.id });
      }
    });

    socket.on('webrtc:viewer:leave', (raw: { matchId?: string }) => {
      const matchId = getMatchId(raw);
      if (!matchId) return;

      socket.leave(getWebRtcRoom(matchId));
      viewerMatchesBySocket.get(socket.id)?.delete(matchId);
      const broadcasterId = broadcastersByMatch.get(matchId);
      if (broadcasterId) {
        io.to(broadcasterId).emit('webrtc:viewer:left', { matchId, viewerId: socket.id });
      }
    });

    socket.on('webrtc:offer', (raw: { matchId?: string; target?: string; description?: unknown }) => {
      const matchId = getMatchId(raw);
      const target = String(raw?.target || '');
      if (!matchId || !target || broadcastersByMatch.get(matchId) !== socket.id) return;

      io.to(target).emit('webrtc:offer', {
        matchId,
        from: socket.id,
        description: raw.description,
      });
    });

    socket.on('webrtc:answer', (raw: { matchId?: string; target?: string; description?: unknown }) => {
      const matchId = getMatchId(raw);
      const target = String(raw?.target || '');
      if (!matchId || !target) return;

      io.to(target).emit('webrtc:answer', {
        matchId,
        from: socket.id,
        description: raw.description,
      });
    });

    socket.on('webrtc:ice-candidate', (raw: { matchId?: string; target?: string; candidate?: unknown }) => {
      const matchId = getMatchId(raw);
      const target = String(raw?.target || '');
      if (!matchId || !target) return;

      io.to(target).emit('webrtc:ice-candidate', {
        matchId,
        from: socket.id,
        candidate: raw.candidate,
      });
    });

    socket.on('disconnect', () => {
      subscriptions.delete(socket.id);

      for (const [matchId, broadcasterId] of broadcastersByMatch.entries()) {
        if (broadcasterId === socket.id) {
          broadcastersByMatch.delete(matchId);
          socket.to(getWebRtcRoom(matchId)).emit('webrtc:broadcaster:left', { matchId });
        }
      }

      const viewerMatches = viewerMatchesBySocket.get(socket.id);
      if (viewerMatches) {
        for (const matchId of viewerMatches) {
          const broadcasterId = broadcastersByMatch.get(matchId);
          if (broadcasterId) {
            io.to(broadcasterId).emit('webrtc:viewer:left', { matchId, viewerId: socket.id });
          }
        }
        viewerMatchesBySocket.delete(socket.id);
      }
    });
  });

  return {
    io,
    async publishDocumentChange(changedPath: string) {
      const tasks: Promise<void>[] = [];

      for (const [socketId, socketSubscriptions] of subscriptions.entries()) {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) continue;

        for (const subscription of socketSubscriptions.values()) {
          if (!matchesMutation(subscription, changedPath)) {
            continue;
          }

          tasks.push(
            emitSnapshot(socket, subscription).catch((error) => {
              socket.emit('snapshot:error', {
                id: subscription.id,
                message: error instanceof Error ? error.message : 'Realtime refresh failed',
              });
            })
          );
        }
      }

      await Promise.all(tasks);
    },
  };
}

export type SocketHub = ReturnType<typeof createSocketHub>;
