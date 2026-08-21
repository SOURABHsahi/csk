import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import ReportModal from '../modals/ReportModal';
import SaveToCategoryModal from '../modals/SaveToCategoryModal';
import DocumentViewerModal from '../modals/DocumentViewerModal';
import ArticleShareModal from '../modals/ArticleShareModal';

import { interactionsApi, postsApi, searchApi, communitiesApi, resolveMediaUrl, getVideoThumbnail } from '../../utils/apiService';

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

    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200';

    return createPortal(
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}
        >
            {/* Close */}
            <button
                onClick={onClose}
                className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all hover:bg-white/10"
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
                src={resolveMediaUrl(images[current]?.url)}
                onError={(e) => { e.target.src = FALLBACK_IMG; }}
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
                            <img 
                                src={resolveMediaUrl(img.url)} 
                                onError={(e) => { e.target.src = FALLBACK_IMG; }} 
                                alt="thumb" 
                                className="w-full h-full object-cover" 
                            />
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

    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200';

    // Single image — full width, tall cover
    if (images.length === 1) {
        return (
            <div
                className="w-full overflow-hidden cursor-zoom-in group relative"
                style={{ maxHeight: '520px' }}
                onClick={() => onImageClick(0)}
            >
                <img
                    src={resolveMediaUrl(images[0].url)}
                    onError={(e) => { e.target.src = FALLBACK_IMG; }}
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
                        <img 
                            src={resolveMediaUrl(img.url)} 
                            onError={(e) => { e.target.src = FALLBACK_IMG; }} 
                            alt="Post image" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                        />
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
                    <img 
                        src={resolveMediaUrl(images[0].url)} 
                        onError={(e) => { e.target.src = FALLBACK_IMG; }} 
                        alt="Post image" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                {images.slice(1, 3).map((img, i) => (
                    <div key={i} className="overflow-hidden cursor-zoom-in group relative" style={{ height: '189px' }} onClick={() => onImageClick(i + 1)}>
                        <img 
                            src={resolveMediaUrl(img.url)} 
                            onError={(e) => { e.target.src = FALLBACK_IMG; }} 
                            alt="Post image" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                        />
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
                    <img 
                        src={resolveMediaUrl(img.url)} 
                        onError={(e) => { e.target.src = FALLBACK_IMG; }} 
                        alt="Post image" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                    />
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
    const { currentUser, awardRuleKarma } = useUser();
    const { addToast } = useToast();
    const navigate = useNavigate();
    
    // Interaction States
    const initialReaction = post.userReaction || null;
    const [reaction, setReaction] = useState(initialReaction);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [shareCount, setShareCount] = useState(post.shares || 0);
    const [isSaved, setIsSaved] = useState(() => {
        const bookmarkedIds = JSON.parse(localStorage.getItem('knome_bookmarked_ids') || '[]');
        return post.isSaved || bookmarkedIds.includes(String(post.id));
    }); // FR-CI-04
    const [isSaveCategoryModalOpen, setIsSaveCategoryModalOpen] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [hasFetchedComments, setHasFetchedComments] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [reactionHover, setReactionHover] = useState(false);

    // Share Modal State
    const [shareMode, setShareMode] = useState('menu'); // 'menu' | 'community' | 'userSearch'
    const [shareSearchQuery, setShareSearchQuery] = useState('');
    const [shareSearchResults, setShareSearchResults] = useState([]);
    const [isShareSearching, setIsShareSearching] = useState(false);
    const [selectedShareUsers, setSelectedShareUsers] = useState([]);
    // Community share state
    const [shareCommunities, setShareCommunities] = useState([]);
    const [selectedShareCommunityId, setSelectedShareCommunityId] = useState('');
    const [loadingCommunities, setLoadingCommunities] = useState(false);
    const [isSharingToCommunity, setIsSharingToCommunity] = useState(false);

    // Lightbox & Document Viewer state
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [activeDocViewer, setActiveDocViewer] = useState(null);
    
    // Menu & Report (FR-SM-02)
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const menuRef = useRef(null);
    
    // Comments State
    const initialCommentCount = Number(post.commentsCount ?? post.commentCount ?? (Array.isArray(post.comments) ? post.comments.length : 0)) || 0;
    const [comments, setComments] = useState(post.comments || []);
    const [commentCount, setCommentCount] = useState(initialCommentCount);
    const [newComment, setNewComment] = useState('');
    
    // Total live comment count including nested replies
    const nestedRepliesCount = comments.reduce((acc, c) => acc + (Array.isArray(c.replies) ? c.replies.length : 0), 0);
    const displayCommentCount = Math.max(commentCount, comments.length + nestedRepliesCount);

    const handleAddComment = async (e, parentCommentId = null) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newComment.trim()) return;

        const commentText = newComment.trim();
        setNewComment('');

        try {
            const added = await interactionsApi.addComment('Post', post.id, commentText, parentCommentId);
            const formatted = {
                id: added?.commentId || Date.now(),
                author: added?.authorFullName || currentUser?.name || currentUser?.fullName || 'You',
                avatar: resolveMediaUrl(added?.authorProfilePhotoUrl || currentUser?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'You')}&background=6366f1&color=fff`,
                text: added?.commentText || commentText,
                time: 'Just now',
                replies: []
            };

            setComments(prev => [formatted, ...prev]);
            setCommentCount(prev => Math.max(prev + 1, comments.length + 1));
            if (awardRuleKarma && (post.userId || post.authorId)) {
                awardRuleKarma(post.userId || post.authorId, 'COMMENT_RECEIVED');
            }
        } catch (error) {
            console.error('Failed to add comment', error);
            const optimistic = {
                id: Date.now(),
                author: currentUser?.name || currentUser?.fullName || 'You',
                avatar: currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'You')}&background=6366f1&color=fff`,
                text: commentText,
                time: 'Just now',
                replies: []
            };
            setComments(prev => [optimistic, ...prev]);
            setCommentCount(prev => Math.max(prev + 1, comments.length + 1));
        }
    };
    
    // Timer for reaction popover delay
    const hoverTimeoutRef = useRef(null);

    // Separate image attachments from other attachments
    const imageAttachments = (post.attachments || []).filter(a => a.type === 'image');
    const otherAttachments = (post.attachments || []).filter(a => a.type !== 'image');

    const handleCopyPostLink = () => {
        const link = `${window.location.origin}/posts?id=${post.id}`;
        navigator.clipboard.writeText(link).then(() => {
            setShareCount(prev => prev + 1);
            addToast('Post permalink copied to clipboard!', 'success');
            setIsShareOpen(false);
        }).catch(() => {
            addToast('Failed to copy link', 'error');
        });
    };

    const handleShareToTimeline = async () => {
        try {
            await interactionsApi.shareContent('Post', post.id, 'Timeline');
            setShareCount(prev => prev + 1);
            if (awardRuleKarma && (post.userId || post.authorId)) {
                awardRuleKarma(post.userId || post.authorId, 'SHARE_RECEIVED');
            }
            addToast('Post shared to your timeline successfully!', 'success');
            setIsShareOpen(false);
        } catch (error) {
            console.error('Failed to share post', error);
            addToast('Failed to share post', 'error');
        }
    };

    const handleShareToCommunity = async () => {
        if (!selectedShareCommunityId) {
            addToast('Please select a community to share to.', 'warning');
            return;
        }
        setIsSharingToCommunity(true);
        try {
            await interactionsApi.shareContent('Post', post.id, 'Community', parseInt(selectedShareCommunityId));
            setShareCount(prev => prev + 1);
            if (awardRuleKarma && (post.userId || post.authorId)) {
                awardRuleKarma(post.userId || post.authorId, 'SHARE_RECEIVED');
            }
            addToast('Post successfully shared to community!', 'success');
            setIsShareOpen(false);
            setShareMode('menu');
        } catch (error) {
            addToast('Failed to share post to community', 'error');
        } finally {
            setIsSharingToCommunity(false);
        }
    };

    const handleShareWithUsers = async () => {
        if (selectedShareUsers.length === 0) {
            addToast('Please select at least one user to share with.', 'warning');
            return;
        }
        try {
            await Promise.all(selectedShareUsers.map(u => 
                interactionsApi.shareContent('Post', post.id, 'User', u.id || u.userId).catch(err => {
                    console.warn('Backend user share notice:', err);
                })
            ));
            setShareCount(prev => prev + selectedShareUsers.length);
            if (awardRuleKarma && (post.userId || post.authorId)) {
                awardRuleKarma(post.userId || post.authorId, 'SHARE_RECEIVED');
            }
            // Save local notification event for immediate UI update
            const notifsToStore = selectedShareUsers.map(u => ({
                id: `local_share_${post.id}_${u.id || u.userId}_${Date.now()}`,
                type: 'share',
                category: 'Shares',
                icon: 'share',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
                text: `${currentUser?.fullName || 'Someone'} shared a post with you.`,
                senderName: currentUser?.fullName || 'Colleague',
                senderAvatar: currentUser?.profilePhotoUrl || currentUser?.avatar || null,
                targetUserId: u.id || u.userId,
                time: 'Just now',
                unread: true,
                targetUrl: `/posts?id=${post.id}`,
                relatedContentType: 'Post',
                relatedContentId: post.id
            }));
            const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            localStorage.setItem('knome_notifications', JSON.stringify([...notifsToStore, ...existingNotifs]));
            if (notifsToStore.length > 0) {
                window.dispatchEvent(new CustomEvent('knome_notification_received', { detail: notifsToStore[0] }));
            }

            addToast(`Post successfully shared with ${selectedShareUsers.length} user(s)!`, 'success');
            setIsShareOpen(false);
            setShareMode('menu');
            setSelectedShareUsers([]);
            setShareSearchQuery('');
        } catch (error) {
            console.error('Failed to share post with users', error);
            addToast('Failed to share post with some users.', 'error');
        }
    };

    const { users: contextUsers } = useUser();
    const [allPlatformUsers, setAllPlatformUsers] = useState([]);

    useEffect(() => {
        if (!isShareOpen || shareMode !== 'userSearch') return;

        const loadUsers = async () => {
            setIsShareSearching(true);
            try {
                let merged = [...(contextUsers || [])];
                try {
                    const res = await searchApi.searchUsers(shareSearchQuery.trim()).catch(() => null);
                    const apiList = Array.isArray(res) ? res : (res?.items || []);
                    apiList.forEach(u => {
                        const uId = u.userId || u.id;
                        if (uId && !merged.some(m => String(m.userId || m.id) === String(uId))) {
                            merged.push({
                                id: uId,
                                userId: uId,
                                employeeId: u.employeeId,
                                name: u.fullName || u.name || u.title,
                                fullName: u.fullName || u.name || u.title,
                                role: u.roleName || u.role || u.designation || u.summary || 'Employee',
                                department: u.departmentName || u.department || 'MPOnline',
                                avatar: u.profilePhotoUrl || u.avatar || null
                            });
                        }
                    });
                } catch {}

                const currentId = String(currentUser?.userId || currentUser?.id || '');
                const currentEmpId = String(currentUser?.employeeId || '').toLowerCase();
                const filtered = merged.filter(u => {
                    const idMatch = String(u.userId || u.id) === currentId;
                    const empMatch = currentEmpId && String(u.employeeId || '').toLowerCase() === currentEmpId;
                    return !idMatch && !empMatch;
                });
                setAllPlatformUsers(filtered);
            } finally {
                setIsShareSearching(false);
            }
        };

        loadUsers();
    }, [isShareOpen, shareMode, contextUsers, currentUser, shareSearchQuery]);

    const displayedShareUsers = React.useMemo(() => {
        if (!shareSearchQuery.trim()) return allPlatformUsers;
        const query = shareSearchQuery.trim().toLowerCase();
        const matches = allPlatformUsers.filter(u => {
            const name = (u.name || u.fullName || '').toLowerCase();
            const empId = (u.employeeId || '').toLowerCase();
            const role = (u.role || u.roleName || u.designation || '').toLowerCase();
            const dept = (u.department || '').toLowerCase();
            return name.includes(query) || empId.includes(query) || role.includes(query) || dept.includes(query);
        });

        return matches.sort((a, b) => {
            const aName = (a.name || a.fullName || '').toLowerCase();
            const bName = (b.name || b.fullName || '').toLowerCase();
            const aStarts = aName.startsWith(query) ? 0 : (aName.includes(query) ? 1 : 2);
            const bStarts = bName.startsWith(query) ? 0 : (bName.includes(query) ? 1 : 2);
            if (aStarts !== bStarts) return aStarts - bStarts;
            return aName.localeCompare(bName);
        });
    }, [allPlatformUsers, shareSearchQuery]);

    // Fetch communities when entering community share mode
    useEffect(() => {
        if (shareMode !== 'community' || shareCommunities.length > 0) return;
        let isMounted = true;
        const fetchCommunities = async () => {
            setLoadingCommunities(true);
            try {
                const res = await communitiesApi.getMyCommunities();
                if (isMounted) {
                    const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
                    setShareCommunities(list);
                    if (list.length > 0) {
                        setSelectedShareCommunityId(String(list[0].communityId || list[0].id || ''));
                    }
                }
            } catch (err) {
                console.error('Failed to load communities for share', err);
            } finally {
                if (isMounted) setLoadingCommunities(false);
            }
        };
        fetchCommunities();
        return () => { isMounted = false; };
    }, [shareMode, shareCommunities.length]);

    const handleDeletePost = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            await postsApi.delete(post.id);
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

    const toggleReaction = async (type) => {
        const previousReaction = reaction;
        const newReaction = reaction === type ? null : type;
        
        // Optimistically update UI
        setReaction(newReaction);
        if (previousReaction && !newReaction) {
            setLikeCount(prev => Math.max(0, prev - 1)); // Removed reaction
        } else if (!previousReaction && newReaction) {
            setLikeCount(prev => prev + 1); // Added new reaction
            if (awardRuleKarma && (post.userId || post.authorId)) {
                awardRuleKarma(post.userId || post.authorId, 'LIKE_RECEIVED');
            }
        }
        setReactionHover(false);

        // The backend expects TitleCase (Like, Celebrate, Support, Heart)
        // Also, to "un-react", the backend expects us to send the SAME reaction type we already had.
        const reactionTypeToSend = newReaction || previousReaction;
        if (!reactionTypeToSend) return; // Should not happen since we only call this with a valid type

        const formattedReaction = reactionTypeToSend.charAt(0).toUpperCase() + reactionTypeToSend.slice(1);

        try {
            await interactionsApi.toggleReaction('Post', post.id, formattedReaction);
        } catch (error) {
            console.error('Failed to toggle reaction', error);
            // Revert on failure
            setReaction(previousReaction);
            if (previousReaction && !newReaction) {
                setLikeCount(prev => prev + 1);
            } else if (!previousReaction && newReaction) {
                setLikeCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    return (
        <article 
            id={post.id ? `post-${post.id}` : undefined}
            className={`w-full min-w-0 rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 ${post.isHighlighted ? 'ring-2 ring-indigo-500 shadow-2xl' : ''}`}
            style={{
                background: 'var(--bg-card)',
                border: post.isHighlighted ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-premium)',
            }}>
            {/* Header */}
            <div className="p-5 pb-3 flex gap-4">
                <button 
                    onClick={() => navigate('/profile', { state: { user: post.author } })}
                    className="w-12 h-12 rounded-xl p-[2px] bg-gradient-to-br from-blue-500 to-cyan-400 shrink-0 shadow-sm transition-transform hover:scale-105 cursor-pointer"
                >
                    <img 
                        className="w-full h-full rounded-[10px] object-cover border-2 border-white dark:border-slate-900" 
                        alt={post.author?.name || "Avatar"} 
                        src={post.author?.avatar}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=6366f1&color=fff`;
                        }}
                    />
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
                            {/* Save & Categorize Button (FR-CI-04) */}
                            <button 
                                onClick={async () => {
                                    if (isSaved) {
                                        setIsSaved(false);
                                        try {
                                            const bookmarkedIds = JSON.parse(localStorage.getItem('knome_bookmarked_ids') || '[]');
                                            localStorage.setItem('knome_bookmarked_ids', JSON.stringify(bookmarkedIds.filter(id => id !== String(post.id))));
                                            
                                            const localCustomSaved = JSON.parse(localStorage.getItem('knome_saved_items_custom') || '[]');
                                            localStorage.setItem('knome_saved_items_custom', JSON.stringify(localCustomSaved.filter(i => String(i.contentId || i.id) !== String(post.id))));

                                            await interactionsApi.toggleBookmark('Post', post.id);
                                            window.dispatchEvent(new CustomEvent('knome-bookmark-saved', { detail: { id: post.id, removed: true } }));
                                            addToast('Item removed from saved bookmarks.', 'info');
                                        } catch (e) {
                                            setIsSaved(true);
                                        }
                                    } else {
                                        setIsSaveCategoryModalOpen(true);
                                    }
                                }}
                                className={`p-1.5 rounded-lg transition-all active:scale-95 ${isSaved ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                title={isSaved ? "Unsave" : "Save & Categorize Content"}
                            >
                                <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0"}}>bookmark</span>
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-1 w-48 bg-theme-60-surface border border-theme-30 rounded-xl shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
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
                {post.title && (
                    <h3 
                        onClick={() => post.type === 'article' && navigate('/article-view?id=' + (post.id === 1 ? '2' : post.id))}
                        className={`text-base font-extrabold text-slate-900 dark:text-white mb-1.5 leading-snug ${post.type === 'article' ? 'hover:text-blue-500 cursor-pointer transition-colors' : ''}`}
                    >
                        {post.title}
                    </h3>
                )}
                <p className="text-[13.5px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                </p>

                {/* Shared Profile Card */}
                {post.sharedProfile && (
                    <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                                {post.sharedProfile.avatar ? (
                                    <img src={post.sharedProfile.avatar} alt={post.sharedProfile.name} className="w-full h-full object-cover" />
                                ) : (
                                    (post.sharedProfile.name || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
                                        SHARED PROFILE
                                    </span>
                                </div>
                                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate mt-0.5">
                                    {post.sharedProfile.name || post.sharedProfile.fullName}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {post.sharedProfile.designation || 'Contributor'} • {post.sharedProfile.department || 'General'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/profile', { state: { user: post.sharedProfile } })}
                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            View Profile
                        </button>
                    </div>
                )}
                {/* Shared Video Player / Card inside PostCard */}
                {(post.sharedVideo || post.type === 'video_share' || post.videoUrl || (post.content && (post.content.includes('Shared Video:') || post.content.includes('📹')))) && (
                    <div className="mt-3.5 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                        {(() => {
                            const vidObj = post.sharedVideo || {
                                id: post.id || `shared_vid_${Date.now()}`,
                                title: post.title?.replace('📹 Shared Video: ', '').replace(/ — uploaded by.*/, '') || post.content?.replace(/^.*Shared Video: "/, '').replace(/".*/, '') || 'Shared Video',
                                sourceUrl: post.videoUrl || post.sourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                thumbnail: post.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
                                author: post.authorName || post.author || 'MPOnline Team'
                            };
                            const vUrl = vidObj.sourceUrl || vidObj.videoUrl || post.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                            const isYT = vUrl && (vUrl.includes('youtube.com') || vUrl.includes('youtu.be'));

                            return (
                                <div className="flex flex-col">
                                    <div className="relative aspect-video w-full bg-black overflow-hidden group">
                                        {isYT ? (
                                            <iframe
                                                src={vUrl.includes('embed') ? vUrl : `https://www.youtube.com/embed/${(vUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))((\w|-){11})/) || [])[1] || ''}`}
                                                className="w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                title={vidObj.title}
                                            />
                                        ) : (
                                            <video
                                                src={resolveMediaUrl(vUrl) || vUrl}
                                                poster={getVideoThumbnail(vidObj) || undefined}
                                                preload="metadata"
                                                controls
                                                controlsList="nodownload"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    if (e.target && !e.target.src.includes('BigBuckBunny.mp4')) {
                                                        e.target.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="p-3.5 bg-slate-900 flex items-center justify-between gap-3 border-t border-slate-800">
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">play_circle</span>
                                                SHARED VIDEO
                                            </span>
                                            <h5 className="font-extrabold text-white text-xs sm:text-sm truncate mt-1">
                                                {vidObj.title}
                                            </h5>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/videos?id=${vidObj.id || ''}&title=${encodeURIComponent(vidObj.title || '')}&url=${encodeURIComponent(vUrl)}`)}
                                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                            <span>Play Full Video</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

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
                                <div key={att.id} className="overflow-hidden bg-black rounded-xl border border-slate-200 dark:border-slate-800">
                                    <video 
                                        src={att.url} 
                                        controls 
                                        controlsList="nodownload" 
                                        disablePictureInPicture 
                                        onContextMenu={(e) => e.preventDefault()} 
                                        className="w-full" 
                                        style={{ maxHeight: '460px' }} 
                                    />
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
                                    <audio 
                                        src={att.url} 
                                        controls 
                                        controlsList="nodownload" 
                                        onContextMenu={(e) => e.preventDefault()} 
                                        className="flex-1" 
                                    />
                                </div>
                            );
                        } else if (att.type === 'doc') {
                            const isPdf = att.name?.toLowerCase().endsWith('.pdf') || att.url?.toLowerCase().includes('.pdf');
                            return (
                                <div key={att.id} className="mx-5 mb-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-3.5 overflow-hidden">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                                            isPdf ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                        }`}>
                                            <span className="material-symbols-outlined text-[24px]">
                                                {isPdf ? 'picture_as_pdf' : 'description'}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate" title={att.name}>{att.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 bg-slate-200/70 dark:bg-slate-700/70 rounded text-slate-700 dark:text-slate-300">
                                                    {isPdf ? 'PDF' : 'DOC'}
                                                </span>
                                                <span>Document (View Only)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setActiveDocViewer(att)}
                                        className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                        View File
                                    </button>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            )}

            {/* ── Document Viewer Modal ── */}
            {activeDocViewer && (
                <DocumentViewerModal 
                    document={activeDocViewer} 
                    onClose={() => setActiveDocViewer(null)} 
                />
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
            <div className="px-5 py-2.5 flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1">
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] shadow-xs">👍</span>
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-xs">❤️</span>
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-xs">👏</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? 'reaction' : 'reactions'}` : '0 reactions'}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                    <button onClick={() => setShowComments(!showComments)} className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <span className="font-bold">{displayCommentCount}</span>
                        <span>{displayCommentCount === 1 ? 'comment' : 'comments'}</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <span className="font-bold">{shareCount || post.sharesCount || 0}</span>
                        <span>shares</span>
                    </span>
                </div>
            </div>

            {/* Interaction Bar */}
            <div className="px-3 py-2 flex items-center justify-between relative">
                
                {/* Reaction Picker Container (FR-CI-01) */}
                <div 
                    className="relative flex-1 flex justify-center items-center"
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = setTimeout(() => setReactionHover(true), 150);
                    }}
                    onMouseLeave={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = setTimeout(() => setReactionHover(false), 350);
                    }}
                >
                    {/* Reaction Popover */}
                    {reactionHover && (
                        <div 
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-full px-3 py-2 flex gap-2 animate-in fade-in slide-in-from-bottom-2 z-30"
                            onMouseEnter={() => {
                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                setReactionHover(true);
                            }}
                            onMouseLeave={() => {
                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                hoverTimeoutRef.current = setTimeout(() => setReactionHover(false), 350);
                            }}
                        >
                            {/* Invisible Hitbox Bridge connecting Popover to Like Button */}
                            <div className="absolute top-full left-0 right-0 h-4" />

                            {Object.entries(REACTION_TYPES).map(([key, data]) => (
                                <button 
                                    key={key}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleReaction(key);
                                    }}
                                    className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col items-center justify-center group/react transition-transform hover:scale-125 origin-bottom cursor-pointer"
                                    title={data.label}
                                >
                                    <span className="text-[22px] group-hover/react:-translate-y-1 transition-transform">{data.icon}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={() => toggleReaction(reaction ? null : 'like')}
                        className={`w-full flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-colors cursor-pointer ${reaction ? REACTION_TYPES[reaction].color : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        {reaction ? (
                            <>
                                <span className="text-[18px]">{REACTION_TYPES[reaction].icon}</span>
                                {REACTION_TYPES[reaction].label} ({likeCount})
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                                Like ({likeCount})
                            </>
                        )}
                    </button>
                </div>

                <button 
                    onClick={async () => {
                        const nextState = !showComments;
                        setShowComments(nextState);
                        if (nextState && !hasFetchedComments) {
                            try {
                                const res = await interactionsApi.getComments('Post', post.id);
                                if (res && Array.isArray(res)) {
                                    const fetchedComments = res.map(c => ({
                                        id: c.commentId,
                                        author: c.authorFullName,
                                        avatar: resolveMediaUrl(c.authorProfilePhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorFullName)}&background=6366f1&color=fff`,
                                        text: c.commentText,
                                        time: new Date(c.createdDate).toLocaleDateString(),
                                        replies: (c.replies || []).map(r => ({
                                            id: r.commentId,
                                            author: r.authorFullName,
                                            avatar: resolveMediaUrl(r.authorProfilePhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.authorFullName)}&background=6366f1&color=fff`,
                                            text: r.commentText,
                                            time: new Date(r.createdDate).toLocaleDateString(),
                                            replies: []
                                        }))
                                    }));
                                    
                                    // Merge fetched comments with any local optimistic comments added before fetch
                                    setComments(prev => {
                                        const existingIds = new Set(prev.map(p => p.id));
                                        const newFetched = fetchedComments.filter(f => !existingIds.has(f.id));
                                        return [...prev, ...newFetched];
                                    });
                                    setHasFetchedComments(true);
                                }
                            } catch (e) {
                                console.error('Failed to load comments', e);
                            }
                        }
                    }}
                    className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    Comment ({displayCommentCount})
                </button>

                {/* Share Button (FR-CI-03) */}
                <div className="flex-1 relative">
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsShareOpen(!isShareOpen);
                        }}
                        className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">share</span>
                        Share ({shareCount || post.sharesCount || 0})
                    </button>

                    {/* Universal Share Modal (FR-CI-03) */}
                    <ArticleShareModal 
                        isOpen={isShareOpen}
                        onClose={() => setIsShareOpen(false)}
                        post={post}
                        contentType="Post"
                        onShared={(type, count) => {
                            setShareCount(prev => prev + (count || 1));
                            if (awardRuleKarma && (post.userId || post.authorId)) {
                                awardRuleKarma(post.userId || post.authorId, 'SHARE_RECEIVED');
                            }
                        }}
                    />
                </div>
            </div>

            <ReportModal 
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)} 
                targetType="Post"
                targetId={post?.id}
                targetName={post?.author?.name || post?.authorFullName || 'Author'}
            />

            {/* Comments Section (FR-CI-02, FR-CI-05) */}
            {showComments && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Comments ({displayCommentCount})</h3>
                    
                    {/* Add Comment */}
                    <form onSubmit={(e) => handleAddComment(e, null)} className="flex gap-3 mb-6">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 bg-indigo-500 shadow-sm mt-1">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <textarea 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a thoughtful comment..." 
                                rows={2}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <button type="button" className="text-slate-400 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Attach Image">
                                    <span className="material-symbols-outlined text-[18px]">image</span>
                                </button>
                                <button 
                                    type="submit"
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
                                >
                                    Post Comment
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-5">
                        {comments.map(comment => (
                            <CommentThread 
                                key={comment.id} 
                                postId={post.id} 
                                comment={comment} 
                                onReplyAdded={() => setCommentCount(p => p + 1)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Save & Categorize Modal */}
            <SaveToCategoryModal
                isOpen={isSaveCategoryModalOpen}
                onClose={() => setIsSaveCategoryModalOpen(false)}
                item={{
                    id: post.id,
                    contentType: 'Post',
                    title: post.title || '',
                    content: post.content || post.text || '',
                    image: post.image || post.mediaUrl || (Array.isArray(post.mediaUrls) ? post.mediaUrls[0] : null) || (Array.isArray(post.attachmentUrls) ? post.attachmentUrls[0] : null) || post.thumbnailUrl || post.thumbnail || null,
                    author: post.author?.name || post.author,
                    time: post.createdDate || post.time || 'Just now',
                    tags: post.tags || []
                }}
                onSaved={async (savedItem) => {
                    setIsSaved(true);
                    try {
                        await interactionsApi.toggleBookmark('Post', post.id);
                    } catch (_) {}
                    addToast(`✅ Saved to "${savedItem.category}"!`, 'success');
                }}
            />
        </article>
    );
}

// Sub-component for nested replies (FR-CI-05)
function CommentThread({ postId, comment, depth = 0, onReplyAdded }) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replies, setReplies] = useState(comment.replies || []);

    useEffect(() => {
        setReplies(comment.replies || []);
    }, [comment.replies]);

    const submitReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        try {
            const c = await interactionsApi.addComment('Post', postId, replyText.trim(), comment.id);
            if (c) {
                const newReply = {
                    id: c.commentId || Date.now(),
                    author: c.authorFullName || 'You',
                    avatar: c.authorProfilePhotoUrl ? resolveMediaUrl(c.authorProfilePhotoUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorFullName || 'User')}&background=6366f1&color=fff`,
                    time: 'Just now',
                    text: c.commentText || replyText.trim(),
                    replies: []
                };

                setReplies(prev => [...prev, newReply]);
                setReplyText('');
                setIsReplying(false);
                if (onReplyAdded) onReplyAdded();
            }
        } catch (error) {
            console.error('Failed to add reply', error);
            const optimisticReply = {
                id: Date.now(),
                author: 'You',
                avatar: `https://ui-avatars.com/api/?name=You&background=6366f1&color=fff`,
                time: 'Just now',
                text: replyText.trim(),
                replies: []
            };
            setReplies(prev => [...prev, optimisticReply]);
            setReplyText('');
            setIsReplying(false);
            if (onReplyAdded) onReplyAdded();
        }
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
                    <p className="text-[13px] text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                </div>
                
                {/* Comment Actions */}
                <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] font-bold text-slate-500">
                    <button className="hover:text-indigo-500 transition-colors">Like</button>
                    <button onClick={() => setIsReplying(!isReplying)} className="hover:text-indigo-500 transition-colors">Reply</button>
                </div>

                {isReplying && (
                    <form onSubmit={submitReply} className="mt-3 flex items-center gap-2 max-w-md">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                autoFocus
                                placeholder={`Reply to ${comment.author}...`} 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-4 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!replyText.trim()}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full text-xs font-semibold flex items-center gap-1 transition-all shrink-0 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[14px]">send</span>
                            <span>Reply</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setIsReplying(false); setReplyText(''); }}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors shrink-0"
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {/* Nested Replies */}
                {replies && replies.length > 0 && (
                    <div className="mt-4 space-y-4 border-l border-slate-100 dark:border-slate-800 pl-4">
                        {replies.map(reply => (
                            <CommentThread key={reply.id} postId={postId} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
