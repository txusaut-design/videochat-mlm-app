'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { VideoCallDialog } from './VideoCallDialog';

export const RoomList: React.FC = () => {
  const { state, joinRoom, getMembershipStatus } = useApp();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const user = state.auth.user!;
  const isActiveMember = getMembershipStatus(user.id);

  const handleJoinRoom = async (roomId: string) => {
    if (!isActiveMember) {
      alert('Necesitas una membresía activa para unirte a las salas');
      return;
    }

    const success = await joinRoom(roomId, user.id);
    if (success) {
      setSelectedRoom(roomId);
    } else {
      alert('No se pudo unir a la sala. Puede estar llena.');
    }
  };

  const handleLeaveRoom = () => {
    setSelectedRoom(null);
  };

  if (selectedRoom) {
    return (
      <VideoCallDialog
        roomId={selectedRoom}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {state.rooms.filter(room => room.isActive).map(room => {
        const creator = state.users.find(u => u.id === room.creatorId);
        const isRoomFull = room.currentParticipants.length >= room.maxParticipants;
        const isUserInRoom = room.currentParticipants.includes(user.id);

        return (
          <Card key={room.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{room.name}</CardTitle>
                <Badge variant={isRoomFull ? "destructive" : "default"}>
                  {room.currentParticipants.length}/{room.maxParticipants}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{room.topic}</Badge>
                {room.requiresMembership && (
                  <Badge variant="secondary">Membresía</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-gray-600 mb-3">{room.description}</p>
              <div className="text-sm text-gray-500">
                <p>Creado por: {creator?.firstName} {creator?.lastName}</p>
                <p>Fecha: {new Date(room.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => handleJoinRoom(room.id)}
                disabled={isRoomFull || !isActiveMember || isUserInRoom}
                className="w-full"
              >
                {isUserInRoom ? 'Ya estás en esta sala' :
                 isRoomFull ? 'Sala llena' :
                 !isActiveMember ? 'Membresía requerida' :
                 'Unirse a la sala'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}

      {state.rooms.length === 0 && (
        <div className="col-span-full">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No hay salas disponibles
              </h3>
              <p className="text-gray-500">
                ¡Sé el primero en crear una sala de videochat!
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
