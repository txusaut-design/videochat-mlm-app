'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PermissionsDialogProps {
  onPermissionsGranted: () => void;
  onCancel: () => void;
}

export const PermissionsDialog: React.FC<PermissionsDialogProps> = ({
  onPermissionsGranted,
  onCancel
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a cámara y micrófono');
      }

      // Solicitar permisos
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Detener el stream inmediatamente (solo necesitábamos los permisos)
      stream.getTracks().forEach(track => track.stop());

      onPermissionsGranted();
    } catch (err: any) {
      let errorMessage = 'Error al obtener permisos de cámara y micrófono';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permisos denegados. Por favor, permite el acceso a cámara y micrófono.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró cámara o micrófono en tu dispositivo.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta acceso a cámara y micrófono.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Acceso bloqueado por seguridad. Asegúrate de usar HTTPS.';
      }

      setError(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center">
            <span className="text-2xl">📹</span>
          </div>
          <CardTitle className="text-xl">Permisos de Cámara y Micrófono</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center text-gray-300">
            <p className="mb-4">
              Para participar en la videollamada, necesitamos acceso a tu cámara y micrófono.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
              <span className="text-2xl">📹</span>
              <div>
                <h4 className="font-semibold">Cámara</h4>
                <p className="text-sm text-gray-400">Para mostrar tu video a otros participantes</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
              <span className="text-2xl">🎤</span>
              <div>
                <h4 className="font-semibold">Micrófono</h4>
                <p className="text-sm text-gray-400">Para que otros puedan escucharte</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <h4 className="font-semibold text-blue-200 mb-2">💡 Información importante:</h4>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Puedes activar/desactivar tu cámara y micrófono en cualquier momento</li>
              <li>• Tus datos no se graban ni almacenan</li>
              <li>• Solo los participantes de la sala pueden verte y escucharte</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={requestPermissions}
              disabled={isRequesting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Solicitando permisos...
                </>
              ) : (
                'Permitir acceso a cámara y micrófono'
              )}
            </Button>

            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isRequesting}
            >
              Cancelar
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Si ya otorgaste permisos pero sigue apareciendo este mensaje,
            verifica la configuración de tu navegador o recarga la página.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
