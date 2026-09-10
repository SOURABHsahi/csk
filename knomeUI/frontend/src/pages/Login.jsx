import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';

// Employee ID suggestions for quick demo login
const QUICK_USERS = [
    { id: 'MP0108', displayId: 'MPO101', name: 'Loveneesh Sharma', role: 'System Administrator', avatar: 'https://ui-avatars.com/api/?name=Loveneesh+Sharma&background=6366f1&color=fff&bold=true' },
    { id: 'MPO102', displayId: 'MPO102', name: 'Vishendra Sharma', role: 'Community Administrator', avatar: 'https://ui-avatars.com/api/?name=Vishendra+Sharma&background=06b6d4&color=fff&bold=true' },
    { id: 'MPO104', displayId: 'MPO104', name: 'Rishikesh Ugle', role: 'Software Engineer', avatar: 'https://ui-avatars.com/api/?name=Rishikesh+Ugle&background=ec4899&color=fff&bold=true' },
    { id: 'MPO105', displayId: 'MPO105', name: 'Meghna Tiwari', role: 'Business Analyst', avatar: 'https://ui-avatars.com/api/?name=Meghna+Tiwari&background=8b5cf6&color=fff&bold=true' },
    { id: 'EMP001', displayId: 'EMP001', name: 'Aarav Sharma', role: 'System Admin (Dev)', avatar: 'https://ui-avatars.com/api/?name=Aarav+Sharma&background=10b981&color=fff&bold=true' },
    { id: 'EMP002', displayId: 'EMP002', name: 'Priya Patel', role: 'HR Administrator', avatar: 'https://ui-avatars.com/api/?name=Priya+Patel&background=f59e0b&color=fff&bold=true' },
];

export default function Login() {
    const { login, currentUser, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const [employeeId, setEmployeeId] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already authenticated, redirect straight to Knome dashboard
    useEffect(() => {
        if (isAuthenticated && currentUser) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, currentUser, navigate]);

    // Read error from URL if any
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlError = params.get('error');
        if (urlError) {
            setError(urlError);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleLogin = async (idToUse) => {
        const id = (idToUse || employeeId || 'MP0108').trim().toUpperCase();
        setError('');
        setIsLoading(true);
        try {
            await login(id);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed. Please check your Employee ID.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 sm:p-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col lg:flex-row items-center gap-10">

                {/* Left — Branding Panel */}
                <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-3xl">hub</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
                                KNOME
                            </h1>
                            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
                                MPOnline Enterprise Knowledge Hub
                            </p>
                        </div>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 leading-tight text-white">
                        Where Knowledge<br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Meets Community
                        </span>
                    </h2>
                    <p className="text-sm sm:text-base leading-relaxed max-w-md text-slate-400">
                        Your internal platform for knowledge articles, tech discussions, communities, video streams, and enterprise collaboration.
                    </p>

                    {/* Feature Badges */}
                    <div className="flex flex-wrap gap-2 mt-6 justify-center lg:justify-start">
                        {['📰 Articles', '🎙️ Podcasts', '🎬 Videos', '👥 Communities', '⚡ Karma Points'].map(f => (
                            <span key={f} className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900/80 border border-slate-800 text-slate-300">
                                {f}
                            </span>
                        ))}
                    </div>

                    {/* Direct One-Click Access Button */}
                    <div className="mt-8 hidden lg:block">
                        <button
                            onClick={() => handleLogin('MP0108')}
                            disabled={isLoading}
                            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                            <span>Direct Open Knome (System Admin)</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Right — Login Card */}
                <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
                    <div>
                        <h3 className="text-xl font-black text-white">
                            Sign In to Knome
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Enter your Employee ID or choose a quick demo account
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-base shrink-0">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Employee ID Input */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Employee ID
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                badge
                            </span>
                            <input
                                type="text"
                                placeholder="e.g. MPO101 or MP0108"
                                value={employeeId}
                                onChange={(e) => { setEmployeeId(e.target.value.toUpperCase()); setError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    {/* Enter Knome Button */}
                    <button
                        onClick={() => handleLogin()}
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                        {isLoading ? (
                            <>
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                <span>Opening Knome...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">login</span>
                                <span>Enter Knome Portal</span>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 pt-2">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Quick Access Accounts
                        </span>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>

                    {/* Quick User Selector */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {QUICK_USERS.map(u => (
                            <button
                                key={u.id}
                                onClick={() => handleLogin(u.id)}
                                disabled={isLoading}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all text-left cursor-pointer group"
                            >
                                <img
                                    src={u.avatar}
                                    alt={u.name}
                                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700 shadow-xs"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                                        {u.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                        {u.displayId} • {u.role}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 group-hover:text-indigo-400 text-sm shrink-0 transition-transform group-hover:translate-x-0.5">
                                    arrow_forward_ios
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
