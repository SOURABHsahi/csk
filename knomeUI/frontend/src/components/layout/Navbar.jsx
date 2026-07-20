import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationSettingsModal from '../modals/NotificationSettingsModal';
import knomeLogo from '../../assets/knome_logo.png';

export default function Navbar() {
    const { currentUser, setCurrentUser, users } = useUser();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Mock suggestions based on Indian names and tech terms
    const allSuggestions = [
        { type: 'person', label: 'Aditi Sharma', icon: 'person' },
        { type: 'person', label: 'Rahul Kumar', icon: 'person' },
        { type: 'person', label: 'Priya Singh', icon: 'person' },
        { type: 'community', label: 'React Developers India', icon: 'group' },
        { type: 'post', label: 'Quarterly Planning Session Outcomes', icon: 'article' },
        { type: 'video', label: 'How to build scalable microservices', icon: 'videocam' },
        { type: 'tag', label: 'JavaScript', icon: 'tag' },
        { type: 'tag', label: 'UI/UX Design', icon: 'tag' },
    ];
    
    const filteredSuggestions = searchQuery.trim() === '' 
        ? [] 
        : allSuggestions.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSearch = (query) => {
        if (!query.trim()) return;
        setSearchQuery('');
        setShowSuggestions(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };
    const [isDark, setIsDark] = useState(() => {
        // Check saved preference; default to light
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return false; // default light
    });

    // Notifications state (FR-NT-01, FR-NT-04)
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'reaction', text: 'Meghna Tiwari reacted to your post.', time: '5m', unread: true, icon: 'favorite', color: 'text-pink-400', bg: 'bg-pink-500/10' },
        { id: 2, type: 'comment', text: 'Vishendra Sharma commented on your article.', time: '1h', unread: true, icon: 'chat_bubble', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { id: 3, type: 'follower', text: 'Sourabh Sahu started following you.', time: '2h', unread: false, icon: 'person_add', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { id: 4, type: 'mention', text: 'Mayur Verma mentioned you in a comment.', time: '1d', unread: false, icon: 'alternate_email', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ]);
    const unreadCount = notifications.filter(n => n.unread).length;

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, unread: false })));
    };

    useEffect(() => {
        const handleJoinRequest = (e) => {
            if (['SYSADM', 'HRADM', 'CADM'].includes(currentUser.role)) {
                const { communityName, requestedBy } = e.detail;
                const newNotif = {
                    id: Date.now(),
                    type: 'request',
                    text: `${requestedBy} requested to join ${communityName}.`,
                    time: 'Just now',
                    unread: true,
                    icon: 'group_add',
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10'
                };
                setNotifications(prev => [newNotif, ...prev]);
            }
        };
        window.addEventListener('community-join-request', handleJoinRequest);
        return () => window.removeEventListener('community-join-request', handleJoinRequest);
    }, [currentUser.role]);

    // Apply theme on mount and when isDark changes
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    const navLinks = [
        { to: '/', label: 'Dashboard' },
        { to: '/jobs', label: 'Jobs' },
    ];
    if (['SYSADM', 'HRADM', 'CADM'].includes(currentUser.role)) {
        navLinks.push({ to: '/admin-console', label: 'Admin' });
    }

    return (
        <>
        {/* TopNavBar */}
        <nav className="fixed w-full z-50 transition-colors duration-300">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-[72px] grid grid-cols-2 lg:grid-cols-3 items-center gap-4">
                
                {/* ─── LEFT: Logo & Navigation ─── */}
                <div className="flex items-center gap-8 justify-start">
                    <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.01] shrink-0">
                        <img 
                            src={knomeLogo} 
                            alt="Knome Logo" 
                            className="h-14 object-contain bg-white rounded-xl p-1" 
                            style={{
                                boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
                            }}
                        />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{
                                background: 'linear-gradient(135deg, #3b7fff, #00d4ff)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                Knome Portal
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                                Connecting People & Knowledge
                            </span>
                        </div>
                    </Link>

                    {/* Pill-shaped Nav Links */}
                    <div className="hidden xl:flex items-center p-1 rounded-xl"
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                        {navLinks.map(link => {
                            const isActive = pathname === link.to;
                            return (
                                <Link key={link.to} to={link.to}
                                    className="relative px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-300"
                                    style={isActive ? {
                                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-aurora))',
                                        color: 'white',
                                        boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                                    } : {
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    <span className="relative z-10">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ─── CENTER: Smart Search ─── */}
                <div className="hidden lg:flex items-center justify-center w-full">
                    <div className="relative w-full max-w-[520px] z-50">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]"
                            style={{color: 'var(--text-muted)'}}>search</span>
                        <input
                            type="text"
                            placeholder="Search Knome, posts, people or tags..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery) }}
                            className="w-full pl-10 pr-4 py-2 text-[13.5px] font-medium rounded-full outline-none transition-all focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                                color: 'var(--text-primary)',
                                backdropFilter: 'blur(12px)',
                            }}
                        />

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && searchQuery.trim() !== '' && (
                            <div className="absolute top-12 left-0 w-full rounded-2xl overflow-hidden shadow-2xl py-2"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.97)' : 'rgba(255,255,255,0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: 'var(--shadow-premium)'
                                }}>
                                {filteredSuggestions.length > 0 ? (
                                    filteredSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onMouseDown={() => handleSearch(suggestion.label)}
                                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-blue-500/10"
                                        >
                                            <span className="material-symbols-outlined text-[16px]" style={{color: 'var(--text-muted)'}}>
                                                {suggestion.icon}
                                            </span>
                                            <span className="text-[13px] font-semibold" style={{color: 'var(--text-primary)'}}>
                                                {suggestion.label}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-center text-[13px]" style={{color: 'var(--text-secondary)'}}>
                                        No results found for "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: Actions & Profile ─── */}
                <div className="flex items-center gap-2.5 justify-end">

                    {/* Karma Badge */}
                    <Link to="/karma-history" className="relative hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))',
                            border: '1px solid rgba(251, 191, 36, 0.25)',
                        }}
                        title="Karma Points">
                        <span className="material-symbols-outlined text-amber-400 text-[15px]" style={{fontVariationSettings:"'FILL' 1"}}>military_tech</span>
                        <span className="text-[12px] font-black text-amber-400">1,250</span>
                    </Link>

                    {/* ─── Theme Toggle ─── */}
                    <button
                        onClick={toggleTheme}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 group"
                        style={{
                            background: isDark
                                ? 'rgba(14, 26, 56, 0.7)'
                                : 'rgba(239, 246, 255, 0.85)',
                            border: '1px solid var(--border-mid)',
                        }}
                    >
                        <span className="material-symbols-outlined text-[18px] transition-all duration-300"
                            style={{
                                color: isDark ? '#fbbf24' : '#2563eb',
                                fontVariationSettings: "'FILL' 1"
                            }}>
                            {isDark ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                            }}
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{color: 'var(--text-secondary)', fontVariationSettings:"'FILL' 1"}}>notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                                    style={{
                                        background: 'linear-gradient(135deg, #f43f5e, #fb923c)',
                                        minWidth: '18px', height: '18px',
                                        boxShadow: '0 0 10px rgba(244,63,94,0.6)'
                                    }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotifOpen && (
                            <div className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden shadow-2xl z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.97)' : 'rgba(255,255,255,0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.8)' : '0 24px 80px rgba(37,99,235,0.12), 0 4px 24px rgba(0,0,0,0.08)'
                                }}>
                                <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{borderColor: 'var(--border-mid)'}}>
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={markAllRead} className="text-[11px] font-bold text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">Mark all read</button>
                                        <button onClick={() => { setIsNotifSettingsOpen(true); setIsNotifOpen(false); }} className="text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">settings</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.map(n => (
                                        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${n.unread ? 'border-l-2 border-blue-500' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.bg}`}>
                                                <span className={`material-symbols-outlined text-[16px] ${n.color}`} style={{fontVariationSettings:"'FILL' 1"}}>{n.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-snug">{n.text}</p>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5 block">{n.time}</span>
                                            </div>
                                            {n.unread && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Avatar & Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-3 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                            }}
                        >
                            <img className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0 border border-slate-200 dark:border-slate-700" alt="Avatar" src={currentUser.avatar} />
                            <div className="hidden sm:flex flex-col items-start text-left min-w-0">
                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{currentUser.name.split(' ')[0]}</span>
                                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-none">{currentUser.roleName}</span>
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">expand_more</span>
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-12 w-64 rounded-2xl overflow-hidden shadow-2xl z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.8)' : '0 24px 80px rgba(37,99,235,0.12), 0 4px 24px rgba(0,0,0,0.08)'
                                }}>
                                <div className="px-4 py-3.5 border-b" style={{borderColor: 'var(--border-mid)'}}>
                                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{currentUser.roleName}</p>
                                </div>
                                <div className="py-1.5">
                                    <div className="px-3 py-1 mb-1">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Switch User (Demo)</p>
                                        {users.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => { setCurrentUser(u); setIsUserMenuOpen(false); }}
                                                className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-2 ${currentUser.id === u.id ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-black"
                                                    style={{background: 'linear-gradient(135deg, #3b7fff, #00d4ff)'}}>
                                                    {u.name.charAt(0)}
                                                </div>
                                                {u.name.split(' ')[0]} <span className="text-slate-600">({u.roleName})</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t px-3 py-2" style={{borderColor: 'var(--border-mid)'}}>
                                        <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">person</span> My Profile
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>

        {isNotifSettingsOpen && <NotificationSettingsModal isOpen={isNotifSettingsOpen} onClose={() => setIsNotifSettingsOpen(false)} />}
        </>
    );
}
