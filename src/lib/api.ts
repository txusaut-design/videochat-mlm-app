// API Client for VideoChat MLM Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as any).Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'An error occurred');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication endpoints
  auth = {
    register: async (userData: {
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      password: string;
      sponsorCode?: string;
    }) => {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if ((response.data as any)?.token) {
        this.setToken((response.data as any).token);
      }

      return response;
    },

    login: async (email: string, password: string) => {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if ((response.data as any)?.token) {
        this.setToken((response.data as any).token);
      }

      return response;
    },

    demoLogin: async () => {
      const response = await this.request('/auth/demo-login', {
        method: 'POST',
      });

      if ((response.data as any)?.token) {
        this.setToken((response.data as any).token);
      }

      return response;
    },

    getMe: async () => {
      return this.request('/auth/me');
    },

    logout: () => {
      this.clearToken();
    },

    refreshToken: async () => {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
      });

      if ((response.data as any)?.token) {
        this.setToken((response.data as any).token);
      }

      return response;
    },
  };

  // User endpoints
  users = {
    getProfile: async () => {
      return this.request('/users/profile');
    },

    updateProfile: async (profileData: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    }) => {
      return this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      return this.request('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    getById: async (id: string) => {
      return this.request(`/users/${id}`);
    },

    getUsers: async (params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/users${query ? `?${query}` : ''}`);
    },

    search: async (query: string) => {
      return this.request(`/users/search/${encodeURIComponent(query)}`);
    },

    getStats: async () => {
      return this.request('/users/stats/overview');
    },
  };

  // Room endpoints
  rooms = {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/rooms${query ? `?${query}` : ''}`);
    },

    getById: async (id: string) => {
      return this.request(`/rooms/${id}`);
    },

    create: async (roomData: {
      name: string;
      topic: string;
      description: string;
      maxParticipants?: number;
      requiresMembership?: boolean;
    }) => {
      return this.request('/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
      });
    },

    update: async (id: string, roomData: Partial<{
      name: string;
      topic: string;
      description: string;
      maxParticipants: number;
      requiresMembership: boolean;
      isActive: boolean;
    }>) => {
      return this.request(`/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(roomData),
      });
    },

    delete: async (id: string) => {
      return this.request(`/rooms/${id}`, {
        method: 'DELETE',
      });
    },

    join: async (id: string) => {
      return this.request(`/rooms/${id}/join`, {
        method: 'POST',
      });
    },

    leave: async (id: string) => {
      return this.request(`/rooms/${id}/leave`, {
        method: 'POST',
      });
    },

    getMyCreated: async (params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/rooms/my/created${query ? `?${query}` : ''}`);
    },
  };

  // Payment endpoints
  payments = {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/payments${query ? `?${query}` : ''}`);
    },

    getById: async (id: string) => {
      return this.request(`/payments/${id}`);
    },

    create: async (paymentData: {
      amount: number;
      currency: string;
      transactionHash: string;
    }) => {
      return this.request('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    },

    getStats: async () => {
      return this.request('/payments/stats/overview');
    },

    verify: async (id: string) => {
      return this.request(`/payments/${id}/verify`, {
        method: 'POST',
      });
    },
  };

  // MLM endpoints
  mlm = {
    getNetwork: async () => {
      return this.request('/mlm/network');
    },

    getCommissions: async (params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/mlm/commissions${query ? `?${query}` : ''}`);
    },

    getStats: async () => {
      return this.request('/mlm/stats');
    },

    getLevelUsers: async (level: number, params?: {
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/mlm/levels/${level}${query ? `?${query}` : ''}`);
    },

    getReferralLink: async () => {
      return this.request('/mlm/referral-link');
    },

    getEarningsReport: async (params?: {
      startDate?: string;
      endDate?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value);
          }
        });
      }

      const query = searchParams.toString();
      return this.request(`/mlm/earnings-report${query ? `?${query}` : ''}`);
    },
  };

  // Health check
  health = async () => {
    return this.request('/health');
  };
}

// Create and export API client instance
export const api = new ApiClient(API_BASE_URL);

// Export types for TypeScript
export type LoginResponse = {
  user: any;
  token: string;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};
