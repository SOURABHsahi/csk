import React, { useState } from 'react';
import { useUser } from '../components/contexts/UserContext';
import { useAudio } from '../components/contexts/AudioContext';
import UploadPodcastModal from '../components/modals/UploadPodcastModal';

export default function Podcasts() {
    const { currentUser } = useUser();
    const { playPodcast, currentPodcast, isPlaying } = useAudio();
    
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All Episodes');
    const [selectedSeries, setSelectedSeries] = useState(null);

    const seriesData = [
        {
            id: 's1',
            title: 'The Quantum Leap',
            description: 'Deep dives into emerging technology and how it reshapes our internal infrastructure.',
            episodes: 12,
            category: 'Tech Focus',
            thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400&h=400'
        },
        {
            id: 's2',
            title: 'Leadership Uncut',
            description: 'Candid conversations with our global directors about growth, failure, and strategy.',
            episodes: 8,
            category: 'Leadership',
            thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=400&h=400'
        },
        {
            id: 's3',
            title: 'Culture & Karma',
            description: 'Highlighting the people behind the projects and the culture that drives us.',
            episodes: 24,
            category: 'Community',
            thumbnail: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=400&h=400'
        }
    ];

    const podcastEpisodes = [
        {
            id: 1,
            title: 'Ep 12: Preparing for the EMEA Rollout',
            series: 'The Quantum Leap',
            category: 'Tech Focus',
            duration: '45:10',
            date: 'Oct 14, 2023',
            author: 'Corporate Tech',
            thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400&h=400'
        },
        {
            id: 2,
            title: 'Interview with Sarah Jenkins (VP of Engineering)',
            series: 'Leadership Uncut',
            category: 'Leadership',
            duration: '32:15',
            date: 'Oct 10, 2023',
            author: 'HR Communications',
            thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=400&h=400'
        },
        {
            id: 3,
            title: 'How Team Alpha Ship Faster without Burnout',
            series: 'Culture & Karma',
            category: 'Community',
            duration: '28:40',
            date: 'Oct 05, 2023',
            author: 'Meghna Tiwari',
            thumbnail: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=400&h=400'
        },
        {
            id: 4,
            title: 'Ep 11: Security Audits in a Remote World',
            series: 'The Quantum Leap',
            category: 'Tech Focus',
            duration: '41:20',
            date: 'Sep 28, 2023',
            author: 'Corporate Tech',
            thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400&h=400'
        }
    ];

    const displayedEpisodes = selectedSeries 
        ? podcastEpisodes.filter(ep => ep.series === selectedSeries.title)
        : podcastEpisodes;

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-32">
                
                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Podcast Channel</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Listen to industry insights and internal talk series.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filter
                        </button>
                        {currentUser.role !== 'SYSADM' && (
                            <button 
                                onClick={() => setIsUploadOpen(true)}
                                className="px-6 py-2.5 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/30 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">mic</span>
                                Publish Episode
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    {['All Episodes', 'Series', 'My Podcasts'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab !== 'Series') setSelectedSeries(null); // reset series filter if switching tabs
                            }}
                            className={`px-6 py-4 font-bold text-[14px] transition-colors relative ${activeTab === tab ? 'text-pink-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 rounded-t-full"></div>}
                        </button>
                    ))}
                </div>

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
                    </div>
                </section>

                {/* Episodes List */}
                <section>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6">
                        {selectedSeries ? `Episodes in "${selectedSeries.title}"` : 'All Episodes'}
                    </h2>
                    
                    <div className="flex flex-col gap-3">
                        {displayedEpisodes.map(ep => {
                            const isThisPlaying = currentPodcast?.id === ep.id && isPlaying;
                            return (
                                <div key={ep.id} className="group glass card-lift bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all hover:shadow-md">
                                    <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden shadow-sm">
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
                                            <span className="text-[12px] font-bold text-slate-400">{ep.date}</span>
                                        </div>
                                        <h3 className="font-bold text-[15px] text-slate-900 dark:text-white truncate mb-1">{ep.title}</h3>
                                        <div className="flex items-center gap-4 text-[12px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {ep.duration}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> {ep.author}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4 md:mt-0">
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
                    </div>
                </section>

            </main>

            <UploadPodcastModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        </>
    );
}
