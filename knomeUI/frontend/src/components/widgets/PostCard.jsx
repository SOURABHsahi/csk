import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import ReportModal from '../modals/ReportModal';

import { savePost, deletePost } from '../../utils/mockPosts';

// Available reactions (FR-CI-01)
const REACTION_TYPES = {
    like: { icon: '👍', label: 'Like', color: 'text-blue-500' },
    celebrate: { icon: '🎉', label: 'Celebrate', color: 'text-amber-500' },
    support: { icon: '🤝', label: 'Support', color: 'text-purple-500' },
    heart: { icon: '❤️', label: 'Heart', color: 'text-pink-500' }
};

// ─── Fullscreen Image Lightbox ───────────────────────────────
function ImageLightbox({ images, startIndex, onClose }) {
    const [current, setCurrent] = useState(startIndex);

    const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowLeft')  prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'Escape')     onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [prev, next, onClose]);

    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}
        >
            {/* Close */}
            <button
                onClick={onClose}
                className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20"
            >
                <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            {/* Counter */}
            {images.length > 1 && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-[13px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    {current + 1} / {images.length}
                </div>
            )}

            {/* Prev Arrow */}
            {images.length > 1 && (
                <button
                    onClick={e => { e.stopPropagation(); prev(); }}
                    className="absolute left-4 w-12 h-12 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20"
                >
                    <span className="material-symbols-outlined text-[28px]">arrow_back_ios</span>
                </button>
            )}

            {/* Image */}
            <img
                src={images[current].url}
                alt="Full view"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                style={{ userSelect: 'none' }}
                onClick={e => e.stopPropagation()}
            />

            {/* Next Arrow */}
            {images.length > 1 && (
                <button
                    onClick={e => { e.stopPropagation(); next(); }}
                    className="absolute right-4 w-12 h-12 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20"
                >
                    <span className="material-symbols-outlined text-[28px]">arrow_forward_ios</span>
                </button>
            )}

            {/* Thumbnail strip for multi-image */}
            {images.length > 1 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={e => { e.stopPropagation(); setCurrent(i); }}
                            className="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all"
                            style={{ borderColor: i === current ? 'white' : 'rgba(255,255,255,0.3)' }}
                        >
                            <img src={img.url} alt="thumb" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body
    );
}

// ─── Image Grid (full-width cover layout) ────────────────────
function ImageGrid({ images, onImageClick }) {
    if (images.length === 0) return null;

    // Single image — full width, tall cover
    if (images.length === 1) {
        return (
            <div
                className="w-full overflow-hidden cursor-zoom-in group relative"
                style={{ maxHeight: '520px' }}
                onClick={() => onImageClick(0)}
            >
                <img
                    src={images[0].url}
                    alt="Post image"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    style={{ maxHeight: '520px', display: 'block' }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
        );
    }

    // Two images — side by side
    if (images.length === 2) {
        return (
            <div className="w-full grid grid-cols-2 gap-0.5" style={{ height: '360px' }}>
                {images.map((img, i) => (
                    <div
                        key={i}
                        className="overflow-hidden cursor-zoom-in group relative"
                        onClick={() => onImageClick(i)}
                    >
                        <img src={img.url} alt="Post image" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                ))}
            </div>
        );
    }

    // Three images — 1 big left, 2 stacked right
    if (images.length === 3) {
        return (
            <div className="w-full grid grid-cols-2 gap-0.5" style={{ height: '380px' }}>
                <div className="overflow-hidden cursor-zoom-in group relative row-span-2" onClick={() => onImageClick(0)}>
                    <img src={images[0].url} alt="Post image" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                {images.slice(1, 3).map((img, i) => (
                    <div key={i} className="overflow-hidden cursor-zoom-in group relative" style={{ height: '189px' }} onClick={() => onImageClick(i + 1)}>
                        <img src={img.url} alt="Post image" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                ))}
            </div>
        );
    }

    // Four or more — 2x2 grid, last cell shows +N more
    const showImages = images.slice(0, 4);
    const extraCount = images.length - 4;
    return (
        <div className="w-full grid grid-cols-2 gap-0.5" style={{ height: '380px' }}>
            {showImages.map((img, i) => (
                <div
                    key={i}
                    className="overflow-hidden cursor-zoom-in group relative"
                    onClick={() => onImageClick(i)}
                >
                    <img src={img.url} alt="Post image" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    {/* +N overlay on last cell */}
                    {i === 3 && extraCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.55)' }}>
                            <span className="text-white text-2xl font-black">+{extraCount}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function PostCard({ post, onPostDeleted }) {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    
    // Interaction States
    const [reaction, setReaction] = useState(null);
    const [isSaved, setIsSaved] = useState(post.isSaved || false); // FR-CI-04
    const [showComments, setShowComments] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [reactionHover, setReactionHover] = useState(false);

    // Lightbox state
    const [lightboxIndex, setLightboxIndex] = useState(null);
    
    // Menu & Report (FR-SM-02)
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const menuRef = useRef(null);
    
    // Comments State
    const [comments, setComments] = useState(post.comments || []);
    const [newComment, setNewComment] = useState('');
    
    // Timer for reaction popover delay
    const hoverTimeoutRef = useRef(null);

    // Separate image attachments from other attachments
    const imageAttachments = (post.attachments || []).filter(a => a.type === 'image');
    const otherAttachments = (post.attachments || []).filter(a => a.type !== 'image');

    const handleShareToTimeline = async () => {
        try {
            const sharedContent = `Shared a post from @${post.author.name}:\n\n"${post.content}"`;
            await savePost({
                content: sharedContent,
                attachments: post.attachments || []
            });
            alert('Post shared to your timeline successfully!');
            setIsShareOpen(false);
            window.location.reload();
        } catch (error) {
            console.error('Failed to share post', error);
            alert('Failed to share post');
        }
    };

    const handleShareToCommunity = () => {
        const comm = prompt("Enter community name to share to:");
        if (comm) {
            alert(`Post successfully shared to community: ${comm}`);
            setIsShareOpen(false);
        }
    };

    const handleSendInMessage = () => {
        const user = prompt("Enter username to send message to:");
        if (user) {
            alert(`Post successfully sent to ${user} via message!`);
            setIsShareOpen(false);
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            await deletePost(post.id);
            setIsMenuOpen(false);
            if (onPostDeleted) onPostDeleted();
        } catch (error) {
            alert("Failed to delete post");
        }
    };

    const handleReactionMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => setReactionHover(true), 300);
    };

    const handleReactionMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setReactionHover(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleReaction = (type) => {
        if (reaction === type) setReaction(null);
        else setReaction(type);
        setReactionHover(false);
    };

    const handleAddComment = (e, parentId = null) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        const newC = {
            id: Date.now(),
            author: currentUser.name,
            avatar: `https://ui-avatars.com/api/?name=${currentUser.name}&background=6366f1&color=fff`,
            text: newComment,
            time: 'Just now',
            replies: []
        };

        if (parentId) {
            // Nested reply (FR-CI-05) - simplified for prototype
            setComments(comments.map(c => {
                if (c.id === parentId) {
                    return { ...c, replies: [...(c.replies || []), newC] };
                }
                return c;
            }));
        } else {
            setComments([newC, ...comments]);
        }
        setNewComment('');
    };

    return (
        <article className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1"
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-premium)',
            }}>
            {/* Header */}
            <div className="p-5 pb-3 flex gap-4">
                <button 
                    onClick={() => navigate('/profile', { state: { user: post.author } })}
                    className="w-12 h-12 rounded-xl p-[2px] bg-gradient-to-br from-blue-500 to-cyan-400 shrink-0 shadow-sm transition-transform hover:scale-105 cursor-pointer"
                >
                    <img className="w-full h-full rounded-[10px] object-cover border-2 border-white dark:border-slate-900" alt="Avatar" src={post.author.avatar} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                            <button onClick={() => navigate('/profile', { state: { user: post.author } })} className="font-extrabold text-[14px] text-[#0F172A] dark:text-white leading-tight hover:underline cursor-pointer">{post.author.name}</button>
                            {post.author.isVerified && <span className="material-symbols-outlined text-[13px] text-blue-500" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>}
                            <span className="text-slate-300 dark:text-slate-700 text-[11px]">•</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11.5px] font-bold uppercase tracking-wider">{post.author.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* Save Button (FR-CI-04) */}
                            <button 
                                onClick={() => setIsSaved(!isSaved)}
                                className={`p-1.5 rounded-lg transition-all active:scale-95 ${isSaved ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                title={isSaved ? "Unsave" : "Save Content"}
                            >
                                <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0"}}>bookmark</span>
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                                        <button 
                                            onClick={() => { setIsMenuOpen(false); navigate('/profile', { state: { user: post.author } }); }}
                                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">person</span> View Profile
                                        </button>
                                        <button 
                                            onClick={() => { setIsMenuOpen(false); setIsReportModalOpen(true); }}
                                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">report</span> Report Post
                                        </button>
                                        {(currentUser?.userId === post.author?.userId || currentUser?.role === 'SYSADM' || currentUser?.role === 'HRADM') && (
                                            <button 
                                                onClick={handleDeletePost}
                                                className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-1"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span> Delete Post
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        {post.time}
                        <span className="material-symbols-outlined text-[10px]">public</span>
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-3">
                {post.type === 'article' && (
                    <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-fit">
                        <span className="material-symbols-outlined text-[12px]" style={{fontVariationSettings: "'FILL' 1"}}>article</span>
                        ARTICLE
                    </div>
                )}
                <p className="text-[13.5px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                </p>
                {post.type === 'article' && (
                    <button 
                        onClick={() => navigate('/article-view?id=' + (post.id === 1 ? '2' : post.id))}
                        className="mt-3 text-xs font-black text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                    >
                        Read Full Article
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                )}
                {post.tags && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map(tag => (
                            <span key={tag} className="text-[12px] font-bold text-[#2563EB] hover:text-blue-700 hover:underline cursor-pointer transition-colors">#{tag}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Image Attachments — Full-Width Cover Grid ── */}
            {imageAttachments.length > 0 && (
                <div className="mt-2 w-full">
                    <ImageGrid
                        images={imageAttachments}
                        onImageClick={(idx) => setLightboxIndex(idx)}
                    />
                </div>
            )}

            {/* ── Non-Image Attachments (Video / Audio / Doc) ── */}
            {otherAttachments.length > 0 && (
                <div className="mt-2 w-full flex flex-col gap-2">
                    {otherAttachments.map(att => {
                        if (att.type === 'video') {
                            return (
                                <div key={att.id} className="overflow-hidden bg-black">
                                    <video src={att.url} controls className="w-full" style={{ maxHeight: '460px' }} />
                                </div>
                            );
                        } else if (att.type === 'audio') {
                            return (
                                <div key={att.id} className="mx-5 mb-1 p-4 rounded-2xl flex items-center gap-4"
                                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                                        <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>headphones</span>
                                    </div>
                                    <audio src={att.url} controls className="flex-1" />
                                </div>
                            );
                        } else if (att.type === 'doc') {
                            return (
                                <div key={att.id} className="mx-5 mb-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[20px]">description</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{att.name}</p>
                                            <p className="text-[11px] text-slate-500">Document</p>
                                        </div>
                                    </div>
                                    <a href={att.url} target="_blank" rel="noreferrer" className="shrink-0 p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">download</span>
                                    </a>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            )}

            {/* ── Fullscreen Lightbox ── */}
            {lightboxIndex !== null && (
                <ImageLightbox
                    images={imageAttachments}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}

            {/* Interaction Counts */}
            <div className="px-5 py-3 flex items-center justify-between text-[12px] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                    {reaction && (
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            <span className="text-[14px]">{REACTION_TYPES[reaction].icon}</span>
                            <span className="font-bold text-slate-900 dark:text-white">You {post.likes > 0 ? `and ${post.likes} others` : ''}</span>
                        </div>
                    )}
                    {!reaction && post.likes > 0 && <span>{post.likes} reactions</span>}
                </div>
                <div className="flex gap-4">
                    <button className="hover:underline hover:text-indigo-500">{comments.length} comments</button>
                    <span>{post.shares || 0} shares</span>
                </div>
            </div>

            {/* Interaction Bar */}
            <div className="px-3 py-2 flex items-center justify-between relative">
                
                {/* Reaction Popover (FR-CI-01) */}
                {reactionHover && (
                    <div 
                        className="absolute bottom-full left-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-full px-3 py-2 flex gap-2 animate-in fade-in slide-in-from-bottom-2 z-20"
                        onMouseEnter={() => setReactionHover(true)}
                        onMouseLeave={handleReactionMouseLeave}
                    >
                        {Object.entries(REACTION_TYPES).map(([key, data]) => (
                            <button 
                                key={key}
                                onClick={() => toggleReaction(key)}
                                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col items-center justify-center group/react transition-transform hover:scale-125 origin-bottom"
                                title={data.label}
                            >
                                <span className="text-[22px] group-hover/react:-translate-y-1 transition-transform">{data.icon}</span>
                            </button>
                        ))}
                    </div>
                )}

                <button 
                    onMouseEnter={handleReactionMouseEnter}
                    onMouseLeave={handleReactionMouseLeave}
                    onClick={() => toggleReaction(reaction ? null : 'like')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-colors ${reaction ? REACTION_TYPES[reaction].color : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    {reaction ? (
                        <>
                            <span className="text-[18px]">{REACTION_TYPES[reaction].icon}</span>
                            {REACTION_TYPES[reaction].label}
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                            Like
                        </>
                    )}
                </button>

                <button 
                    onClick={() => setShowComments(!showComments)}
                    className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    Comment
                </button>

                {/* Share Button (FR-CI-03) */}
                <div className="flex-1 relative">
                    <button 
                        onClick={() => setIsShareOpen(!isShareOpen)}
                        className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">share</span>
                        Share
                    </button>

                    {/* Share Popover Modal... */}
                    {isShareOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsShareOpen(false)}></div>
                            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Share Post</h3>
                                    <button onClick={() => setIsShareOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={handleShareToTimeline} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">dynamic_feed</span></div> Share to Timeline
                                    </button>
                                    <button onClick={handleShareToCommunity} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-500 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">groups</span></div> Share to Community
                                    </button>
                                    <button onClick={handleSendInMessage} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">send</span></div> Send in Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ReportModal 
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)} 
                targetType="Post"
                targetName={post.author.name}
            />

            {/* Comments Section (FR-CI-02, FR-CI-05) */}
            {showComments && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5">
                    
                    {/* Add Comment */}
                    <div className="flex gap-3 mb-6">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 bg-indigo-500 shadow-sm">
                            {currentUser.name.charAt(0)}
                        </div>
                        <form onSubmit={(e) => handleAddComment(e, null)} className="flex-1 relative">
                            <input 
                                type="text" 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..." 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-4 pr-12 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                            />
                            {/* Image Attachment (FR-CI-02) */}
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Attach Image">
                                <span className="material-symbols-outlined text-[18px]">image</span>
                            </button>
                        </form>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-5">
                        {comments.map(comment => (
                            <CommentThread key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
}

// Sub-component for nested replies (FR-CI-05)
function CommentThread({ comment, depth = 0 }) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replies, setReplies] = useState(comment.replies || []);

    const submitReply = (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        const newReply = {
            id: Date.now(),
            author: 'You',
            avatar: 'https://ui-avatars.com/api/?name=You&background=6366f1&color=fff',
            time: 'Just now',
            text: replyText.trim(),
            replies: []
        };

        setReplies([...replies, newReply]);
        setReplyText('');
        setIsReplying(false);
    };

    return (
        <div className="flex gap-3">
            <img src={comment.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" />
            <div className="flex-1">
                <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-3 inline-block max-w-full">
                    <div className="flex items-baseline justify-between gap-4 mb-1">
                        <span className="font-bold text-[13px] text-slate-900 dark:text-white">{comment.author}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{comment.time}</span>
                    </div>
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                </div>
                
                {/* Comment Actions */}
                <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] font-bold text-slate-500">
                    <button className="hover:text-indigo-500 transition-colors">Like</button>
                    {/* Allow reply if less than 3 levels deep */}
                    {depth < 3 && (
                        <button onClick={() => setIsReplying(!isReplying)} className="hover:text-indigo-500 transition-colors">Reply</button>
                    )}
                </div>

                {isReplying && (
                    <form onSubmit={submitReply} className="mt-3 relative max-w-sm">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder={`Reply to ${comment.author}...`} 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-4 pr-10 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                        />
                    </form>
                )}

                {/* Nested Replies */}
                {replies && replies.length > 0 && (
                    <div className="mt-4 space-y-4 border-l border-slate-100 dark:border-slate-800 pl-4">
                        {replies.map(reply => (
                            <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
