'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useApp } from '@/contexts/AppContext';
import { RoomList } from './RoomList';
import { CreateRoomDialog } from './CreateRoomDialog';
import { MembershipStatus } from './MembershipStatus';
import { MLMStats } from './MLMStats';
import { PaymentDialog } from './PaymentDialog';

export const Dashboard: React.FC = () => {
  const { state, logout, getMembershipStatus } = useApp();
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const user = state.auth.user!;
  const isActiveMember = getMembershipStatus(user.id);
  const userInitials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">VideoChat MLM</h1>
              <Badge variant={isActiveMember ? "default" : "destructive"}>
                {isActiveMember ? "Membresía Activa" : "Membresía Inactiva"}
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Ganancias: <span className="font-semibold text-green-600">${user.totalEarnings}</span>
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={handleLogout}>
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rooms">Salas de Chat</TabsTrigger>
            <TabsTrigger value="membership">Membresía</TabsTrigger>
            <TabsTrigger value="mlm">Red MLM</TabsTrigger>
            <TabsTrigger value="earnings">Ganancias</TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">Salas de Videochat</h2>
              <Button onClick={() => setCreateRoomOpen(true)}>
                Crear Nueva Sala
              </Button>
            </div>

            {!isActiveMember && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-800">Membresía Requerida</h3>
                      <p className="text-yellow-600">
                        Necesitas una membresía activa para unirte a las salas de videochat
                      </p>
                    </div>
                    <Button onClick={() => setPaymentOpen(true)} className="bg-yellow-600 hover:bg-yellow-700">
                      Activar Membresía
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <RoomList />
          </TabsContent>

          <TabsContent value="membership">
            <MembershipStatus />
          </TabsContent>

          <TabsContent value="mlm">
            <MLMStats />
          </TabsContent>

          <TabsContent value="earnings">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Historial de Ganancias</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ganancias Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">${user.totalEarnings}</div>
                    <p className="text-sm text-gray-500">Acumulado desde el registro</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Comisiones Este Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ${state.commissions
                        .filter(c => c.toUserId === user.id &&
                          new Date(c.createdAt).getMonth() === new Date().getMonth())
                        .reduce((sum, c) => sum + c.amount, 0)}
                    </div>
                    <p className="text-sm text-gray-500">Comisiones MLM recibidas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Red Activa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {state.users.filter(u => u.sponsorId === user.id).length}
                    </div>
                    <p className="text-sm text-gray-500">Referidos directos</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Últimas Comisiones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {state.commissions
                      .filter(c => c.toUserId === user.id)
                      .slice(0, 10)
                      .map(commission => {
                        const fromUser = state.users.find(u => u.id === commission.fromUserId);
                        return (
                          <div key={commission.id} className="flex justify-between items-center py-2 border-b">
                            <div>
                              <p className="font-medium">
                                Comisión Nivel {commission.level}
                              </p>
                              <p className="text-sm text-gray-500">
                                De: {fromUser?.firstName} {fromUser?.lastName}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">+${commission.amount}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(commission.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                    {state.commissions.filter(c => c.toUserId === user.id).length === 0 && (
                      <p className="text-gray-500 text-center py-8">
                        No has recibido comisiones aún. ¡Invita a más usuarios para empezar a ganar!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">🎉 ¡Comisiones Distribuidas!</h4>
                <p className="text-sm text-blue-700">
                  Las comisiones de $7.5 USD han sido automáticamente distribuidas
                  a los 5 niveles superiores de tu red MLM:
                </p>
                <ul className="text-xs text-blue-600 mt-2 space-y-1">
                  <li>• Nivel 1: $3.5 USD (referido directo)</li>
                  <li>• Niveles 2-5: $1 USD cada uno</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <CreateRoomDialog
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </div>
  );
};
