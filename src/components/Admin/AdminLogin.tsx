'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AdminLoginProps {
  onLogin: (credentials: { username: string; password: string }) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validación básica
      if (!username || !password) {
        throw new Error('Por favor, complete todos los campos');
      }

      // Credenciales de demo para administrador
      if (username === 'admin' && password === 'admin123') {
        onLogin({ username, password });
      } else {
        throw new Error('Credenciales incorrectas. Use admin/admin123 para demo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🛡️</span>
          </div>
          <CardTitle className="text-2xl font-bold">Panel de Administración</CardTitle>
          <p className="text-gray-600">VideoChat MLM - Acceso Restringido</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Verificando...</span>
                </div>
              ) : (
                'Acceder al Panel'
              )}
            </Button>
          </form>

          {/* Información de demo */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">🔧 Credenciales de Demo</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Usuario:</strong> admin</p>
              <p><strong>Contraseña:</strong> admin123</p>
            </div>
          </div>

          {/* Funcionalidades */}
          <div className="mt-4 text-center">
            <h4 className="font-medium text-gray-900 mb-2">📊 Funcionalidades del Panel</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="bg-gray-50 p-2 rounded">👥 Gestión Usuarios</div>
              <div className="bg-gray-50 p-2 rounded">🏠 Monitor Salas</div>
              <div className="bg-gray-50 p-2 rounded">⚖️ Logs Moderación</div>
              <div className="bg-gray-50 p-2 rounded">💰 Métricas MLM</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
