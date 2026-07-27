import React, { useState, useEffect } from 'react';
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
import { dashboardApi, mapFeedItem } from '../utils/apiService';

export default function Dashboard() {
    const { currentUser } = useUser();
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [posts, setPosts] = useState([]);
    const [greeting, setGreeting] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [showHero, setShowHero] = useState(false);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const data = await dashboardApi.getFeed('All');
            if (data && Array.isArray(data)) {
                setPosts(data.map(mapFeedItem));
            }
        } catch (err) {
            console.error('Failed to load feed:', err);
        } finally {
            setIsLoading(false);
        }
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
                            <button
                                onClick={() => setShowHero(!showHero)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/20">
                                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                {showHero ? 'Close Hero' : 'Explore Hero'}
                            </button>
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold"
                                style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)'}}>
                                <span className="material-symbols-outlined text-[16px] text-amber-500" style={{fontVariationSettings:"'FILL' 1"}}>military_tech</span>
                                1,250 Karma Points
                            </div>
                        </div>
                    </div>

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
