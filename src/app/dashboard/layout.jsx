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

  // useEffect para leer el token de la URL y loguear al usuario
  useEffect(() => {
    // Si el AuthContext está cargando, aún no hacemos nada
    if (auth && !auth.loading) {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            // Llamamos a la API para obtener los datos del usuario con el token
            fetch('/api/user/me', {
                headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
            })
            .then(res => res.json())
            .then(userData => {
                if (userData) {
                    auth.login(userData, tokenFromUrl);
                    // Limpiamos el token de la URL para que no quede visible
                    router.replace('/dashboard', undefined, { shallow: true });
                }
            })
            .catch(error => {
                console.error('Error fetching user data after Google login:', error);
                auth.logout();
                router.replace('/login');
            });
        } else if (!auth.isAuthenticated) {
            // Si ya no hay token en la URL y no está autenticado, lo redirigimos
            router.push('/login');
        }
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
  
  // Si la carga terminó y el usuario no está autenticado, no renderizamos el contenido
  if (!auth.isAuthenticated) {
    return null;
  }

  // Si la carga terminó y el usuario está autenticado, renderizamos el dashboard
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