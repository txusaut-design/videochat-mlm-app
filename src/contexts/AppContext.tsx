'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, User, Room, Payment, MLMCommission, AuthState } from '@/types';
import { api } from '@/lib/api';

interface AppContextType {
  state: AppState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'membershipExpiry' | 'isActive' | 'totalEarnings'> & { password: string }) => Promise<boolean>;
  logout: () => void;
  demoLogin: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  createRoom: (roomData: Omit<Room, 'id' | 'createdAt' | 'currentParticipants' | 'isActive' | 'creatorId'>) => Promise<void>;
  joinRoom: (roomId: string, userId: string) => Promise<boolean>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
  processPayment: (userId: string, amount: number, currency: string, transactionHash: string) => Promise<void>;
  getMembershipStatus: (userId: string) => boolean;
  loadRooms: () => Promise<void>;
  loadPayments: () => Promise<void>;
  loadCommissions: () => Promise<void>;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ROOMS'; payload: Room[] }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'UPDATE_ROOM'; payload: Room }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'SET_COMMISSIONS'; payload: MLMCommission[] }
  | { type: 'ADD_COMMISSION'; payload: MLMCommission }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: AppState = {
  auth: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  },
  users: [],
  rooms: [],
  payments: [],
  commissions: [],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.payload,
          isAuthenticated: !!action.payload,
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: action.payload,
        },
      };
    case 'SET_ROOMS':
      return {
        ...state,
        rooms: action.payload,
      };
    case 'ADD_ROOM':
      return {
        ...state,
        rooms: [...state.rooms, action.payload],
      };
    case 'UPDATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.id ? action.payload : room
        ),
      };
    case 'SET_PAYMENTS':
      return {
        ...state,
        payments: action.payload,
      };
    case 'ADD_PAYMENT':
      return {
        ...state,
        payments: [...state.payments, action.payload],
      };
    case 'SET_COMMISSIONS':
      return {
        ...state,
        commissions: action.payload,
      };
    case 'ADD_COMMISSION':
      return {
        ...state,
        commissions: [...state.commissions, action.payload],
      };
    default:
      return state;
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app data
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Try to connect to backend first
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          await refreshUser();
        }
        await loadRooms();
      } catch (error) {
        console.log('Backend not available, using demo mode');
        // If backend is not available, load demo data
        loadDemoData();
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      // Fallback to demo data
      loadDemoData();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Demo data for when backend is not available
  const loadDemoData = () => {
    // Create demo user
    const demoUser = {
      id: 'demo-user-1',
      email: 'demo@example.com',
      username: 'demo_user',
      firstName: 'Demo',
      lastName: 'User',
      createdAt: new Date(),
      membershipExpiry: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      isActive: true,
      totalEarnings: 52.5, // Updated with new 5-level system earnings
      sponsorId: undefined,
      avatar: undefined
    };

    // Create demo rooms
    const demoRooms = [
      {
        id: 'room-1',
        name: 'Tecnología y Programación',
        topic: 'Desarrollo de Software',
        description: 'Sala para discutir las últimas tendencias en tecnología y programación',
        creatorId: 'demo-user-1',
        createdAt: new Date(),
        maxParticipants: 10,
        currentParticipants: ['demo-user-1'],
        isActive: true,
        requiresMembership: true
      },
      {
        id: 'room-2',
        name: 'Emprendimiento Digital',
        topic: 'Negocios Online',
        description: 'Comparte experiencias sobre emprendimiento y negocios digitales',
        creatorId: 'demo-user-2',
        createdAt: new Date(),
        maxParticipants: 10,
        currentParticipants: ['demo-user-2'],
        isActive: true,
        requiresMembership: true
      },
      {
        id: 'room-3',
        name: 'Marketing y Ventas',
        topic: 'Estrategias de Marketing',
        description: 'Discusión sobre técnicas de marketing digital y ventas online',
        creatorId: 'demo-user-3',
        createdAt: new Date(),
        maxParticipants: 10,
        currentParticipants: [],
        isActive: true,
        requiresMembership: true
      },
      {
        id: 'room-4',
        name: 'Inversiones y Finanzas',
        topic: 'Educación Financiera',
        description: 'Aprende sobre inversiones, criptomonedas y educación financiera',
        creatorId: 'demo-user-4',
        createdAt: new Date(),
        maxParticipants: 10,
        currentParticipants: ['demo-user-4', 'demo-user-5'],
        isActive: true,
        requiresMembership: true
      }
    ];

    // Create demo payments
    const demoPayments = [
      {
        id: 'payment-1',
        userId: 'demo-user-1',
        amount: 10,
        currency: 'USDT',
        transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        membershipExtension: 28
      },
      {
        id: 'payment-2',
        userId: 'demo-user-1',
        amount: 10,
        currency: 'USDC',
        transactionHash: '0xfedcba0987654321fedcba0987654321fedcba09',
        status: 'completed' as const,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        membershipExtension: 28
      }
    ];

    // Create demo commissions
    const demoCommissions = [
      {
        id: 'commission-1',
        fromUserId: 'demo-user-2',
        toUserId: 'demo-user-1',
        level: 1,
        amount: 3.5, // $3.5 for level 1
        paymentId: 'payment-3',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'paid' as const
      },
      {
        id: 'commission-2',
        fromUserId: 'demo-user-3',
        toUserId: 'demo-user-1',
        level: 2,
        amount: 1, // $1 for level 2
        paymentId: 'payment-4',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'paid' as const
      },
      {
        id: 'commission-3',
        fromUserId: 'demo-user-4',
        toUserId: 'demo-user-1',
        level: 3,
        amount: 1, // $1 for level 3
        paymentId: 'payment-5',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'paid' as const
      },
      {
        id: 'commission-4',
        fromUserId: 'demo-user-5',
        toUserId: 'demo-user-1',
        level: 4,
        amount: 1, // $1 for level 4
        paymentId: 'payment-6',
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        status: 'paid' as const
      },
      {
        id: 'commission-5',
        fromUserId: 'demo-user-6',
        toUserId: 'demo-user-1',
        level: 5,
        amount: 1, // $1 for level 5
        paymentId: 'payment-7',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        status: 'paid' as const
      }
    ];

    // Load demo data into state
    dispatch({ type: 'SET_USER', payload: demoUser });
    dispatch({ type: 'SET_ROOMS', payload: demoRooms });
    dispatch({ type: 'SET_PAYMENTS', payload: demoPayments });
    dispatch({ type: 'SET_COMMISSIONS', payload: demoCommissions });

    // Store demo flag
    localStorage.setItem('demo_mode', 'true');
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // If in demo mode, simulate login
      if (localStorage.getItem('demo_mode') === 'true') {
        if (email === 'demo@example.com') {
          loadDemoData();
          return true;
        }
        return false;
      }

      const response = await api.auth.login(email, password);

      if (response.success && (response.data as any)?.user) {
        dispatch({ type: 'SET_USER', payload: (response.data as any).user });
        await loadUserData();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to demo mode
      if (email === 'demo@example.com') {
        loadDemoData();
        return true;
      }
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const demoLogin = async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      if (localStorage.getItem('demo_mode') === 'true') {
        loadDemoData();
        return true;
      }

      const response = await api.auth.demoLogin();

      if (response.success && (response.data as any)?.user) {
        dispatch({ type: 'SET_USER', payload: (response.data as any).user });
        await loadUserData();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Demo login error:', error);
      // Fallback to demo mode
      loadDemoData();
      return true;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt' | 'membershipExpiry' | 'isActive' | 'totalEarnings'> & { password: string }): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await api.auth.register({
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        sponsorCode: userData.sponsorId,
      });

      if (response.success && (response.data as any)?.user) {
        dispatch({ type: 'SET_USER', payload: (response.data as any).user });
        await loadUserData();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    api.auth.logout();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_PAYMENTS', payload: [] });
    dispatch({ type: 'SET_COMMISSIONS', payload: [] });
    localStorage.removeItem('demo_mode');
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await api.auth.getMe();

      if (response.success && (response.data as any)?.user) {
        dispatch({ type: 'SET_USER', payload: (response.data as any).user });
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Token might be invalid, logout
      logout();
    }
  };

  const loadUserData = async () => {
    if (state.auth.user) {
      await Promise.all([
        loadRooms(),
        loadPayments(),
        loadCommissions(),
      ]);
    }
  };

  const loadRooms = async (): Promise<void> => {
    try {
      const response = await api.rooms.getAll({ limit: 50 });

      if (response.success && (response.data as any)?.rooms) {
        const rooms = (response.data as any).rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          topic: room.topic,
          description: room.description,
          creatorId: room.creatorId,
          createdAt: new Date(room.createdAt),
          maxParticipants: room.maxParticipants,
          currentParticipants: room.currentParticipants?.map((p: any) => p.id) || [],
          isActive: room.isActive,
          requiresMembership: room.requiresMembership,
        }));

        dispatch({ type: 'SET_ROOMS', payload: rooms });
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadPayments = async (): Promise<void> => {
    try {
      const response = await api.payments.getAll({ limit: 50 });

      if (response.success && (response.data as any)?.payments) {
        const payments = (response.data as any).payments.map((payment: any) => ({
          id: payment.id,
          userId: payment.userId,
          amount: payment.amount,
          currency: payment.currency,
          transactionHash: payment.transactionHash,
          status: payment.status,
          createdAt: new Date(payment.createdAt),
          membershipExtension: payment.membershipExtension,
        }));

        dispatch({ type: 'SET_PAYMENTS', payload: payments });
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadCommissions = async (): Promise<void> => {
    try {
      const response = await api.mlm.getCommissions({ limit: 100 });

      if (response.success && (response.data as any)?.commissions) {
        const commissions = (response.data as any).commissions.map((commission: any) => ({
          id: commission.id,
          fromUserId: commission.fromUserId,
          toUserId: commission.toUserId,
          level: commission.level,
          amount: commission.amount,
          paymentId: commission.paymentId,
          createdAt: new Date(commission.createdAt),
          status: commission.status,
        }));

        dispatch({ type: 'SET_COMMISSIONS', payload: commissions });
      }
    } catch (error) {
      console.error('Error loading commissions:', error);
    }
  };

  const createRoom = async (roomData: Omit<Room, 'id' | 'createdAt' | 'currentParticipants' | 'isActive' | 'creatorId'>): Promise<void> => {
    try {
      if (localStorage.getItem('demo_mode') === 'true') {
        // Demo mode - add room locally
        const newRoom = {
          id: `room-${Date.now()}`,
          ...roomData,
          createdAt: new Date(),
          currentParticipants: [],
          isActive: true,
          creatorId: state.auth.user?.id || 'demo-user-1'
        };
        dispatch({ type: 'ADD_ROOM', payload: newRoom });
        return;
      }

      const response = await api.rooms.create({
        name: roomData.name,
        topic: roomData.topic,
        description: roomData.description,
        maxParticipants: roomData.maxParticipants,
        requiresMembership: roomData.requiresMembership,
      });

      if (response.success && (response.data as any)?.room) {
        const room = (response.data as any).room;
        const newRoom = {
          id: room.id,
          name: room.name,
          topic: room.topic,
          description: room.description,
          creatorId: room.creatorId,
          createdAt: new Date(room.createdAt),
          maxParticipants: room.maxParticipants,
          currentParticipants: [],
          isActive: room.isActive,
          requiresMembership: room.requiresMembership,
        };

        dispatch({ type: 'ADD_ROOM', payload: newRoom });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };

  const joinRoom = async (roomId: string, userId: string): Promise<boolean> => {
    try {
      if (localStorage.getItem('demo_mode') === 'true') {
        // Demo mode - update room locally
        const room = state.rooms.find(r => r.id === roomId);
        if (room && !room.currentParticipants.includes(userId)) {
          const updatedRoom = {
            ...room,
            currentParticipants: [...room.currentParticipants, userId]
          };
          dispatch({ type: 'UPDATE_ROOM', payload: updatedRoom });
        }
        return true;
      }

      const response = await api.rooms.join(roomId);

      if (response.success) {
        await loadRooms();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  };

  const leaveRoom = async (roomId: string, userId: string): Promise<void> => {
    try {
      if (localStorage.getItem('demo_mode') === 'true') {
        // Demo mode - update room locally
        const room = state.rooms.find(r => r.id === roomId);
        if (room) {
          const updatedRoom = {
            ...room,
            currentParticipants: room.currentParticipants.filter(id => id !== userId)
          };
          dispatch({ type: 'UPDATE_ROOM', payload: updatedRoom });
        }
        return;
      }

      await api.rooms.leave(roomId);
      await loadRooms();
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const processPayment = async (userId: string, amount: number, currency: string, transactionHash: string): Promise<void> => {
    try {
      if (localStorage.getItem('demo_mode') === 'true') {
        // Demo mode - simulate payment processing
        const newPayment = {
          id: `payment-${Date.now()}`,
          userId,
          amount,
          currency,
          transactionHash,
          status: 'completed' as const,
          createdAt: new Date(),
          membershipExtension: 28
        };

        dispatch({ type: 'ADD_PAYMENT', payload: newPayment });

        // Update user membership
        if (state.auth.user) {
          const updatedUser = {
            ...state.auth.user,
            membershipExpiry: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
            totalEarnings: state.auth.user.totalEarnings + 7.5 // Simulate new 5-level commission distribution ($7.5 total)
          };
          dispatch({ type: 'SET_USER', payload: updatedUser });
        }
        return;
      }

      const response = await api.payments.create({
        amount,
        currency,
        transactionHash,
      });

      if (response.success) {
        await refreshUser();
        await loadPayments();
        await loadCommissions();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  };

  const getMembershipStatus = (userId: string): boolean => {
    if (!state.auth.user || state.auth.user.id !== userId) {
      return false;
    }

    return state.auth.user.membershipExpiry ?
      new Date(state.auth.user.membershipExpiry) > new Date() :
      false;
  };

  const value: AppContextType = {
    state,
    login,
    register,
    logout,
    demoLogin,
    refreshUser,
    createRoom,
    joinRoom,
    leaveRoom,
    processPayment,
    getMembershipStatus,
    loadRooms,
    loadPayments,
    loadCommissions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
