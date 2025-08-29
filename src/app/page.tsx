'use client';

import { useApp } from '@/contexts/AppContext';
import { AuthPage } from '@/components/Auth/AuthPage';
import { Dashboard } from '@/components/Dashboard/Dashboard';

export default function Home() {
  const { state } = useApp();

  if (state.auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return state.auth.isAuthenticated ? <Dashboard /> : <AuthPage />;
}
