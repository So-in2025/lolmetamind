'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import EpicButton from '@/components/landing/EpicButton';

// ... (UserProfile componente se mantiene igual)
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
        console.log('Token encontrado en la URL. Intentando autenticar...');
        
        try {
          const response = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
          });
          
          if (!response.ok) {
            // Si la API devuelve un error (ej. 401 Token Inválido), lo lanzamos.
            throw new Error(`Error de verificación de token: ${response.status}`);
          }
          
          const userData = await response.json();
          auth.login(userData, tokenFromUrl); 
          
          // Autenticación exitosa: Limpiar la URL sin recargar.
          router.replace('/dashboard', { shallow: true }); 
          
        } catch (error) {
          console.error("Error al iniciar sesión con token:", error.message);
          
          // **ESTE ES EL CAMBIO CLAVE:** // 1. Limpiamos la URL primero para quitar el token que falló.
          router.replace('/', { shallow: true }); 
          
          // 2. Redirigimos forzosamente al inicio para reintentar el login.
          // Lo hacemos después de limpiar la URL, aunque router.push('/') es suficiente.
          // En este caso, si ya estamos en /, el replace lo mantiene.
        }
      } 
      // 2. Si ya estoy autenticado y hay un token en la URL (p.ej. después de un refresh)
      else if (tokenFromUrl && auth.isAuthenticated) {
         router.replace('/dashboard', { shallow: true });
      }
      // 3. Fallback: Si no hay token en la URL y NO estoy autenticado, redirigir a inicio
      else if (!tokenFromUrl && !auth.isAuthenticated) {
        router.push('/');
      }
    };

    // Solo se ejecuta si el estado de AuthContext ha terminado de cargar su estado inicial
    if (!auth.loading) {
      processLogin();
    }
  }, [auth, router]);

  // ... (El manejo del estado de carga se mantiene igual)
  if (auth.loading || (!auth.isAuthenticated && new URLSearchParams(window.location.search).get('token'))) {
    return (
      <div className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light flex items-center justify-center">
        <p className="animate-pulse">Verificando sesión...</p>
      </div>
    );
  }

  // Cargar Dashboard
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