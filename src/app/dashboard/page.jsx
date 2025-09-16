'use client';
import { useAuth } from '@/context/AuthContext';
import SummonerProfileForm from '@/components/forms/SummonerProfileForm';
import ProfileForm from '@/components/forms/ProfileForm';
import WeeklyChallenges from '@/components/WeeklyChallenges';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const auth = useAuth();
  const [currentUser, setCurrentUser] = useState(auth ? auth.user : null);

  useEffect(() => {
    if (auth) {
      setCurrentUser(auth.user);
    }
  }, [auth]);

  const handleProfileUpdate = (updatedUser) => {
    if (auth) {
      const token = localStorage.getItem('authToken');
      // Actualiza el contexto global y el estado local
      auth.login(updatedUser, token); 
      setCurrentUser(updatedUser);
    }
  };

  // Si el contexto aún no carga, no renderizamos nada para evitar el error
  if (!currentUser) {
    return null; // O un spinner de carga
  }

  // CORRECCIÓN: La variable hasSummonerProfile se define correctamente.
  const hasSummonerProfile = currentUser && currentUser.riot_id_name;

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
                Usa el formulario para obtener un análisis instantáneo o revisa tus retos semanales.
              </p>
            </div>
            <div className="w-full max-w-lg">
              <ProfileForm />
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