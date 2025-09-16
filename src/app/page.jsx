import ProfileForm from '@/components/forms/ProfileForm'
import WeeklyChallenges from '@/components/WeeklyChallenges'
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-start items-center p-8 bg-lol-blue-dark text-lol-gold-light font-body">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 mt-12">

        {/* Columna de la izquierda: Formulario y Contenido */}
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="w-full max-w-lg mb-8 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-lol-blue-accent mb-4 text-shadow-lg">
              LoL MetaMind
            </h1>
            <p className="text-lg md:text-xl text-lol-gold-light/90 mb-6">
              La plataforma de coaching de League of Legends con IA que te da una ventaja estratégica.
            </p>
          </div>
          <ProfileForm />
          <div className="mt-8 text-center">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold transition-colors duration-300">
              Ver el widget de OBS »
            </Link>
          </div>
        </div>

        {/* Columna de la derecha: Contenido Extra / Próximas Características */}
        <div className="w-full lg:w-1/2 flex flex-col items-center mt-12 lg:mt-32">
          <div className="w-full max-w-lg bg-lol-blue-medium p-8 rounded-xl shadow-lg border-2 border-lol-gold-dark text-center">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-4">¡Novedades!</h3>
            <p className="text-lol-gold-light/90">
              Estamos trabajando en las próximas funciones: gamificación, builds premium y más.
              ¡Sigue atento a las actualizaciones de la plataforma!
            </p>
            <div className="mt-4">
              <Link href="/builds" className="text-lol-blue-accent hover:text-lol-gold transition-colors duration-300 font-bold">
                Explorar builds recomendadas »
              </Link>
            </div>
          </div>
          <div className="w-full max-w-lg">
            <WeeklyChallenges />
          </div>
        </div>
      </div>
    </main>
  );
}
