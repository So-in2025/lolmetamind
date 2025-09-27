'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import EpicButton from '@/components/landing/EpicButton';

function UserProfile() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        auth.logout();
        router.push('/');
    };

    if (!auth || !auth.user) return null;

    return (
        <div className="flex items-center space-x-4">
            <span className="text-lol-gold-light">Bienvenido, <strong className="font-bold text-lol-blue-accent">{auth.user.username}</strong></span>
            <EpicButton onClick={handleLogout} className="text-xs py-1 px-3">
                Salir
            </EpicButton>
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

      // 1. Recibir token de la URL e intentar autenticar
      if (tokenFromUrl && !auth.isAuthenticated) {
        console.log('Token encontrado en la URL. Obteniendo datos reales del usuario...');
        try {
          const response = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
          });
          
          if (!response.ok) throw new Error('No se pudo verificar el token o el usuario.');
          
          const userData = await response.json();
          auth.login(userData, tokenFromUrl); 
          
          // FIX: Limpiar la URL y quedarse en el dashboard
          router.replace('/dashboard', { shallow: true }); 
          
        } catch (error) {
          console.error("Error al iniciar sesión con token:", error);
          auth.logout();
          router.push('/'); // Redirige a inicio si la verificación falla
        }
      } 
      // 2. Si ya estoy autenticado y estoy en la URL de token, limpiar el token
      else if (tokenFromUrl && auth.isAuthenticated) {
         router.replace('/dashboard', { shallow: true });
      }
      // 3. Fallback: Si no hay token Y no estoy autenticado, redirigir al inicio
      else if (!tokenFromUrl && !auth.isAuthenticated) {
        router.push('/');
      }
    };

    if (!auth.loading) {
      processLogin();
    }
  }, [auth, router]);

  // Si auth.loading es true, o no está autenticado PERO hay un token en la URL (estado "Verificando sesión")
  if (auth.loading || (!auth.isAuthenticated && new URLSearchParams(window.location.search).get('token'))) {
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