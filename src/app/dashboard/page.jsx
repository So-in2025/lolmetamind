'use client';
import { useAuth } from '@/context/AuthContext';
import ProfileFlowForm from '@/components/forms/ProfileFlowForm'; // Importamos el nuevo componente unificado
import WeeklyChallenges from '@/components/WeeklyChallenges';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, login } = useAuth();

  const handleProfileUpdate = (updatedUserData) => {
    const token = localStorage.getItem('authToken');
    login(updatedUserData, token);
    // Forzamos un refresh de la página para asegurar que todos los componentes reciban el nuevo estado.
    // Es la solución más robusta para asegurar la transición de la UI.
    window.location.reload();
  };

  const hasSummonerProfile = user && user.riot_id_name;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="w-full lg:w-2/3 flex flex-col items-center">
        {/* Renderizamos el nuevo componente unificado, pasándole el estado y la función de actualización */}
        <ProfileFlowForm
          hasProfile={hasSummonerProfile}
          onProfileUpdate={handleProfileUpdate}
          currentUser={user}
        />
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