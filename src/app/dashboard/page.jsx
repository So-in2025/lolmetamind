'use client';
import { useAuth } from '@/context/AuthContext';
import SummonerProfileForm from '@/components/forms/SummonerProfileForm';
import ProfileForm from '@/components/forms/ProfileForm';
import WeeklyChallenges from '@/components/WeeklyChallenges';
import Link from 'next/link';

export default function DashboardPage() {
  // Obtenemos el usuario y la función de login directamente del contexto.
  // No usaremos un estado local 'currentUser' para evitar problemas de sincronización.
  const { user, login } = useAuth();

  // Esta función se pasa al formulario. Cuando se ejecuta, actualiza el contexto.
  const handleProfileUpdate = (updatedUserData) => {
    const token = localStorage.getItem('authToken');
    // Al llamar a login, el 'user' del contexto cambiará,
    // y cualquier componente que use 'useAuth()' se volverá a renderizar.
    login(updatedUserData, token);
  };

  // La decisión de qué mostrar se basa directamente en el 'user' del contexto.
  const hasSummonerProfile = user && user.riot_id_name;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="w-full lg:w-2/3 flex flex-col items-center">
        {hasSummonerProfile ? (
          <>
            <div className="w-full max-w-lg mb-8 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-lol-blue-accent mb-4">
                Tu Centro de Mando
              </h2>
              <p className="text-lg text-lol-gold-light/90">
                Selecciona tu signo zodiacal para recibir un análisis instantáneo de la IA.
              </p>
            </div>
            <div className="w-full max-w-lg">
              {/* Le pasamos el usuario directamente desde el contexto */}
              <ProfileForm currentUser={user} />
            </div>
          </>
        ) : (
          <div className="w-full max-w-lg">
            <SummonerProfileForm onProfileUpdate={handleProfileUpdate} />
          </div>
        )}
      </div>
      <div className="w-full lg:w-1/3 flex flex-col items-center mt-0 lg:mt-12">
        <div className="w-full max-w-lg">
          <WeeklyChallenges />
          <div className="mt-8 text-center bg-lol-blue-medium p-6 rounded-xl shadow-lg border-2 border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold" target="_blank">
              Abrir el widget de OBS »
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}