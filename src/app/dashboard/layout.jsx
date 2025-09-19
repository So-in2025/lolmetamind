// src/app/dashboard/layout.jsx
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
    // Si el AuthContext ya terminó de cargar, podemos tomar una decisión.
    if (!auth.loading) {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');

      // Si hay un token en la URL y aún no estamos autenticados, lo procesamos.
      if (tokenFromUrl && !auth.isAuthenticated) {
        // En un escenario real, aquí se llamaría a una API para validar el token y obtener los datos del usuario.
        // Simulamos esta llamada para usar el token.
        console.log('Token encontrado en la URL. Procesando inicio de sesión...');
        
        // Asumimos que tienes una API que devuelve el usuario a partir del token.
        // Si no, necesitarías implementarla.
        const mockUserData = { id: 1, username: 'Usuario Google', email: 'user@gmail.com' };
        auth.login(mockUserData, tokenFromUrl);
        
        // Limpiamos la URL para evitar problemas
        router.replace('/dashboard', undefined, { shallow: true });

      } else if (!auth.isAuthenticated) {
        // Si no hay token en la URL y no está autenticado, redirigimos
        router.push('/login');
      }
    }
  }, [auth, router]);

  // Mientras el estado se está cargando o autenticando, mostramos un spinner
  if (auth.loading) {
    return (
      <div className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light flex items-center justify-center">
        <p className="animate-pulse">Verificando sesión...</p>
      </div>
    );
  }

  // Después de la carga, si no hay autenticación, simplemente no renderizamos nada,
  // el useEffect se encargará de la redirección.
  if (!auth.isAuthenticated) {
    return null;
  }

  // Si la carga terminó y el usuario está autenticado, renderizamos el contenido
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