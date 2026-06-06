import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Square, Users, Video } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { createPeerConnection, createWebRtcSocket } from '../utils/webrtcSocket';

export const WebRtcBroadcastControls = ({ matchId }: { matchId: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [status, setStatus] = useState('Camera live start karo');
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMicOn, setIsMicOn] = useState(true);

  const closePeer = (viewerId: string) => {
    peersRef.current.get(viewerId)?.close();
    peersRef.current.delete(viewerId);
    setViewerCount(peersRef.current.size);
  };

  const stopBroadcast = () => {
    socketRef.current?.emit('webrtc:broadcaster:leave', { matchId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    for (const peer of peersRef.current.values()) {
      peer.close();
    }
    peersRef.current.clear();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    setIsLive(false);
    setViewerCount(0);
    setStatus('Camera live band ho gaya');
  };

  const toggleMic = () => {
    const nextMicState = !isMicOn;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextMicState;
    });
    setIsMicOn(nextMicState);
  };

  const startBroadcast = async () => {
    if (isLive) return;

    const socket = createWebRtcSocket();
    if (!socket) {
      setStatus('Login session nahi mila. Dobara login karo.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Is device/browser me camera live supported nahi hai.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMicOn;
      });
      if (videoRef.current) videoRef.current.srcObject = stream;

      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('webrtc:broadcaster:join', { matchId });
        setStatus('Camera live chal raha hai');
        setIsLive(true);
      });

      socket.on('connect_error', () => {
        setStatus('Live server connect nahi ho paya.');
      });

      socket.on('webrtc:viewer:joined', async ({ viewerId }: { viewerId: string }) => {
        if (!streamRef.current || !viewerId) return;

        closePeer(viewerId);
        const peer = createPeerConnection();
        peersRef.current.set(viewerId, peer);
        setViewerCount(peersRef.current.size);

        streamRef.current.getTracks().forEach((track) => {
          peer.addTrack(track, streamRef.current as MediaStream);
        });

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:ice-candidate', {
              matchId,
              target: viewerId,
              candidate: event.candidate,
            });
          }
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('webrtc:offer', {
          matchId,
          target: viewerId,
          description: peer.localDescription,
        });
      });

      socket.on('webrtc:answer', async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
        const peer = peersRef.current.get(from);
        if (!peer || !description) return;
        await peer.setRemoteDescription(description);
      });

      socket.on('webrtc:ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const peer = peersRef.current.get(from);
        if (!peer || !candidate) return;
        await peer.addIceCandidate(candidate);
      });

      socket.on('webrtc:viewer:left', ({ viewerId }: { viewerId: string }) => {
        closePeer(viewerId);
      });

      socket.on('webrtc:broadcaster:replaced', () => {
        setStatus('Dusre device se live start hua. Yeh live band ho gaya.');
        stopBroadcast();
      });

      socket.connect();
    } catch (error) {
      console.error('WebRTC broadcast failed:', error);
      setStatus('Camera/mic permission allow karo, phir try karo.');
      stopBroadcast();
    }
  };

  useEffect(() => {
    return () => stopBroadcast();
  }, []);

  return (
    <div className="rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-red-600 animate-pulse' : 'bg-gray-300'}`} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Video Camera</h3>
          </div>
          <p className="mt-1 truncate text-xs font-bold text-gray-600">{status}</p>
        </div>
        <div className="shrink-0 rounded-full bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-2">
          <Users size={14} />
          {viewerCount}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} autoPlay muted playsInline className={`aspect-video w-full object-cover ${isLive ? 'block' : 'hidden'}`} />
        {!isLive && (
          <div className="aspect-video w-full flex items-center justify-center text-yellow-500">
            <Video size={32} />
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={isLive ? stopBroadcast : startBroadcast}
          className={`rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${
            isLive ? 'bg-red-600 text-white' : 'bg-black text-yellow-500'
          }`}
        >
          {isLive ? <Square size={16} /> : <Radio size={16} />}
          {isLive ? 'Stop Live Video' : 'Start Live Video'}
        </button>
        <button
          type="button"
          onClick={toggleMic}
          disabled={!isLive}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
          {isMicOn ? 'Mic On' : 'Mic Off'}
        </button>
      </div>
    </div>
  );
};
