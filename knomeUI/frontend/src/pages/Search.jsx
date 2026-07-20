import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { users } from '../components/contexts/UserContext';
import { getPosts } from '../utils/mockPosts';
import { getArticles } from '../utils/mockArticles';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function Search() {
    const navigate = useNavigate();
    const query = useQuery().get('q') || '';
    const [searchQuery, setSearchQuery] = useState(query);
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    
    // Filters state
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeTime, setActiveTime] = useState('Any time');
    const [activeSort, setActiveSort] = useState('Most Relevant');

    // FR-SD-05 Search History
    const [searchHistory, setSearchHistory] = useState([
        'UI Design Systems', 'Meghna Tiwari', 'Q3 Townhall', 'Frontend Masters'
    ]);

    const [aggregatedData, setAggregatedData] = useState([]);

    useEffect(() => {
        async function loadData() {
            let fetchedPosts = [];
            let fetchedArticles = [];
            try { fetchedPosts = await getPosts(); } catch(e){}
            try { fetchedArticles = await getArticles(); } catch(e){}

            const mappedUsers = users.map(u => ({
                id: 'u_' + u.id,
                type: 'Person',
                name: u.name,
                role: u.roleName || u.designation,
                department: u.department,
                img: u.avatar
            }));

            const mappedPosts = fetchedPosts.map(p => ({
                id: 'p_' + p.id,
                originalId: p.id,
                type: 'Post',
                name: p.content.substring(0, 60) + '...',
                desc: p.content,
                author: p.author.name,
                date: p.time,
                icon: 'edit_square'
            }));

            const mappedArticles = fetchedArticles.map(a => ({
                id: 'a_' + a.id,
                originalId: a.id,
                type: 'Article',
                name: a.title,
                desc: a.subtitle,
                author: a.author.name,
                date: a.date,
                icon: 'article'
            }));

            const staticData = [
                { id: 'c1', originalId: 1, type: 'Community', name: 'Engineering Excellence', members: '1.2k', desc: 'Sharing best practices, architectural patterns, and scaling strategies across our core services.', icon: 'group' },
                { id: 'c2', originalId: 2, type: 'Community', name: 'Product Design Guild', members: '458', desc: 'Central hub for design systems, UX research, and accessibility standards.', icon: 'palette' },
                { id: 'c3', originalId: 3, type: 'Community', name: 'HR & Culture', members: '5.4k', desc: 'Global announcements, HR policies, and discussions regarding workplace culture.', icon: 'public' },
                { id: 'v1', originalId: 1, type: 'Video', name: 'Q3 Townhall Meeting', author: 'Leadership', duration: '45:00', icon: 'videocam' },
                { id: 'v2', originalId: 2, type: 'Video', name: 'Microservices Architecture Deep Dive', author: 'Meghna Tiwari', duration: '1:12:00', icon: 'videocam' },
                { id: 'pc1', originalId: 1, type: 'Podcast', name: 'Tech Talks: React 19 Features', author: 'Frontend Team', duration: '22:15', icon: 'podcasts' },
                { id: 'j1', originalId: 1, type: 'Job', name: 'Senior Frontend Developer', department: 'Engineering', location: 'Remote', icon: 'work' },
                { id: 'j2', originalId: 2, type: 'Job', name: 'Product Designer', department: 'Design', location: 'Bhopal', icon: 'work' },
            ];

            setAggregatedData([...mappedUsers, ...mappedPosts, ...mappedArticles, ...staticData]);
        }
        loadData();
    }, []);

    // Trigger search
    useEffect(() => {
        if (!searchQuery) {
            setResults([]);
            return;
        }

        setIsSearching(true);

        const timer = setTimeout(() => {
            const q = searchQuery.toLowerCase();
            const filtered = aggregatedData.filter(item => {
                const matchName = item.name?.toLowerCase().includes(q);
                const matchDesc = item.desc?.toLowerCase().includes(q);
                const matchAuthor = item.author?.toLowerCase().includes(q);
                const matchType = item.type?.toLowerCase().includes(q);
                const matchDept = item.department?.toLowerCase().includes(q);
                
                const categoryMatch = activeCategory === 'All' || item.type === activeCategory || (activeCategory === 'Content' && ['Article','Post','Video','Podcast'].includes(item.type));
                
                return (matchName || matchDesc || matchAuthor || matchType || matchDept) && categoryMatch;
            });

            if (activeSort === 'Most Popular') {
                filtered.sort((a,b) => (b.views || b.likes || 0) - (a.views || a.likes || 0));
            }

            setResults(filtered);
            setIsSearching(false);
            
            setSearchHistory(prev => {
                const updated = [searchQuery, ...prev.filter(h => h !== searchQuery)].slice(0, 10);
                return updated;
            });
            
        }, 800); 

        return () => clearTimeout(timer);
    }, [searchQuery, activeCategory, activeSort, activeTime, aggregatedData]);


    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // URL update handled loosely by state here, real app would pushstate
        }
    };

    return (
        <main className="flex-1 min-w-0 flex flex-col lg:flex-row gap-6">
            
            {/* Left Sidebar: Filters & History */}
            <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
                
                {/* Search History (FR-SD-05) */}
                <div className="glass rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm bg-white dark:bg-slate-900">
                    <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        Recent Searches
                    </h3>
                    <div className="flex flex-col gap-1">
                        {searchHistory.map((h, i) => (
                            <button key={i} onClick={() => setSearchQuery(h)} className="text-left px-3 py-2 rounded-xl text-[13px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate">
                                {h}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters (FR-SD-02) */}
                <div className="glass rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm bg-white dark:bg-slate-900 flex flex-col gap-6">
                    <div>
                        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Category</h3>
                        <div className="flex flex-col gap-2">
                            {['All', 'Person', 'Community', 'Content', 'Job'].map(cat => (
                                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                                    <input type="radio" name="category" checked={activeCategory === cat} onChange={() => setActiveCategory(cat)} className="text-indigo-500 focus:ring-indigo-500 rounded-full bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
                                    <span className={`text-[13px] font-bold transition-colors ${activeCategory === cat ? 'text-indigo-500' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Date Range</h3>
                        <select value={activeTime} onChange={e => setActiveTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[13px] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors">
                            <option>Any time</option>
                            <option>Past 24 hours</option>
                            <option>Past week</option>
                            <option>Past month</option>
                        </select>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Sort By</h3>
                        <select value={activeSort} onChange={e => setActiveSort(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[13px] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors">
                            <option>Most Relevant</option>
                            <option>Most Popular</option>
                            <option>Newest First</option>
                        </select>
                    </div>
                </div>

            </aside>

            {/* Main Search Area */}
            <div className="flex-1 flex flex-col gap-6">
                
                {/* Search Bar */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchSubmit}
                        placeholder="Search people, communities, posts, videos..." 
                        className="w-full pl-12 pr-6 py-4 text-lg font-bold rounded-2xl outline-none shadow-sm transition-all focus:shadow-md glass card-lift"
                        style={{
                            background: 'var(--tw-colors-slate-900, rgba(255,255,255,0.9))',
                            border: '1px solid var(--tw-colors-slate-200, rgba(99,102,241,0.2))'
                        }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    )}
                </div>

                {/* Results Area */}
                <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 min-h-[500px] flex flex-col overflow-hidden">
                    
                    <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <h2 className="text-[14px] font-bold text-slate-500">
                            {isSearching ? 'Searching...' : (
                                searchQuery ? `Found ${results.length} results for "${searchQuery}"` : 'Enter a query to start searching'
                            )}
                        </h2>
                    </div>

                    <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
                        
                        {!searchQuery && !isSearching && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <span className="material-symbols-outlined text-[64px] text-slate-300 mb-4">search</span>
                                <p className="text-lg font-bold text-slate-400">What are you looking for?</p>
                            </div>
                        )}

                        {/* Skeleton Loader (FR-SD-04) */}
                        {isSearching && (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-2"></div>
                                            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actual Results */}
                        {!isSearching && searchQuery && results.length > 0 && results.map((res) => (
                            <div 
                                key={res.id} 
                                onClick={() => {
                                    if (res.type === 'Article') {
                                        navigate(`/article-view?id=${res.originalId}`);
                                    } else if (res.type === 'Person') {
                                        navigate(`/profile`);
                                    } else if (res.type === 'Community') {
                                        navigate(`/community`);
                                    } else if (res.type === 'Job') {
                                        navigate(`/jobs`);
                                    } else if (res.type === 'Video') {
                                        navigate(`/videos`);
                                    } else if (res.type === 'Podcast') {
                                        navigate(`/podcasts`);
                                    }
                                }}
                                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                                
                                <div className="flex items-center gap-4">
                                    {res.type === 'Person' ? (
                                        <img src={res.img} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center">
                                            <span className="material-symbols-outlined">{res.icon}</span>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                {res.type}
                                            </span>
                                            <h4 className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                                                {res.name}
                                            </h4>
                                        </div>
                                        
                                        <p className="text-[13px] font-medium text-slate-500">
                                            {res.type === 'Person' && `${res.role} • ${res.department}`}
                                            {res.type === 'Community' && `${res.members} Members • ${res.desc}`}
                                            {(res.type === 'Article' || res.type === 'Post') && `By ${res.author} • ${res.date}`}
                                            {(res.type === 'Video' || res.type === 'Podcast') && `By ${res.author} • ${res.duration}`}
                                            {res.type === 'Job' && `${res.department} • ${res.location}`}
                                        </p>
                                    </div>
                                </div>

                                <span className="material-symbols-outlined text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>

                            </div>
                        ))}

                        {!isSearching && searchQuery && results.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-[32px] text-slate-400">search_off</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No results found</h3>
                                <p className="text-[14px] text-slate-500">We couldn't find anything matching "{searchQuery}". Try adjusting your filters or terms.</p>
                            </div>
                        )}

                    </div>
                </div>

            </div>

        </main>
    );
}
