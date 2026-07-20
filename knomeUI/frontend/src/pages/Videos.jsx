import React, { useState, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import UploadVideoModal from '../components/modals/UploadVideoModal';
import VideoPlayerModal from '../components/modals/VideoPlayerModal';
import { getVideos } from '../utils/videoService';

export default function Videos() {
    const { currentUser } = useUser();
    
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const filters = ['All', 'Training & Tutorials', 'Townhalls', 'Engineering Tech Talks', 'Leadership Updates'];

    const fetchVideos = async () => {
        setIsLoading(true);
        const data = await getVideos();
        setVideos(data || []);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const filteredVideos = videos.filter(v => 
        (activeFilter === 'All' || v.category === activeFilter) &&
        (v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-12">
                
                {/* Header & Upload Button */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Video Channel</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Discover organizational knowledge and training</p>
                    </div>
                    {currentUser.role !== 'SYSADM' && (
                        <button 
                            onClick={() => setIsUploadOpen(true)}
                            className="px-6 py-2.5 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/30 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">upload</span>
                            Upload Video
                        </button>
                    )}
                </div>

                {/* Filters & Search (FR-VC-05) */}
                <div className="glass card-lift rounded-2xl border shadow-sm p-2 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex overflow-x-auto custom-scrollbar w-full md:w-auto p-1">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors ${activeFilter === filter ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                        <input 
                            type="text" 
                            placeholder="Search by title or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white transition-all" 
                        />
                    </div>
                </div>

                {/* Featured Video (only show if 'All' and no search) */}
                {activeFilter === 'All' && !searchQuery && videos.length > 0 && (
                    <section 
                        onClick={() => setActiveVideo(videos[0])}
                        className="relative rounded-3xl overflow-hidden h-[400px] shadow-2xl group cursor-pointer border border-slate-200 dark:border-slate-800"
                    >
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={videos[0].thumbnail} alt="Featured" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-20 h-20 rounded-full bg-cyan-500/90 backdrop-blur-md flex items-center justify-center text-white shadow-xl shadow-cyan-500/30 scale-90 group-hover:scale-100 transition-all duration-300">
                                <span className="material-symbols-outlined text-[40px] ml-1">play_arrow</span>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div className="max-w-3xl">
                                <span className="bg-cyan-500 text-white text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full mb-4 inline-block shadow-lg shadow-cyan-500/30">
                                    Featured Presentation
                                </span>
                                <h2 className="text-white text-3xl font-black tracking-tight mb-3 line-clamp-2">
                                    {videos[0].title}
                                </h2>
                                <p className="text-slate-300 font-medium text-sm mb-4 line-clamp-2">
                                    {videos[0].description}
                                </p>
                                <div className="flex items-center gap-6 text-slate-300 text-[12px] font-bold">
                                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-cyan-400">schedule</span> {videos[0].duration}</span>
                                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-cyan-400">visibility</span> {videos[0].views} views</span>
                                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-cyan-400">corporate_fare</span> {videos[0].category}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Video Grid */}
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Explore Videos</h3>
                    
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2 opacity-70">
                            <span className="material-symbols-outlined animate-spin text-[32px] text-cyan-500">progress_activity</span>
                            <span className="font-bold">Loading videos...</span>
                        </div>
                    ) : filteredVideos.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                            No videos found matching your criteria.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredVideos.map((video) => (
                                <div 
                                    key={video.id} 
                                    onClick={() => setActiveVideo(video)}
                                    className="group glass card-lift bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border shadow-sm cursor-pointer"
                                >
                                    <div className="relative aspect-video overflow-hidden">
                                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={video.thumbnail} alt={video.title} />
                                        
                                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-white text-[48px]">play_circle</span>
                                        </div>
                                        
                                        <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded-md font-bold">
                                            {video.duration}
                                        </span>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-[15px] text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-cyan-500 transition-colors leading-snug">
                                            {video.title}
                                        </h3>
                                        
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {video.tags.map((tag, idx) => (
                                                <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 text-[12px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> {video.views}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">thumb_up</span> {video.likes}</span>
                                            <span className="ml-auto text-slate-400">{video.date}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            <UploadVideoModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onVideoUploaded={fetchVideos} />
            <VideoPlayerModal isOpen={!!activeVideo} onClose={() => setActiveVideo(null)} video={activeVideo} />
        </>
    );
}
