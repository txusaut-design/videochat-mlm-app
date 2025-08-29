export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  membershipExpiry: Date | null;
  isActive: boolean;
  sponsorId?: string; // ID del usuario que lo invitó
  totalEarnings: number;
  avatar?: string;
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  description: string;
  creatorId: string;
  createdAt: Date;
  maxParticipants: number;
  currentParticipants: string[]; // Array de user IDs
  isActive: boolean;
  requiresMembership: boolean;
}

export interface MLMLevel {
  level: number;
  userId: string;
  commission: number; // $1 USD por nivel
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string; // 'USDT', 'USDC', etc.
  transactionHash: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  membershipExtension: number; // días añadidos a la membresía
}

export interface MLMCommission {
  id: string;
  fromUserId: string; // Usuario que pagó
  toUserId: string; // Usuario que recibe la comisión
  level: number; // Nivel en la estructura (1-6)
  amount: number; // $1 USD
  paymentId: string;
  createdAt: Date;
  status: 'pending' | 'paid';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AppState {
  auth: AuthState;
  users: User[];
  rooms: Room[];
  payments: Payment[];
  commissions: MLMCommission[];
}

export interface VideoCall {
  roomId: string;
  participants: {
    userId: string;
    stream: MediaStream | null;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }[];
}

// Sistema de Votación y Expulsión Democrática
export interface VoteRecord {
  voterId: string;
  targetUserId: string;
  timestamp: Date;
  reason?: string;
}

export interface ActiveVoting {
  targetUserId: string;
  targetUserName: string;
  votes: VoteRecord[];
  startedAt: Date;
  startedBy: string;
  requiredVotes: number; // 50%+1 del total de participantes
  totalParticipants: number;
  isCompleted: boolean;
  result?: 'expelled' | 'failed';
  cooldownEnds?: Date;
}

export interface ExpelledUser {
  userId: string;
  userName: string;
  roomId: string;
  expelledAt: Date;
  expelledBy: string[]; // IDs de usuarios que votaron
  reason?: string;
  permanentBan?: boolean; // Para futuras implementaciones
}

export interface RoomModerationState {
  activeVotings: ActiveVoting[];
  expelledUsers: ExpelledUser[];
  votingCooldowns: { [userId: string]: Date }; // Cooldown para iniciar nuevas votaciones
  lastVotingActions: { [userId: string]: Date }; // Para prevenir spam
}

// Extender Room interface para incluir moderación
export interface RoomWithModeration extends Room {
  moderation: RoomModerationState;
}

// Eventos de moderación para el sistema
export interface ModerationEvents {
  voteStarted: (voting: ActiveVoting) => void;
  voteAdded: (vote: VoteRecord, voting: ActiveVoting) => void;
  voteCompleted: (voting: ActiveVoting, result: 'expelled' | 'failed') => void;
  userExpelled: (expelledUser: ExpelledUser) => void;
  cooldownStarted: (userId: string, endsAt: Date) => void;
}
