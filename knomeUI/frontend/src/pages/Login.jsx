import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';

// Employee ID suggestions for quick login
const QUICK_USERS = [
    { id: 'MPO101', name: 'Loveneesh Sharma', role: 'System Admin', avatar: 'https://randomuser.me/api/portraits/men/40.jpg' },
    { id: 'MPO102', name: 'Vishendra Sharma', role: 'Community Admin', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
    { id: 'MPO103', name: 'Sourabh Sahu', role: 'HR Admin', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
    { id: 'MPO104', name: 'Rishikesh Ugle', role: 'Employee', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
    { id: 'MPO105', name: 'Meghna Tiwari', role: 'Employee', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 'MPO106', name: 'Mayur Verma', role: 'Employee', avatar: 'https://randomuser.me/api/portraits/men/55.jpg' },
];

export default function Login() {
    const { login } = useUser();
    const navigate = useNavigate();
    const [employeeId, setEmployeeId] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (idToUse) => {
        const id = (idToUse || employeeId).trim().toUpperCase();
        if (!id) {
            setError('Please enter your Employee ID.');
            return;
        }
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'var(--bg-base)' }}>

            {/* Animated background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-20"
                    style={{ background: 'radial-gradient(circle, #6366f1, #ec4899, transparent 70%)' }} />
                <div className="absolute bottom-[-15%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-15"
                    style={{ background: 'radial-gradient(circle, #0ea5e9, #6366f1, transparent 70%)' }} />
            </div>

            <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col lg:flex-row items-center gap-10">

                {/* Left — Branding Panel */}
                <div className="flex-1 text-center lg:text-left">
                    {/* Logo placeholder — gradient wordmark */}
                    <div className="inline-flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                            <span className="material-symbols-outlined text-white text-[24px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>Knome</h1>
                            <p className="text-[11px] font-bold tracking-widest uppercase"
                                style={{ color: 'var(--text-muted)' }}>Enterprise Knowledge Hub</p>
                        </div>
                    </div>

                    <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-tight"
                        style={{ color: 'var(--text-primary)' }}>
                        Where Knowledge<br />
                        <span style={{
                            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>Meets Community</span>
                    </h2>
                    <p className="text-base leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
                        Your internal platform for posts, articles, videos, podcasts, and meaningful connections across the organization.
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-2 mt-6 justify-center lg:justify-start">
                        {['📰 Articles', '🎙️ Podcasts', '🎬 Videos', '👥 Communities', '⚡ Karma'].map(f => (
                            <span key={f} className="px-3 py-1.5 rounded-full text-[12px] font-bold"
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-secondary)',
                                }}>
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right — Login Card */}
                <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(99,102,241,0.08)',
                    }}>

                    <h3 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                        Sign In
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                        Enter your Employee ID to access Knome Portal
                    </p>

                    {/* Employee ID Input */}
                    <div className="mb-4">
                        <label className="block text-[12px] font-bold uppercase tracking-widest mb-2"
                            style={{ color: 'var(--text-muted)' }}>
                            Employee ID
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]"
                                style={{ color: 'var(--text-muted)' }}>badge</span>
                            <input
                                type="text"
                                placeholder="e.g. MPO101"
                                value={employeeId}
                                onChange={(e) => { setEmployeeId(e.target.value.toUpperCase()); setError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[14px] font-semibold outline-none transition-all focus:ring-2"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: error ? '1px solid #ef4444' : '1px solid var(--border-mid)',
                                    color: 'var(--text-primary)',
                                    focusRingColor: '#6366f1',
                                }}
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-[12px] font-semibold mt-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                {error}
                            </p>
                        )}
                    </div>

                    {/* Login Button */}
                    <button
                        onClick={() => handleLogin()}
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl font-black text-[15px] text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                        }}>
                        {isLoading ? (
                            <>
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                Signing in...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                                Sign In to Knome
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                        <span className="text-[11px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-muted)' }}>Quick Access</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>

                    {/* Quick User Selector */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
                            style={{ color: 'var(--text-muted)' }}>
                            Select a demo account
                        </p>
                        {QUICK_USERS.map(u => (
                            <button
                                key={u.id}
                                onClick={() => handleLogin(u.id)}
                                disabled={isLoading}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-60 text-left"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                }}>
                                <img src={u.avatar} alt={u.name}
                                    className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-700 shadow-sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold truncate"
                                        style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                                    <p className="text-[11px] truncate"
                                        style={{ color: 'var(--text-muted)' }}>{u.id} · {u.role}</p>
                                </div>
                                <span className="material-symbols-outlined text-[16px] shrink-0"
                                    style={{ color: 'var(--text-muted)' }}>arrow_forward_ios</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
