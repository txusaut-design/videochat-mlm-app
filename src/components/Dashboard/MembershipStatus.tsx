'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { PaymentDialog } from './PaymentDialog';

export const MembershipStatus: React.FC = () => {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { state, getMembershipStatus } = useApp();

  // Verificar si el usuario existe
  if (!state.auth.user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Error: No hay usuario logueado</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recargar página
          </Button>
        </div>
      </div>
    );
  }

  const user = state.auth.user;
  const isActiveMember = getMembershipStatus(user.id);

  const daysRemaining = user.membershipExpiry ?
    Math.max(0, Math.ceil((new Date(user.membershipExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) :
    0;

  const userPayments = state.payments.filter(p => p.userId === user.id);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Estado de Membresía</h2>

      {/* Status Card */}
      <Card className={`border-2 ${isActiveMember ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Tu Membresía</CardTitle>
            <Badge variant={isActiveMember ? "default" : "destructive"} className="text-sm">
              {isActiveMember ? "ACTIVA" : "INACTIVA"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Información de Membresía</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-semibold ${isActiveMember ? 'text-green-600' : 'text-red-600'}`}>
                    {isActiveMember ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Precio mensual:</span>
                  <span className="font-semibold">$10 USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duración:</span>
                  <span className="font-semibold">28 días</span>
                </div>
                {user.membershipExpiry && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expira:</span>
                      <span className="font-semibold">
                        {new Date(user.membershipExpiry).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Días restantes:</span>
                      <span className={`font-semibold ${daysRemaining <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                        {daysRemaining} días
                      </span>
                    </div>
                  </>
                )}
                {!user.membershipExpiry && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="font-semibold text-red-600">Sin membresía</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Beneficios de la Membresía</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Acceso a todas las salas de videochat
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Crear salas personalizadas (hasta 10 usuarios)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Participar en el programa de afiliados
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Recibir comisiones de tu red MLM
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Soporte técnico prioritario
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            {!isActiveMember ? (
              <Button onClick={() => setPaymentOpen(true)} size="lg" className="bg-green-600 hover:bg-green-700">
                Activar Membresía - $10 USD
              </Button>
            ) : daysRemaining <= 7 ? (
              <Button onClick={() => setPaymentOpen(true)} size="lg" className="bg-orange-600 hover:bg-orange-700">
                Renovar Membresía - $10 USD
              </Button>
            ) : (
              <Button onClick={() => setPaymentOpen(true)} size="lg" variant="outline">
                Extender Membresía - $10 USD
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {userPayments.length > 0 ? (
            <div className="space-y-3">
              {userPayments
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(payment => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">${payment.amount} {payment.currency}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString()} -
                        Membresía extendida por {payment.membershipExtension} días
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        TX: {payment.transactionHash.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No tienes pagos registrados aún</p>
              <p className="text-sm">¡Activa tu membresía para empezar!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Program Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Programa de Referidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-blue-800">
              ¡Comparte tu código de referido y gana $1 USD por cada nivel de tu red!
            </p>

            <div className="bg-white p-4 rounded-lg border">
              <Label className="text-sm font-medium text-gray-700">Tu código de referido:</Label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded font-mono text-sm flex-1">
                  {user.username}
                </code>
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(user.username)}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="text-sm text-blue-700">
              <p className="font-semibold">Estructura de comisiones (5 niveles):</p>
              <ul className="mt-2 space-y-1">
                <li>• <strong>Nivel 1 (Referidos directos): $3.5 USD</strong> por pago</li>
                <li>• Nivel 2: $1 USD por pago</li>
                <li>• Nivel 3: $1 USD por pago</li>
                <li>• Nivel 4: $1 USD por pago</li>
                <li>• Nivel 5: $1 USD por pago</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="font-semibold">💡 Recordatorio:</p>
                <p>Cada membresía tiene una duración de <strong>28 días</strong> por $10 USD</p>
                <p className="text-green-700 font-semibold">Total distribuido: $7.5 USD por cada pago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </div>
  );
};
