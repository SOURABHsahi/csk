import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { interactionsApi, searchApi, communitiesApi, resolveMediaUrl } from '../../utils/apiService';
import { useUser } from '../contexts/UserContext';

export default function ArticleShareModal({ isOpen, onClose, article, onShared }) {
    const { currentUser } = useUser();
    const [shareTab, setShareTab] = useState('menu'); // 'menu' | 'community' | 'users'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Communities list for community share
    const [communities, setCommunities] = useState([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [copied, setCopied] = useState(false);

    const backdropRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !article) return;
        setShareTab('menu');
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUsers([]);
        setCopied(false);
        setIsSharing(false);

        // Fetch communities list for selection
        const fetchCommunities = async () => {
            try {
                const res = await communitiesApi.getAll();
                const list = Array.isArray(res) ? res : (res?.data || []);
                setCommunities(list);
                if (list.length > 0) {
                    setSelectedCommunityId(list[0].communityId || list[0].id);
                }
            } catch (err) {
                console.error('Failed to load communities for share modal', err);
            }
        };
        fetchCommunities();
    }, [isOpen, article]);

    // Handle User Search
    useEffect(() => {
        if (shareTab !== 'users' || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await searchApi.searchUsers(searchQuery.trim());
                const list = Array.isArray(res) ? res : (res?.items || []);
                setSearchResults(list.filter(u => u.userId !== currentUser?.userId && u.id !== currentUser?.id));
            } catch (err) {
                console.error('Failed to search users for share', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, shareTab, currentUser?.userId, currentUser?.id]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !article) return null;

    const articleUrl = `${window.location.origin}/article-view?id=${article.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(articleUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: article.title,
                    text: article.subtitle || article.description || article.title,
                    url: articleUrl
                });
                onClose();
            } catch (err) {
                console.warn('Native share cancelled or failed', err);
            }
        } else {
            handleCopyLink();
        }
    };

    const handleShareToCommunity = async () => {
        if (!selectedCommunityId) return;
        setIsSharing(true);
        try {
            await interactionsApi.shareContent('Article', article.id, 'Community', parseInt(selectedCommunityId));
            if (onShared) onShared('community');
            alert(`Article successfully shared to community!`);
            onClose();
        } catch (err) {
            console.error('Failed to share article to community', err);
            alert('Failed to share article to community. Please try again.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareToUsers = async () => {
        if (selectedUsers.length === 0) return;
        setIsSharing(true);
        try {
            await Promise.all(selectedUsers.map(u => 
                interactionsApi.shareContent('Article', article.id, 'User', u.id || u.userId)
            ));
            const notifsToStore = selectedUsers.map(u => ({
                id: `local_share_${article.id}_${u.id || u.userId}_${Date.now()}`,
                type: 'share',
                category: 'Shares',
                icon: 'share',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
                text: `${currentUser?.fullName || 'Someone'} shared an article with you.`,
                senderName: currentUser?.fullName || 'Colleague',
                senderAvatar: currentUser?.profilePhotoUrl || currentUser?.avatar || null,
                targetUserId: u.id || u.userId,
                time: 'Just now',
                unread: true,
                targetUrl: `/article-view?id=${article.id}`,
                relatedContentType: 'Article',
                relatedContentId: article.id
            }));
            const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            localStorage.setItem('knome_notifications', JSON.stringify([...notifsToStore, ...existingNotifs]));
            if (notifsToStore.length > 0) {
                window.dispatchEvent(new CustomEvent('knome_notification_received', { detail: notifsToStore[0] }));
            }

            if (onShared) onShared('users');
            alert(`Article successfully shared with ${selectedUsers.length} team member(s)!`);
            onClose();
        } catch (err) {
            console.error('Failed to share article with users', err);
            alert('Failed to share article with some users.');
        } finally {
            setIsSharing(false);
        }
    };

    const toggleSelectUser = (user) => {
        const uId = user.id || user.userId;
        if (selectedUsers.some(u => (u.id || u.userId) === uId)) {
            setSelectedUsers(prev => prev.filter(u => (u.id || u.userId) !== uId));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    return createPortal(
        <div
            ref={backdropRef}
            onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
            className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-left">
                
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {shareTab !== 'menu' && (
                            <button
                                onClick={() => setShareTab('menu')}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer shrink-0"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </button>
                        )}
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base truncate">
                                <span className="material-symbols-outlined text-blue-500">share</span>
                                {shareTab === 'community' ? 'Share to Community' : shareTab === 'users' ? 'Share with Users' : 'Share Article'}
                            </h3>
                            <p className="text-[11px] text-slate-500 truncate font-medium">{article.title}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                    {shareTab === 'menu' && (
                        <div className="space-y-3">
                            
                            {/* Option 1: Share to Community */}
                            <div
                                onClick={() => setShareTab('community')}
                                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/50 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all flex items-center gap-4 cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[24px]">groups</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                                        Share to Community
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Post this article directly into a specialized community feed
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                            </div>

                            {/* Option 2: Share with Users */}
                            <div
                                onClick={() => setShareTab('users')}
                                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/50 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-4 cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[24px]">person_add</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">
                                        Share with Colleagues
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Send direct notifications to specific MPOnline team members
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                            </div>

                            {/* Copy Link Section */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Direct Article URL
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={articleUrl}
                                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none font-mono truncate"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                            copied
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-400'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{copied ? 'done' : 'content_copy'}</span>
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            {/* Native Share button if supported */}
                            {typeof navigator !== 'undefined' && !!navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">share</span>
                                    Open Native Share Options
                                </button>
                            )}
                        </div>
                    )}

                    {/* Tab: Share to Community */}
                    {shareTab === 'community' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Select Target Community
                                </label>
                                {communities.length > 0 ? (
                                    <select
                                        value={selectedCommunityId}
                                        onChange={(e) => setSelectedCommunityId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    >
                                        {communities.map(c => (
                                            <option key={c.communityId || c.id} value={c.communityId || c.id}>
                                                {c.name || c.title} ({c.memberCount || 0} members)
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-xs text-slate-500 py-2">No communities available.</p>
                                )}
                            </div>

                            <button
                                onClick={handleShareToCommunity}
                                disabled={isSharing || !selectedCommunityId}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                {isSharing ? 'Sharing to Community...' : 'Post Article to Community'}
                            </button>
                        </div>
                    )}

                    {/* Tab: Share with Users */}
                    {shareTab === 'users' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Search colleague by name or employee ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Selected Users Chips */}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl max-h-24 overflow-y-auto">
                                    {selectedUsers.map(u => (
                                        <span key={u.id || u.userId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-xs font-bold shadow-sm">
                                            {u.name || u.fullName}
                                            <button onClick={() => toggleSelectUser(u)} className="hover:text-red-200">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Search Results List */}
                            <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                                {isSearching ? (
                                    <div className="py-6 text-center text-xs text-slate-400 font-bold">Searching team members...</div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(u => {
                                        const uId = u.id || u.userId;
                                        const isSelected = selectedUsers.some(sel => (sel.id || sel.userId) === uId);
                                        return (
                                            <div
                                                key={uId}
                                                onClick={() => toggleSelectUser(u)}
                                                className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={resolveMediaUrl(u.avatar || u.profilePhotoUrl)}
                                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=6366f1&color=fff`; }}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                        alt={u.name}
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold leading-tight">{u.name || u.fullName}</p>
                                                        <p className="text-[10px] text-slate-400">{u.role || u.department || 'Employee'}</p>
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {isSelected ? 'check_box' : 'checkbox_outline_blank'}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : searchQuery ? (
                                    <div className="py-6 text-center text-xs text-slate-400 font-bold">No users found matching "{searchQuery}"</div>
                                ) : (
                                    <div className="py-6 text-center text-xs text-slate-400 font-bold">Type a name above to search employees</div>
                                )}
                            </div>

                            <button
                                onClick={handleShareToUsers}
                                disabled={isSharing || selectedUsers.length === 0}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                {isSharing ? 'Sharing...' : `Share with ${selectedUsers.length} Selected Member(s)`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
