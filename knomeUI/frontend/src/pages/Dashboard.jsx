import React, { useState, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import CreatePostModal from '../components/modals/CreatePostModal';
import PostCard from '../components/widgets/PostCard';
import HotPostsWidget from '../components/widgets/HotPostsWidget';
import { getPosts } from '../utils/mockPosts';

export default function Dashboard() {
    const { currentUser } = useUser();
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [posts, setPosts] = useState([]);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const loadPosts = async (delay = 0) => {
        if (delay) await new Promise(r => setTimeout(r, delay));
        const data = await getPosts();
        setPosts(data || []);
    };

    useEffect(() => {
        loadPosts();
    }, []);

    return (
        <>
            <div className="flex-1 min-w-0 flex flex-col xl:flex-row gap-6 pb-32">
                {/* Main Feed Column */}
                <main className="flex-1 min-w-0 flex flex-col gap-5">

                    {/* Greeting Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest mb-0.5" style={{color: 'var(--text-muted)'}}>
                                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <h1 className="text-2xl font-black tracking-tight" style={{color: 'var(--text-primary)'}}>
                                {greeting}, <span style={{background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>{currentUser.name.split(' ')[0]}</span> 👋
                            </h1>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold"
                            style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)'}}>
                            <span className="material-symbols-outlined text-[16px] text-amber-500" style={{fontVariationSettings:"'FILL' 1"}}>military_tech</span>
                            1,250 Karma Points
                        </div>
                    </div>

                    {/* Premium Org Announcement Banner */}
                    <div className="relative w-full rounded-2xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 45%, #db2777 100%)',
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(255,255,255,0.1)'
                        }}>
                        {/* Animated orb effects */}
                        <div className="absolute -top-16 right-4 w-56 h-56 rounded-full opacity-20 pointer-events-none animate-pulse"
                            style={{background: 'radial-gradient(circle, #f43f5e, transparent 70%)'}}></div>
                        <div className="absolute -bottom-10 left-0 w-40 h-40 rounded-full opacity-15 pointer-events-none"
                            style={{background: 'radial-gradient(circle, #06b6d4, transparent 70%)'}}></div>
                        <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'}}></div>

                        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center">
                            {/* Icon */}
                            <div className="hidden md:flex w-16 h-16 rounded-2xl items-center justify-center shrink-0"
                                style={{background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)'}}>
                                <span className="material-symbols-outlined text-white text-[32px]" style={{fontVariationSettings:"'FILL' 1"}}>event</span>
                            </div>

                            <div className="text-center md:text-left flex-1">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                        style={{background: 'rgba(255,255,255,0.2)', color: '#fce7f3', backdropFilter: 'blur(4px)'}}>
                                        📢 Announcement
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-300"
                                        style={{background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)'}}>
                                        Registration Open
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 tracking-tight">Annual Tech Symposium 2026</h2>
                                <p className="font-medium text-sm max-w-xl leading-relaxed text-indigo-100">
                                    Join us for our flagship internal engineering event. 3 days of workshops, talks, and innovation.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto shrink-0">
                                {['SYSADM', 'HRADM'].includes(currentUser.role) && (
                                    <button className="flex-1 md:flex-none px-4 py-2.5 font-bold rounded-xl transition-all whitespace-nowrap text-xs text-white hover:bg-white/20"
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                        Manage
                                    </button>
                                )}
                                <button className="flex-1 md:flex-none px-6 py-2.5 font-black rounded-xl transition-all whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg text-sm text-indigo-700 bg-white"
                                    style={{boxShadow: '0 4px 14px rgba(255,255,255,0.25)'}}>
                                    Register Now →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Create Post Composer */}
                    {currentUser.role !== 'SYSADM' && (
                        <div className="rounded-2xl overflow-hidden"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                            }}>
                            {/* Top row */}
                            <div
                                onClick={() => setIsCreatePostOpen(true)}
                                className="flex items-center gap-3 p-4 cursor-pointer group">
                                <div className="relative shrink-0">
                                    <img className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white dark:border-slate-800" alt="Avatar" src={currentUser.avatar} />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"></div>
                                </div>
                                <div className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-colors group-hover:ring-1 group-hover:ring-indigo-300"
                                    style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-subtle)'
                                    }}>
                                    What's on your mind, {currentUser.name.split(' ')[0]}?
                                </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex items-center border-t px-4 py-2 gap-1" style={{borderColor: 'var(--border-subtle)'}}>
                                {[
                                    { icon: 'image', label: 'Photo', color: '#10b981' },
                                    { icon: 'videocam', label: 'Video', color: '#ef4444' },
                                    { icon: 'article', label: 'Article', color: '#8b5cf6' },
                                    { icon: 'emoji_emotions', label: 'Feeling', color: '#f59e0b' },
                                ].map(btn => (
                                    <button
                                        key={btn.label}
                                        onClick={() => setIsCreatePostOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex-1 justify-center"
                                        style={{color: 'var(--text-secondary)'}}>
                                        <span className="material-symbols-outlined text-[16px]" style={{color: btn.color}}>{btn.icon}</span>
                                        <span className="hidden sm:inline">{btn.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Post Feed */}
                    <div className="flex flex-col gap-5">
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} onPostDeleted={() => loadPosts(500)} />
                        ))}
                    </div>
                </main>

                {/* Right Sidebar Widgets */}
                <aside className="w-full xl:w-[340px] shrink-0 flex flex-col gap-5">
                    <HotPostsWidget />

                    {/* Trending Tags Widget */}
                    <div className="rounded-2xl p-5"
                        style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
                        <h3 className="text-[14px] font-black mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                            <span className="material-symbols-outlined text-[18px] text-indigo-500" style={{fontVariationSettings:"'FILL' 1"}}>trending_up</span>
                            Trending Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { tag: 'tech-symposium', color: '#6366f1' },
                                { tag: 'engineering', color: '#0ea5e9' },
                                { tag: 'design-system', color: '#8b5cf6' },
                                { tag: 'product', color: '#10b981' },
                                { tag: 'culture', color: '#f59e0b' },
                                { tag: 'Q4-planning', color: '#ef4444' },
                            ].map(({ tag, color }) => (
                                <span key={tag}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-105"
                                    style={{background: `${color}15`, color, border: `1px solid ${color}25`}}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* People You May Know */}
                    <div className="rounded-2xl p-5"
                        style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
                        <h3 className="text-[14px] font-black mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                            <span className="material-symbols-outlined text-[18px] text-pink-500" style={{fontVariationSettings:"'FILL' 1"}}>group_add</span>
                            People You May Know
                        </h3>
                        <div className="flex flex-col gap-3">
                            {[
                                { name: 'Meghna Tiwari', role: 'Lead Engineer', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', mutual: 12 },
                                { name: 'Mayur Verma', role: 'Data Analyst', avatar: 'https://randomuser.me/api/portraits/men/34.jpg', mutual: 7 },
                                { name: 'Priya Singh', role: 'UX Designer', avatar: 'https://randomuser.me/api/portraits/women/68.jpg', mutual: 5 },
                            ].map(person => (
                                <div key={person.name} className="flex items-center gap-3">
                                    <img src={person.avatar} alt={person.name} className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-800 shadow-sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold truncate" style={{color: 'var(--text-primary)'}}>{person.name}</p>
                                        <p className="text-[11px] truncate" style={{color: 'var(--text-muted)'}}>{person.role} · {person.mutual} mutual</p>
                                    </div>
                                    <button className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                                        style={{background: '#6366f115', color: '#6366f1', border: '1px solid #6366f130'}}>
                                        + Follow
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} onPostCreated={() => loadPosts(500)} />
        </>
    );
}
