import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import CreatePostModal from '../components/modals/CreatePostModal';
import PostCard from '../components/widgets/PostCard';
import HotPostsWidget from '../components/widgets/HotPostsWidget';
import MyCommunitiesWidget from '../components/widgets/MyCommunitiesWidget';
import TrendingTagsWidget from '../components/widgets/TrendingTagsWidget';
import PeopleYouMayKnowWidget from '../components/widgets/PeopleYouMayKnowWidget';
import TextScramble from '../components/ui/TextScramble';
import ScrollExpandMedia from '../components/ui/scroll-expansion-hero';
import { BackgroundPaths } from '../components/ui/background-paths';
import { dashboardApi, karmaApi, mapFeedItem, resolveMediaUrl } from '../utils/apiService';

export default function Dashboard() {
    const navigate = useNavigate();
    const { currentUser } = useUser();
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [posts, setPosts] = useState([]);
    const [greeting, setGreeting] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [userKarma, setUserKarma] = useState(currentUser?.karma || 0);
    const [showHero, setShowHero] = useState(false);

    const [activeFilter, setActiveFilter] = useState('All');
    const [announcements, setAnnouncements] = useState([]);

    const isSysAdmin = currentUser?.role === 'SYSADM' || 
                       currentUser?.roleName === 'System Administrator' || 
                       (Array.isArray(currentUser?.roles) && (currentUser.roles.includes('SYSADM') || currentUser.roles.includes('System Administrator') || currentUser.roles.includes('SystemAdmin')));

    useEffect(() => {
        if (currentUser?.karma !== undefined) {
            setUserKarma(currentUser.karma);
        }
        const loadKarma = async () => {
            try {
                const bal = await karmaApi.getMyBalance();
                if (bal && typeof bal.totalPoints === 'number') {
                    setUserKarma(bal.totalPoints);
                }
            } catch {
                /* fallback */
            }
        };
        loadKarma();

        // Load HR Broadcast Announcements (FR-DB-05)
        dashboardApi.getAnnouncements().then(res => {
            if (Array.isArray(res)) setAnnouncements(res);
            else if (res?.items) setAnnouncements(res.items);
        }).catch(() => {});
    }, [currentUser?.userId, currentUser?.employeeId, currentUser?.karma]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const loadPosts = async (filterType = activeFilter) => {
        setIsLoading(true);
        try {
            const data = await dashboardApi.getFeed(filterType);
            if (data && Array.isArray(data)) {
                const mapped = data.map(mapFeedItem);
                const postsAndArticlesOnly = mapped.filter(item => {
                    const type = (item.type || item.contentType || '').toLowerCase();
                    if (type === 'video' || type === 'podcast') return false;
                    return true;
                });
                setPosts(postsAndArticlesOnly);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error('Failed to load feed:', err);
            setPosts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (filterId) => {
        setActiveFilter(filterId);
        loadPosts(filterId);
    };

    const handlePostCreated = (e) => {
        const newPostData = e?.detail || e;
        if (newPostData && (newPostData.id || newPostData.postId)) {
            const mapped = mapFeedItem(newPostData);
            setPosts(prev => {
                const targetId = mapped.id;
                if (prev.some(p => p.id === targetId)) return prev;
                return [mapped, ...prev];
            });
        }
        dashboardApi.getFeed(activeFilter).then(data => {
            if (data && Array.isArray(data)) {
                const mapped = data.map(mapFeedItem);
                const postsAndArticlesOnly = mapped.filter(item => {
                    const type = (item.type || item.contentType || '').toLowerCase();
                    if (type === 'video' || type === 'podcast') return false;
                    return true;
                });
                setPosts(postsAndArticlesOnly);
            }
        }).catch(() => {});
    };

    const handlePostDeleted = (e) => {
        const deletedId = e?.detail?.id || e;
        if (deletedId) {
            setPosts(prev => prev.filter(p => p.id !== deletedId));
        }
    };

    useEffect(() => {
        loadPosts('All');
        window.addEventListener('post-created', handlePostCreated);
        window.addEventListener('post-deleted', handlePostDeleted);
        return () => {
            window.removeEventListener('post-created', handlePostCreated);
            window.removeEventListener('post-deleted', handlePostDeleted);
        };
    }, []);

    return (
        <>
            <div className="flex-1 min-w-0 flex flex-col xl:flex-row gap-6 pb-6">
                {/* Main Feed Column */}
                <main className="flex-1 min-w-0 flex flex-col gap-5">

                    {/* Greeting Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest mb-0.5" style={{color: 'var(--text-muted)'}}>
                                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <h1 className="text-2xl font-black tracking-tight mb-1" style={{color: 'var(--text-primary)'}}>
                                {greeting}, <span style={{background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>{currentUser.name.split(' ')[0]}</span> 👋
                            </h1>
                            <TextScramble 
                                className="text-sm font-semibold tracking-wide text-theme-30-text bg-theme-30/10 px-2 py-0.5 rounded-md"
                                phrases={[
                                    'Discover Your Knowledge Feed',
                                    'See What Your Network Is Up To',
                                    'Collaborate With Your Peers',
                                    'Learn Something New Today'
                                ]} 
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {!isSysAdmin && (
                                <button 
                                    onClick={() => navigate('/karma-history')}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer hover:scale-105 transition-all shadow-xs"
                                    style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)'}}
                                    title="View Karma Points & History"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-amber-500" style={{fontVariationSettings:"'FILL' 1"}}>military_tech</span>
                                    {userKarma.toLocaleString()} Karma Points
                                </button>
                            )}
                        </div>
                    </div>

                    {/* HR Organization Announcement Banner (FR-DB-05) */}
                    {announcements && announcements.length > 0 && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex items-start gap-3 shadow-xs">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>campaign</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-md">HR Broadcast</span>
                                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">• Organization Announcement</span>
                                </div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{announcements[0].title || announcements[0].message}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">{announcements[0].content || announcements[0].details || announcements[0].message}</p>
                            </div>
                        </div>
                    )}

                    {/* Interactive Background Paths Hero Showcase */}
                    {showHero && (
                        <div className="flex flex-col gap-4">
                            <BackgroundPaths 
                                title="Discover Excellence" 
                                subtitle="Welcome to Knome — the enterprise knowledge & collaboration hub for MPOnline Limited"
                                buttonText="Create New Post"
                                onButtonClick={() => setIsCreatePostOpen(true)}
                            />
                            <ScrollExpandMedia
                                mediaType="image"
                                mediaSrc="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1280&auto=format&fit=crop"
                                bgImageSrc="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1920&auto=format&fit=crop"
                                title="Knome Knowledge Hub"
                                date="MPOnline Enterprise Platform"
                                scrollToExpand="Scroll to Expand Interactive View"
                                textBlend={true}
                            >
                                <div className="max-w-4xl mx-auto text-white">
                                    <h3 className="text-2xl font-bold mb-3 text-indigo-200">Enterprise Innovation & Knowledge Exchange</h3>
                                    <p className="text-slate-200 leading-relaxed font-medium text-sm sm:text-base">
                                        Connect with team members, publish technical articles, participate in community discussions, and explore curated media channels.
                                    </p>
                                </div>
                            </ScrollExpandMedia>
                        </div>
                    )}

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
                                    <img 
                                        className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white dark:border-slate-800" 
                                        alt="Avatar" 
                                        src={resolveMediaUrl(currentUser?.profilePhotoUrl) || currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || currentUser?.fullName || 'User')}&background=6366f1&color=fff`} 
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || currentUser?.fullName || 'User')}&background=6366f1&color=fff`;
                                        }}
                                    />
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
                                    { icon: 'article', label: 'Article', color: '#8b5cf6' },
                                    { icon: 'description', label: 'Document', color: '#3b82f6' },
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
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                Loading feed...
                            </div>
                        ) : posts.length > 0 ? (
                            posts.map((post, idx) => (
                                <PostCard key={post.id ? `${post.id}-${idx}` : idx} post={post} onPostDeleted={(deletedId) => {
                                    if (deletedId) setPosts(prev => prev.filter(p => p.id !== deletedId && p.postId !== deletedId));
                                    loadPosts(activeFilter);
                                }} />
                            ))
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">find_in_page</span>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No content found for '{activeFilter}'</h4>
                                <p className="text-xs text-slate-400 mt-1">Try switching to 'All Posts' to view the full enterprise timeline.</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Sidebar Widgets */}
                <aside className="w-full xl:w-[340px] shrink-0 flex flex-col gap-5">
                    <MyCommunitiesWidget />
                    <HotPostsWidget />

                    {/* Trending Tags Widget */}
                    <TrendingTagsWidget />

                    {/* People You May Know */}
                    <PeopleYouMayKnowWidget />
                </aside>
            </div>

            <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} onPostCreated={() => loadPosts(500)} />
        </>
    );
}
