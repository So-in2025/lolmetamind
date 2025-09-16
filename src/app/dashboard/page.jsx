import ProfileForm from '@/components/forms/ProfileForm'
import WeeklyChallenges from '@/components/WeeklyChallenges'
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">

      {/* Columna de la izquierda: Formulario y Contenido Principal */}
      <div className="w-full lg:w-1/2 flex flex-col items-center">
        <div className="w-full max-w-lg mb-8 text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-lol-blue-accent mb-4 text-shadow-lg">
              Tu Centro de Mando
            </h2>
            <p className="text-lg md:text-xl text-lol-gold-light/90">
              Usa el formulario para obtener un análisis instantáneo o revisa tus retos semanales.
            </p>
        </div>
        <div className="w-full max-w-lg">
          <ProfileForm />
        </div>
      </div>

      {/* Columna de la derecha: Módulos adicionales como Gamificación */}
      <div className="w-full lg:w-1/2 flex flex-col items-center mt-0 lg:mt-24">
        <div className="w-full max-w-lg">
          <WeeklyChallenges />
          <div className="mt-8 text-center bg-lol-blue-medium p-6 rounded-xl shadow-lg border-2 border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold transition-colors duration-300" target="_blank">
              Abrir el widget de OBS en una nueva pestaña »
            </Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
