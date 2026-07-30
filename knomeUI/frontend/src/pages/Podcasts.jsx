import React, { useState, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import { useAudio } from '../components/contexts/AudioContext';
import UploadPodcastModal from '../components/modals/UploadPodcastModal';
import { podcastsApi, savedContentApi, resolveMediaUrl, getPersonalizedRecommendations } from '../utils/apiService';

export default function Podcasts() {
    const { currentUser } = useUser();
    const { playPodcast, currentPodcast, isPlaying } = useAudio();
    
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All Episodes');
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [savedMap, setSavedMap] = useState({});

    // Interactive Filter State
    const [showFilterBar, setShowFilterBar] = useState(false);
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterSort, setFilterSort] = useState('Newest First');

    const [seriesData, setSeriesData] = useState([]);
    const [podcastEpisodes, setPodcastEpisodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPodcastsData = async () => {
        try {
            setIsLoading(true);
            const [seriesRes, podcastsRes] = await Promise.all([
                podcastsApi.getAllSeries(),
                podcastsApi.getAll()
            ]);

            if (seriesRes) {
                const seriesArray = Array.isArray(seriesRes) ? seriesRes : [];
                const mappedSeries = seriesArray.map(s => ({
                    id: s.seriesId,
                    title: s.title,
                    description: s.description || 'Enterprise Podcast Series',
                    episodes: s.episodeCount || 0,
                    category: 'Series',
                    thumbnail: s.coverImageUrl ? resolveMediaUrl(s.coverImageUrl) : 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=90&w=1600&h=1600'
                }));
                setSeriesData(mappedSeries);
            }

            if (podcastsRes) {
                const podcastsArray = Array.isArray(podcastsRes) ? podcastsRes : [];
                const mappedPodcasts = podcastsArray.map(p => ({
                    id: p.podcastId,
                    title: p.title,
                    series: p.seriesTitle || 'Standalone Episode',
                    category: p.categoryName || 'General',
                    durationSeconds: p.durationSeconds || 0,
                    duration: p.durationSeconds ? `${Math.floor(p.durationSeconds / 60)}:${(p.durationSeconds % 60).toString().padStart(2, '0')}` : '00:00',
                    date: new Date(p.uploadedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    author: p.uploaderFullName,
                    thumbnail: p.coverImageUrl ? resolveMediaUrl(p.coverImageUrl) : 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=90&w=1600&h=1600',
                    audioUrl: p.audioUrl
                }));
                setPodcastEpisodes(mappedPodcasts);
            }
        } catch (error) {
            console.error('Failed to fetch podcasts data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPodcastsData();
        
        const handleRefresh = () => fetchPodcastsData();
        window.addEventListener('podcast-published', handleRefresh);
        return () => window.removeEventListener('podcast-published', handleRefresh);
    }, []);

    const isAdmin = currentUser?.role === 'SYSADM' || currentUser?.role === 'CADM' || currentUser?.role === 'HRADM';

    const handleDeletePodcast = async (podcastId) => {
        if (!window.confirm('Are you sure you want to delete this podcast episode?')) return;
        try {
            await podcastsApi.delete(podcastId);
            fetchPodcastsData();
        } catch (error) {
            console.error('Failed to delete podcast:', error);
            alert('Failed to delete podcast. ' + (error.message || ''));
        }
    };

    // Filter & Sort Logic
    const rawEpisodes = podcastEpisodes
        .filter(ep => {
            // Tab filter
            if (activeTab === 'My Podcasts') {
                if (currentUser?.name && !ep.author?.toLowerCase().includes(currentUser.name.toLowerCase())) {
                    return false;
                }
            } else if (activeTab === '✨ Recommended for You') {
                // Return true, handled by recommendation engine below
            } else if (activeTab === 'General' || activeTab === 'Tech' || activeTab === 'Leadership' || activeTab === 'Engineering') {
                if (ep.category.toLowerCase() !== activeTab.toLowerCase()) {
                    return false;
                }
            }
            // Series Card filter
            if (selectedSeries && ep.series !== selectedSeries.title) {
                return false;
            }
            // Keyword filter
            if (filterKeyword.trim()) {
                const kw = filterKeyword.toLowerCase().trim();
                const matchTitle = ep.title.toLowerCase().includes(kw);
                const matchAuthor = ep.author?.toLowerCase().includes(kw);
                const matchSeries = ep.series?.toLowerCase().includes(kw);
                if (!matchTitle && !matchAuthor && !matchSeries) return false;
            }
            // Category filter
            if (filterCategory !== 'All' && ep.category.toLowerCase() !== filterCategory.toLowerCase()) {
                return false;
            }
            return true;
        });

    const displayedEpisodes = activeTab === '✨ Recommended for You'
        ? getPersonalizedRecommendations(rawEpisodes, currentUser)
        : rawEpisodes.sort((a, b) => {
            if (filterSort === 'Oldest First') return a.id - b.id;
            if (filterSort === 'Duration (Longest)') return b.durationSeconds - a.durationSeconds;
            return b.id - a.id; // Newest First
        });

    const resetFilters = () => {
        setFilterKeyword('');
        setFilterCategory('All');
        setFilterSort('Newest First');
        setSelectedSeries(null);
    };

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-32">
                
                {/* Hero Header */}
                <div className="relative rounded-2xl overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-fuchsia-100/50 dark:from-fuchsia-900/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-pink-400/10 dark:bg-pink-500/10 blur-[80px] pointer-events-none"></div>
                    
                    {/* Light Streaks behind text */}
                    <div className="absolute top-[35%] left-0 w-[60%] h-[1px] bg-gradient-to-r from-fuchsia-300/40 dark:from-fuchsia-400/20 to-transparent"></div>
                    <div className="absolute top-[50%] left-0 w-[40%] h-[2px] bg-gradient-to-r from-pink-300/40 dark:from-pink-400/20 to-transparent blur-[1px]"></div>
                    <div className="absolute top-[65%] left-0 w-[50%] h-[1px] bg-gradient-to-r from-rose-300/40 dark:from-rose-400/20 to-transparent"></div>

                    {/* Content Left */}
                    <div className="relative z-10 flex flex-col items-start max-w-3xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pink-500/30 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
                            ✨ Tuning into MPOnline
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-slate-900 dark:text-white" style={{ lineHeight: '1.2' }}>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 dark:from-fuchsia-400 dark:via-pink-400 dark:to-rose-400">
                                Tune Into Enterprise Insights
                            </span>
                        </h1>

                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
                            Discover audio sessions, tech talks, and leadership updates built for the next generation — anytime, anywhere.
                        </p>
                    </div>

                    {/* Action Right */}
                    <div className="relative z-10 shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button 
                            onClick={() => setShowFilterBar(!showFilterBar)}
                            className={`w-full sm:w-auto px-5 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                                showFilterBar || filterKeyword || filterCategory !== 'All' || filterSort !== 'Newest First'
                                    ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filter { (filterKeyword || filterCategory !== 'All' || filterSort !== 'Newest First') && '• Active' }
                        </button>
                        {currentUser.role !== 'SYSADM' && (
                            <button 
                                onClick={() => setIsUploadOpen(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">mic</span>
                                Publish Episode
                            </button>
                        )}
                    </div>
                </div>

                {/* Interactive Filter Control Bar */}
                {showFilterBar && (
                    <div className="p-5 rounded-2xl border border-pink-500/30 bg-white dark:bg-slate-900 shadow-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col md:flex-row items-center gap-4">
                        {/* Keyword Search */}
                        <div className="relative flex-1 w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input 
                                type="text"
                                value={filterKeyword}
                                onChange={(e) => setFilterKeyword(e.target.value)}
                                placeholder="Search by title, author, series..."
                                className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-xl outline-none border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                            {filterKeyword && (
                                <button onClick={() => setFilterKeyword('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Category Dropdown */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-xs font-bold text-slate-400 shrink-0">Category:</span>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full md:w-auto text-xs font-bold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
                            >
                                <option value="All">All Categories</option>
                                <option value="General">General</option>
                                <option value="Tech">Tech</option>
                                <option value="Leadership">Leadership</option>
                                <option value="Engineering">Engineering</option>
                            </select>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-xs font-bold text-slate-400 shrink-0">Sort:</span>
                            <select
                                value={filterSort}
                                onChange={(e) => setFilterSort(e.target.value)}
                                className="w-full md:w-auto text-xs font-bold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
                            >
                                <option value="Newest First">Newest First</option>
                                <option value="Oldest First">Oldest First</option>
                                <option value="Duration (Longest)">Duration (Longest)</option>
                            </select>
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-xs font-bold text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-xl transition-colors shrink-0"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                    {['All Episodes', '✨ Recommended for You', 'General', 'Tech', 'Leadership', 'Engineering', 'My Podcasts'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSelectedSeries(null);
                            }}
                            className={`px-6 py-4 font-bold text-[14px] transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-pink-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 rounded-t-full"></div>}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Series Grouping (FR-PD-03) */}
                        <section>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-pink-500">dynamic_feed</span>
                                    Featured Series
                                </h2>
                                {selectedSeries && (
                                    <button 
                                        onClick={() => setSelectedSeries(null)}
                                        className="text-[12px] font-bold text-pink-500 hover:underline"
                                    >
                                        Clear Selection
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {seriesData.map(series => (
                                    <div 
                                        key={series.id}
                                        onClick={() => setSelectedSeries(series)}
                                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer card-lift ${selectedSeries?.id === series.id ? 'ring-2 ring-pink-500 border-transparent shadow-lg shadow-pink-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md'}`}
                                    >
                                        <div className="h-40 overflow-hidden relative">
                                            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" src={series.thumbnail} alt={series.title} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                                            <div className="absolute bottom-3 left-4 flex gap-2">
                                                <span className="px-2 py-0.5 bg-pink-500 text-white rounded text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                    {series.category}
                                                </span>
                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-black uppercase shadow-sm">
                                                    {series.episodes} EPS
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5 relative bg-white dark:bg-slate-900">
                                            <h3 className="font-bold text-[16px] text-slate-900 dark:text-white group-hover:text-pink-500 transition-colors mb-1">{series.title}</h3>
                                            <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed">{series.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {seriesData.length === 0 && (
                                    <div className="col-span-3 text-center py-8 text-slate-500">No series available.</div>
                                )}
                            </div>
                        </section>

                        {/* Episodes List */}
                        <section className="mt-8">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6">
                                {selectedSeries ? `Episodes in "${selectedSeries.title}"` : 'All Episodes'}
                            </h2>
                            
                            <div className="flex flex-col gap-3">
                                {displayedEpisodes.map(ep => {
                                    const isThisPlaying = currentPodcast?.id === ep.id && isPlaying;
                                    return (
                                        <div key={ep.id} className="group glass card-lift bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all hover:shadow-md">
                                            <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800">
                                                <img src={ep.thumbnail} className="w-full h-full object-cover" alt="Cover" />
                                                <button 
                                                    onClick={() => playPodcast(ep)}
                                                    className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900/70"
                                                >
                                                    <span className="material-symbols-outlined text-[32px] text-white">
                                                        {isThisPlaying ? 'pause_circle' : 'play_circle'}
                                                    </span>
                                                </button>
                                                {isThisPlaying && (
                                                    <div className="absolute bottom-1 right-1 flex items-end gap-0.5 h-3">
                                                        <div className="w-1 bg-pink-500 animate-pulse h-full"></div>
                                                        <div className="w-1 bg-pink-500 animate-pulse h-2/3 delay-75"></div>
                                                        <div className="w-1 bg-pink-500 animate-pulse h-4/5 delay-150"></div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2 py-0.5 rounded uppercase tracking-wider">{ep.series}</span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${
                                                        ep.category === 'Tech' ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800' :
                                                        ep.category === 'Leadership' ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' :
                                                        ep.category === 'Engineering' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' :
                                                        'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                        {ep.category}
                                                    </span>
                                                    <span className="text-[12px] font-bold text-slate-400">{ep.date}</span>
                                                </div>
                                                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate mb-1">{ep.title}</h3>
                                                <div className="flex items-center gap-4 text-[12px] font-bold text-slate-500">
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {ep.duration}</span>
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> {ep.author}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 md:mt-0">
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => handleDeletePodcast(ep.id)}
                                                        title="Delete Episode"
                                                        className="w-10 h-10 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={async () => {
                                                        const epId = ep.id;
                                                        const currentlySaved = !!savedMap[epId];
                                                        setSavedMap(prev => ({ ...prev, [epId]: !currentlySaved }));
                                                        try {
                                                            await savedContentApi.toggleBookmark('Podcast', epId);
                                                        } catch (err) {
                                                            setSavedMap(prev => ({ ...prev, [epId]: currentlySaved }));
                                                        }
                                                    }}
                                                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                                        savedMap[ep.id]
                                                            ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-md'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                                    title={savedMap[ep.id] ? "Saved in Personal Library" : "Save Podcast"}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: savedMap[ep.id] ? "'FILL' 1" : "'FILL' 0" }}>
                                                        bookmark
                                                    </span>
                                                </button>
                                                <button className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">playlist_add</span>
                                                </button>
                                                <button 
                                                    onClick={() => playPodcast(ep)}
                                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-[13px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">{isThisPlaying ? 'pause' : 'play_arrow'}</span>
                                                    {isThisPlaying ? 'Pause' : 'Play Now'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {displayedEpisodes.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">No episodes found.</div>
                                )}
                            </div>
                        </section>
                    </>
                )}

            </main>

            <UploadPodcastModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        </>
    );
}
