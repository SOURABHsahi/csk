import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import { useUser } from '../contexts/UserContext';
import { resolveMediaUrl } from '../../utils/apiService';

export default function Sidebar() {
    const { openPostModal } = useModal();
    const { currentUser } = useUser();
    const { pathname } = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Listen for mobile sidebar open/toggle events
    useEffect(() => {
        const toggleMobile = () => setIsMobileOpen(prev => !prev);
        const openMobile = () => setIsMobileOpen(true);
        const closeMobile = () => setIsMobileOpen(false);

        window.addEventListener('knome_toggle_mobile_sidebar', toggleMobile);
        window.addEventListener('knome_open_mobile_sidebar', openMobile);
        window.addEventListener('knome_close_mobile_sidebar', closeMobile);

        return () => {
            window.removeEventListener('knome_toggle_mobile_sidebar', toggleMobile);
            window.removeEventListener('knome_open_mobile_sidebar', openMobile);
            window.removeEventListener('knome_close_mobile_sidebar', closeMobile);
        };
    }, []);

    // Auto-close mobile drawer when route changes
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile drawer is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileOpen]);

    const isItemActive = (item) => {
        if (item.matchPaths && Array.isArray(item.matchPaths)) {
            return item.matchPaths.some(p => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));
        }
        return item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(item.to + '/');
    };

    const navItems = [
        { to: '/',                 icon: 'home',         label: 'Home',          color: '#6366f1' },
        { to: '/community',        icon: 'group',        label: 'Communities',   color: '#0ea5e9', matchPaths: ['/community', '/communities'] },
        { to: '/suggested-people', icon: 'person_add',   label: 'People',        color: '#10b981', matchPaths: ['/suggested-people', '/network'] },
        { to: '/saved-content',    icon: 'bookmark',     label: 'Saved',         color: '#f59e0b' },
        { to: '/search',           icon: 'search',       label: 'Discover',      color: '#8b5cf6' },
    ];

    const isSysAdmin = currentUser?.role === 'SYSADM' ||
                       ['System Administrator', 'System Admin'].includes(currentUser?.roleName) ||
                       (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'System Administrator', 'SystemAdmin'].includes(r)));

    const isHrOrSysAdmin = ['SYSADM', 'HRADM'].includes(currentUser?.role) ||
                           ['System Administrator', 'HR Administrator', 'System Admin', 'HR Admin'].includes(currentUser?.roleName) ||
                           (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'HRADM', 'System Administrator', 'HR Administrator', 'SystemAdmin', 'HRAdmin'].includes(r)));

    if (isSysAdmin) {
        navItems.push({ to: '/admin-console', icon: 'admin_panel_settings', label: 'Admin Console', color: '#f43f5e' });
    }
    if (isHrOrSysAdmin) {
        navItems.push({ to: '/hr-analytics', icon: 'bar_chart', label: 'HR Analytics', color: '#ef4444' });
    }

    const quickLinks = [
        { to: '/posts',    label: 'Posts',     icon: 'dynamic_feed', color: '#6366f1' },
        { to: '/articles', label: 'Articles',  icon: 'article',      color: '#0ea5e9', matchPaths: ['/articles', '/article-view'] },
        { to: '/videos',   label: 'Videos',    icon: 'videocam',     color: '#ef4444' },
        { to: '/podcasts', label: 'Podcasts',  icon: 'podcasts',     color: '#8b5cf6' },
        { to: '/jobs',     label: 'Openings',  icon: 'work',         color: '#10b981' },
    ];

    const userAvatar = resolveMediaUrl(currentUser?.profilePhotoUrl) || currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff';
    const userName = currentUser?.fullName || currentUser?.name || 'Employee';
    const userRole = currentUser?.roleName || currentUser?.role || 'Member';
    const userDept = currentUser?.department || currentUser?.departmentName || 'MPOnline';
    const userKarma = (currentUser?.karmaPoints ?? currentUser?.karma ?? 0).toLocaleString();
    const userPosts = currentUser?.postsCount ?? 0;
    const userFollowers = currentUser?.followersCount ?? 0;

    const renderSidebarContent = (isMobile = false) => (
        <>
            {/* User Profile Card */}
            <Link to="/profile" className="block" onClick={() => isMobile && setIsMobileOpen(false)}>
                <div className="rounded-2xl p-4 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer bg-theme-60-surface border border-theme-30 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                    {/* Orb decorations */}
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10 pointer-events-none"
                        style={{background: 'radial-gradient(circle, #6366f1, transparent 70%)'}}></div>
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-[0.08] pointer-events-none"
                        style={{background: 'radial-gradient(circle, #ec4899, transparent 70%)'}}></div>

                    <div className="relative z-10 flex items-center gap-3 mb-3">
                        <div className="relative shrink-0">
                            <img 
                                className="w-12 h-12 rounded-full object-cover border-2 border-theme-60-surface shadow-md" 
                                alt="Avatar" 
                                src={userAvatar} 
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
                                }}
                            />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-theme-60-surface"></div>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-[14px] truncate leading-tight text-slate-900 dark:text-white">{userName.split(' ')[0]}</h3>
                            <p className="text-[11px] truncate font-medium text-theme-30-text">{userRole}</p>
                            <p className="text-[10px] font-semibold mt-0.5 truncate text-theme-30-text opacity-70">{userDept}</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className={`relative z-10 grid ${currentUser?.role === 'SYSADM' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 pt-2.5 border-t border-theme-30`}>
                        {currentUser?.role !== 'SYSADM' && (
                            <div className="text-center">
                                <p className="text-[13px] font-black text-slate-900 dark:text-white">{userKarma}</p>
                                <p className="text-[9px] uppercase tracking-wider font-bold text-theme-30-text">Points</p>
                            </div>
                        )}
                        <div className={`text-center ${currentUser?.role !== 'SYSADM' ? 'border-x border-theme-30' : ''}`}>
                            <p className="text-[13px] font-black text-slate-900 dark:text-white">{userPosts}</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold text-theme-30-text">Posts</p>
                        </div>
                        <div className={`text-center ${currentUser?.role === 'SYSADM' ? 'border-l border-theme-30' : ''}`}>
                            <p className="text-[13px] font-black text-slate-900 dark:text-white">{userFollowers}</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold text-theme-30-text">Followers</p>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Navigation */}
            <nav className="flex flex-col gap-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest px-3 mb-1" style={{color: 'var(--text-muted)'}}>Menu</p>
                {navItems.map(item => {
                    const isActive = isItemActive(item);
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => isMobile && setIsMobileOpen(false)}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive ? '' : 'hover:translate-x-0.5'}`}
                            style={isActive ? {
                                background: `${item.color}18`,
                                border: `1px solid ${item.color}35`,
                            } : {
                                border: '1px solid transparent',
                            }}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{background: item.color}}></div>
                            )}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                                style={{
                                    background: isActive ? `${item.color}20` : 'var(--bg-surface)',
                                }}>
                                <span className="material-symbols-outlined text-[17px]"
                                    style={{
                                        color: isActive ? item.color : 'var(--text-secondary)',
                                        fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                    }}>
                                    {item.icon}
                                </span>
                            </div>
                            <span className="text-[13px] font-bold transition-colors duration-200 truncate"
                                style={{color: isActive ? item.color : 'var(--text-secondary)'}}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Create Post CTA */}
            {currentUser?.role !== 'SYSADM' && (
                <button
                    onClick={() => {
                        if (isMobile) setIsMobileOpen(false);
                        openPostModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] cursor-pointer"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                    }}>
                    <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>add_circle</span>
                    Create Post
                </button>
            )}

            {/* Quick Links */}
            <div className="rounded-xl p-3"
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)'
                }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 px-1" style={{color: 'var(--text-muted)'}}>Quick Access</p>
                <div className="flex flex-col gap-1">
                    {quickLinks.map(link => {
                        const isActive = isItemActive(link);
                        return (
                            <Link key={link.to} to={link.to}
                                onClick={() => isMobile && setIsMobileOpen(false)}
                                className={`flex flex-row items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200 group relative ${
                                    isActive ? 'shadow-xs' : 'hover:translate-x-0.5 hover:bg-theme-30-hover'
                                }`}
                                style={isActive ? {
                                    background: `${link.color}18`,
                                    border: `1px solid ${link.color}35`,
                                } : {
                                    border: '1px solid transparent',
                                }}
                                title={link.label}>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{background: link.color}}></div>
                                )}
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                                    style={{
                                        background: isActive ? `${link.color}28` : `${link.color}15`,
                                        boxShadow: isActive ? `0 2px 8px ${link.color}25` : 'none'
                                    }}>
                                    <span className="material-symbols-outlined text-[17px] transition-all"
                                        style={{
                                            color: link.color,
                                            fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"
                                        }}>
                                        {link.icon}
                                    </span>
                                </div>
                                <span className="text-[12px] font-bold transition-colors truncate"
                                    style={{
                                        color: isActive ? link.color : 'var(--text-secondary)'
                                    }}>
                                    {link.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* 1. Desktop Sticky Sidebar */}
            <aside className="w-58 sticky top-24 hidden md:flex flex-col gap-3 shrink-0" style={{width: '228px'}}>
                {renderSidebarContent(false)}
            </aside>

            {/* 2. Mobile Slide-Out Drawer (Accessible via Hamburger & Bottom Bar) */}
            {isMobileOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    {/* Backdrop */}
                    <div 
                        onClick={() => setIsMobileOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
                    />

                    {/* Slide Drawer Content */}
                    <div className="fixed top-0 left-0 bottom-0 w-[290px] max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl p-4 overflow-y-auto z-10 flex flex-col gap-3.5 custom-scrollbar">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-[16px]">hub</span>
                                </div>
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Knome Menu</span>
                            </div>
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Close Sidebar"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {renderSidebarContent(true)}
                    </div>
                </div>
            )}

            {/* 3. Mobile Bottom Action Bar (Fixed at bottom for 1-tap mobile navigation) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 py-1.5 flex items-center justify-around shadow-lg">
                <Link to="/" className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition-colors ${pathname === '/' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: pathname === '/' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
                    <span className="text-[10px]">Home</span>
                </Link>

                <Link to="/community" className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition-colors ${pathname.startsWith('/community') ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: pathname.startsWith('/community') ? "'FILL' 1" : "'FILL' 0" }}>group</span>
                    <span className="text-[10px]">Groups</span>
                </Link>

                {/* Center Create Post Floating Action Button */}
                {currentUser?.role !== 'SYSADM' && (
                    <button
                        onClick={openPostModal}
                        className="w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/35 active:scale-95 transition-transform cursor-pointer"
                        title="Create Post"
                        aria-label="Create Post"
                    >
                        <span className="material-symbols-outlined text-[24px]">add</span>
                    </button>
                )}

                <Link to="/videos" className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition-colors ${pathname.startsWith('/videos') ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: pathname.startsWith('/videos') ? "'FILL' 1" : "'FILL' 0" }}>videocam</span>
                    <span className="text-[10px]">Videos</span>
                </Link>

                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="flex flex-col items-center gap-0.5 p-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Open Full Sidebar"
                >
                    <span className="material-symbols-outlined text-[20px]">menu</span>
                    <span className="text-[10px]">Menu</span>
                </button>
            </div>
        </>
    );
}

