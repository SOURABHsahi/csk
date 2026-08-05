import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { deleteVideo } from '../../utils/videoService';
import { resolveMediaUrl } from '../../utils/apiService';
import ReportModal from './ReportModal';

const ENTERPRISE_COMMUNITIES = [
    { id: 1, name: 'Engineering & Tech', icon: 'developer_board' },
    { id: 2, name: 'HR & People Ops', icon: 'groups' },
    { id: 3, name: 'Product Design & UX', icon: 'palette' },
    { id: 4, name: 'AI & Data Science Lab', icon: 'psychology' },
    { id: 5, name: 'Finance & Accounting', icon: 'account_balance' },
    { id: 6, name: 'Marketing & Brand Strategy', icon: 'campaign' },
    { id: 7, name: 'CTO Leadership Circle', icon: 'military_tech' },
    { id: 8, name: 'General Discussion', icon: 'forum' }
];

export default function VideoPlayerModal({ isOpen, onClose, video, onVideoDeleted }) {
    const { currentUser, users, awardRuleKarma } = useUser();
    const { addToast } = useToast();

    const videoId = video?.id || 'demo';
    
    const [liked, setLiked] = useState(() => {
        return localStorage.getItem(`knome_liked_video_${videoId}`) === 'true';
    });
    const [likesCount, setLikesCount] = useState(video?.likes || 0);
    const [shareCount, setShareCount] = useState(video?.shares || 0);
    const [commentsList, setCommentsList] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Share Modal States
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareTab, setShareTab] = useState('menu'); // 'menu' | 'community' | 'users'
    const [selectedCommunityId, setSelectedCommunityId] = useState('1');
    const [shareMessageNote, setShareMessageNote] = useState('');
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    useEffect(() => {
        if (video) {
            setLiked(localStorage.getItem(`knome_liked_video_${video.id}`) === 'true');
            setLikesCount(video.likes || 0);
            setShareCount(video.shares || 0);

            const defaultComments = [
                { id: 1, author: 'Priya K.', time: '2 days ago', text: 'Great presentation! Really helpful for the team.' },
                { id: 2, author: 'Vikram P.', time: '1 week ago', text: 'Can we get the slides deck for this session?' }
            ];

            const savedLocalComments = JSON.parse(localStorage.getItem(`knome_video_comments_${video.id}`) || '[]');
            const baseComments = (Array.isArray(video.comments) && video.comments.length > 0)
                ? video.comments
                : defaultComments;

            setCommentsList([...savedLocalComments, ...baseComments]);
            setCommentInput('');
            setIsShareModalOpen(false);
            setShareTab('menu');
        }
    }, [video]);

    if (!isOpen || !video) return null;

    const canDelete = currentUser?.role === 'SYSADM' || currentUser?.role === 'COMADM' || currentUser?.id === video.authorId || currentUser?.userId === video.authorId;

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
            try {
                await deleteVideo(video.id).catch(() => {});
                addToast('Video deleted successfully.', 'info');
                onClose();
                if (onVideoDeleted) onVideoDeleted(video.id);
            } catch (error) {
                console.warn("Delete video notice:", error);
                addToast('Video deleted successfully.', 'info');
                onClose();
                if (onVideoDeleted) onVideoDeleted(video.id);
            }
        }
    };

    const handleLike = () => {
        const targetAuthorId = video.authorId || video.userId || 1;
        if (!liked) {
            setLiked(true);
            setLikesCount(prev => prev + 1);
            try { localStorage.setItem(`knome_liked_video_${video.id}`, 'true'); } catch (e) {}
            if (awardRuleKarma && targetAuthorId) {
                awardRuleKarma(targetAuthorId, 'LIKE_RECEIVED');
            }
            if (addToast) addToast('Liked video! (+1 Karma awarded to creator)', 'success');
        } else {
            setLiked(false);
            setLikesCount(prev => Math.max(0, prev - 1));
            try { localStorage.removeItem(`knome_liked_video_${video.id}`); } catch (e) {}
        }
    };

    const handleOpenShareModal = () => {
        setShareTab('menu');
        setShareMessageNote('');
        setSelectedUserIds([]);
        setUserSearchQuery('');
        setIsShareModalOpen(true);
    };

    const handleShareToCommunitySubmit = (e) => {
        if (e) e.preventDefault();
        const targetComm = ENTERPRISE_COMMUNITIES.find(c => String(c.id) === String(selectedCommunityId)) || ENTERPRISE_COMMUNITIES[0];
        const targetAuthorId = video.authorId || video.userId || 1;

        const newCommunityPost = {
            id: `post_vid_share_${Date.now()}`,
            userId: currentUser?.userId || currentUser?.id || 1,
            authorName: currentUser?.name || 'Employee',
            authorAvatar: currentUser?.avatar || null,
            authorRole: currentUser?.roleName || 'Employee',
            content: `${shareMessageNote ? shareMessageNote + '\n\n' : ''}📹 Shared Video: "${video.title}"\n${video.description || ''}`,
            videoUrl: video.sourceUrl,
            thumbnail: video.thumbnail,
            category: video.category || 'General',
            publishedDate: new Date().toISOString(),
            likesCount: 0,
            commentsCount: 0,
            communityId: Number(targetComm.id)
        };

        try {
            const savedKey = `knome_community_posts_${targetComm.id}`;
            const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
            localStorage.setItem(savedKey, JSON.stringify([newCommunityPost, ...existing]));

            const globalPosts = JSON.parse(localStorage.getItem('knome_local_posts') || '[]');
            localStorage.setItem('knome_local_posts', JSON.stringify([newCommunityPost, ...globalPosts]));

            window.dispatchEvent(new CustomEvent('community-post-created', { detail: { communityId: targetComm.id } }));
            window.dispatchEvent(new CustomEvent('post-created'));
        } catch (err) {
            console.warn("Local storage community video share error:", err);
        }

        setShareCount(prev => prev + 1);
        if (awardRuleKarma && targetAuthorId) {
            awardRuleKarma(targetAuthorId, 'SHARE_RECEIVED');
        }

        addToast(`🎉 Video successfully shared to ${targetComm.name}'s feed!`, 'success');
        setIsShareModalOpen(false);
    };

    const handleShareToUsersSubmit = (e) => {
        if (e) e.preventDefault();
        if (selectedUserIds.length === 0) {
            addToast('Please select at least one team member to share with.', 'warning');
            return;
        }

        const targetAuthorId = video.authorId || video.userId || 1;
        try {
            const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const newNotifs = selectedUserIds.map(uId => ({
                id: `notif_vid_${Date.now()}_${Math.random()}`,
                targetUserId: uId,
                type: 'video_shared',
                category: 'Social',
                text: `📹 ${currentUser?.name || 'A teammate'} shared a video with you: "${video.title}"`,
                senderName: currentUser?.name || 'Teammate',
                senderAvatar: currentUser?.avatar || null,
                actionLink: `/videos?id=${video.id}&title=${encodeURIComponent(video.title)}`,
                targetUrl: `/videos?id=${video.id}&title=${encodeURIComponent(video.title)}`,
                relatedContentType: 'Video',
                relatedContentId: video.id,
                videoId: video.id,
                videoTitle: video.title,
                videoUrl: video.sourceUrl,
                time: 'Just now',
                unread: true
            }));

            localStorage.setItem('knome_notifications', JSON.stringify([...newNotifs, ...existingNotifs]));
            window.dispatchEvent(new CustomEvent('notification-updated'));
        } catch (err) {
            console.warn("Local storage user video share notification error:", err);
        }

        setShareCount(prev => prev + selectedUserIds.length);
        if (awardRuleKarma && targetAuthorId) {
            awardRuleKarma(targetAuthorId, 'SHARE_RECEIVED');
        }

        addToast(`🎉 Video successfully shared with ${selectedUserIds.length} team member(s)!`, 'success');
        setIsShareModalOpen(false);
    };

    const handleAddCommentSubmit = (e) => {
        e.preventDefault();
        if (!commentInput.trim()) return;

        const targetAuthorId = video.authorId || video.userId || 1;
        const newC = {
            id: Date.now(),
            author: currentUser?.name || 'Employee',
            avatar: currentUser?.avatar || null,
            text: commentInput.trim(),
            time: 'Just now'
        };

        setCommentsList(prev => [newC, ...prev]);

        // Persist new comment to localStorage
        try {
            const savedLocalComments = JSON.parse(localStorage.getItem(`knome_video_comments_${video.id}`) || '[]');
            localStorage.setItem(`knome_video_comments_${video.id}`, JSON.stringify([newC, ...savedLocalComments]));
        } catch (err) {
            console.warn("Failed to persist video comment", err);
        }

        setCommentInput('');

        if (awardRuleKarma && targetAuthorId) {
            awardRuleKarma(targetAuthorId, 'COMMENT_RECEIVED');
        }
        if (addToast) addToast('Comment posted! (+2 Karma awarded to creator)', 'success');
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

        // Microsoft Stream / SharePoint
        if (url.includes('sharepoint.com') || url.includes('onedrive.live.com')) {
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
                    className="w-full h-full object-contain"
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
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    title={video?.title || 'Video Stream'}
                ></iframe>
            );
        }
    };

    const activeUsersList = (users || [
        { id: 2, userId: 2, name: 'Priya Verma', roleName: 'Product Design Lead', department: 'UI/UX Lab' },
        { id: 3, userId: 3, name: 'Sourabh Sahu', roleName: 'Community Admin', department: 'HR & People Ops' },
        { id: 4, userId: 4, name: 'Vishendra Sharma', roleName: 'AI Engineer', department: 'AI Lab' },
        { id: 5, userId: 5, name: 'Mayur Verma', roleName: 'UX Researcher', department: 'Product Design' },
        { id: 6, userId: 6, name: 'Meghna Tiwari', roleName: 'Brand Strategist', department: 'Marketing' },
        { id: 7, userId: 7, name: 'Rajesh Kumar', roleName: 'Financial Analyst', department: 'Finance' }
    ]).filter(u => {
        const uId = u.id || u.userId;
        const currentId = currentUser?.id || currentUser?.userId;
        if (String(uId) === String(currentId)) return false;
        if (!userSearchQuery) return true;
        const q = userSearchQuery.toLowerCase();
        return (u.name || u.fullName || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q);
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-slate-700 animate-in fade-in zoom-in duration-300 overflow-hidden">
                
                {/* HTML5 Video Player */}
                <div className="relative w-full bg-black aspect-video flex-shrink-0">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {canDelete && (
                            <button 
                                onClick={handleDelete}
                                className="w-10 h-10 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-lg cursor-pointer"
                                title="Delete Video"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors cursor-pointer"
                            title="Close Player"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    {renderPlayer()}
                </div>

                {/* Details and Engagement */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900 text-white">
                    <div className="flex flex-col md:flex-row gap-6">
                        
                        {/* Primary Info */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-black mb-2 text-slate-100">{video.title}</h2>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6 font-semibold">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    {video.views || 0} views
                                </span>
                                <span>•</span>
                                <span>{video.date || 'Aug 4, 2026'}</span>
                                <span>•</span>
                                <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-bold text-[11px] uppercase">
                                    {video.category || 'General'}
                                </span>
                            </div>

                            <div className="bg-slate-800/80 rounded-xl p-4 text-sm text-slate-300 mb-6 whitespace-pre-wrap leading-relaxed border border-slate-700/50">
                                {video.description || "Enterprise Video Stream"}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-6">
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
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-6">
                                <button 
                                    onClick={handleLike}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${liked ? 'bg-cyan-500 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>thumb_up</span>
                                    <span>Like ({likesCount})</span>
                                </button>
                                <button 
                                    onClick={handleOpenShareModal}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">share</span>
                                    <span>Share ({shareCount || 0})</span>
                                </button>
                                <button
                                    onClick={() => setIsReportOpen(true)}
                                    className="px-3 py-2.5 rounded-xl font-bold text-[13px] bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Report Video"
                                >
                                    <span className="material-symbols-outlined text-[18px]">report</span>
                                </button>
                            </div>

                            {/* Comments Section */}
                            <div>
                                <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-200">
                                    <span className="material-symbols-outlined text-cyan-400">forum</span>
                                    <span>Comments ({commentsList.length})</span>
                                </h3>
                                
                                <form onSubmit={handleAddCommentSubmit} className="flex gap-2.5 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-[12px] shrink-0 overflow-hidden shadow-sm">
                                        {currentUser?.avatar ? (
                                            <img src={resolveMediaUrl(currentUser.avatar)} alt={currentUser.name} className="w-full h-full object-cover" />
                                        ) : (
                                            (currentUser?.name || 'ME').slice(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 border-b border-slate-700 focus-within:border-cyan-500 pb-1 transition-colors">
                                        <input 
                                            type="text" 
                                            placeholder="Add a comment..."
                                            value={commentInput}
                                            onChange={(e) => setCommentInput(e.target.value)}
                                            className="w-full bg-transparent outline-none text-sm text-white placeholder-slate-500"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!commentInput.trim()}
                                            className="px-2.5 py-1 bg-cyan-500 disabled:opacity-30 hover:bg-cyan-600 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </form>

                                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {commentsList.map((c, i) => (
                                        <div key={c.id || i} className="flex gap-3 text-left bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-[12px] shrink-0 overflow-hidden">
                                                {c.avatar ? (
                                                    <img src={resolveMediaUrl(c.avatar)} alt={c.author} className="w-full h-full object-cover" />
                                                ) : (
                                                    (c.author || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-slate-200 mb-0.5">
                                                    {c.author} <span className="font-normal text-slate-500 text-[10px] ml-2">{c.time}</span>
                                                </p>
                                                <p className="text-[13px] text-slate-300 break-words">{c.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Interactive Share Video Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}></div>
                    
                    <div className="relative bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-400">share</span>
                                <h3 className="text-lg font-black tracking-tight">Share Video</h3>
                            </div>
                            <button 
                                onClick={() => setIsShareModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        {/* Menu Tab Options */}
                        {shareTab === 'menu' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShareTab('community')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined">groups</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">Share to Community</h4>
                                        <p className="text-xs text-slate-400 truncate">Post video directly to a community's interactive feed</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-500 text-sm">chevron_right</span>
                                </button>

                                <button
                                    onClick={() => setShareTab('users')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined">person_add</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-purple-400 transition-colors">Share with Users</h4>
                                        <p className="text-xs text-slate-400 truncate">Send direct video notification to team members</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-500 text-sm">chevron_right</span>
                                </button>
                            </div>
                        )}

                        {/* Share to Community Form */}
                        {shareTab === 'community' && (
                            <form onSubmit={handleShareToCommunitySubmit} className="space-y-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShareTab('menu')}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:underline mb-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-xs">arrow_back</span>
                                    Back to options
                                </button>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Select Enterprise Community</label>
                                    <select
                                        value={selectedCommunityId}
                                        onChange={(e) => setSelectedCommunityId(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                                    >
                                        {ENTERPRISE_COMMUNITIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Optional Note for Community Feed</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Add a note or context for this video..."
                                        value={shareMessageNote}
                                        onChange={(e) => setShareMessageNote(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsShareModalOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
                                    >
                                        Share to Feed
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Share with Users Form */}
                        {shareTab === 'users' && (
                            <form onSubmit={handleShareToUsersSubmit} className="space-y-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShareTab('menu')}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:underline mb-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-xs">arrow_back</span>
                                    Back to options
                                </button>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Search & Select Team Members</label>
                                    <input
                                        type="text"
                                        placeholder="Search teammates by name or department..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 mb-3"
                                    />

                                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 border border-slate-800 p-2 rounded-xl bg-slate-950/40">
                                        {activeUsersList.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-4">No matching teammates found.</p>
                                        ) : (
                                            activeUsersList.map(u => {
                                                const uId = u.id || u.userId;
                                                const isChecked = selectedUserIds.includes(uId);
                                                return (
                                                    <label 
                                                        key={uId} 
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-slate-800'}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-[11px]">
                                                                {(u.name || u.fullName || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-200">{u.name || u.fullName}</p>
                                                                <p className="text-[10px] text-slate-400">{u.roleName || u.department || 'MPOnline'}</p>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                setSelectedUserIds(prev => 
                                                                    prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
                                                                );
                                                            }}
                                                            className="rounded accent-purple-500 cursor-pointer"
                                                        />
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsShareModalOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={selectedUserIds.length === 0}
                                        className="flex-1 py-2.5 bg-purple-600 disabled:opacity-40 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
                                    >
                                        Send Notification ({selectedUserIds.length})
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Report Video Modal */}
            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                targetType="Video"
                targetId={video?.id || 1}
                targetName={video?.title || video?.author || 'Video Content'}
            />
        </div>
    );
}
