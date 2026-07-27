import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationSettingsModal from '../modals/NotificationSettingsModal';
import NotificationToast from '../ui/NotificationToast';
import knomeLogo from '../../assets/knome_logo.png';
import { notificationsApi, profileApi, searchApi, resolveMediaUrl } from '../../utils/apiService';
import * as signalR from '@microsoft/signalr';

export default function Navbar() {
    const { currentUser, setCurrentUser, users } = useUser();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    
    // Smart YouTube-Style Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [trendingSearches, setTrendingSearches] = useState([]);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Fetch Recent Searches & Trending Searches when dropdown opens
    useEffect(() => {
        if (!showSuggestions) return;

        const loadInitialSearchData = async () => {
            try {
                const [histRes, trendRes] = await Promise.all([
                    searchApi.getHistory(5),
                    searchApi.getTrending(6)
                ]);
                setRecentSearches(Array.isArray(histRes) ? histRes : (histRes?.data || []));
                setTrendingSearches(Array.isArray(trendRes) ? trendRes : (trendRes?.data || []));
            } catch (e) {
                console.error('Failed to load search history/trending data', e);
            }
        };

        loadInitialSearchData();
    }, [showSuggestions]);

    // Real-time debounced search suggestions
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            setIsSearchingSuggestions(false);
            setSelectedIndex(-1);
            return;
        }

        setIsSearchingSuggestions(true);
        const timer = setTimeout(async () => {
            try {
                const res = await searchApi.getSuggestions(searchQuery, 8);
                const items = Array.isArray(res) ? res : (res?.data || []);
                setSuggestions(items);
            } catch (e) {
                console.error('Failed to fetch search suggestions', e);
                setSuggestions([]);
            } finally {
                setIsSearchingSuggestions(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (query, categoryFilter = null) => {
        const q = query ? query.trim() : searchQuery.trim();
        if (!q) return;
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedIndex(-1);
        const typeParam = categoryFilter ? `&type=${encodeURIComponent(categoryFilter)}` : '';
        navigate(`/search?q=${encodeURIComponent(q)}${typeParam}`);
    };

    const handleClearHistory = async (e, term = null) => {
        if (e) e.stopPropagation();
        try {
            await searchApi.clearHistory(term);
            if (term) {
                setRecentSearches(prev => prev.filter(item => item.searchTerm !== term));
            } else {
                setRecentSearches([]);
            }
        } catch (err) {
            console.error('Failed to clear search history', err);
        }
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                const selected = suggestions[selectedIndex];
                handleSearch(selected.title);
            } else {
                handleSearch(searchQuery);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return false;
    });

    // Notifications state (FR-NT-01, FR-NT-04)
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState(false);
    const [allNotifs, setAllNotifs] = useState([]);
    const [toastNotification, setToastNotification] = useState(null);
    const [activeNotifFilter, setActiveNotifFilter] = useState('All'); // All | Reactions | Comments | Connections | Mentions | System
    const [notifSearchQuery, setNotifSearchQuery] = useState('');

    const playChimeSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            // Audio context blocked or unsupported
        }
    };

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return 'Just now';
        const diff = (Date.now() - new Date(dateStr)) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const mapNotificationItem = (n) => {
        const type = (n.notificationType || n.eventType || '').toLowerCase();
        const isFollow = type.includes('follow');
        const isConnectionReq = type.includes('connection');
        const isReaction = type.includes('reaction') || type.includes('like');
        const isComment = type.includes('comment');
        const isMention = type.includes('mention');
        const isCommunityInvite = type.includes('community') || type.includes('invite');

        let icon = 'notifications';
        let color = 'text-slate-400';
        let bg = 'bg-slate-500/10';
        let category = 'System';

        if (isCommunityInvite) {
            icon = 'group_add';
            color = 'text-indigo-500';
            bg = 'bg-indigo-500/10';
            category = 'Connections';
        } else if (isFollow || isConnectionReq) {
            icon = isConnectionReq ? 'connect_without_contact' : 'person_add';
            color = 'text-indigo-500';
            bg = 'bg-indigo-500/10';
            category = 'Connections';
        } else if (isReaction) {
            icon = 'favorite';
            color = 'text-rose-500';
            bg = 'bg-rose-500/10';
            category = 'Reactions';
        } else if (isComment) {
            icon = 'chat_bubble';
            color = 'text-blue-500';
            bg = 'bg-blue-500/10';
            category = 'Comments';
        } else if (isMention) {
            icon = 'alternate_email';
            color = 'text-purple-500';
            bg = 'bg-purple-500/10';
            category = 'Mentions';
        }

        const senderName = n.senderName || n.actorName || 'System';
        const senderAvatar = resolveMediaUrl(n.senderAvatar) || (senderName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=6366f1&color=fff` : null);
        const dateVal = n.createdAt || n.createdDate;
        const targetCommunityId = n.referenceId || n.relatedContentId;
        const resolvedTargetUrl = n.targetUrl || (isCommunityInvite && targetCommunityId ? `/community/view?id=${targetCommunityId}` : null);

        return {
            id: n.notificationId || n.id,
            category,
            type: isCommunityInvite ? 'community_invite' : (isConnectionReq ? 'follow_request' : (isFollow ? 'follow' : type)),
            title: n.title || (isCommunityInvite ? 'Community Invitation' : (isFollow ? 'New Follower' : (isConnectionReq ? 'Connection Request' : 'Notification'))),
            text: n.message,
            targetUrl: resolvedTargetUrl,
            createdDate: dateVal,
            time: formatRelativeTime(dateVal),
            unread: !n.isRead,
            icon,
            color,
            bg,
            senderUserId: n.senderUserId || n.referenceId || n.relatedContentId || n.actorUserId,
            senderName,
            senderAvatar,
            handled: n.isRead,
            status: 'pending'
        };
    };

    const fetchNotifications = async () => {
        try {
            const res = await notificationsApi.getAll(false);
            if (Array.isArray(res)) {
                setAllNotifs(res.map(mapNotificationItem));
            } else if (res?.items) {
                setAllNotifs(res.items.map(mapNotificationItem));
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const token = localStorage.getItem('knome_jwt');
        if (!token) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5095/hubs/notifications", {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveNotification", (notification) => {
            const mapped = mapNotificationItem(notification);
            mapped.time = 'Just now';
            mapped.unread = true;
            setAllNotifs(prev => [mapped, ...prev]);
            setToastNotification(mapped);
            playChimeSound();
        });

        connection.start().catch(err => {
            const msg = err?.message?.toLowerCase() || '';
            if (err?.name !== 'AbortError' && !msg.includes('negotiation') && !msg.includes('handshake') && !msg.includes('stopped')) {
                console.error("SignalR Connection Error: ", err);
            }
        });

        return () => {
            connection.stop().catch(() => {});
        };
    }, [currentUser]);

    const notifications = allNotifs.filter(n => {
        const matchesCategory = activeNotifFilter === 'All' || n.category === activeNotifFilter;
        const matchesQuery = !notifSearchQuery || n.text?.toLowerCase().includes(notifSearchQuery.toLowerCase()) || n.senderName?.toLowerCase().includes(notifSearchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    const unreadCount = allNotifs.filter(n => n.unread).length;

    const markAllRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setAllNotifs(prev => prev.map(n => ({ ...n, unread: false, handled: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (notif.unread) {
            try {
                await notificationsApi.markRead(notif.id);
                setAllNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false, handled: true } : n));
            } catch (err) {
                console.error('Failed to mark notification read:', err);
            }
        }
        setIsNotifOpen(false);
        if (notif.targetUrl) {
            navigate(notif.targetUrl);
        } else if (notif.senderUserId) {
            navigate(`/profile/${notif.senderUserId}`);
        }
    };

    const handleDeleteNotification = async (e, notifId) => {
        e.stopPropagation();
        try {
            await notificationsApi.delete(notifId);
            setAllNotifs(prev => prev.filter(n => n.id !== notifId));
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const handleApproveFollowRequest = async (e, notifId, approve) => {
        e.stopPropagation();
        const targetNotif = allNotifs.find(n => n.id === notifId);
        if (!targetNotif) return;

        const targetId = targetNotif.senderUserId || targetNotif.relatedContentId || targetNotif.id;

        // Optimistic UI state update
        setAllNotifs(prev => prev.map(n => {
            if (n.id === notifId) {
                return {
                    ...n,
                    unread: false,
                    handled: true,
                    status: approve ? 'approved' : 'declined',
                    text: approve ? `You accepted connection request from ${n.senderName || 'user'}.` : `You declined connection request from ${n.senderName || 'user'}.`
                };
            }
            return n;
        }));

        try {
            if (approve) {
                await profileApi.acceptConnection(targetId);
            } else {
                await profileApi.rejectConnection(targetId);
            }
            window.dispatchEvent(new CustomEvent('network-updated'));
        } catch (error) {
            console.error("Failed to update connection request", error);
        }
    };

    const handleApproveRequest = () => {};
    const handleFollowBack = (e, notif) => {
        e.stopPropagation();
        if (notif.senderUserId) {
            profileApi.follow(notif.senderUserId).catch(err => console.error("Failed to follow back", err));
        }
    };

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
    if (['SYSADM', 'HRADM'].includes(currentUser.role)) {
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
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-10 py-2 text-[13.5px] font-medium rounded-full outline-none transition-all focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                                color: 'var(--text-primary)',
                                backdropFilter: 'blur(12px)',
                            }}
                        />
                        {searchQuery && (
                            <button
                                onMouseDown={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        )}

                        {/* Search Overlay Dropdown (YouTube-style) */}
                        {showSuggestions && (
                            <div className="absolute top-12 left-0 w-full rounded-2xl overflow-hidden shadow-2xl py-2 z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.97)' : 'rgba(255,255,255,0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: 'var(--shadow-premium)'
                                }}>
                                
                                {/* Mode A: Real-time Suggestions while typing */}
                                {searchQuery.trim() !== '' ? (
                                    isSearchingSuggestions ? (
                                        <div className="px-4 py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <span className="text-[12px] font-medium">Searching...</span>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                                            <div className="px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                                Matching Suggestions
                                            </div>
                                            {suggestions.map((item, idx) => {
                                                const resolvedThumb = resolveMediaUrl(item.thumbnailUrl);
                                                const isHighlighted = idx === selectedIndex;
                                                return (
                                                    <button
                                                        key={`${item.contentType}-${item.id}-${idx}`}
                                                        onMouseDown={() => handleSearch(item.title)}
                                                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${isHighlighted ? 'bg-blue-500/15' : 'hover:bg-blue-500/10'}`}
                                                    >
                                                        {resolvedThumb ? (
                                                            <img src={resolvedThumb} alt={item.title} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {item.contentType === 'User' ? '👤' : item.contentType === 'Community' ? '👥' : item.contentType === 'Video' ? '🎥' : '📄'}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-bold truncate leading-tight" style={{color: 'var(--text-primary)'}}>{item.title}</p>
                                                            <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                            {item.contentType}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-6 text-center text-[13px] text-slate-500">
                                            No matches for "{searchQuery}". Press Enter to search all results.
                                        </div>
                                    )
                                ) : (
                                    /* Mode B: Recent Searches & Trending Terms when empty/focused */
                                    <div className="flex flex-col gap-3 py-1">
                                        {/* Recent Searches */}
                                        {recentSearches.length > 0 && (
                                            <div>
                                                <div className="px-4 py-1 flex items-center justify-between">
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">history</span>
                                                        Recent Searches
                                                    </span>
                                                    <button 
                                                        onMouseDown={(e) => handleClearHistory(e, null)}
                                                        className="text-[10px] font-bold text-blue-500 hover:underline"
                                                    >
                                                        Clear All
                                                    </button>
                                                </div>
                                                {recentSearches.map((rec, idx) => (
                                                    <div 
                                                        key={`rec-${idx}`}
                                                        onMouseDown={() => handleSearch(rec.searchTerm)}
                                                        className="px-4 py-2 flex items-center justify-between hover:bg-blue-500/10 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="material-symbols-outlined text-[16px] text-slate-400">history</span>
                                                            <span className="text-[13px] font-semibold" style={{color: 'var(--text-primary)'}}>{rec.searchTerm}</span>
                                                        </div>
                                                        <button 
                                                            onMouseDown={(e) => handleClearHistory(e, rec.searchTerm)}
                                                            className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                                            title="Remove search"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Trending Searches */}
                                        {trendingSearches.length > 0 && (
                                            <div className="px-4 pt-1 pb-2">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
                                                    <span className="material-symbols-outlined text-[13px] text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>trending_up</span>
                                                    Trending Searches
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {trendingSearches.map((term, idx) => (
                                                        <button
                                                            key={`trend-${idx}`}
                                                            onMouseDown={() => handleSearch(term)}
                                                            className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 transition-all border border-slate-200 dark:border-slate-700"
                                                        >
                                                            🔥 {term}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
                            <span className="material-symbols-outlined text-[20px] text-theme-30-text" style={{fontVariationSettings:"'FILL' 1"}}>notifications</span>
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
                            <div className="absolute right-0 top-12 w-88 rounded-2xl overflow-hidden shadow-2xl z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.97)' : 'rgba(255,255,255,0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.8)' : '0 24px 80px rgba(37,99,235,0.12), 0 4px 24px rgba(0,0,0,0.08)'
                                }}>
                                <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor: 'var(--border-mid)'}}>
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={markAllRead} className="text-[11px] font-bold text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">Mark all read</button>
                                        <button onClick={() => { setIsNotifSettingsOpen(true); setIsNotifOpen(false); }} className="text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">settings</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Category Filters */}
                                <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                                    {['All', 'Reactions', 'Comments', 'Connections', 'Mentions'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveNotifFilter(cat)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                                                activeNotifFilter === cat 
                                                    ? 'bg-blue-600 text-white shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Live Notification Search */}
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                        <input
                                            type="text"
                                            value={notifSearchQuery}
                                            onChange={(e) => setNotifSearchQuery(e.target.value)}
                                            placeholder="Search notifications..."
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.map(n => (
                                        <div 
                                            key={n.id} 
                                            onClick={() => handleNotificationClick(n)}
                                            className={`group relative flex flex-col gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${n.unread ? 'border-l-2 border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {n.senderAvatar ? (
                                                    <img 
                                                        src={n.senderAvatar} 
                                                        alt={n.senderName} 
                                                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.bg}`}>
                                                        <span className={`material-symbols-outlined text-[18px] ${n.color}`} style={{fontVariationSettings:"'FILL' 1"}}>{n.icon}</span>
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 truncate">{n.senderName || n.title}</span>
                                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">{n.time}</span>
                                                    </div>
                                                    <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-snug mt-0.5">{n.text}</p>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {n.unread && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                                    <button 
                                                        onClick={(e) => handleDeleteNotification(e, n.id)} 
                                                        title="Delete notification"
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded"
                                                    >
                                                        <span className="material-symbols-outlined text-[15px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action Buttons for Admin Join Requests */}
                                            {n.type === 'request' && !n.handled && (
                                                <div className="flex items-center gap-2 pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => handleApproveRequest(e, n.id, true)}
                                                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleApproveRequest(e, n.id, false)}
                                                        className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Action Buttons for Follow Requests */}
                                            {n.type === 'follow_request' && !n.handled && (
                                                <div className="flex items-center gap-2 pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => handleApproveFollowRequest(e, n.id, true)}
                                                        className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-600 transition-colors shadow-sm"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleApproveFollowRequest(e, n.id, false)}
                                                        className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Follow Back Button */}
                                            {n.type === 'follow_request' && n.handled && n.status === 'approved' && !n.followedBack && (
                                                <div className="flex items-center gap-2 pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => handleFollowBack(e, n)}
                                                        className="px-3 py-1 bg-pink-500/10 text-pink-500 rounded-lg text-[11px] font-bold hover:bg-pink-500/20 transition-colors border border-pink-500/20 shadow-sm"
                                                    >
                                                        Follow Back
                                                    </button>
                                                </div>
                                            )}

                                            {/* Action Button for Community Invitations */}
                                            {n.type === 'invite' && (
                                                <div className="pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsNotifOpen(false);
                                                            navigate('/community');
                                                        }}
                                                        className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-600 transition-colors shadow-sm flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">groups</span>
                                                        Join Community
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {notifications.length === 0 && (
                                        <div className="p-6 text-center text-xs text-slate-400">No notifications</div>
                                    )}
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
        {toastNotification && <NotificationToast notification={toastNotification} onClose={() => setToastNotification(null)} />}
        </>
    );
}
