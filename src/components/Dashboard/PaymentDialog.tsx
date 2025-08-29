'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STABLECOINS = [
  { symbol: 'USDT', name: 'Tether USD', network: 'TRC20' },
  { symbol: 'USDC', name: 'USD Coin', network: 'ERC20' },
  { symbol: 'BUSD', name: 'Binance USD', network: 'BEP20' },
];

const DEMO_WALLETS = {
  USDT: 'TQrZ4seYeiFQYWqCd9cFmwL4Bj9MzUzYH8',
  USDC: '0x742d35Cc6634C0532925a3b8D75a4F676b1D9D8',
  BUSD: 'bnb1g5p04snezgpky203fq5da9qnur8q2hsnzwzsvc',
};

export const PaymentDialog: React.FC<PaymentDialogProps> = ({ open, onOpenChange }) => {
  const [selectedCoin, setSelectedCoin] = useState<string>('USDT');
  const [transactionHash, setTransactionHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'payment' | 'confirm'>('select');
  const { processPayment, state } = useApp();

  const user = state.auth.user!;
  const selectedStablecoin = STABLECOINS.find(coin => coin.symbol === selectedCoin)!;
  const walletAddress = DEMO_WALLETS[selectedCoin as keyof typeof DEMO_WALLETS];

  const handleCoinSelect = (coin: string) => {
    setSelectedCoin(coin);
    setStep('payment');
  };

  const handlePaymentSubmit = async () => {
    if (!transactionHash.trim()) {
      alert('Por favor, ingresa el hash de la transacción');
      return;
    }

    if (transactionHash.length < 10) {
      alert('El hash de transacción parece inválido');
      return;
    }

    setIsProcessing(true);

    // Simular verificación de transacción
    setTimeout(() => {
      processPayment(user.id, 10, selectedCoin, transactionHash);
      setIsProcessing(false);
      setStep('confirm');
    }, 2000);
  };

  const handleClose = () => {
    setStep('select');
    setTransactionHash('');
    setIsProcessing(false);
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Dirección copiada al portapapeles');
  };

  const generateDemoHash = () => {
    const hash = '0x' + Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15);
    setTransactionHash(hash);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Activar/Renovar Membresía - $10 USD</DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Selecciona tu Stablecoin</h3>
              <p className="text-gray-600">Elige la criptomoneda con la que deseas pagar</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {STABLECOINS.map(coin => (
                <Card
                  key={coin.symbol}
                  className="cursor-pointer hover:shadow-md border-2 hover:border-blue-300 transition-all"
                  onClick={() => handleCoinSelect(coin.symbol)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {coin.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{coin.symbol}</h4>
                          <p className="text-sm text-gray-600">{coin.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{coin.network}</Badge>
                        <p className="text-sm text-gray-600 mt-1">$10.00 USD</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Información del Pago</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Costo: $10 USD en stablecoins</li>
                <li>• Duración: 28 días de membresía</li>
                <li>• Beneficios: Acceso completo + comisiones MLM</li>
                <li>• <strong>Distribución: $7.5 USD en comisiones (5 niveles)</strong></li>
                <li>• Procesamiento: Automático tras confirmación</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Envía {selectedStablecoin.symbol} a esta dirección
              </h3>
              <Badge variant="outline" className="mb-4">{selectedStablecoin.network}</Badge>
            </div>

            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-xs text-gray-500 mb-2">Dirección de la wallet:</div>
                    <code className="text-sm font-mono break-all">{walletAddress}</code>
                  </div>

                  <Button
                    onClick={() => copyToClipboard(walletAddress)}
                    variant="outline"
                    size="sm"
                  >
                    📋 Copiar Dirección
                  </Button>

                  <div className="text-center">
                    <div className="text-lg font-semibold">Cantidad a enviar:</div>
                    <div className="text-2xl font-bold text-green-600">10.00 {selectedStablecoin.symbol}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="txHash">Hash de la Transacción *</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="txHash"
                    placeholder="0x..."
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={generateDemoHash}
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                  >
                    Demo
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa el hash de tu transacción después de enviar el pago
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Instrucciones Importantes</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>1. Envía exactamente 10.00 {selectedStablecoin.symbol}</li>
                  <li>2. Usa la red {selectedStablecoin.network}</li>
                  <li>3. Copia el hash de transacción</li>
                  <li>4. Pégalo en el campo de arriba</li>
                  <li>5. Confirma el pago</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="text-center space-y-6">
            <div className="text-green-600 text-6xl">✓</div>
            <div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                ¡Pago Confirmado!
              </h3>
              <p className="text-gray-600">
                Tu membresía ha sido activada/renovada por 28 días
              </p>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Método de pago:</span>
                    <span className="font-semibold">{selectedStablecoin.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cantidad:</span>
                    <span className="font-semibold">$10.00 USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hash de transacción:</span>
                    <span className="font-mono text-xs">{transactionHash.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <Badge className="bg-green-600">Confirmado</Badge>
                  </div>
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
                <li>• <strong>Nivel 1: $3.5 USD</strong> (referido directo)</li>
                <li>• Niveles 2-5: $1 USD cada uno</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'payment' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Atrás
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                disabled={!transactionHash.trim() || isProcessing}
              >
                {isProcessing ? 'Verificando...' : 'Confirmar Pago'}
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <Button onClick={handleClose}>
              Continuar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
