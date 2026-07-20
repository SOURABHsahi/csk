import React, { useState, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import PostCard from '../components/widgets/PostCard';
import CreatePostModal from '../components/modals/CreatePostModal';
import { getPosts } from '../utils/mockPosts';

export default function Posts() {
    const { currentUser } = useUser();
    
    // Core state
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('All');
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

    const loadPosts = async () => {
        setIsLoading(true);
        const data = await getPosts();
        setPosts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadPosts();
    }, []);

    // Get all unique tags for filter pills
    const allTags = ['All', ...new Set(posts.flatMap(post => post.tags || []))];

    // Filter logic
    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = selectedTag === 'All' || (post.tags && post.tags.includes(selectedTag));
        return matchesSearch && matchesTag;
    });

    const handlePostCreated = () => {
        // Small delay so backend processes the new post before refetch
        setTimeout(() => loadPosts(), 500);
    };

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-6 pb-32">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight" style={{color: 'var(--text-primary)'}}>
                        Posts Hub
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        Browse, search, and participate in conversations across the network.
                    </p>
                </div>
                
                {/* Write Post Button */}
                {currentUser.role !== 'SYSADM' && (
                    <button
                        onClick={() => setIsCreatePostOpen(true)}
                        className="px-5 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 shrink-0"
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
                    filteredPosts.map(post => (
                        <PostCard key={post.id} post={post} onPostDeleted={() => loadPosts()} />
                    ))
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
