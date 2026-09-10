import React, { useState, useEffect, useRef } from 'react';
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
        ...(selectedTag !== 'All' && !['⏰ Scheduled', '✨ Recommended'].includes(selectedTag) ? [selectedTag] : [])
    ])].filter(Boolean);
    const filteredAvailableTags = rawUniqueTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));

    // Count author's upcoming scheduled posts
    const authorScheduledCount = posts.filter(p => (p.status === 'Scheduled' || p.isScheduledFuture)).length;

    // Filter and sort logic — highlighted target post always at top
    const rawPosts = posts.filter(post => {
        const matchesSearch = !searchQuery || (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (post.author?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = selectedTag === 'All' || 
                           (selectedTag === '⏰ Scheduled' ? (post.status === 'Scheduled' || post.isScheduledFuture) : 
                           (selectedTag === '✨ Recommended' ? true : (
                               (post.tags && post.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())) ||
                               ((post.content || '').toLowerCase().includes('#' + selectedTag.toLowerCase()))
                           )));
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
        <div className="flex-1 min-w-0 flex flex-col gap-6 pb-6">
            
            {/* Header - Formal & Catchy Hero Typography Design */}
            <div className="relative flex flex-col items-center text-center pb-4 pt-4">
                
                {/* Background Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 rounded-full blur-[70px] pointer-events-none -z-10"></div>

                {/* Top Right Action Button */}
                {currentUser.role !== 'SYSADM' && (
                    <div className="absolute right-0 top-2 hidden sm:block">
                        <button 
                            onClick={() => setIsCreatePostOpen(true)}
                            className="px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_square</span>
                            Write Post
                        </button>
                    </div>
                )}

                {/* Refined Category Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase tracking-wider mb-3 shadow-xs">
                    <span className="material-symbols-outlined text-[14px]">forum</span>
                    Enterprise Feed & Discussions
                </div>

                {/* Title: Formal & Catchy (No Underline) */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 mb-3 leading-tight">
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">Network</span>
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-xs">
                        Conversations
                    </span>
                </h1>

                {/* Subtitle with Integrated Text Flow */}
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl leading-relaxed mb-1">
                    Browse and participate in discussions with our <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">vibrant community feed</span>
                </p>

                {/* Small Description */}
                <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-normal max-w-xl">
                    Stay updated with real-time posts, share knowledge snippets, and collaborate across the network seamlessly.
                </p>

                {/* Mobile Write Button */}
                {currentUser.role !== 'SYSADM' && (
                    <button 
                        onClick={() => setIsCreatePostOpen(true)}
                        className="mt-5 sm:hidden px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all flex items-center gap-2 w-full justify-center shadow-md cursor-pointer"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                        }}
                    >
                        <span className="material-symbols-outlined text-[16px]">edit_square</span>
                        Write Post
                    </button>
                )}
            </div>

            {/* Search & Modern Filter Bar (Clean & Professional) */}
            <div className={`glass bg-white dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3.5 shadow-sm relative ${isFilterOpen ? 'z-40' : 'z-10'}`}>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Search discussions by keyword, topic, or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-slate-900 dark:text-white transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
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
                                isFilterOpen || (selectedTag !== 'All' && selectedTag !== '✨ Recommended')
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20'
                                    : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                            title="Filter by Topic / Hashtag"
                        >
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                            <span className="hidden sm:inline">Filter</span>
                            {selectedTag !== 'All' && selectedTag !== '✨ Recommended' && (
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            )}
                        </button>

                        {/* Filter Popover Dropdown */}
                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-indigo-500">tune</span>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Filter Topics</h4>
                                    </div>
                                    {selectedTag !== 'All' && (
                                        <button 
                                            onClick={() => { setSelectedTag('All'); setIsFilterOpen(false); }}
                                            className="text-[11px] font-bold text-indigo-500 hover:underline cursor-pointer"
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
                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold'
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
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <span className="truncate">#{tag}</span>
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

                {/* Primary Quick Filter Pills & Active Tag Indicator */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                        <button
                            onClick={() => setSelectedTag('All')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                selectedTag === 'All'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            All Posts
                        </button>
                        <button
                            onClick={() => setSelectedTag('✨ Recommended')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                selectedTag === '✨ Recommended'
                                    ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span>✨</span>
                            <span>Recommended</span>
                        </button>
                        {authorScheduledCount > 0 && (
                            <button
                                onClick={() => setSelectedTag('⏰ Scheduled')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    selectedTag === '⏰ Scheduled'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                <span>Scheduled</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                    selectedTag === '⏰ Scheduled' ? 'bg-white/20 text-white' : 'bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                                }`}>
                                    {authorScheduledCount}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Active Selected Filter Badge */}
                    {selectedTag !== 'All' && selectedTag !== '✨ Recommended' && selectedTag !== '⏰ Scheduled' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg animate-in fade-in duration-150">
                            <span>Topic: #{selectedTag}</span>
                            <button 
                                onClick={() => setSelectedTag('All')}
                                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 p-0.5 cursor-pointer"
                                title="Clear topic filter"
                            >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Feed display — Full screen width */}
            <div className="flex flex-col gap-6 w-full min-w-0">
                {isLoading ? (
                    <div className="glass bg-white dark:bg-slate-950 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 animate-spin">progress_activity</span>
                        <h3 className="font-bold text-slate-700 dark:text-slate-350 text-sm">Loading posts...</h3>
                    </div>
                ) : filteredPosts.length > 0 ? (
                    <>
                        {filteredPosts.slice(0, visibleCount).map(post => (
                            <PostCard key={post.id} post={post} onPostDeleted={(deletedId) => {
                                if (deletedId) setPosts(prev => prev.filter(p => p.id !== deletedId && p.postId !== deletedId));
                                loadPosts();
                            }} />
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
