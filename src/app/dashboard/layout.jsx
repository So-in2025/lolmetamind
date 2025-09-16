// src/app/dashboard/layout.jsx

export default function DashboardLayout({ children }) {
  return (
    <section className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light font-body">
      <header className="bg-lol-blue-medium p-4 border-b-2 border-lol-gold-dark">
        <h1 className="text-2xl font-display text-lol-gold text-center">
          LoL MetaMind Dashboard
        </h1>
      </header>
      <main className="p-4 sm:p-8">
        {children}
      </main>
    </section>
  );
}
