import React, { useEffect } from 'react';

/**
 * Knome Login Redirector.
 * Knome authentication is fully delegated to Employee Hub (Central Identity Provider).
 */
export default function Login() {
    useEffect(() => {
        const host = window.location.hostname || 'localhost';
        const isIis = window.location.port === '8080';
        const ehPort = isIis ? '8081' : '5001';
        const knomePort = window.location.port || (isIis ? '8080' : '5173');
        const ehBase = `http://${host}:${ehPort}`;
        const knomeBase = `http://${host}:${knomePort}`;
        const searchParams = new URLSearchParams(window.location.search);
        const isLogout = searchParams.get('logout') === 'true' || searchParams.get('action') === 'logout';
        const logoutParam = isLogout ? 'logout=true&' : '';
        window.location.href = `${ehBase}/?${logoutParam}client_id=knome-web-portal&redirect_uri=${encodeURIComponent(knomeBase)}`;
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
            <div className="flex flex-col items-center gap-5 text-center p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 max-w-md w-full shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
                    <span className="material-symbols-outlined text-white text-3xl">hub</span>
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Redirecting to Employee Hub</h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Single Sign-On (SSO) authentication is centralized at Employee Hub.
                    </p>
                </div>
                <button
                    onClick={() => {
                        const host = window.location.hostname || 'localhost';
                        const isIis = window.location.port === '8080';
                        const ehPort = isIis ? '8081' : '5001';
                        const knomePort = window.location.port || (isIis ? '8080' : '5173');
                        const ehBase = `http://${host}:${ehPort}`;
                        const knomeBase = `http://${host}:${knomePort}`;
                        window.location.href = `${ehBase}/?logout=true&client_id=knome-web-portal&redirect_uri=${encodeURIComponent(knomeBase)}`;
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:opacity-90 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                    <span>Proceed to Employee Hub Login</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
            </div>
        </div>
    );
}

