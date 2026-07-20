import React, { useState } from 'react';
import PostCard from '../components/widgets/PostCard';

export default function SavedContent() {
    
    // Mock saved items (FR-CI-04)
    const [activeTab, setActiveTab] = useState('All');

    const mockSavedPosts = [
        {
            id: 2,
            author: {
                name: 'Loveneesh Sharma',
                role: 'System Administrator',
                avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
                isVerified: true
            },
            time: '5 hours ago',
            content: 'Heads up everyone: We will be performing scheduled maintenance on the core database cluster this Saturday from 2 AM to 4 AM EST. Expect intermittent downtime across all staging environments. Production will not be affected.',
            tags: ['maintenance', 'infrastructure', 'devops'],
            likes: 12,
            shares: 2,
            isSaved: true,
            comments: []
        }
    ];

    const tabs = ['All', 'Posts', 'Articles', 'Videos', 'Podcasts'];

    return (
        <main className="flex-1 flex flex-col gap-8 pb-32 min-w-0">
            
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    <span className="material-symbols-outlined text-[32px] text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>bookmark</span>
                    Saved Content
                </div>
                <p className="text-sm font-medium text-slate-500">Your personal library of bookmarked posts, articles, and media.</p>
            </header>

            {/* Filter Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar whitespace-nowrap px-2">
                {tabs.map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-4 font-bold text-[14px] transition-colors ${activeTab === tab ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Feed */}
            <div className="flex flex-col gap-6 max-w-3xl">
                {mockSavedPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}
                
                {/* Mock an article card visually for variety */}
                {['All', 'Articles'].includes(activeTab) && (
                    <div className="group glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row gap-5 relative overflow-hidden">
                        <div className="absolute top-4 right-4 text-amber-500">
                            <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>bookmark</span>
                        </div>
                        <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=300&h=200" alt="Cover" className="w-full md:w-48 h-32 object-cover rounded-xl" />
                        <div className="flex-1 flex flex-col justify-center pr-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Article</div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-indigo-500 transition-colors">The Future of AI in Enterprise Architecture</h3>
                            <p className="text-[12px] font-bold text-slate-500 flex items-center gap-2">
                                By Meghna Tiwari <span className="opacity-50">•</span> 5 min read
                            </p>
                        </div>
                    </div>
                )}
            </div>

        </main>
    );
}
