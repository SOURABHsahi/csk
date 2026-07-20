import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import { useUser } from '../contexts/UserContext';

export default function Sidebar() {
    const { openPostModal } = useModal();
    const { currentUser } = useUser();
    const { pathname } = useLocation();

    const navItems = [
        { to: '/',                 icon: 'home',         label: 'Home',          color: '#6366f1' },
        { to: '/community',        icon: 'group',        label: 'Communities',   color: '#0ea5e9' },
        { to: '/suggested-people', icon: 'person_add',   label: 'People',        color: '#10b981' },
        { to: '/saved-content',    icon: 'bookmark',     label: 'Saved',         color: '#f59e0b' },
        { to: '/search',           icon: 'search',       label: 'Discover',      color: '#8b5cf6' },
    ];

    if (['SYSADM', 'HRADM', 'CADM'].includes(currentUser.role)) {
        navItems.push({ to: '/hr-analytics', icon: 'bar_chart', label: 'HR Analytics', color: '#ef4444' });
    }

    const quickLinks = [
        { to: '/posts',    label: 'Posts',     icon: 'dynamic_feed', color: '#6366f1' },
        { to: '/articles', label: 'Articles',  icon: 'article',      color: '#0ea5e9' },
        { to: '/videos',   label: 'Videos',    icon: 'videocam',     color: '#ef4444' },
        { to: '/podcasts', label: 'Podcasts',  icon: 'podcasts',     color: '#8b5cf6' },
        { to: '/jobs',     label: 'Jobs',      icon: 'work',         color: '#10b981' },
    ];

    return (
        <aside className="w-58 h-[calc(100vh-6rem)] sticky top-24 hidden md:flex flex-col gap-3 shrink-0" style={{width: '228px'}}>

            {/* User Profile Card */}
            <Link to="/profile" className="block">
                <div className="rounded-2xl p-4 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}>
                    {/* Orb decorations */}
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10 pointer-events-none"
                        style={{background: 'radial-gradient(circle, #6366f1, transparent 70%)'}}></div>
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-[0.08] pointer-events-none"
                        style={{background: 'radial-gradient(circle, #ec4899, transparent 70%)'}}></div>

                    <div className="relative z-10 flex items-center gap-3 mb-3">
                        <div className="relative shrink-0">
                            <img className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md" alt="Avatar" src={currentUser.avatar} />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"></div>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-[14px] truncate leading-tight" style={{color: 'var(--text-primary)'}}>{currentUser.name.split(' ')[0]}</h3>
                            <p className="text-[11px] truncate font-medium" style={{color: 'var(--text-secondary)'}}>{currentUser.roleName}</p>
                            <p className="text-[10px] font-semibold mt-0.5 truncate" style={{color: 'var(--text-muted)'}}>{currentUser.department}</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="relative z-10 grid grid-cols-3 gap-2 pt-2.5 border-t" style={{borderColor: 'var(--border-subtle)'}}>
                        <div className="text-center">
                            <p className="text-[13px] font-black" style={{color: 'var(--text-primary)'}}>1.2k</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold" style={{color: 'var(--text-muted)'}}>Points</p>
                        </div>
                        <div className="text-center border-x" style={{borderColor: 'var(--border-subtle)'}}>
                            <p className="text-[13px] font-black" style={{color: 'var(--text-primary)'}}>84</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold" style={{color: 'var(--text-muted)'}}>Posts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[13px] font-black" style={{color: 'var(--text-primary)'}}>312</p>
                            <p className="text-[9px] uppercase tracking-wider font-bold" style={{color: 'var(--text-muted)'}}>Network</p>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Navigation */}
            <nav className="flex flex-col gap-0.5 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest px-3 mb-1" style={{color: 'var(--text-muted)'}}>Menu</p>
                {navItems.map(item => {
                    const isActive = pathname === item.to;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
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
            {currentUser.role !== 'SYSADM' && (
                <button
                    onClick={openPostModal}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]"
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
                    {quickLinks.map(link => (
                        <Link key={link.to} to={link.to}
                            className="flex flex-row items-center gap-3 p-1.5 rounded-lg transition-all hover:translate-x-1 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            title={link.label}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{background: `${link.color}15`}}>
                                <span className="material-symbols-outlined text-[16px]" style={{color: link.color}}>{link.icon}</span>
                            </div>
                            <span className="text-[12px] font-bold" style={{color: 'var(--text-secondary)'}}>{link.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

        </aside>
    );
}
