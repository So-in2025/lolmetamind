'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function UserProfile() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        auth.logout();
        // CAMBIO CLAVE: Redirigir a la página principal en lugar de /login
        router.push('/');
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
    const processLogin = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');

      if (tokenFromUrl && !auth.isAuthenticated) {
        console.log('Token encontrado en la URL. Obteniendo datos reales del usuario...');
        try {
          const response = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
          });
          if (!response.ok) throw new Error('No se pudo verificar el token');
          
          const userData = await response.json();
          auth.login(userData, tokenFromUrl);
          router.replace('/dashboard', undefined, { shallow: true });
        } catch (error) {
          console.error("Error al iniciar sesión con token:", error);
          auth.logout();
          router.push('/');
        }
      } else if (!auth.isAuthenticated) {
        router.push('/');
      }
    };

    if (!auth.loading) {
      processLogin();
    }
  }, [auth, router]);

  if (auth.loading || !auth.isAuthenticated) {
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