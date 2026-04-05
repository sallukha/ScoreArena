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

    socket.on('disconnect', () => {
      subscriptions.delete(socket.id);
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
