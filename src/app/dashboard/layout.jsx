'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function UserProfile() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            auth.logout();
            router.push('/login');
        }
    };

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

  useEffect(() => {
    // Si la carga ha terminado y no estás autenticado, redirigimos
    if (auth && !auth.loading && !auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth, router]);

  // Si el contexto está en estado de carga (loading es true), mostramos un spinner
  if (!auth || auth.loading) {
    return (
        <div className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light flex items-center justify-center">
            <p className="animate-pulse">Verificando sesión...</p>
        </div>
    );
  }
  
  // Después de la carga, si no está autenticado, no renderizamos nada (el useEffect hará la redirección)
  if (!auth.isAuthenticated) {
    return null;
  }

  // Si la carga terminó y está autenticado, renderizamos el contenido
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