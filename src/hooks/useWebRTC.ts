'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Participant {
  userId: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface WebRTCMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'toggle-audio' | 'toggle-video';
  roomId: string;
  userId: string;
  data?: {
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidate;
    targetUserId?: string;
    enabled?: boolean;
    audioEnabled?: boolean;
    videoEnabled?: boolean;
  };
  timestamp?: number;
}

export const useWebRTC = (roomId: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const signalingRef = useRef<{
    send: (message: WebRTCMessage) => void;
    onMessage: (callback: (message: WebRTCMessage) => void) => () => void;
  } | null>(null);

  // Configuración ICE servers (STUN servers públicos)
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Sistema de señalización simple usando localStorage y eventos
  const initSignaling = useCallback(() => {
    const signaling = {
      send: (message: WebRTCMessage) => {
        const messages = JSON.parse(localStorage.getItem(`webrtc-${roomId}`) || '[]');
        messages.push({ ...message, timestamp: Date.now() });
        localStorage.setItem(`webrtc-${roomId}`, JSON.stringify(messages));

        // Trigger evento para otras ventanas/tabs
        window.dispatchEvent(new CustomEvent('webrtc-message', { detail: message }));
      },

      onMessage: (callback: (message: WebRTCMessage) => void) => {
        const handleMessage = (event: Event) => {
          const customEvent = event as CustomEvent;
          const message = customEvent.detail as WebRTCMessage;
          if (message.roomId === roomId && message.userId !== userId) {
            callback(message);
          }
        };

        window.addEventListener('webrtc-message', handleMessage);

        // También verificar mensajes existentes
        const messages = JSON.parse(localStorage.getItem(`webrtc-${roomId}`) || '[]');
        const recentMessages = messages.filter((msg: WebRTCMessage & { timestamp: number }) =>
          Date.now() - msg.timestamp < 30000 && msg.userId !== userId
        );

        recentMessages.forEach((msg: WebRTCMessage) => callback(msg));

        return () => {
          window.removeEventListener('webrtc-message', handleMessage);
        };
      }
    };

    signalingRef.current = signaling;
    return signaling;
  }, [roomId, userId]);

  // Crear peer connection
  const createPeerConnection = useCallback((participantId: string) => {
    const peerConnection = new RTCPeerConnection({ iceServers });

    // Manejar ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        signalingRef.current.send({
          type: 'ice-candidate',
          roomId,
          userId,
          data: {
            candidate: event.candidate,
            targetUserId: participantId
          }
        });
      }
    };

    // Manejar stream remoto
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(participantId);
        if (participant) {
          updated.set(participantId, {
            ...participant,
            stream: remoteStream
          });
        }
        return updated;
      });
    };

    // Agregar track local si existe
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    return peerConnection;
  }, [roomId, userId]);

  // Verificar permisos antes de solicitar stream
  const checkPermissions = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    } catch {
      return false;
    }
  }, []);

  // Inicializar stream local
  const initLocalStream = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta videollamadas');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsConnecting(false);
      return stream;
    } catch (err: unknown) {
      let errorMessage = 'Error al acceder a cámara y micrófono';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Permisos denegados. Recarga la página y permite el acceso.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No se encontró cámara o micrófono en tu dispositivo.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Tu navegador no soporta videollamadas.';
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Acceso bloqueado. Asegúrate de usar HTTPS.';
        }
      }

      setError(errorMessage);
      setIsConnecting(false);
      throw err;
    }
  }, []);

  // Unirse a la sala
  const joinRoom = useCallback(async () => {
    try {
      const stream = await initLocalStream();
      const signaling = initSignaling();

      // Anunciar que el usuario se unió
      signaling.send({
        type: 'user-joined',
        roomId,
        userId,
        data: { audioEnabled, videoEnabled }
      });

      // Escuchar mensajes de señalización
      const cleanup = signaling.onMessage(async (message: WebRTCMessage) => {
        switch (message.type) {
          case 'user-joined':
            if (message.userId !== userId) {
              // Crear peer connection para nuevo usuario
              const peerConnection = createPeerConnection(message.userId);

              setParticipants(prev => {
                const updated = new Map(prev);
                updated.set(message.userId, {
                  userId: message.userId,
                  peerConnection,
                  audioEnabled: message.data?.audioEnabled || true,
                  videoEnabled: message.data?.videoEnabled || true
                });
                return updated;
              });

              // Crear oferta
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);

              signaling.send({
                type: 'offer',
                roomId,
                userId,
                data: {
                  offer,
                  targetUserId: message.userId
                }
              });
            }
            break;

          case 'offer':
            if (message.data?.targetUserId === userId) {
              const peerConnection = createPeerConnection(message.userId);

              setParticipants(prev => {
                const updated = new Map(prev);
                updated.set(message.userId, {
                  userId: message.userId,
                  peerConnection,
                  audioEnabled: true,
                  videoEnabled: true
                });
                return updated;
              });

              if (message.data?.offer) {
                await peerConnection.setRemoteDescription(message.data.offer);
              }
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);

              signaling.send({
                type: 'answer',
                roomId,
                userId,
                data: {
                  answer,
                  targetUserId: message.userId
                }
              });
            }
            break;

          case 'answer':
            if (message.data?.targetUserId === userId) {
              const participant = participants.get(message.userId);
              if (participant?.peerConnection && message.data?.answer) {
                await participant.peerConnection.setRemoteDescription(message.data.answer);
              }
            }
            break;

          case 'ice-candidate':
            if (message.data?.targetUserId === userId) {
              const participant = participants.get(message.userId);
              if (participant?.peerConnection) {
                await participant.peerConnection.addIceCandidate(message.data.candidate);
              }
            }
            break;

          case 'user-left':
            setParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(message.userId);
              if (participant?.peerConnection) {
                participant.peerConnection.close();
              }
              updated.delete(message.userId);
              return updated;
            });
            break;

          case 'toggle-audio':
            setParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(message.userId);
              if (participant) {
                updated.set(message.userId, {
                  ...participant,
                  audioEnabled: message.data?.enabled ?? false
                });
              }
              return updated;
            });
            break;

          case 'toggle-video':
            setParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(message.userId);
              if (participant) {
                updated.set(message.userId, {
                  ...participant,
                  videoEnabled: message.data?.enabled ?? false
                });
              }
              return updated;
            });
            break;
        }
      });

      return cleanup;
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Error al unirse a la sala');
    }
  }, [roomId, userId]);

  // Salir de la sala
  const leaveRoom = useCallback(() => {
    // Anunciar que el usuario se va
    if (signalingRef.current) {
      signalingRef.current.send({
        type: 'user-left',
        roomId,
        userId
      });
    }

    // Cerrar todas las conexiones
    participants.forEach(participant => {
      if (participant.peerConnection) {
        participant.peerConnection.close();
      }
    });

    // Detener stream local
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    setParticipants(new Map());
    setLocalStream(null);
  }, [roomId, userId]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);

        if (signalingRef.current) {
          signalingRef.current.send({
            type: 'toggle-audio',
            roomId,
            userId,
            data: { enabled: !audioEnabled }
          });
        }
      }
    }
  }, [audioEnabled, roomId, userId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);

        if (signalingRef.current) {
          signalingRef.current.send({
            type: 'toggle-video',
            roomId,
            userId,
            data: { enabled: !videoEnabled }
          });
        }
      }
    }
  }, [videoEnabled, roomId, userId]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      // Cleanup function que se ejecuta al desmontar
      if (signalingRef.current) {
        signalingRef.current.send({
          type: 'user-left',
          roomId,
          userId
        });
      }

      // Cerrar todas las conexiones
      participants.forEach(participant => {
        if (participant.peerConnection) {
          participant.peerConnection.close();
        }
      });

      // Detener stream local
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, userId]);

  return {
    localStream,
    localVideoRef,
    participants: Array.from(participants.values()),
    audioEnabled,
    videoEnabled,
    isConnecting,
    error,
    checkPermissions,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo
  };
};
