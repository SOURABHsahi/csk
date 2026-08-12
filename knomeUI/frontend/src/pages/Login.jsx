import React, { useEffect } from 'react';

/**
 * Knome Login Redirector.
 * Knome authentication is fully delegated to Employee Hub (Central Identity Provider).
 */
export default function Login() {
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const isLogout = searchParams.get('logout') === 'true' || searchParams.get('action') === 'logout';
        const logoutParam = isLogout ? 'logout=true&' : '';
        window.location.href = `http://localhost:5001/?${logoutParam}client_id=knome-web-portal&redirect_uri=http%3A%2F%2Flocalhost%3A5173`;
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
            <div className="flex flex-col items-center gap-5 text-center p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 max-w-md w-full shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
                    <span className="material-symbols-outlined text-white text-3xl">hub</span>
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Redirecting to Employee Hub</h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Single Sign-On (SSO) authentication is centralized at Employee Hub.
                    </p>
                </div>
                <a
                    href="http://localhost:5001/?logout=true&client_id=knome-web-portal&redirect_uri=http%3A%2F%2Flocalhost%3A5173"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                    <span>Proceed to Employee Hub Login</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
            </div>
        </div>
    );
}
