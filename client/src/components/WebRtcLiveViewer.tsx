import { useEffect, useRef, useState } from 'react';
import { Radio, VideoOff } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { createPeerConnection, createWebRtcSocket } from '../utils/webrtcSocket';

export const WebRtcLiveViewer = ({ matchId }: { matchId: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Camera live check ho raha hai');
  const [hasVideo, setHasVideo] = useState(false);

  const resetPeer = () => {
    peerRef.current?.close();
    peerRef.current = null;
    remoteStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setHasVideo(false);
  };

  useEffect(() => {
    const socket = createWebRtcSocket();
    if (!socket) {
      setStatus('Live video dekhne ke liye login chahiye.');
      return undefined;
    }

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('webrtc:viewer:join', { matchId });
      setStatus('Broadcaster ka wait ho raha hai');
    });

    socket.on('connect_error', () => {
      setStatus('Live server connect nahi ho paya.');
    });

    socket.on('webrtc:broadcaster:ready', () => {
      setStatus('Camera live connect ho raha hai');
    });

    socket.on('webrtc:broadcaster:left', () => {
      resetPeer();
      setStatus('Camera live abhi band hai');
    });

    socket.on('webrtc:offer', async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
      resetPeer();
      const peer = createPeerConnection();
      peerRef.current = peer;
      remoteStreamRef.current = new MediaStream();
      if (videoRef.current) videoRef.current.srcObject = remoteStreamRef.current;

      peer.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStreamRef.current?.addTrack(track);
        });
        setHasVideo(true);
        setStatus('Camera live chal raha hai');
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', {
            matchId,
            target: from,
            candidate: event.candidate,
          });
        }
      };

      await peer.setRemoteDescription(description);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('webrtc:answer', {
        matchId,
        target: from,
        description: peer.localDescription,
      });
    });

    socket.on('webrtc:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!peerRef.current || !candidate) return;
      await peerRef.current.addIceCandidate(candidate);
    });

    socket.connect();

    return () => {
      socket.emit('webrtc:viewer:leave', { matchId });
      socket.disconnect();
      resetPeer();
    };
  }, [matchId]);

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-black shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-white px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600">WebRTC Live Camera</h3>
          <p className="mt-1 truncate text-xs font-bold text-gray-500">{status}</p>
        </div>
        <div className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
          hasVideo ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          <Radio size={14} />
          {hasVideo ? 'Live' : 'Waiting'}
        </div>
      </div>
      <video ref={videoRef} autoPlay playsInline controls className={`aspect-video w-full bg-black object-contain ${hasVideo ? 'block' : 'hidden'}`} />
      {!hasVideo && (
        <div className="aspect-video w-full flex flex-col items-center justify-center gap-3 px-6 text-center text-yellow-500">
          <VideoOff size={32} />
          <p className="text-xs font-black uppercase tracking-widest">{status}</p>
        </div>
      )}
    </div>
  );
};
