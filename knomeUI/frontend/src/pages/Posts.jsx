import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import PostCard from '../components/widgets/PostCard';
import CreatePostModal from '../components/modals/CreatePostModal';
import ScrollLoadingIndicator from '../components/ui/ScrollLoadingIndicator';
import { useScrollLoading } from '../hooks/useScrollLoading';
import HotPostsWidget from '../components/widgets/HotPostsWidget';
import TrendingTagsWidget from '../components/widgets/TrendingTagsWidget';
import HighlightText from '../components/ui/HighlightText';
import { postsApi, mapPost, getPersonalizedRecommendations } from '../utils/apiService';

export default function Posts() {
    const { currentUser } = useUser();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const targetPostId = queryParams.get('id') || queryParams.get('postId') || queryParams.get('highlight');
    const initialTag = queryParams.get('tag') || queryParams.get('hashtag') || null;
    const initialSearch = queryParams.get('q') || '';
    
    // Core state
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [selectedTag, setSelectedTag] = useState(initialTag ? initialTag.replace('#', '') : 'All');
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tag = params.get('tag') || params.get('hashtag');
        if (tag) {
            setSelectedTag(tag.replace('#', ''));
        }
        const q = params.get('q');
        if (q !== null && q !== undefined) {
            setSearchQuery(q);
        }
    }, [location.search]);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const data = await postsApi.getPosts(null, null, 1, 100);
            let mapped = data ? data.map(mapPost) : [];

            // Merge local fallback posts if any
            try {
                const deletedIds = JSON.parse(localStorage.getItem('knome_deleted_post_ids') || '[]').map(String);
                const localPosts = JSON.parse(localStorage.getItem('knome_local_posts') || '[]');
                localPosts.forEach(lp => {
                    const lpIdStr = String(lp.id || lp.postId || '');
                    if (!deletedIds.includes(lpIdStr) && !mapped.some(m => String(m.id || m.postId) === lpIdStr)) {
                        mapped.unshift(mapPost(lp));
                    }
                });
            } catch (e) {}

            // Filter out any posts present in deleted IDs blacklist
            try {
                const deletedIds = JSON.parse(localStorage.getItem('knome_deleted_post_ids') || '[]').map(String);
                if (deletedIds.length > 0) {
                    mapped = mapped.filter(p => !deletedIds.includes(String(p.id)) && !deletedIds.includes(String(p.postId)));
                }
            } catch (e) {}
            
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

            // Filter posts based on publication schedule for scheduled items
            const currentUserIdStr = String(currentUser?.userId || currentUser?.id || '');
            const accessiblePosts = mapped.filter(p => {
                if (p.status === 'Scheduled' && p.scheduledDate) {
                    const schedTime = new Date(p.scheduledDate).getTime();
                    const now = Date.now();
                    if (schedTime > now) {
                        // Future: author only
                        const authorIdStr = String(p.author?.id || p.authorId || p.userId || '');
                        return authorIdStr === currentUserIdStr;
                    }
                }
                return true;
            });

            setPosts(accessiblePosts);
        } catch (error) {
            console.error('Failed to load posts', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
        const handlePostDeleted = (e) => {
            const deletedId = e?.detail?.id || e;
            if (deletedId) {
                const delStr = String(deletedId);
                setPosts(prev => prev.filter(p => String(p.id) !== delStr && String(p.postId) !== delStr));
            }
        };
        const handlePostCreated = () => {
            loadPosts();
        };

        // Check every 15s to transition scheduled posts live according to scheduled publication time
        const interval = setInterval(() => {
            loadPosts();
        }, 15000);

        window.addEventListener('post-deleted', handlePostDeleted);
        window.addEventListener('post-created', handlePostCreated);
        return () => {
            clearInterval(interval);
            window.removeEventListener('post-deleted', handlePostDeleted);
            window.removeEventListener('post-created', handlePostCreated);
        };
    }, [targetPostId, currentUser?.id]);

    const [showFilterBar, setShowFilterBar] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const filterRef = useRef(null);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get all unique tags for filter dropdown
    const rawUniqueTags = [...new Set([
        ...posts.flatMap(post => post.tags || []),
        ...(selectedTag !== 'All' && selectedTag !== '⏰ Scheduled' ? [selectedTag] : [])
    ])].filter(Boolean);
    const filteredAvailableTags = rawUniqueTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));

    // Count author's upcoming scheduled posts
    const authorScheduledCount = posts.filter(p => (p.status === 'Scheduled' || p.isScheduledFuture)).length;

    // Filter and sort logic — highlighted target post always at top
    const rawPosts = posts.filter(post => {
        const matchesSearch = !searchQuery || (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (post.author?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = selectedTag === 'All' || 
                           selectedTag === '🔥 Hot Posts' ||
                           (selectedTag === '⏰ Scheduled' ? (post.status === 'Scheduled' || post.isScheduledFuture) : 
                           (
                               (post.tags && post.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())) ||
                               ((post.content || '').toLowerCase().includes('#' + selectedTag.toLowerCase()))
                           ));
        return matchesSearch && matchesTag;
    });

    const filteredPosts = (selectedTag === '🔥 Hot Posts'
        ? [...rawPosts].sort((a, b) => {
            const scoreA = Number(a.likesCount || a.likes || 0) * 2 + Number(a.commentsCount || a.comments || 0) * 3 + Number(a.sharesCount || a.shares || 0) * 4;
            const scoreB = Number(b.likesCount || b.likes || 0) * 2 + Number(b.commentsCount || b.comments || 0) * 3 + Number(b.sharesCount || b.shares || 0) * 4;
            return scoreB - scoreA;
        })
        : rawPosts
    ).sort((a, b) => {
        if (a.isHighlighted) return -1;
        if (b.isHighlighted) return 1;
        return 0;
    });

    // Infinite Scroll Hook
    const { visibleCount, reset: resetScrollLoading } = useScrollLoading(filteredPosts.length, 6, 6);

    useEffect(() => {
        resetScrollLoading();
    }, [searchQuery, selectedTag, resetScrollLoading]);

    const handlePostCreated = () => {
        // Small delay so backend processes the new post before refetch
        setTimeout(() => loadPosts(), 500);
    };

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-6 pb-6">
            
            {/* Hero Header */}
            <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                {/* Background effects */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-blue-100/60 dark:from-blue-950/30 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-blue-400/10 dark:bg-blue-500/10 blur-[80px] pointer-events-none"></div>
                
                {/* Light Streaks behind text */}
                <div className="absolute top-[35%] left-0 w-[60%] h-[1px] bg-gradient-to-r from-blue-300/40 dark:from-blue-400/20 to-transparent"></div>
                <div className="absolute top-[50%] left-0 w-[40%] h-[2px] bg-gradient-to-r from-indigo-300/40 dark:from-indigo-400/20 to-transparent blur-[1px]"></div>
                <div className="absolute top-[65%] left-0 w-[50%] h-[1px] bg-gradient-to-r from-cyan-300/40 dark:from-cyan-400/20 to-transparent"></div>

                {/* Content Left */}
                <div className="relative z-10 flex flex-col items-start max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
                        💬 Live Workplace Feed
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-slate-900 dark:text-white" style={{ lineHeight: '1.2' }}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400">
                            Connect With Workplace Pulse
                        </span>
                    </h1>

                    <p className="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
                        Share instant thoughts, project breakthroughs, team questions, and celebrate milestones across the network.
                    </p>
                </div>

                {/* Action Right */}
                <div className="relative z-10 shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button 
                        onClick={() => setShowFilterBar(prev => !prev)}
                        className={`w-full sm:w-auto px-5 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                            showFilterBar || searchQuery || selectedTag !== 'All'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                        Filter { (searchQuery || selectedTag !== 'All') && '• Active' }
                    </button>
                    {currentUser.role !== 'SYSADM' && (
                        <button 
                            onClick={() => setIsCreatePostOpen(true)}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit_square</span>
                            Write Post
                        </button>
                    )}
                </div>
            </div>

            {/* Search & Topic Filter Bar (Collapsible via Filter button) */}
            {(showFilterBar || searchQuery || selectedTag !== 'All') && (
                <div className={`p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-white dark:bg-slate-900 shadow-xl mb-2 animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col gap-3.5 relative ${isFilterOpen ? 'z-40' : 'z-10'}`}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Search discussions by keyword, topic, or author..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 outline-none text-slate-900 dark:text-white transition-all"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Filter Icon Button with Dropdown Popover */}
                        <div className="relative z-50" ref={filterRef}>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                                    isFilterOpen || selectedTag !== 'All'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                                title="Filter by Topic / Hashtag"
                            >
                                <span className="material-symbols-outlined text-[18px]">tune</span>
                                <span className="hidden sm:inline">Topics</span>
                                {selectedTag !== 'All' && (
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                )}
                            </button>

                            {/* Filter Popover Dropdown */}
                            {isFilterOpen && (
                                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-blue-500">tune</span>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Filter Topics</h4>
                                        </div>
                                        {selectedTag !== 'All' && (
                                            <button 
                                                onClick={() => { setSelectedTag('All'); setIsFilterOpen(false); }}
                                                className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer"
                                            >
                                                Reset Filter
                                            </button>
                                        )}
                                    </div>

                                    {/* Tag Search inside filter dropdown */}
                                    <div className="relative mb-3">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">search</span>
                                        <input 
                                            type="text"
                                            placeholder="Search topic tags..."
                                            value={tagSearch}
                                            onChange={(e) => setTagSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        <button
                                            onClick={() => { setSelectedTag('All'); setIsFilterOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                                selectedTag === 'All'
                                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <span>All Topics</span>
                                            {selectedTag === 'All' && <span className="material-symbols-outlined text-[16px]">check</span>}
                                        </button>

                                        {filteredAvailableTags.length > 0 ? (
                                            filteredAvailableTags.map(tag => {
                                                const isSelected = selectedTag === tag;
                                                const count = posts.filter(p => p.tags && p.tags.includes(tag)).length;
                                                return (
                                                    <button
                                                        key={tag}
                                                        onClick={() => { setSelectedTag(tag); setIsFilterOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <span className="truncate">
                                                            <HighlightText text={`#${tag}`} query={tagSearch} />
                                                        </span>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                            {count}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="text-center py-4 text-xs text-slate-400">No topic tags found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Primary Quick Filter Pills & Active Tag Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    <button
                        onClick={() => setSelectedTag('All')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            selectedTag === 'All'
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-400 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        All Posts
                    </button>
                    <button
                        onClick={() => setSelectedTag('🔥 Hot Posts')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                            selectedTag === '🔥 Hot Posts'
                                ? 'bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400 shadow-xs font-black'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>🔥</span>
                        <span>Hot Posts</span>
                    </button>
                    {authorScheduledCount > 0 && (
                        <button
                            onClick={() => setSelectedTag('⏰ Scheduled')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                selectedTag === '⏰ Scheduled'
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span>Scheduled</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                selectedTag === '⏰ Scheduled' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                            }`}>
                                {authorScheduledCount}
                            </span>
                        </button>
                    )}
                </div>

                {/* Active Selected Filter Badge */}
                {selectedTag !== 'All' && selectedTag !== '⏰ Scheduled' && selectedTag !== '🔥 Hot Posts' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl animate-in fade-in duration-150">
                        <span>Topic: #{selectedTag}</span>
                        <button 
                            onClick={() => setSelectedTag('All')}
                            className="hover:text-blue-800 dark:hover:text-blue-200 ml-1 cursor-pointer"
                            title="Clear topic filter"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content Layout with Feed and Right Sidebar Widgets */}
            <div className="flex flex-col xl:flex-row gap-8 items-start w-full min-w-0">
                {/* Feed display */}
                <main className="flex-1 min-w-0 flex flex-col gap-6 w-full">
                    {isLoading ? (
                        <div className="glass bg-white dark:bg-slate-950 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 animate-spin">progress_activity</span>
                            <h3 className="font-bold text-slate-700 dark:text-slate-350 text-sm">Loading posts...</h3>
                        </div>
                    ) : filteredPosts.length > 0 ? (
                        <>
                            {filteredPosts.slice(0, visibleCount).map(post => (
                                <PostCard key={post.id} post={post} searchQuery={searchQuery} onPostDeleted={(deletedId) => {
                                    if (deletedId) setPosts(prev => prev.filter(p => p.id !== deletedId && p.postId !== deletedId));
                                    loadPosts();
                                }} />
                            ))}

                            {/* Infinite Scroll Progress Indicator */}
                            <ScrollLoadingIndicator isVisible={visibleCount < filteredPosts.length} text="Loading more posts on scroll..." />
                        </>
                    ) : (
                        <div className="glass bg-white dark:bg-slate-950 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 animate-bounce">
                                {selectedTag === '⏰ Scheduled' ? 'schedule' : 'feed'}
                            </span>
                            <h3 className="font-bold text-slate-700 dark:text-slate-350 text-sm">
                                {selectedTag === '⏰ Scheduled' ? 'No Scheduled Posts' : 'No Posts Found'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {selectedTag === '⏰ Scheduled' 
                                    ? 'You do not have any posts waiting to be published.'
                                    : 'Try adjusting your search criteria or tags filter.'}
                            </p>
                            {currentUser.role !== 'SYSADM' && (
                                <button
                                    onClick={() => setIsCreatePostOpen(true)}
                                    className="mt-2 px-5 py-2 font-bold text-xs rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    {selectedTag === '⏰ Scheduled' ? 'Schedule a Post' : 'Create First Post'}
                                </button>
                            )}
                        </div>
                    )}
                </main>

                {/* Right Sidebar Widgets: Hot Posts & Trending Tags */}
                <aside className="w-full xl:w-[340px] shrink-0 flex flex-col gap-5">
                    <HotPostsWidget />
                    <TrendingTagsWidget onTagClick={(tag) => setSelectedTag(tag)} />
                </aside>
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
