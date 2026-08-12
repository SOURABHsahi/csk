import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLoader from './PageLoader';

/**
 * AuthGuard wraps all protected routes.
 * Shows a loading spinner while session is being restored.
 * Redirects to /login if not authenticated.
 */
export default function AuthGuard({ children }) {
    const userContext = useUser();
    const isAuthenticated = userContext?.isAuthenticated ?? false;
    const isAuthLoading = userContext?.isAuthLoading ?? false;
    const currentUser = userContext?.currentUser;
    const logout = userContext?.logout;

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--bg-base)' }}>
                <div className="flex flex-col items-center gap-4">
                    {/* Animated logo mark */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                        <span className="material-symbols-outlined text-white text-[32px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-[14px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                            Loading Knome...
                        </p>
                        <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map(i => (
                                <div key={i}
                                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                                    style={{
                                        background: '#6366f1',
                                        animationDelay: `${i * 0.15}s`,
                                    }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Automatic Single Sign-On Redirect to Employee Hub
        window.location.href = 'http://localhost:5001/?client_id=knome-web-portal&redirect_uri=http%3A%2F%2Flocalhost%3A5173';
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center animate-pulse">
                        <span className="material-symbols-outlined text-indigo-400 text-2xl">lock_open</span>
                    </div>
                    <p className="text-sm font-bold text-slate-300">Redirecting to Employee Hub Single Sign-On...</p>
                </div>
            </div>
        );
    }

    // Strict Account Suspension Guard — Block Posts, Articles, Videos, Podcasts & Community Access
    if (currentUser && currentUser.isActive === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
                <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner border border-rose-500/30">
                        <span className="material-symbols-outlined text-4xl">person_off</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-rose-400 tracking-tight mb-1">ACCESS DENIED</h2>
                        <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">Account Suspended</h3>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/80 p-4 rounded-xl border border-slate-700/50">
                        Your account <strong className="text-white">({currentUser.name || currentUser.employeeId})</strong> has been suspended by System Administrator due to compliance & governance policies.
                    </p>
                    <div className="text-xs text-rose-300 font-semibold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-left space-y-1">
                        <div className="font-black text-rose-400 mb-1 uppercase tracking-wider">Restricted Modules:</div>
                        <div>⛔ Posts & Feeds Viewing / Creation</div>
                        <div>⛔ Knowledge Articles & Blogs</div>
                        <div>⛔ Video Streaming & Uploads</div>
                        <div>⛔ Podcasts & Audio Recordings</div>
                        <div>⛔ Enterprise Communities & Channels</div>
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            onClick={logout}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all border border-slate-700 cursor-pointer shadow-lg"
                        >
                            Log Out & Return to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return children;
}
