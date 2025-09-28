// Ruta: src/app/layout.jsx

import './globals.css'
import { Inter } from 'next/font/google'
// ELIMINAR: import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'LoL MetaMind',
  description: 'Plataforma de coaching con IA para League of Legends',
  icons: {
    icon: '/vite.svg',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* ELIMINAR: <AuthProvider> */}
          {children}
        {/* ELIMINAR: </AuthProvider> */}
      </body>
    </html>
  )
}