'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActiveVoting } from '@/types';

interface ParticipantVideoProps {
  userId: string;
  userName: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
  // Props para sistema de moderación
  canStartVoting?: boolean;
  onStartVoting?: (targetUserId: string, reason?: string) => void;
  onVoteToExpel?: (targetUserId: string, reason?: string) => void;
  activeVoting?: ActiveVoting;
  hasUserVoted?: boolean;
  currentUserId?: string;
}

export const ParticipantVideo: React.FC<ParticipantVideoProps> = ({
  userId,
  userName,
  stream,
  audioEnabled,
  videoEnabled,
  isLocal = false,
  canStartVoting = false,
  onStartVoting,
  onVoteToExpel,
  activeVoting,
  hasUserVoted = false,
  currentUserId
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showModerationMenu, setShowModerationMenu] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = userName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleStartVoting = () => {
    onStartVoting?.(userId, 'Comportamiento inapropiado');
    setShowModerationMenu(false);
  };

  const handleVoteToExpel = () => {
    onVoteToExpel?.(userId, 'Apoyo la expulsión');
    setShowModerationMenu(false);
  };

  // No mostrar controles de moderación para el usuario local
  const showModerationControls = !isLocal && (canStartVoting || activeVoting);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video group">
      {stream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Evitar feedback en video local
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg bg-gray-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlay con información del participante */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex justify-between items-center">
          <div className="text-white">
            <p className="font-medium text-sm">
              {userName}
              {isLocal && ' (Tú)'}
            </p>
          </div>

          <div className="flex space-x-1">
            {/* Indicador de audio */}
            <Badge
              variant={audioEnabled ? "default" : "destructive"}
              className={`text-xs px-2 py-1 ${
                audioEnabled
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {audioEnabled ? '🎤' : '🔇'}
            </Badge>

            {/* Indicador de video */}
            <Badge
              variant={videoEnabled ? "default" : "destructive"}
              className={`text-xs px-2 py-1 ${
                videoEnabled
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {videoEnabled ? '📹' : '📷'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Votación activa - Barra de progreso */}
      {activeVoting && (
        <div className="absolute top-0 left-0 right-0 bg-red-900/90 p-2">
          <div className="text-white text-xs text-center">
            <div className="flex justify-between items-center mb-1">
              <span>🗳️ Votación de expulsión</span>
              <span>{activeVoting.votes.length}/{activeVoting.requiredVotes}</span>
            </div>
            <div className="w-full bg-red-800 rounded-full h-1">
              <div
                className="bg-red-500 h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${(activeVoting.votes.length / activeVoting.requiredVotes) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de conexión */}
      {!stream && !isLocal && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>
      )}

      {/* Indicador de usuario local */}
      {isLocal && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs bg-blue-600 text-white">
            Local
          </Badge>
        </div>
      )}

      {/* Controles de moderación */}
      {showModerationControls && (
        <div className="absolute top-2 right-2">
          <div className="relative">
            <Button
              size="sm"
              variant="destructive"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs px-2 py-1"
              onClick={() => setShowModerationMenu(!showModerationMenu)}
            >
              ⚠️
            </Button>

            {/* Menú de moderación */}
            {showModerationMenu && (
              <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50 min-w-[200px]">
                <div className="text-white text-xs mb-2 font-medium">
                  Moderación: {userName}
                </div>

                {/* Iniciar votación */}
                {canStartVoting && !activeVoting && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full text-xs mb-1"
                    onClick={handleStartVoting}
                  >
                    🗳️ Iniciar votación de expulsión
                  </Button>
                )}

                {/* Votar en votación activa */}
                {activeVoting && !hasUserVoted && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full text-xs mb-1"
                    onClick={handleVoteToExpel}
                  >
                    ✋ Votar para expulsar
                  </Button>
                )}

                {/* Usuario ya votó */}
                {activeVoting && hasUserVoted && (
                  <div className="text-green-400 text-xs text-center py-2">
                    ✓ Ya has votado
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => setShowModerationMenu(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicador de expulsión completada */}
      {activeVoting?.isCompleted && activeVoting.result === 'expelled' && (
        <div className="absolute inset-0 bg-red-900/90 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-2xl mb-2">🚫</div>
            <div className="text-sm font-medium">Usuario expulsado</div>
            <div className="text-xs text-red-300">Por votación democrática</div>
          </div>
        </div>
      )}
    </div>
  );
};
