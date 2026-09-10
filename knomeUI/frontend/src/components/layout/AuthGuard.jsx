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
        return <Navigate to="/login" replace />;
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
                            Log Out & Return to MPO Employee Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Role Pending Guard — only applies if explicitly marked PENDING (never for standard new users)
    const isRolePending = currentUser && (
        currentUser.role === 'PENDING' ||
        currentUser.roleName === 'Pending Role Assignment' ||
        (Array.isArray(currentUser.roles) && currentUser.roles.length === 1 && currentUser.roles[0] === 'Pending Role Assignment')
    );

    if (isRolePending) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-white relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none"></div>

                <div className="max-w-lg w-full bg-slate-900/90 border border-amber-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-amber-500/10 text-center space-y-6 animate-in fade-in zoom-in duration-300 relative backdrop-blur-xl">

                    {/* Animated Pending Icon */}
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-orange-500/20 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                        <span className="material-symbols-outlined text-amber-400 text-4xl animate-pulse">hourglass_top</span>
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                        </span>
                    </div>

                    <div>
                        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
                            ⏳ Role Assignment Pending
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            Access Pending Approval
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Welcome, <strong className="text-slate-200">{currentUser.name || currentUser.fullName || currentUser.employeeId}</strong>!
                        </p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 text-left space-y-3 shadow-inner">
                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-amber-400 text-lg shrink-0 mt-0.5">info</span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Your account is authenticated via <strong>EmployeeHub SSO</strong>, but portal access is locked until the <strong>System Administrator</strong> assigns your access role.
                            </p>
                        </div>

                        {currentUser.email && (
                            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-700/50">
                                <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0 mt-0.5">mark_email_read</span>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    A confirmation email has been dispatched to <span className="text-amber-300 font-mono font-bold bg-slate-900/60 px-1.5 py-0.5 rounded">{currentUser.email}</span>.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 text-xs">
                            <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40">
                                <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Employee ID</span>
                                <span className="text-white font-mono font-bold">{currentUser.employeeId || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40">
                                <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Department</span>
                                <span className="text-white font-bold truncate block">{currentUser.department || 'General'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Listening Poller Indicator */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-800/40 py-2 px-3 rounded-xl border border-slate-700/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Auto-detecting approval... You'll enter automatically once approved.</span>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={logout}
                            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 cursor-pointer shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">logout</span>
                            <span>Sign Out & Return to Employee Hub</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return children;
}
