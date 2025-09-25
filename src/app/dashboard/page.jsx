'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProfileFlowForm from '@/components/forms/ProfileFlowForm';
import WeeklyChallenges from '@/components/WeeklyChallenges';
import EpicButton from '@/components/landing/EpicButton';
import Link from 'next/link';
import { FiCopy, FiCheckCircle } from 'react-icons/fi'; // Iconos para la clave de licencia

export default function DashboardPage() {
    const { user, login } = useAuth();
    
    // Estados para la información detallada (Subscription, License Key)
    const [detailedUserData, setDetailedUserData] = useState(null);
    const [isLoadingDetailed, setIsLoadingDetailed] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    
    const isAuthenticated = user && user.id;

    // --- Lógica para obtener datos detallados (Licencia y Suscripción) ---
    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoadingDetailed(false);
            return;
        }

        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('authToken'); 
                const response = await fetch('/api/user/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    throw new Error('No se pudo cargar la información detallada del usuario.');
                }
                const data = await response.json();
                
                // Si hay datos nuevos, actualiza el contexto de autenticación
                if (data.riot_id_name !== user.riot_id_name) {
                    login(data, token);
                }
                setDetailedUserData(data);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoadingDetailed(false);
            }
        };

        fetchUserData();
    }, [isAuthenticated, user, login]);
    
    // --- Handlers ---
    const handleCopyToClipboard = () => {
        if (detailedUserData?.license_key) {
            navigator.clipboard.writeText(detailedUserData.license_key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); 
        }
    };

    const handleActivateTrial = async () => {
        try {
            // Esta ruta debería simular la activación de la prueba
            const response = await fetch('/api/activate-trial', { method: 'POST' });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'No se pudo activar la prueba.');
            }
            window.location.reload(); 
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleProfileUpdate = (updatedUserData) => {
        const token = localStorage.getItem('authToken');
        login(updatedUserData, token);
        window.location.reload();
    };

    // --- Lógica de Estado de Suscripción ---
    const getStatusInfo = () => {
        const data = detailedUserData || user;
        if (!data) return { text: 'Cargando...', color: 'text-gray-400' };

        switch (data.subscription_tier) {
            case 'PREMIUM':
            case 'Pro':
                return { text: 'PREMIUM', color: 'text-lol-gold' };
            case 'TRIAL':
                // Simulación de los días restantes
                const endDate = new Date(data.trial_ends_at || Date.now() + (3 * 24 * 60 * 60 * 1000));
                const now = new Date();
                const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                return { text: `PRUEBA (quedan ${daysRemaining} días)`, color: 'text-lol-blue-accent' };
            default:
                return { text: 'GRATIS', color: 'text-gray-400' };
        }
    };
    
    // --- Renderizado ---
    const hasSummonerProfile = user && user.riot_id_name;
    const statusInfo = getStatusInfo();
    const finalUserData = detailedUserData || user;

    if (isLoadingDetailed || !isAuthenticated) {
        return <div className="text-center p-10">Cargando tu dashboard...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
            
            {/* -------------------- COLUMNA IZQUIERDA: Cuenta, Suscripción y Perfil -------------------- */}
            <div className="w-full lg:w-2/3 flex flex-col items-center space-y-8">
                
                {/* --- SECCIÓN 1: Cuenta y Suscripción (Unificado) --- */}
                <div className="w-full max-w-xl bg-lol-blue-medium p-8 rounded-xl shadow-lg border-2 border-lol-gold-dark">
                    <h2 className="text-2xl font-display font-bold text-lol-gold mb-4">Información de Cuenta</h2>
                    
                    {/* User Info & Avatar */}
                    <div className="flex items-center gap-4 border-b border-gray-700/50 pb-4 mb-4">
                        {/* El avatar_url debería estar en detailedUserData */}
                        <img src={finalUserData.avatar_url || '/placeholder-avatar.png'} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-lol-blue-accent" />
                        <div>
                            <h3 className="text-xl font-bold text-lol-gold-light">{finalUserData.username}</h3>
                            <p className="text-sm text-gray-400">{finalUserData.email}</p>
                        </div>
                    </div>
                    
                    {/* Subscription Status */}
                    <p className={`mt-2 text-lg font-bold ${statusInfo.color}`}>
                        Estado de la Suscripción: {statusInfo.text}
                    </p>

                    {/* License Key Management */}
                    <div className="mt-6 border-t border-gray-700/50 pt-4">
                        <h3 className="text-xl font-semibold text-lol-gold mb-3">Clave de Licencia</h3>
                        {finalUserData.license_key ? (
                            <div className="flex items-center gap-4 bg-lol-blue-dark p-3 rounded-md">
                                <span className="text-lol-blue-accent font-mono flex-grow overflow-x-auto text-sm">{finalUserData.license_key}</span>
                                <button onClick={handleCopyToClipboard} className="bg-lol-gold-dark hover:bg-lol-gold text-lol-blue-dark font-bold py-1 px-3 rounded-lg transition-colors duration-200 flex items-center gap-2 text-xs">
                                    {copied ? <FiCheckCircle className="text-green-500" /> : <FiCopy />}
                                    {copied ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center p-4 bg-lol-blue-dark rounded-md">
                                <p className="text-gray-400 mb-4">Aún no tienes una clave de licencia.</p>
                                {/* Mostrar botones solo si está en GRATIS */}
                                {(statusInfo.text === 'GRATIS') && (
                                    <>
                                        <EpicButton onClick={handleActivateTrial} className="text-xs py-2 px-4 bg-lol-blue-accent">
                                            Activar Prueba Gratuita
                                        </EpicButton>
                                        <Link href="/pricings" passHref>
                                            <EpicButton className="text-xs py-2 px-4 mt-2">
                                                Adquirir Plan Premium
                                            </EpicButton>
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- SECCIÓN 2: Riot Profile & AI Analysis --- */}
                <ProfileFlowForm
                    hasProfile={hasSummonerProfile}
                    onProfileUpdate={handleProfileUpdate}
                    currentUser={user}
                />
            </div>

            {/* -------------------- COLUMNA DERECHA: Desafíos y Widgets -------------------- */}
            <div className="w-full lg:w-1/3 flex flex-col items-center mt-0 lg:mt-12 space-y-8">
                <div className="w-full max-w-lg">
                    <WeeklyChallenges />
                </div>
                
                {/* Link al HUD Flotante */}
                <div className="w-full max-w-lg text-center bg-lol-blue-medium p-6 rounded-xl shadow-lg border-2 border-lol-gold-dark">
                    <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Asistente en Tiempo Real</h3>
                    <p className="text-sm text-lol-gold-light/70 mb-3">Accede a tu HUD flotante para el juego.</p>
                    <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold" target="_blank">
                        Abrir HUD / Widget de OBS »
                    </Link>
                </div>
            </div>
        </div>
    );
}