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

      // 1. Caso principal: Recibir token de la URL e intentar autenticar
      if (tokenFromUrl && !auth.isAuthenticated) {
        console.log('Token encontrado en la URL. Obteniendo datos reales del usuario...');
        try {
          const response = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
          });
          
          if (!response.ok) throw new Error('No se pudo verificar el token o el usuario. Redirigiendo al login.');
          
          const userData = await response.json();
          // Llama a login, lo que guarda el token y el usuario en el contexto/localStorage
          auth.login(userData, tokenFromUrl); 
          
          // Limpiar la URL sin recargar, manteniendo al usuario en /dashboard
          router.replace('/dashboard', undefined, { shallow: true }); 
          
        } catch (error) {
          console.error("Error al iniciar sesión con token:", error);
          // Si la verificación falla (e.g., token caducado o inválido), redirige al inicio
          router.push('/'); 
        }
      } 
      // 2. Caso de limpieza: Si hay token en URL, pero ya estoy autenticado, limpio la URL.
      else if (tokenFromUrl && auth.isAuthenticated) {
         router.replace('/dashboard', undefined, { shallow: true });
      }
      // 3. Caso de fallback: Si no hay token en la URL y NO estoy autenticado (ej. usuario escribe la URL /dashboard)
      else if (!tokenFromUrl && !auth.isAuthenticated) {
        router.push('/');
      }
    };

    if (!auth.loading) {
      processLogin();
    }
  }, [auth, router]);

  // Esto hace que la página muestre "Verificando sesión..." si el proceso no ha terminado.
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