import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, isAuthenticated } = useUser();
    const [error, setError] = useState('');

    // Read error from URL if present (e.g. from SSO failure)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlError = params.get('error');
        if (urlError) {
            setError(urlError);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // If already authenticated, redirect to home
    useEffect(() => {
        if (isAuthenticated && currentUser) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, currentUser, navigate]);

    const getSsoUrls = () => {
        const host = window.location.hostname || 'localhost';
        const isIis = window.location.port === '8080';
        const ehPort = isIis ? '8081' : '5001';
        const knomePort = window.location.port || (isIis ? '8080' : '5173');
        const knomeBase = `${window.location.protocol}//${host}${knomePort ? `:${knomePort}` : ''}`;
        
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        const ehBase = isLocal ? `http://${host}:${ehPort}` : 'https://counselling-1.mponline.demo.gov.in:3001';
        const hubLoginUrl = `${ehBase}/login`;
        
        return { ehBase, hubLoginUrl, knomeBase };
    };

    const handleSsoLogin = () => {
        const { hubLoginUrl, knomeBase } = getSsoUrls();
        const returnUrl = encodeURIComponent(`${knomeBase}/login`);
        window.location.href = `${hubLoginUrl}?client_id=Knome-2026&returnUrl=${returnUrl}&redirect_uri=${encodeURIComponent(knomeBase)}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Header Brand */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-3">
                        <span className="material-symbols-outlined text-white text-3xl">hub</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white">KNOME</h1>
                    <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
                        MPOnline Enterprise Knowledge & Collaboration Platform
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="text-lg font-bold text-white">Enterprise Single Sign-On</h2>
                        <p className="text-xs text-slate-400">
                            Sign in securely using your central MPOnline Employee Hub credentials
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {error}
                        </div>
                    )}

                    {/* Single SSO Button */}
                    <div>
                        <button
                            type="button"
                            onClick={handleSsoLogin}
                            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[22px]">fingerprint</span>
                            <span>Sign in with MPO Employee Hub</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>

                    <div className="pt-2 text-center border-t border-slate-800/80">
                        <p className="text-[11px] text-slate-500 font-medium">
                            Protected by MPOnline OIDC & Identity Server
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
