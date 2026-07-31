import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { deleteVideo } from '../../utils/videoService';
import ReportModal from './ReportModal';

export default function VideoPlayerModal({ isOpen, onClose, video, onVideoDeleted }) {
    const { currentUser } = useUser();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(video?.likes || 0);
    const [isReportOpen, setIsReportOpen] = useState(false);

    if (!isOpen || !video) return null;

    const canDelete = currentUser?.role === 'SYSADM' || currentUser?.role === 'COMADM' || currentUser?.id === video.authorId;

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
            try {
                await deleteVideo(video.id);
                onClose();
                if (onVideoDeleted) onVideoDeleted();
            } catch (error) {
                alert("Failed to delete video. Please try again.");
            }
        }
    };

    const handleLike = () => {
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
    };

    const getEmbedUrl = (url) => {
        if (!url) return null;
        
        // YouTube
        let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
        }
        
        // Vimeo
        match = url.match(/vimeo\.com\/(\d+)/);
        if (match && match[1]) {
            return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
        }

        // Microsoft Stream (Classic)
        match = url.match(/microsoftstream\.com\/video\/([\w-]+)/);
        if (match && match[1]) {
            return `https://web.microsoftstream.com/embed/video/${match[1]}?autoplay=1`;
        }

        // SharePoint / OneDrive (New Stream)
        if (url.includes('sharepoint.com') || url.includes('onedrive.live.com')) {
            // Usually SharePoint embed links require ?action=embedview
            if (!url.includes('action=embedview')) {
                return url.includes('?') ? `${url}&action=embedview` : `${url}?action=embedview`;
            }
        }

        return url;
    };

    const renderPlayer = () => {
        const url = video.sourceUrl || "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
        const isExternalEmbed = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('sharepoint.com') || url.includes('onedrive.live.com') || url.includes('microsoftstream.com');
        const isDirectVideoFile = !!url.match(/\.(mp4|webm|ogg|mov|m4v|mkv)(\?.*)?$/i) || url.includes('/uploads/') || url.includes('/Media/') || url.startsWith('data:video') || url.startsWith('blob:');

        if ((video.sourceType === 'LocalUpload' || isDirectVideoFile || !isExternalEmbed) && !isExternalEmbed) {
            return (
                <video 
                    className="w-full h-full"
                    controls 
                    controlsList="nodownload"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    autoPlay
                    preload="auto"
                    poster={video.thumbnail}
                    src={url}
                >
                    Your browser does not support the video tag.
                </video>
            );
        } else {
            return (
                <iframe
                    className="w-full h-full border-0"
                    src={getEmbedUrl(url)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                ></iframe>
            );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-slate-700 animate-in fade-in zoom-in duration-300 overflow-hidden">
                
                {/* HTML5 Video Player (FR-VC-03) */}
                <div className="relative w-full bg-black aspect-video flex-shrink-0">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {canDelete && (
                            <button 
                                onClick={handleDelete}
                                className="w-10 h-10 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-lg"
                                title="Delete Video"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    {renderPlayer()}
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
                                <button
                                    onClick={() => setIsReportOpen(true)}
                                    className="px-3 py-2.5 rounded-xl font-bold text-[13px] bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Report Video"
                                >
                                    <span className="material-symbols-outlined text-[18px]">report</span>
                                    Report
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

            {/* Report Video Modal */}
            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                targetType="Video"
                targetId={video?.id || 1}
                targetName={video?.author || video?.presenter || 'Creator'}
            />
        </div>
    );
}
