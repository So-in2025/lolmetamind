#!/bin/bash

# ==============================================================================
# SCRIPT FINAL - CREACIÓN DE PÁGINAS DE AUTENTICACIÓN Y FLUJO DE USUARIO
#
# Rol: Frontend Developer
# Objetivo: 1. Crear las páginas de UI para /login y /register.
#           2. Conectar los formularios al AuthContext para un manejo de sesión completo.
#           3. Finalizar el flujo de registro del usuario.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la creación de las páginas de autenticación...${NC}"

# --- 1. Crear las páginas de Login y Registro ---
echo -e "\n${GREEN}Paso 1: Creando directorios y páginas para Login y Registro...${NC}"
mkdir -p src/app/'(auth)'/login
mkdir -p src/app/'(auth)'/register

# Crear la página de Login: src/app/(auth)/login/page.jsx
cat << 'EOF' > src/app/'(auth)'/login/page.jsx
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
EOF
echo "Creado: src/app/(auth)/login/page.jsx"

# Crear la página de Registro: src/app/(auth)/register/page.jsx
cat << 'EOF' > src/app/'(auth)'/register/page.jsx
'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

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
        alert('¡Registro exitoso! Ahora inicia sesión.');
        router.push('/login');
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
        <h1 className="text-4xl font-display text-lol-blue-accent text-center mb-6">Crear Cuenta</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              {...register('username', { required: 'Nombre de usuario es requerido' })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
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
            {isSubmitting ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        <p className="text-center mt-4">
          ¿Ya tienes cuenta? <Link href="/login" className="text-lol-blue-accent hover:underline">Inicia Sesión</Link>
        </p>
      </div>
    </div>
  );
}
EOF
echo "Creado: src/app/(auth)/register/page.jsx"

# --- 2. Modificar la página principal para una mejor UX ---
echo -e "\n${GREEN}Paso 2: Añadiendo enlace de 'Login' a la página principal 'src/app/page.jsx'...${NC}"
sed -i.bak 's|<PricingPlans />|<PricingPlans />\
\
      <div className="mt-8 text-center">\
        <p className="text-lol-gold-light/70">\
          ¿Ya tienes una cuenta?{\\ } \
          <Link href="/login" className="text-lol-blue-accent font-bold hover:underline">\
            Inicia sesión aquí\
          </Link>\
        </p>\
      </div>|' src/app/page.jsx
rm src/app/page.jsx.bak
echo "Actualizado: src/app/page.jsx"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN DEFINITIVA APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de la Solución:${NC}"
echo -e "1.  **Páginas Creadas:** Se han generado los archivos para las rutas '/login' y '/register', que antes no existían."
echo -e "2.  **Flujo Conectado:** Los formularios de estas páginas ahora se comunican con tus APIs de backend y utilizan el 'AuthContext' para gestionar la sesión del usuario."
echo -e "3.  **UX Mejorada:** Se añadió un enlace directo para 'Iniciar Sesión' en la página principal."
echo -e "\n**Acción Final:** Haz 'commit' y 'push' de estos cambios. Ahora, cuando un usuario haga clic en 'Empezar Gratis', será llevado a una página de registro funcional, completando el flujo."
echo -e "\n¡Misión cumplida, ingeniero! El sistema está completo."