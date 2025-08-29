'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApp } from '@/contexts/AppContext';

export const MLMStats: React.FC = () => {
  const { state, getMembershipStatus } = useApp();

  const user = state.auth.user!;
  // For now, use a simple approach to get downline users
  const downlineUsers = state.users.filter((u: any) => u.sponsorId === user.id);

  // Organizar por niveles
  const levelStats = Array.from({ length: 5 }, (_, i) => {
    const level = i + 1;
    const levelUsers = downlineUsers.filter((u: any) => {
      // Calcular el nivel del usuario en la estructura
      let currentUser = u;
      let depth = 0;

      while (currentUser && currentUser.sponsorId && depth < 5) {
        depth++;
        if (currentUser.sponsorId === user.id && depth === 1) return level === 1;
        const nextUser = state.users.find((us: any) => us.id === currentUser?.sponsorId);
        if (!nextUser) break;
        currentUser = nextUser;
        if (currentUser.sponsorId === user.id) return level === depth + 1;
      }

      return false;
    });

    return {
      level,
      users: levelUsers,
      activeUsers: levelUsers.filter((u: any) => getMembershipStatus(u.id)),
      monthlyCommissions: state.commissions.filter(c =>
        c.toUserId === user.id &&
        c.level === level &&
        new Date(c.createdAt).getMonth() === new Date().getMonth()
      ).length,
    };
  });

  const totalDownline = downlineUsers.length;
  const activeDownline = downlineUsers.filter(u => getMembershipStatus(u.id)).length;
  const monthlyCommissions = state.commissions
    .filter(c => c.toUserId === user.id &&
      new Date(c.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Tu Red MLM</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Red Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalDownline}</div>
            <p className="text-xs text-gray-500">usuarios en tu red</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeDownline}</div>
            <p className="text-xs text-gray-500">con membresía activa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Comisiones Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${monthlyCommissions}</div>
            <p className="text-xs text-gray-500">ganado en comisiones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tasa de Conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalDownline > 0 ? Math.round((activeDownline / totalDownline) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500">usuarios activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Estructura por Niveles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {levelStats.map(({ level, users, activeUsers, monthlyCommissions }) => (
              <div key={level} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-sm">
                      Nivel {level}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {users.length} usuarios ({activeUsers.length} activos)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      ${monthlyCommissions * (level === 1 ? 3.5 : 1)} este mes
                    </div>
                    <div className="text-xs text-gray-500">
                      ${level === 1 ? '3.5' : '1'} USD por pago
                    </div>
                  </div>
                </div>

                {users.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.slice(0, 6).map(levelUser => {
                      const isActive = getMembershipStatus(levelUser.id);
                      const initials = `${levelUser.firstName[0]}${levelUser.lastName[0]}`.toUpperCase();

                      return (
                        <div key={levelUser.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {levelUser.firstName} {levelUser.lastName}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {users.length > 6 && (
                      <div className="flex items-center justify-center p-2 bg-gray-100 rounded">
                        <span className="text-sm text-gray-600">
                          +{users.length - 6} más
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No tienes usuarios en este nivel aún</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral Instructions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Cómo Construir tu Red</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">📋 Tu Código de Referido</h3>
                <div className="bg-white p-3 rounded border">
                  <code className="text-lg font-mono">{user.username}</code>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Comparte este código con nuevos usuarios
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-blue-800 mb-2">💰 Sistema de Comisiones</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• $1 USD por cada pago de tus referidos</li>
                  <li>• 6 niveles de profundidad</li>
                  <li>• Solo usuarios con membresía activa reciben comisiones</li>
                  <li>• Pagos automáticos en cada renovación</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Estrategias para Crecer tu Red</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                <div>
                  <strong>1. Comparte en Redes Sociales</strong>
                  <p>Publica sobre los beneficios de las videollamadas profesionales</p>
                </div>
                <div>
                  <strong>2. Invita a Colegas</strong>
                  <p>Profesionales que necesiten herramientas de comunicación</p>
                </div>
                <div>
                  <strong>3. Crea Contenido de Valor</strong>
                  <p>Tutoriales sobre videollamadas efectivas</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
