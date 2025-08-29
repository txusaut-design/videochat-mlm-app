'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, demoLogin, state } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      return;
    }

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Credenciales inválidas');
      }
    } catch (error) {
      setError('Error al iniciar sesión. Inténtalo de nuevo.');
    }
  };

  const handleDemoLogin = async () => {
    setError('');

    try {
      const success = await demoLogin();
      if (!success) {
        setError('Error al cargar usuario demo');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
        <CardDescription className="text-center">
          Accede a tu cuenta para unirte a videochats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state.auth.isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={state.auth.isLoading}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={state.auth.isLoading}
          >
            {state.auth.isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <div className="mt-4">
          <div className="text-center text-sm text-gray-500 mb-2">O prueba con:</div>
          <Button
            onClick={handleDemoLogin}
            variant="outline"
            className="w-full"
            disabled={state.auth.isLoading}
          >
            {state.auth.isLoading ? 'Cargando...' : 'Usuario Demo'}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 text-sm mb-1">🔗 Conectado al Backend Real</h4>
          <p className="text-blue-700 text-xs">
            Ahora utilizamos una API backend real con PostgreSQL para datos persistentes
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-center text-sm text-gray-600 w-full">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:underline font-medium"
          >
            Regístrate aquí
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};
