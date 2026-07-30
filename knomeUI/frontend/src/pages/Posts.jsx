import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import PostCard from '../components/widgets/PostCard';
import CreatePostModal from '../components/modals/CreatePostModal';
import { postsApi, mapPost, getPersonalizedRecommendations } from '../utils/apiService';

export default function Posts() {
    const { currentUser } = useUser();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const targetPostId = queryParams.get('id') || queryParams.get('postId') || queryParams.get('highlight');
    
    // Core state
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('All');
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const data = await postsApi.getPosts(null, null, 1, 100);
            let mapped = data ? data.map(mapPost) : [];
            
            // If target post ID is specified via notification link, ensure it is fetched and prioritized
            if (targetPostId) {
                const targetIdNum = parseInt(targetPostId, 10);
                const exists = mapped.some(p => p.id === targetIdNum);
                if (!exists) {
                    try {
                        const targetData = await postsApi.getById(targetIdNum);
                        if (targetData) {
                            const mappedTarget = mapPost(targetData);
                            mappedTarget.isHighlighted = true;
                            mapped = [mappedTarget, ...mapped];
                        }
                    } catch (e) {
                        console.warn("Could not fetch target post:", e);
                    }
                } else {
                    mapped = mapped.map(p => p.id === targetIdNum ? { ...p, isHighlighted: true } : p);
                }
            }

            setPosts(mapped);
        } catch (error) {
            console.error('Failed to load posts', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [targetPostId]);

    // Get all unique tags for filter pills
    const allTags = ['All', '✨ Recommended', ...new Set(posts.flatMap(post => post.tags || []))];

    // Filter and sort logic — highlighted target post always at top
    const rawPosts = posts.filter(post => {
        const matchesSearch = !searchQuery || (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (post.author?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = selectedTag === 'All' || selectedTag === '✨ Recommended' || (post.tags && post.tags.includes(selectedTag));
        return matchesSearch && matchesTag;
    });

    const filteredPosts = (selectedTag === '✨ Recommended'
        ? getPersonalizedRecommendations(rawPosts, currentUser)
        : rawPosts
    ).sort((a, b) => {
        if (a.isHighlighted) return -1;
        if (b.isHighlighted) return 1;
        return 0;
    });

    // Infinite Scroll State
    const [visibleCount, setVisibleCount] = useState(6);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400) {
                if (!isFetchingMore && visibleCount < filteredPosts.length) {
                    setIsFetchingMore(true);
                    setTimeout(() => {
                        setVisibleCount(prev => prev + 6);
                        setIsFetchingMore(false);
                    }, 300);
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isFetchingMore, visibleCount, filteredPosts.length]);

    const handlePostCreated = () => {
        // Small delay so backend processes the new post before refetch
        setTimeout(() => loadPosts(), 500);
    };

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-6 pb-32">
            
            {/* Header - Custom Hero Typography Design */}
            <div className="relative flex flex-col items-center text-center pb-8 pt-6">
                
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-300/30 dark:bg-slate-700/20 rounded-full blur-[80px] pointer-events-none -z-10"></div>

                {/* Top Right Action Button */}
                {currentUser.role !== 'SYSADM' && (
                    <div className="absolute right-0 top-0 hidden sm:block">
                        <button 
                            onClick={() => setIsCreatePostOpen(true)}
                            className="px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg, var(--theme-10), #1D4ED8)',
                                boxShadow: '0 4px 14px rgba(79,70,229,0.35)'
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_square</span>
                            Write Post
                        </button>
                    </div>
                )}

                {/* Title: Connect (Light) + the World (Heavy) -> Network Conversations */}
                <h1 className="text-[52px] sm:text-[64px] leading-tight tracking-tight text-slate-800 dark:text-slate-100 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-2">
                    <span className="font-light">Network</span>
                    <span className="font-black">Conversations</span>
                </h1>

                {/* Gradient Divider Line */}
                <div className="w-full max-w-3xl h-1.5 rounded-full mb-6" style={{ background: 'linear-gradient(90deg, #1e293b 0%, rgba(30,41,59,0.8) 40%, rgba(30,41,59,0.1) 100%)' }}></div>

                {/* Subtitle with Inline Pills */}
                <div className="text-[17px] font-medium text-theme-30-text mb-4 max-w-2xl leading-relaxed">
                    Browse and participate in discussions with our <span className="inline-flex items-center px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg mx-1 text-[15px] font-bold shadow-sm">vibrant community</span> <span className="inline-flex items-center px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg mx-1 text-[15px] font-bold shadow-sm">feed</span>
                </div>

                {/* Small Description */}
                <p className="text-[14px] text-theme-30-text font-normal max-w-xl opacity-80">
                    Stay updated with real-time posts, share knowledge snippets, and collaborate across the network seamlessly.
                </p>

                {/* Mobile Write Button */}
                {currentUser.role !== 'SYSADM' && (
                    <button 
                        onClick={() => setIsCreatePostOpen(true)}
                        className="mt-6 sm:hidden px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all flex items-center gap-2 w-full justify-center"
                        style={{
                            background: 'linear-gradient(135deg, var(--theme-10), #1D4ED8)',
                        }}
                    >
                        <span className="material-symbols-outlined text-[16px]">edit_square</span>
                        Write Post
                    </button>
                )}
            </div>

            {/* Search & Filter Bar */}
            <div className="glass bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search posts by content or author..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-[#6366f1]/20 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                
                {/* Tag Pills */}
                {allTags.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">Filter Tags:</span>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedTag === tag ? 'bg-[#6366f1]/10 border-[#6366f1] text-[#6366f1]' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {tag === 'All' ? 'All Tags' : `#${tag}`}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Feed display */}
            <div className="flex flex-col gap-6 max-w-4xl">
                {isLoading ? (
                    <div className="glass bg-white dark:bg-slate-950 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 animate-spin">progress_activity</span>
                        <h3 className="font-bold text-slate-700 dark:text-slate-350 text-sm">Loading posts...</h3>
                    </div>
                ) : filteredPosts.length > 0 ? (
                    <>
                        {filteredPosts.slice(0, visibleCount).map(post => (
                            <PostCard key={post.id} post={post} onPostDeleted={() => loadPosts()} />
                        ))}

                        {/* Infinite Scroll Progress Indicator */}
                        {visibleCount < filteredPosts.length && (
                            <div className="py-6 text-center flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
                                <span className="material-symbols-outlined text-[20px] animate-spin text-indigo-500">progress_activity</span>
                                <span>Loading more posts on scroll...</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="glass bg-white dark:bg-slate-950 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 animate-bounce">feed</span>
                        <h3 className="font-bold text-slate-700 dark:text-slate-350 text-sm">No Posts Found</h3>
                        <p className="text-xs text-slate-500">Try adjusting your search criteria or tags filter.</p>
                        {currentUser.role !== 'SYSADM' && (
                            <button
                                onClick={() => setIsCreatePostOpen(true)}
                                className="mt-2 px-5 py-2 font-bold text-xs rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Create First Post
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Create Post Modal — supports image, video, audio, document upload */}
            <CreatePostModal
                isOpen={isCreatePostOpen}
                onClose={() => setIsCreatePostOpen(false)}
                onPostCreated={handlePostCreated}
            />
        </div>
    );
}
