// Tipos simples para admin dashboard
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRooms: number;
  activeRooms: number;
  totalCommissions: number;
  totalVotings: number;
  totalExpulsions: number;
  registrationsToday: number;
  revenueThisMonth: number;
  averageSessionDuration: number;
}

export interface SimpleUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended' | 'banned';
  lastActive: Date;
  totalCommissionsEarned: number;
  referralCount: number;
}

export interface SimpleRoom {
  id: string;
  name: string;
  topic: string;
  currentParticipants: string[];
  maxParticipants: number;
  totalParticipations: number;
  isCurrentlyActive: boolean;
}

export interface AdminDashboardData {
  stats: AdminStats;
  users: SimpleUser[];
  rooms: SimpleRoom[];
}
