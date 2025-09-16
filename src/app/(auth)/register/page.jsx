'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const router = useRouter();

  const onSubmit = async (data) => {
    setError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        alert('¡Registro exitoso! Ahora serás dirigido a la página de inicio de sesión.');
        router.push('/login');
      } else {
        setError(result.error || 'Ocurrió un error inesperado durante el registro.');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor. Por favor, inténtalo de nuevo más tarde.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-lol-blue-dark p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full max-w-md border-2 border-lol-gold-dark"
      >
        <div className="text-center mb-8">
            <h1 className="text-5xl font-display text-lol-blue-accent mb-2 text-shadow-lg">
              LoL MetaMind
            </h1>
            <p className="text-lol-gold-light/80">Crea tu cuenta para empezar a dominar.</p>
        </div>

        {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-6">{error}</p>}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-lol-gold">Username</label>
            <input
              {...register('username', { required: 'El nombre de usuario es requerido' })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent transition-all"
            />
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-lol-gold">Email</label>
            <input
              type="email"
              {...register('email', { required: 'El email es requerido' })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent transition-all"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-lol-gold">Contraseña</label>
            <input
              type="password"
              {...register('password', { required: 'La contraseña es requerida' })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent transition-all"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 rounded-lg transition-colors duration-300 shadow-lg shadow-lol-blue-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creando Cuenta...' : 'Crear Cuenta'}
          </button>
        </form>
        <p className="text-center text-sm mt-6 text-lol-gold-light/70">
          ¿Ya tienes una cuenta? <Link href="/login" className="font-bold text-lol-blue-accent hover:underline">Inicia Sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}