// src/app/dashboard/layout.jsx
'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function UserProfile() {
    // El hook useAuth ahora puede devolver null inicialmente
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            auth.logout();
            router.push('/login');
        }
    };

    // Si auth o auth.user no existen, no renderizamos nada
    if (!auth || !auth.user) return null;

    return (
        <div className="flex items-center space-x-4">
            <span className="text-lol-gold-light">Bienvenido, <strong className="font-bold text-lol-blue-accent">{auth.user.username}</strong></span>
            <button
                onClick={handleLogout}
                className="bg-lol-gold-dark hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
                Salir
            </button>
        </div>
    );
}

export default function DashboardLayout({ children }) {
  const auth = useAuth();
  const router = useRouter();

  // El useEffect solo se ejecuta en el cliente, por lo que auth ya estará definido
  useEffect(() => {
    if (auth && !auth.loading && !auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth, router]);

  // Durante el build o la carga inicial, auth puede ser null o estar cargando
  if (!auth || auth.loading || !auth.isAuthenticated) {
    return (
        <div className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light flex items-center justify-center">
            <p className="animate-pulse">Verificando sesión...</p>
        </div>
    );
  }

  return (
    <section className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light font-body">
      <header className="bg-lol-blue-medium p-4 border-b-2 border-lol-gold-dark flex justify-between items-center">
        <h1 className="text-2xl font-display text-lol-gold text-center">
          LoL MetaMind Dashboard
        </h1>
        <UserProfile />
      </header>
      <main className="p-4 sm:p-8">
        {children}
      </main>
    </section>
  );
}
