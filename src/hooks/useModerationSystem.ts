'use client';

import { useState, useCallback, useEffect } from 'react';
import { ActiveVoting, VoteRecord, ExpelledUser, RoomModerationState } from '@/types';

interface UseModerationSystemProps {
  roomId: string;
  currentUserId: string;
  participants: Array<{ userId: string; userName: string }>;
  onUserExpelled?: (userId: string) => void;
}

export const useModerationSystem = ({
  roomId,
  currentUserId,
  participants,
  onUserExpelled
}: UseModerationSystemProps) => {
  const [moderationState, setModerationState] = useState<RoomModerationState>({
    activeVotings: [],
    expelledUsers: [],
    votingCooldowns: {},
    lastVotingActions: {}
  });

  // Constantes del sistema
  const VOTE_COOLDOWN_MINUTES = 5; // 5 minutos entre votaciones del mismo usuario
  const VOTING_DURATION_MINUTES = 10; // 10 minutos para completar una votación
  const MIN_PARTICIPANTS_FOR_VOTING = 2; // Mínimo 2 participantes para iniciar votación

  // Calcular votos requeridos (50% + 1)
  const calculateRequiredVotes = useCallback((totalParticipants: number): number => {
    return Math.floor(totalParticipants / 2) + 1;
  }, []);

  // Verificar si un usuario puede iniciar una votación
  const canStartVoting = useCallback((targetUserId: string): boolean => {
    // No puede votar contra sí mismo
    if (targetUserId === currentUserId) return false;

    // Verificar si hay suficientes participantes
    if (participants.length < MIN_PARTICIPANTS_FOR_VOTING) return false;

    // Verificar si el usuario objetivo ya está siendo votado
    const existingVoting = moderationState.activeVotings.find(
      voting => voting.targetUserId === targetUserId && !voting.isCompleted
    );
    if (existingVoting) return false;

    // Verificar cooldown del usuario actual
    const lastAction = moderationState.lastVotingActions[currentUserId];
    if (lastAction) {
      const cooldownEnd = new Date(lastAction.getTime() + VOTE_COOLDOWN_MINUTES * 60 * 1000);
      if (new Date() < cooldownEnd) return false;
    }

    // Verificar si el usuario objetivo ya fue expulsado
    const isExpelled = moderationState.expelledUsers.some(
      expelled => expelled.userId === targetUserId && expelled.roomId === roomId
    );
    if (isExpelled) return false;

    return true;
  }, [currentUserId, participants.length, moderationState, roomId]);

  // Iniciar votación para expulsar usuario
  const startVoting = useCallback((targetUserId: string, reason?: string): ActiveVoting | null => {
    if (!canStartVoting(targetUserId)) return null;

    const targetUser = participants.find(p => p.userId === targetUserId);
    if (!targetUser) return null;

    const totalParticipants = participants.length;
    const requiredVotes = calculateRequiredVotes(totalParticipants);

    const newVoting: ActiveVoting = {
      targetUserId,
      targetUserName: targetUser.userName,
      votes: [],
      startedAt: new Date(),
      startedBy: currentUserId,
      requiredVotes,
      totalParticipants,
      isCompleted: false
    };

    setModerationState(prev => ({
      ...prev,
      activeVotings: [...prev.activeVotings, newVoting],
      lastVotingActions: {
        ...prev.lastVotingActions,
        [currentUserId]: new Date()
      }
    }));

    return newVoting;
  }, [canStartVoting, participants, calculateRequiredVotes, currentUserId]);

  // Votar para expulsar usuario
  const voteToExpel = useCallback((targetUserId: string, reason?: string): boolean => {
    const activeVoting = moderationState.activeVotings.find(
      voting => voting.targetUserId === targetUserId && !voting.isCompleted
    );

    if (!activeVoting) return false;

    // Verificar si el usuario ya votó
    const existingVote = activeVoting.votes.find(vote => vote.voterId === currentUserId);
    if (existingVote) return false;

    const newVote: VoteRecord = {
      voterId: currentUserId,
      targetUserId,
      timestamp: new Date(),
      reason
    };

    const updatedVotes = [...activeVoting.votes, newVote];
    const hasEnoughVotes = updatedVotes.length >= activeVoting.requiredVotes;

    setModerationState(prev => ({
      ...prev,
      activeVotings: prev.activeVotings.map(voting => {
        if (voting.targetUserId === targetUserId) {
          const updatedVoting = {
            ...voting,
            votes: updatedVotes,
            isCompleted: hasEnoughVotes,
            result: hasEnoughVotes ? 'expelled' as const : undefined
          };

          // Si se alcanzó el umbral, crear registro de expulsión
          if (hasEnoughVotes) {
            const expelledUser: ExpelledUser = {
              userId: targetUserId,
              userName: activeVoting.targetUserName,
              roomId,
              expelledAt: new Date(),
              expelledBy: updatedVotes.map(vote => vote.voterId),
              reason: reason || 'Votación democrática'
            };

            // Agregar a la lista de expulsados
            setTimeout(() => {
              setModerationState(prevState => ({
                ...prevState,
                expelledUsers: [...prevState.expelledUsers, expelledUser]
              }));

              // Notificar expulsión
              onUserExpelled?.(targetUserId);
            }, 0);
          }

          return updatedVoting;
        }
        return voting;
      })
    }));

    return true;
  }, [moderationState.activeVotings, currentUserId, roomId, onUserExpelled]);

  // Verificar si un usuario está expulsado de la sala
  const isUserExpelled = useCallback((userId: string): boolean => {
    return moderationState.expelledUsers.some(
      expelled => expelled.userId === userId && expelled.roomId === roomId
    );
  }, [moderationState.expelledUsers, roomId]);

  // Obtener votación activa para un usuario
  const getActiveVoting = useCallback((targetUserId: string): ActiveVoting | undefined => {
    return moderationState.activeVotings.find(
      voting => voting.targetUserId === targetUserId && !voting.isCompleted
    );
  }, [moderationState.activeVotings]);

  // Verificar si el usuario actual ya votó en una votación específica
  const hasUserVoted = useCallback((targetUserId: string): boolean => {
    const voting = getActiveVoting(targetUserId);
    if (!voting) return false;
    return voting.votes.some(vote => vote.voterId === currentUserId);
  }, [getActiveVoting, currentUserId]);

  // Limpiar votaciones completadas automáticamente
  useEffect(() => {
    const interval = setInterval(() => {
      setModerationState(prev => ({
        ...prev,
        activeVotings: prev.activeVotings.filter(voting => {
          if (voting.isCompleted) return false;

          // Eliminar votaciones que han expirado
          const elapsed = new Date().getTime() - voting.startedAt.getTime();
          const isExpired = elapsed > VOTING_DURATION_MINUTES * 60 * 1000;

          if (isExpired) {
            // Marcar como fallida si no se completó
            voting.isCompleted = true;
            voting.result = 'failed';
          }

          return !isExpired;
        })
      }));
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  return {
    moderationState,
    startVoting,
    voteToExpel,
    canStartVoting,
    isUserExpelled,
    getActiveVoting,
    hasUserVoted,
    calculateRequiredVotes
  };
};
