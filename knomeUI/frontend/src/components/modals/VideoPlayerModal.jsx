import React, { useState } from 'react';

export default function VideoPlayerModal({ isOpen, onClose, video }) {
    if (!isOpen || !video) return null;

    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(video.likes || 0);

    const handleLike = () => {
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-slate-700 animate-in fade-in zoom-in duration-300 overflow-hidden">
                
                {/* HTML5 Video Player (FR-VC-03) */}
                <div className="relative w-full bg-black aspect-video flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    
                    <video 
                        className="w-full h-full"
                        controls 
                        autoPlay
                        preload="auto"
                        poster={video.thumbnail}
                        // Use actual sourceUrl or fallback for demonstration
                        src={video.sourceUrl || "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* Details and Engagement (FR-VC-04) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900 text-white">
                    <div className="flex flex-col md:flex-row gap-6">
                        
                        {/* Primary Info */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-2">{video.title}</h2>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    {video.views} views
                                </span>
                                <span>•</span>
                                <span>{video.date}</span>
                                <span>•</span>
                                <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-bold text-[11px] uppercase">
                                    {video.category}
                                </span>
                            </div>

                            <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-300 mb-8 whitespace-pre-wrap">
                                {video.description || "No description provided."}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {(video.tags || ['Training', 'Engineering']).map((tag, idx) => (
                                    <span key={idx} className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-[12px] font-bold">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Social / Engagement Panel */}
                        <div className="w-full md:w-80 shrink-0">
                            {/* Action Bar */}
                            <div className="flex items-center gap-2 mb-8 border-b border-slate-700 pb-6">
                                <button 
                                    onClick={handleLike}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-colors ${liked ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{liked ? 'thumb_up' : 'thumb_up_outline'}</span>
                                    {likesCount}
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">share</span>
                                    Share
                                </button>
                            </div>

                            {/* Comments Section (Mock) */}
                            <div>
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined">forum</span>
                                    Comments ({(video.comments || []).length})
                                </h3>
                                
                                <div className="flex gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-[12px] shrink-0">
                                        ME
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Add a comment..."
                                        className="flex-1 bg-transparent border-b border-slate-700 focus:border-cyan-500 outline-none text-sm pb-1 transition-colors"
                                    />
                                </div>

                                <div className="flex flex-col gap-4">
                                    {(video.comments || [
                                        { author: 'Neha K.', time: '2 days ago', text: 'Great presentation! Really helpful.' },
                                        { author: 'Vikram P.', time: '1 week ago', text: 'Can we get the slides for this?' }
                                    ]).map((c, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-[12px] shrink-0">
                                                {c.author.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-300 mb-1">
                                                    {c.author} <span className="font-normal text-slate-500 ml-2">{c.time}</span>
                                                </p>
                                                <p className="text-[13px] text-slate-400">{c.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
