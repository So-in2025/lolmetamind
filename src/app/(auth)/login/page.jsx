'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const onSubmit = async (data) => {
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        login(result.user, result.token);
        router.push('/dashboard');
      } else {
        setError(result.error || 'Ocurrió un error inesperado');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor. Inténtalo de nuevo más tarde.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lol-blue-dark">
      <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full max-w-md border-2 border-lol-gold-dark">
        <h1 className="text-4xl font-display text-lol-blue-accent text-center mb-6">Iniciar Sesión</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              {...register('email', { required: 'Email es requerido' })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <input
              type="password"
              {...register('password', { required: 'Contraseña es requerida' })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center mt-4">
          ¿No tienes cuenta? <Link href="/register" className="text-lol-blue-accent hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
