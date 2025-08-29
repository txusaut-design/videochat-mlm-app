'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useModerationSystem } from '@/hooks/useModerationSystem';
import { ParticipantVideo } from '@/components/VideoCall/ParticipantVideo';

interface VideoCallDialogProps {
  roomId: string;
  onLeave: () => void;
}

export const VideoCallDialog: React.FC<VideoCallDialogProps> = ({ roomId, onLeave }) => {
  const [chatMessage, setChatMessage] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const { state, leaveRoom } = useApp();

  const user = state.auth.user!;
  const room = state.rooms.find(r => r.id === roomId);

  const {
    localStream,
    localVideoRef,
    participants,
    audioEnabled,
    videoEnabled,
    isConnecting,
    error,
    checkPermissions,
    joinRoom: joinWebRTCRoom,
    leaveRoom: leaveWebRTCRoom,
    toggleAudio,
    toggleVideo
  } = useWebRTC(roomId, user.id);

  // Obtener información de usuarios para los participantes
  const participantsWithUserInfo = participants.map(participant => {
    const userInfo = state.users.find(u => u.id === participant.userId);
    return {
      ...participant,
      userName: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Usuario desconocido'
    };
  });

  // Preparar datos para el sistema de moderación
  const allParticipants = [
    { userId: user.id, userName: `${user.firstName} ${user.lastName}` },
    ...participantsWithUserInfo.map(p => ({ userId: p.userId, userName: p.userName }))
  ];

  // Hook de moderación
  const {
    moderationState,
    startVoting,
    voteToExpel,
    canStartVoting,
    isUserExpelled,
    getActiveVoting,
    hasUserVoted
  } = useModerationSystem({
    roomId,
    currentUserId: user.id,
    participants: allParticipants,
    onUserExpelled: (expelledUserId) => {
      // Expulsar usuario de la sala
      if (expelledUserId === user.id) {
        // Si el usuario actual fue expulsado, salir de la sala
        setShowNotification('Has sido expulsado de la sala por votación democrática.');
        setTimeout(() => {
          handleLeave();
        }, 3000);
      } else {
        // Notificar que otro usuario fue expulsado
        const expelledUser = allParticipants.find(p => p.userId === expelledUserId);
        setShowNotification(`${expelledUser?.userName || 'Un usuario'} ha sido expulsado de la sala.`);
        setTimeout(() => setShowNotification(null), 5000);
      }
    }
  });

  // Función para unirse manualmente
  const handleJoinCall = async () => {
    try {
      setHasJoined(true);
      await joinWebRTCRoom();
    } catch (err) {
      setHasJoined(false);
      console.error('Error joining call:', err);
    }
  };

  const handleLeave = () => {
    leaveWebRTCRoom();
    leaveRoom(roomId, user.id);
    setHasJoined(false);
    onLeave();
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // TODO: Implementar envío de mensaje real
      console.log('Enviando mensaje:', chatMessage);
      setChatMessage('');
    }
  };

  // Manejar inicio de votación
  const handleStartVoting = (targetUserId: string, reason?: string) => {
    const voting = startVoting(targetUserId, reason);
    if (voting) {
      const targetUser = allParticipants.find(p => p.userId === targetUserId);
      setShowNotification(`Se ha iniciado una votación para expulsar a ${targetUser?.userName || 'el usuario'}.`);
      setTimeout(() => setShowNotification(null), 5000);
    }
  };

  // Manejar voto de expulsión
  const handleVoteToExpel = (targetUserId: string, reason?: string) => {
    const success = voteToExpel(targetUserId, reason);
    if (success) {
      setShowNotification('Tu voto ha sido registrado.');
      setTimeout(() => setShowNotification(null), 3000);
    }
  };

  // Verificar si el usuario actual fue expulsado
  useEffect(() => {
    if (isUserExpelled(user.id)) {
      setShowNotification('Has sido expulsado de esta sala.');
      setTimeout(() => {
        handleLeave();
      }, 3000);
    }
  }, [isUserExpelled, user.id]);

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Sala no encontrada</p>
          <Button onClick={onLeave} variant="outline">Volver</Button>
        </div>
      </div>
    );
  }

  // Pantalla de bienvenida antes de unirse a la llamada
  if (!hasJoined && !isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{room.name}</h1>
            <p className="text-gray-300">{room.topic}</p>
            <Badge variant="outline" className="mt-2">
              {room.currentParticipants.length} de {room.maxParticipants} participantes
            </Badge>
          </div>

          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <h3 className="font-semibold mb-2">📹 Antes de unirte:</h3>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Asegúrate de tener buena conexión a internet</li>
              <li>• Permitiremos acceso a tu cámara y micrófono</li>
              <li>• Puedes desactivar audio/video cuando quieras</li>
            </ul>
          </div>

          {/* Advertencia sobre moderación */}
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <h3 className="font-semibold mb-2">⚖️ Sistema de Autocontrol:</h3>
            <ul className="text-sm text-yellow-300 space-y-1">
              <li>• Los usuarios pueden votar para expulsar comportamientos inapropiados</li>
              <li>• Se requiere más del 50% de los votos para expulsar</li>
              <li>• Mantén un comportamiento respetuoso en todo momento</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleJoinCall}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              🎥 Unirse a la Videollamada
            </Button>

            <Button
              onClick={onLeave}
              variant="outline"
              className="w-full"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Conectando a la videollamada...</h2>
          <p className="text-gray-300">{room.name}</p>
          <p className="text-sm text-gray-400 mt-2">
            Solicitando acceso a cámara y micrófono...
          </p>
          <Button
            onClick={() => setHasJoined(false)}
            variant="outline"
            className="mt-4"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-4">Error de Conexión</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={handleJoinCall} className="w-full">
              Intentar de nuevo
            </Button>
            <Button onClick={() => setHasJoined(false)} variant="outline" className="w-full">
              Volver a configuración
            </Button>
            <Button onClick={onLeave} variant="outline" className="w-full">
              Volver al dashboard
            </Button>
          </div>
          <div className="mt-6 text-sm text-gray-400">
            <p>💡 Asegúrate de:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Permitir acceso a cámara y micrófono</li>
              <li>Usar HTTPS o localhost</li>
              <li>Tener una conexión estable a internet</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Calcular grid de videos
  const totalParticipants = participantsWithUserInfo.length + 1; // +1 para video local
  const gridCols = totalParticipants <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                   totalParticipants <= 4 ? 'grid-cols-2' :
                   totalParticipants <= 6 ? 'grid-cols-2 md:grid-cols-3' :
                   'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Notificaciones del sistema de moderación */}
      {showNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg max-w-md text-center animate-pulse">
          {showNotification}
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <div>
          <h1 className="text-xl font-semibold">{room.name}</h1>
          <p className="text-gray-300 text-sm">{room.topic}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-green-600">
            🟢 En vivo
          </Badge>
          <Badge variant="outline" className="border-gray-600 text-gray-300">
            {totalParticipants} participante{totalParticipants !== 1 ? 's' : ''}
          </Badge>

          {/* Mostrar votaciones activas */}
          {moderationState.activeVotings.length > 0 && (
            <Badge variant="destructive" className="bg-red-600 animate-pulse">
              🗳️ {moderationState.activeVotings.length} votación{moderationState.activeVotings.length !== 1 ? 'es' : ''} activa{moderationState.activeVotings.length !== 1 ? 's' : ''}
            </Badge>
          )}

          <Button variant="destructive" onClick={handleLeave}>
            Salir de la sala
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className={`grid ${gridCols} gap-4 h-full`}>
          {/* Video local */}
          <ParticipantVideo
            userId={user.id}
            userName={`${user.firstName} ${user.lastName}`}
            stream={localStream || undefined}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            isLocal={true}
            currentUserId={user.id}
          />

          {/* Videos de participantes remotos */}
          {participantsWithUserInfo.map(participant => (
            <ParticipantVideo
              key={participant.userId}
              userId={participant.userId}
              userName={participant.userName}
              stream={participant.stream}
              audioEnabled={participant.audioEnabled}
              videoEnabled={participant.videoEnabled}
              // Props de moderación
              canStartVoting={canStartVoting(participant.userId)}
              onStartVoting={handleStartVoting}
              onVoteToExpel={handleVoteToExpel}
              activeVoting={getActiveVoting(participant.userId)}
              hasUserVoted={hasUserVoted(participant.userId)}
              currentUserId={user.id}
            />
          ))}

          {/* Espacios vacíos para mostrar capacidad de la sala */}
          {Array.from({
            length: Math.max(0, room.maxParticipants - totalParticipants)
          }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-gray-800 border-2 border-gray-600 border-dashed rounded-lg aspect-video flex items-center justify-center"
            >
              <div className="text-gray-500 text-center">
                <div className="text-3xl mb-2">👤</div>
                <p className="text-sm">Esperando participante</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de información de moderación */}
      {moderationState.activeVotings.length > 0 && (
        <div className="bg-red-900/20 border-t border-red-700 p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-white font-semibold mb-2">🗳️ Votaciones Activas</h3>
            {moderationState.activeVotings.map(voting => (
              <div key={voting.targetUserId} className="bg-red-900/30 rounded-lg p-3 mb-2">
                <div className="flex justify-between items-center text-white text-sm">
                  <span>Expulsar a: <strong>{voting.targetUserName}</strong></span>
                  <span>{voting.votes.length}/{voting.requiredVotes} votos</span>
                </div>
                <div className="w-full bg-red-800 rounded-full h-2 mt-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(voting.votes.length / voting.requiredVotes) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area - Versión compacta */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
        <div className="flex justify-center space-x-4">
          <Button
            onClick={toggleAudio}
            variant={audioEnabled ? "default" : "destructive"}
            className="flex items-center space-x-2"
          >
            <span>{audioEnabled ? '🎤' : '🔇'}</span>
            <span>{audioEnabled ? 'Silenciar' : 'Activar mic'}</span>
          </Button>

          <Button
            onClick={toggleVideo}
            variant={videoEnabled ? "default" : "destructive"}
            className="flex items-center space-x-2"
          >
            <span>{videoEnabled ? '📹' : '📷'}</span>
            <span>{videoEnabled ? 'Parar video' : 'Activar video'}</span>
          </Button>

          <Button
            variant="outline"
            className="flex items-center space-x-2"
            disabled
          >
            <span>🖥️</span>
            <span>Compartir pantalla</span>
          </Button>

          <Button
            variant="outline"
            className="flex items-center space-x-2"
            disabled
          >
            <span>⚙️</span>
            <span>Configuración</span>
          </Button>
        </div>
      </div>

      {/* Video local oculto para el hook */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
    </div>
  );
};
