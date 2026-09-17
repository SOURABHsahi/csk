import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import knomeLogoDark from '../assets/knome_logo_dark.png';

export default function Login() {
    const { login, currentUser, isAuthenticated } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        // Direct Open Knome — immediately authenticate as default admin and open Dashboard
        const openKnomeDirectly = async () => {
            if (isAuthenticated && currentUser) {
                navigate('/', { replace: true });
                return;
            }
            try {
                await login('MP0108');
            } catch {
                /* fallback handled in UserContext */
            }
            navigate('/', { replace: true });
        };
        openKnomeDirectly();
    }, [isAuthenticated, currentUser, login, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col items-center gap-5 relative z-10">
                <img src={knomeLogoDark} alt="KNOME" className="h-14 w-auto object-contain drop-shadow-lg animate-pulse" />
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold text-slate-300 tracking-wide">
                        Opening Knome...
                    </span>
                </div>
            </div>
        </div>
    );
}
