'use client';

import { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AdminDashboardSimple: React.FC = () => {
  const stats = {
    totalUsers: 1247,
    activeUsers: 89,
    totalRooms: 15,
    activeRooms: 7,
    totalCommissions: 15750.50,
    totalVotings: 23,
    totalExpulsions: 5,
    registrationsToday: 12,
    revenueThisMonth: 8940.00
  };

  const mockUsers = [
    { id: '1', name: 'María García', email: 'maria@example.com', status: 'active', commissions: 85.50 },
    { id: '2', name: 'Carlos López', email: 'carlos@example.com', status: 'suspended', commissions: 23.50 },
    { id: '3', name: 'Ana Rodríguez', email: 'ana@example.com', status: 'active', commissions: 156.00 }
  ];

  const mockRooms = [
    { id: '1', name: 'Sala Principal', participants: 8, maxParticipants: 10, active: true },
    { id: '2', name: 'Emprendedores', participants: 3, maxParticipants: 8, active: true },
    { id: '3', name: 'Masterclass', participants: 0, maxParticipants: 15, active: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600 mt-1">VideoChat MLM - Dashboard Completo de Base de Datos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Usuarios</p>
                  <p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-blue-100 text-xs mt-1">{stats.activeUsers} activos hoy</p>
                </div>
                <div className="text-4xl opacity-80">👥</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Ingresos del Mes</p>
                  <p className="text-3xl font-bold">${stats.revenueThisMonth.toLocaleString()}</p>
                  <p className="text-green-100 text-xs mt-1">${stats.totalCommissions.toLocaleString()} comisiones</p>
                </div>
                <div className="text-4xl opacity-80">💰</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Salas Activas</p>
                  <p className="text-3xl font-bold">{stats.activeRooms}</p>
                  <p className="text-purple-100 text-xs mt-1">de {stats.totalRooms} salas</p>
                </div>
                <div className="text-4xl opacity-80">🏠</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Moderación</p>
                  <p className="text-3xl font-bold">{stats.totalExpulsions}</p>
                  <p className="text-red-100 text-xs mt-1">{stats.totalVotings} votaciones</p>
                </div>
                <div className="text-4xl opacity-80">⚖️</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Usuarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>👥</span>
                <span>Gestión de Usuarios ({mockUsers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                        {user.status}
                      </Badge>
                      <span className="text-sm font-medium">${user.commissions}</span>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline">Editar</Button>
                        <Button size="sm" variant="destructive">
                          {user.status === 'active' ? 'Suspender' : 'Activar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Salas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🏠</span>
                <span>Estado de Salas ({mockRooms.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockRooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="text-sm text-gray-500">{room.participants}/{room.maxParticipants} participantes</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {room.active ? (
                        <Badge className="bg-green-100 text-green-800">En vivo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                      <Button size="sm" variant="outline">Ver Detalles</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs de Moderación */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⚖️</span>
              <span>Logs de Moderación Recientes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="border rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="destructive">🚫 Usuario Expulsado</Badge>
                  <span className="text-sm text-gray-500">Hace 2 horas</span>
                </div>
                <p className="text-sm">
                  <strong>Sala:</strong> Sala Principal |
                  <strong> Expulsado:</strong> Carlos López |
                  <strong> Votos:</strong> 6/5
                </p>
                <p className="text-xs text-gray-600 mt-1">Motivo: Comportamiento inapropiado en chat</p>
              </div>

              <div className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">🗳️ Votación Fallida</Badge>
                  <span className="text-sm text-gray-500">Hace 5 horas</span>
                </div>
                <p className="text-sm">
                  <strong>Sala:</strong> Emprendedores |
                  <strong> Objetivo:</strong> Juan Pérez |
                  <strong> Votos:</strong> 3/4
                </p>
                <p className="text-xs text-gray-600 mt-1">No se alcanzó el umbral requerido</p>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="default">📊 Nueva Votación</Badge>
                  <span className="text-sm text-gray-500">Hace 1 día</span>
                </div>
                <p className="text-sm">
                  <strong>Sala:</strong> Masterclass |
                  <strong> Iniciada por:</strong> Ana Rodríguez |
                  <strong> Votos:</strong> 2/4
                </p>
                <p className="text-xs text-gray-600 mt-1">Votación en curso...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas MLM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>💰</span>
              <span>Sistema MLM - Estadísticas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.registrationsToday}</div>
                <div className="text-sm text-blue-700">Registros Hoy</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.totalVotings}</div>
                <div className="text-sm text-green-700">Votaciones Totales</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.activeUsers}</div>
                <div className="text-sm text-purple-700">Usuarios Activos</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">${(stats.totalCommissions / stats.totalUsers).toFixed(2)}</div>
                <div className="text-sm text-yellow-700">Promedio por Usuario</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">📈 Estructura MLM</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Nivel 1 (Directos):</span>
                    <span className="font-medium">$3.50 USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Niveles 2-5:</span>
                    <span className="font-medium">$1.00 USD c/u</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Total Distribuido:</span>
                    <span>$7.50 USD</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">🏆 Top Referidores</h4>
                <div className="space-y-2">
                  {mockUsers.sort((a, b) => b.commissions - a.commissions).slice(0, 3).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 bg-yellow-500 rounded-full text-white text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span>{user.name}</span>
                      </div>
                      <span className="font-medium">${user.commissions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const AdminWrapper: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si ya está autenticado al cargar
  useEffect(() => {
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (credentials: { username: string; password: string }) => {
    // En un entorno real, aquí se verificarían las credenciales con el backend
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Verificando autenticación...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="relative">
      {/* Botón de logout flotante */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="flex items-center space-x-2 shadow-lg"
        >
          <span>🚪</span>
          <span>Cerrar Sesión</span>
        </Button>
      </div>

      {/* Dashboard Simplificado */}
      <AdminDashboardSimple />
    </div>
  );
};
