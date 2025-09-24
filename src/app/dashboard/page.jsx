'use client';
import { useState, useEffect } from 'react';
import { FiCopy, FiCheckCircle } from 'react-icons/fi';

export default function DashboardPage() {
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch('/api/user/me');
                if (!response.ok) {
                    throw new Error('No se pudo cargar la información del usuario.');
                }
                const data = await response.json();
                setUserData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleCopyToClipboard = () => {
        if (userData?.license_key) {
            navigator.clipboard.writeText(userData.license_key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        }
    };

    const handleActivateTrial = async () => {
        try {
            const response = await fetch('/api/activate-trial', { method: 'POST' });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'No se pudo activar la prueba.');
            }
            // Recargar los datos para mostrar el nuevo estado
            window.location.reload(); 
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const getStatusInfo = () => {
        if (!userData) return { text: 'Cargando...', color: 'text-gray-400' };

        switch (userData.subscription_tier) {
            case 'PREMIUM':
                return { text: 'PREMIUM', color: 'text-yellow-400' };
            case 'TRIAL':
                const endDate = new Date(userData.trial_ends_at);
                const now = new Date();
                const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                return { text: `PRUEBA (quedan ${daysRemaining} días)`, color: 'text-blue-400' };
            default:
                return { text: 'GRATIS', color: 'text-gray-400' };
        }
    };

    const statusInfo = getStatusInfo();

    if (isLoading) {
        return <div className="text-center p-10">Cargando tu dashboard...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">Tu Dashboard</h1>
            
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <img src={userData.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full border-2 border-yellow-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">{userData.name}</h2>
                        <p className="text-gray-400">{userData.email}</p>
                        <p className={`mt-2 text-lg font-bold ${statusInfo.color}`}>
                            Estado de la Suscripción: {statusInfo.text}
                        </p>
                    </div>
                </div>

                <div className="mt-8 border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Tu Clave de Licencia</h3>
                    {userData.license_key ? (
                        <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-md">
                            <span className="text-green-400 font-mono flex-grow overflow-x-auto">{userData.license_key}</span>
                            <button onClick={handleCopyToClipboard} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2">
                                {copied ? <FiCheckCircle className="text-green-500" /> : <FiCopy />}
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-4 bg-gray-900 rounded-md">
                            <p className="text-gray-400 mb-4">Aún no tienes una clave de licencia.</p>
                            {userData.subscription_tier === 'FREE' && (
                                <button onClick={handleActivateTrial} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
                                    Activar Prueba Gratuita de 3 Días
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
