import PricingPlans from '@/components/pricing/PricingPlans'
import LoginButtons from '@/components/auth/LoginButtons'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-start items-center p-8 bg-lol-blue-dark text-lol-gold-light font-body">
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-display font-bold text-lol-blue-accent mb-4 text-shadow-lg">
          LoL MetaMind
        </h1>
        <p className="text-lg md:text-xl text-lol-gold-light/90 mb-6">
          La plataforma de coaching de League of Legends con IA que te da una ventaja estratégica.
        </p>
      </div>
      
      <PricingPlans />

      <div className="mt-8">
        <LoginButtons />
      </div>
    </main>
  );
}
