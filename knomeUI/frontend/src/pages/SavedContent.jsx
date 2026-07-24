import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { savedContentApi, resolveMediaUrl } from '../utils/apiService';
import * as signalR from '@microsoft/signalr';

export default function SavedContent() {
    const navigate = useNavigate();

    // Filter & Search State
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('NewestSaved');

    // Data State
    const [savedItems, setSavedItems] = useState([]);
    const [counts, setCounts] = useState({ totalCount: 0, postsCount: 0, articlesCount: 0, videosCount: 0, podcastsCount: 0, documentsCount: 0 });
    const [pageNumber, setPageNumber] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionId, setActionId] = useState(null); // For loading spinner on unsave button

    const tabs = [
        { id: 'All', label: 'All', countKey: 'totalCount' },
        { id: 'Posts', label: 'Posts', countKey: 'postsCount' },
        { id: 'Articles', label: 'Articles', countKey: 'articlesCount' },
        { id: 'Videos', label: 'Videos', countKey: 'videosCount' },
        { id: 'Podcasts', label: 'Podcasts', countKey: 'podcastsCount' },
    ];

    // Load counts
    const loadCounts = useCallback(async () => {
        try {
            const res = await savedContentApi.getSavedCounts();
            const payload = res?.data ?? res;
            if (payload && typeof payload === 'object') {
                setCounts({
                    totalCount: payload.totalCount || 0,
                    postsCount: payload.postsCount || 0,
                    articlesCount: payload.articlesCount || 0,
                    videosCount: payload.videosCount || 0,
                    podcastsCount: payload.podcastsCount || 0,
                    documentsCount: payload.documentsCount || 0,
                });
            }
        } catch (e) {
            console.error('Failed to load saved counts', e);
        }
    }, []);

    // Load saved content list
    const loadSavedContent = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await savedContentApi.getSavedContent({
                contentType: activeTab,
                search: searchQuery,
                sortBy,
                pageNumber,
                pageSize: 20,
            });

            const payload = res?.data ?? res;
            if (payload) {
                const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload) ? payload : []);
                setSavedItems(items);
                setTotalCount(payload.totalCount ?? items.length);
            } else {
                setSavedItems([]);
                setTotalCount(0);
            }
        } catch (e) {
            console.error('Failed to load saved content', e);
            setError(e.message || 'Failed to load saved content. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, searchQuery, sortBy, pageNumber]);

    useEffect(() => {
        loadCounts();
        loadSavedContent();
    }, [loadCounts, loadSavedContent]);

    // Real-time SignalR listener for live bookmark updates
    useEffect(() => {
        const token = localStorage.getItem('knome_jwt');
        if (!token) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl('http://localhost:5095/hubs/notifications', {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .build();

        connection.on('BookmarkUpdated', () => {
            loadCounts();
            loadSavedContent();
        });

        connection.start().catch((err) => console.log('SavedContent SignalR Error:', err));

        return () => {
            connection.stop();
        };
    }, [loadCounts, loadSavedContent]);

    // Unsave (Bookmark toggle) action
    const handleUnsave = async (e, item) => {
        e.stopPropagation();
        const key = `${item.contentType}_${item.contentId}`;
        setActionId(key);

        // Optimistic UI Removal
        setSavedItems((prev) => prev.filter((i) => !(i.contentType === item.contentType && i.contentId === item.contentId)));
        setCounts((prev) => ({
            ...prev,
            totalCount: Math.max(0, prev.totalCount - 1),
        }));

        try {
            await savedContentApi.toggleBookmark(item.contentType, item.contentId);
            loadCounts();
        } catch (err) {
            console.error('Failed to unsave item', err);
            // Revert on error
            loadSavedContent();
        } finally {
            setActionId(null);
        }
    };

    // Helper formatting
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTypeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'article': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'video': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'podcast': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'job':
            case 'document': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        }
    };

    const getTypeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'article': return 'article';
            case 'video': return 'play_circle';
            case 'podcast': return 'podcasts';
            case 'job':
            case 'document': return 'description';
            default: return 'dynamic_feed';
        }
    };

    return (
        <main className="flex-1 flex flex-col gap-6 pb-32 min-w-0">
            
            {/* Hero Header */}
            <div className="relative rounded-2xl overflow-hidden mb-2 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-amber-100/50 dark:from-amber-900/20 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-amber-400/10 dark:bg-amber-500/10 blur-[80px] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-start max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">bookmark</span>
                        <span>Personal Library</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-slate-900 dark:text-white" style={{ lineHeight: '1.2' }}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 dark:from-amber-400 dark:via-orange-400 dark:to-yellow-400">
                            Saved Content
                        </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
                        Your personal collection of bookmarked posts, technical articles, video tutorials, and audio podcasts.
                    </p>
                </div>
            </div>

            {/* Filter Tabs & Search / Sort Controls */}
            <div className="glass rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap pb-1 md:pb-0">
                    {tabs.map((tab) => {
                        const count = counts[tab.countKey] || 0;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setPageNumber(1);
                                }}
                                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                    isActive
                                        ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search & Sort Controls */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="relative flex-1 md:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            type="text"
                            placeholder="Search saved items..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPageNumber(1);
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => {
                            setSortBy(e.target.value);
                            setPageNumber(1);
                        }}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                    >
                        <option value="NewestSaved">Newest Saved</option>
                        <option value="OldestSaved">Oldest Saved</option>
                        <option value="RecentlyUpdated">Recently Updated</option>
                    </select>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[24px]">error</span>
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                    <button
                        onClick={loadSavedContent}
                        className="px-4 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors shrink-0"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Skeleton Loading State */}
            {isLoading && (
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse flex flex-col md:flex-row gap-5">
                            <div className="w-full md:w-48 h-32 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0"></div>
                            <div className="flex-1 flex flex-col gap-3 justify-center">
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && savedItems.length === 0 && (
                <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[36px]">bookmark_border</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Saved Items Found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                        {searchQuery
                            ? `No saved items matching "${searchQuery}". Try searching for another keyword.`
                            : `You haven't bookmarked any ${activeTab !== 'All' ? activeTab.toLowerCase() : 'content'} yet. Click the save icon on any post, article, or video to bookmark it here.`}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-transform hover:scale-105 shadow-md"
                    >
                        Explore Feed
                    </button>
                </div>
            )}

            {/* Saved Content Items List */}
            {!isLoading && !error && savedItems.length > 0 && (
                <div className="flex flex-col gap-4">
                    {savedItems.map((item) => {
                        const isUnsaving = actionId === `${item.contentType}_${item.contentId}`;
                        const isAvailable = item.isAvailable !== false;

                        return (
                            <div
                                key={`${item.contentType}_${item.contentId}`}
                                onClick={() => {
                                    if (isAvailable && item.targetUrl) {
                                        navigate(item.targetUrl);
                                    }
                                }}
                                className={`group glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row gap-5 relative overflow-hidden transition-all duration-200 ${
                                    isAvailable ? 'hover:border-amber-500/50 hover:shadow-lg cursor-pointer' : 'opacity-80'
                                }`}
                            >
                                {/* Thumbnail / Media Icon */}
                                {item.thumbnailUrl ? (
                                    <img
                                        src={resolveMediaUrl(item.thumbnailUrl)}
                                        alt={item.title}
                                        className="w-full md:w-48 h-32 object-cover rounded-xl shrink-0 border border-slate-100 dark:border-slate-800"
                                    />
                                ) : (
                                    <div className="w-full md:w-48 h-32 rounded-xl shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700">
                                        <span className="material-symbols-outlined text-[40px]">
                                            {getTypeIcon(item.contentType)}
                                        </span>
                                    </div>
                                )}

                                {/* Content Info */}
                                <div className="flex-1 flex flex-col justify-between pr-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getTypeColor(item.contentType)}`}>
                                                {item.contentType}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-400">
                                                Saved {formatDate(item.savedDate)}
                                            </span>
                                        </div>

                                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-amber-500 transition-colors line-clamp-2">
                                            {item.title}
                                        </h3>

                                        {isAvailable ? (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                                                {item.summary}
                                            </p>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold mb-3">
                                                <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                                                <span>{item.unavailabilityReason || 'Content Unavailable'}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Author & Footer Info */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                        <div className="flex items-center gap-2">
                                            {item.authorAvatar ? (
                                                <img
                                                    src={resolveMediaUrl(item.authorAvatar)}
                                                    alt={item.authorName}
                                                    className="w-6 h-6 rounded-full object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {(item.authorName || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {item.authorName || 'Knome Member'}
                                            </span>
                                            {item.authorRole && (
                                                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                                                    • {item.authorRole}
                                                </span>
                                            )}
                                        </div>

                                        {(item.likesCount > 0 || item.commentsCount > 0) && (
                                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                                                {item.likesCount > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">favorite</span>
                                                        {item.likesCount}
                                                    </span>
                                                )}
                                                {item.commentsCount > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                                                        {item.commentsCount}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Unsave / Bookmark Button */}
                                <button
                                    onClick={(e) => handleUnsave(e, item)}
                                    disabled={isUnsaving}
                                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-amber-500 flex items-center justify-center shadow-sm transition-all hover:scale-110 z-10 cursor-pointer"
                                    title="Unsave item"
                                >
                                    {isUnsaving ? (
                                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            bookmark
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
