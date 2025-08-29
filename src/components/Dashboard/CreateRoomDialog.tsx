'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    topic: '',
    description: '',
    maxParticipants: 10,
  });
  const [error, setError] = useState('');
  const { createRoom, state, getMembershipStatus } = useApp();

  const user = state.auth.user!;
  const isActiveMember = getMembershipStatus(user.id);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxParticipants' ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isActiveMember) {
      setError('Necesitas una membresía activa para crear salas');
      return;
    }

    if (!formData.name.trim() || !formData.topic.trim() || !formData.description.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }

    if (formData.maxParticipants < 2 || formData.maxParticipants > 10) {
      setError('El número de participantes debe estar entre 2 y 10');
      return;
    }

    createRoom({
      name: formData.name.trim(),
      topic: formData.topic.trim(),
      description: formData.description.trim(),
      maxParticipants: formData.maxParticipants,
      requiresMembership: true,
    });

    // Resetear formulario y cerrar dialog
    setFormData({
      name: '',
      topic: '',
      description: '',
      maxParticipants: 10,
    });
    setError('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      topic: '',
      description: '',
      maxParticipants: 10,
    });
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Sala de Videochat</DialogTitle>
        </DialogHeader>

        {!isActiveMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ Necesitas una membresía activa para crear salas de videochat
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Sala *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Tecnología y Programación"
              value={formData.name}
              onChange={handleChange}
              disabled={!isActiveMember}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Temática *</Label>
            <Input
              id="topic"
              name="topic"
              placeholder="Ej: Desarrollo de Software"
              value={formData.topic}
              onChange={handleChange}
              disabled={!isActiveMember}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <textarea
              id="description"
              name="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Describe de qué tratará la conversación en esta sala..."
              value={formData.description}
              onChange={handleChange}
              disabled={!isActiveMember}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Máximo de Participantes</Label>
            <Input
              id="maxParticipants"
              name="maxParticipants"
              type="number"
              min="2"
              max="10"
              value={formData.maxParticipants}
              onChange={handleChange}
              disabled={!isActiveMember}
            />
            <p className="text-xs text-gray-500">Entre 2 y 10 participantes</p>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isActiveMember}
          >
            Crear Sala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
