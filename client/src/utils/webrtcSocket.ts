import { io, type Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../api/config';
import { AUTH_TOKEN_STORAGE_KEY } from '../api/http';

export const createWebRtcSocket = (): Socket | null => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return null;

  return io(getSocketBaseUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {
      token,
    },
  });
};

export const createPeerConnection = () =>
  new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });
