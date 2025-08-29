'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    sponsorCode: '',
  });
  const [error, setError] = useState('');
  const { register, state } = useApp();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateSponsorCode = (code: string): string | null => {
    if (!code) return null; // Código de sponsor es opcional

    const sponsor = state.users.find(u => u.username === code || u.id === code);
    return sponsor ? sponsor.id : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.email || !formData.username || !formData.firstName ||
        !formData.lastName || !formData.password || !formData.confirmPassword) {
      setError('Por favor, completa todos los campos obligatorios');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Verificar que el email no esté registrado
    const existingUser = state.users.find(u => u.email === formData.email);
    if (existingUser) {
      setError('Este email ya está registrado');
      return;
    }

    // Verificar que el username no esté registrado
    const existingUsername = state.users.find(u => u.username === formData.username);
    if (existingUsername) {
      setError('Este nombre de usuario ya está en uso');
      return;
    }

    // Validar código de sponsor si se proporciona
    let sponsorId: string | undefined;
    if (formData.sponsorCode) {
      sponsorId = validateSponsorCode(formData.sponsorCode) || undefined;
      if (!sponsorId) {
        setError('Código de referido inválido');
        return;
      }
    }

    const userData = {
      email: formData.email,
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      sponsorId,
      password: formData.password,
    };

    const success = await register(userData);
    if (!success) {
      setError('Error al crear la cuenta');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
        <CardDescription className="text-center">
          Únete a nuestra plataforma de videochats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Juan"
                value={formData.firstName}
                onChange={handleChange}
                disabled={state.auth.isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Pérez"
                value={formData.lastName}
                onChange={handleChange}
                disabled={state.auth.isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario *</Label>
            <Input
              id="username"
              name="username"
              placeholder="mi_usuario"
              value={formData.username}
              onChange={handleChange}
              disabled={state.auth.isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={state.auth.isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsorCode">Código de Referido</Label>
            <Input
              id="sponsorCode"
              name="sponsorCode"
              placeholder="Opcional - Usuario que te invitó"
              value={formData.sponsorCode}
              onChange={handleChange}
              disabled={state.auth.isLoading}
            />
            <p className="text-xs text-gray-500">
              Si alguien te invitó, ingresa su nombre de usuario
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={state.auth.isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            {state.auth.isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-center text-sm text-gray-600 w-full">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:underline font-medium"
          >
            Inicia sesión aquí
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};
