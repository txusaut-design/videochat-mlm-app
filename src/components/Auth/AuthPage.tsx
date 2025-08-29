'use client';

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">VideoChat MLM</h1>
          <p className="text-gray-600">
            Plataforma de videochats con sistema de afiliados
          </p>
        </div>

        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-2">
            💰 Membresía: $10 USD/28 días | 🔗 Sistema MLM de 5 niveles
          </p>
          <p>
            📹 Videochats de hasta 10 usuarios | 🏆 Gana hasta $7.5 USD por referido
          </p>
        </div>
      </div>
    </div>
  );
};
