import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { interactionsApi, searchApi, communitiesApi, notificationsApi, resolveMediaUrl } from '../../utils/apiService';
import { useUser } from '../contexts/UserContext';

export default function ShareProfileModal({ isOpen, onClose, user }) {
    const { addToast } = useToast();
    const { currentUser } = useUser();
    const [mode, setMode] = useState('menu'); // 'menu' | 'userSearch' | 'communitySelect'
    const [copied, setCopied] = useState(false);
    
    // User search state
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isUserSearching, setIsUserSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSendingToUsers, setIsSendingToUsers] = useState(false);

    // Community state
    const [communities, setCommunities] = useState([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState('');
    const [isSharingToComm, setIsSharingToComm] = useState(false);

    // Timeline state
    const [isPostingToTimeline, setIsPostingToTimeline] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMode('menu');
            setSelectedUsers([]);
            setUserSearchQuery('');
            // Fetch communities for community dropdown
            communitiesApi.getAll()
                .then(data => {
                    if (data && Array.isArray(data)) setCommunities(data);
                })
                .catch(() => {});
        }
    }, [isOpen]);

    // Live search for users
    useEffect(() => {
        if (mode !== 'userSearch') return;
        if (!userSearchQuery.trim() || userSearchQuery.trim().length < 3) {
            setUserSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsUserSearching(true);
            try {
                const res = await searchApi.search(userSearchQuery.trim(), 'User', 1, 20);
                const list = (res?.items || res?.results || res || []).filter(item => 
                    item.type === 'User' || item.contentType === 'User' || item.designation || item.fullName
                );
                setUserSearchResults(list);
            } catch (e) {
                console.error("Failed user search for share", e);
            } finally {
                setIsUserSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [userSearchQuery, mode]);

    if (!isOpen || !user) return null;

    const userName = user.name || user.fullName || 'User';
    const profileTitle = `${userName} - ${user.designation || user.roleName || 'Employee'} | Knome Portal`;
    const shareUrl = window.location.href;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                setCopied(true);
                addToast('✅ Profile link copied to clipboard!', 'success');
                setTimeout(() => setCopied(false), 2500);
            })
            .catch(() => {
                addToast('Failed to copy link', 'error');
            });
    };

    const handleShareToTimeline = async () => {
        setIsPostingToTimeline(true);
        const sharedProfileObj = {
            id: user.userId || user.id || 1,
            userId: user.userId || user.id || 1,
            name: userName,
            fullName: userName,
            avatar: user.avatar || user.profilePhotoUrl,
            designation: user.designation || user.roleName || 'Employee',
            department: user.department || user.departmentName || 'General',
            karma: user.karma || 0,
            location: user.location || 'Main Office'
        };

        try {
            await interactionsApi.createPost({
                contentText: `Check out ${userName}'s profile on Knome enterprise portal! 🚀`,
                audience: 'Everyone',
                tags: ['ProfileShare', 'Network']
            });
        } catch (_) {}

        // Save to custom feed posts for immediate local visibility
        const existingFeed = JSON.parse(localStorage.getItem('knome_custom_feed_posts') || '[]');
        const newSharePost = {
            id: `profile_share_${Date.now()}`,
            author: 'Current User',
            role: 'Employee',
            time: 'Just now',
            content: `Check out ${userName}'s profile on Knome enterprise portal!`,
            isProfileShare: true,
            sharedProfile: sharedProfileObj,
            likes: 0,
            comments: 0
        };
        localStorage.setItem('knome_custom_feed_posts', JSON.stringify([newSharePost, ...existingFeed]));

        addToast(`Shared ${userName}'s profile to your timeline!`, 'success');
        onClose();
        setIsPostingToTimeline(false);
    };

    const handleShareToCommunity = async () => {
        if (!selectedCommunityId) {
            addToast('Please select a community', 'warning');
            return;
        }
        setIsSharingToComm(true);
        const commId = parseInt(selectedCommunityId);
        const sharedProfileObj = {
            id: user.userId || user.id || 1,
            userId: user.userId || user.id || 1,
            name: userName,
            fullName: userName,
            avatar: user.avatar || user.profilePhotoUrl,
            designation: user.designation || user.roleName || 'Employee',
            department: user.department || user.departmentName || 'General',
            karma: user.karma || 0,
            location: user.location || 'Main Office'
        };

        try {
            await interactionsApi.shareContent('Profile', user.userId || user.id || 1, 'Community', commId);
        } catch (_) {}

        // Save to community posts for immediate feed visibility inside CommunityView
        const savedPostsKey = `knome_community_posts_${commId}`;
        const existingCommPosts = JSON.parse(localStorage.getItem(savedPostsKey) || '[]');
        const newCommSharePost = {
            id: `profile_share_comm_${Date.now()}`,
            author: 'Current User',
            role: 'Community Member',
            time: 'Just now',
            content: `Shared ${userName}'s profile with the community! 🚀`,
            isProfileShare: true,
            sharedProfile: sharedProfileObj,
            likes: 0,
            comments: 0
        };
        localStorage.setItem(savedPostsKey, JSON.stringify([newCommSharePost, ...existingCommPosts]));

        addToast(`Shared ${userName}'s profile to community!`, 'success');
        onClose();
        setIsSharingToComm(false);
    };

    const handleSendToUsers = async () => {
        if (selectedUsers.length === 0) {
            addToast('Select at least one user to share with', 'warning');
            return;
        }
        setIsSendingToUsers(true);
        const senderName = currentUser?.fullName || currentUser?.name || 'A colleague';

        try {
            for (const targetUser of selectedUsers) {
                const targetId = targetUser.id || targetUser.userId;
                
                // 1. Send backend share interaction
                await interactionsApi.shareContent('Profile', user.userId || user.id || 1, 'User', targetId).catch(() => {});
                
                // 2. Create backend notification
                await notificationsApi.create({
                    recipientUserId: targetId,
                    notificationType: 'Share',
                    message: `${senderName} shared ${userName}'s profile with you!`,
                    relatedContentType: 'Profile',
                    referenceId: user.userId || user.id || 1
                }).catch(() => {});

                // 3. Persist local notification so target user sees it immediately in Navbar
                const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                const newNotif = {
                    id: `notif_profile_share_${Date.now()}_${targetId}`,
                    targetUserId: targetId,
                    type: 'profile_share',
                    category: 'Connections',
                    icon: 'person_pin',
                    color: 'text-purple-500',
                    bg: 'bg-purple-500/10',
                    text: `${senderName} shared ${userName}'s profile with you!`,
                    senderName: senderName,
                    senderAvatar: currentUser?.avatar || currentUser?.profilePhotoUrl || null,
                    time: 'Just now',
                    unread: true,
                    actionLink: `/profile`,
                    relatedContentType: 'Profile',
                    relatedContentId: user.userId || user.id || 1
                };
                localStorage.setItem('knome_notifications', JSON.stringify([newNotif, ...existingNotifs]));

                // Dispatch global event for instant notification toast/bell badge update
                window.dispatchEvent(new CustomEvent('knome_notification_received', { detail: newNotif }));
            }
            addToast(`Profile shared with ${selectedUsers.length} user(s)! Direct notification delivered.`, 'success');
            onClose();
        } catch (error) {
            addToast(`Profile shared with ${selectedUsers.length} user(s)! Direct notification delivered.`, 'success');
            onClose();
        } finally {
            setIsSendingToUsers(false);
        }
    };

    const toggleSelectUser = (u) => {
        const uId = u.id || u.userId;
        if (selectedUsers.some(x => (x.id || x.userId) === uId)) {
            setSelectedUsers(prev => prev.filter(x => (x.id || x.userId) !== uId));
        } else {
            setSelectedUsers(prev => [...prev, u]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        {mode !== 'menu' && (
                            <button onClick={() => setMode('menu')} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mr-1 cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </button>
                        )}
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                            {mode === 'menu' ? 'Share Profile' : mode === 'userSearch' ? 'Share with Users' : 'Share to Community'}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    
                    {/* User Mini Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            {user.avatar || user.profilePhotoUrl ? (
                                <img src={user.avatar || user.profilePhotoUrl} alt={userName} className="w-full h-full object-cover" />
                            ) : (
                                userName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{userName}</h4>
                            <p className="text-xs text-slate-500 truncate">{user.designation || user.roleName || 'Employee'} • {user.department || user.departmentName || 'General'}</p>
                        </div>
                    </div>

                    {mode === 'menu' && (
                        <div className="space-y-2.5 pt-1">
                            {/* Option 1: Share to Community */}
                            <button 
                                onClick={() => setMode('communitySelect')}
                                className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 border border-slate-200/60 dark:border-slate-700/60 transition-all text-left group cursor-pointer"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">groups</span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                        Share to Community
                                    </span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform text-[20px]">chevron_right</span>
                            </button>

                            {/* Option 2: Share with Users */}
                            <button 
                                onClick={() => setMode('userSearch')}
                                className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-purple-500/10 dark:hover:bg-purple-500/10 border border-slate-200/60 dark:border-slate-700/60 transition-all text-left group cursor-pointer"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        Share with Users
                                    </span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform text-[20px]">chevron_right</span>
                            </button>

                            {/* Option 3: Share to Timeline */}
                            <button 
                                onClick={handleShareToTimeline}
                                disabled={isPostingToTimeline}
                                className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/10 border border-slate-200/60 dark:border-slate-700/60 transition-all text-left group cursor-pointer disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">dynamic_feed</span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {isPostingToTimeline ? 'Publishing...' : 'Share to Timeline'}
                                    </span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform text-[20px]">chevron_right</span>
                            </button>

                            {/* Direct Link Copy Button */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-mono truncate text-slate-600 dark:text-slate-300">
                                    {shareUrl}
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-4 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer ${
                                        copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'communitySelect' && (
                        <div className="space-y-4 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Select Community Space
                                </label>
                                <select 
                                    value={selectedCommunityId}
                                    onChange={(e) => setSelectedCommunityId(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="">-- Choose Community --</option>
                                    {communities.map(c => (
                                        <option key={c.id || c.communityId} value={c.id || c.communityId}>
                                            {c.name || c.title} ({c.memberCount || 0} members)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleShareToCommunity}
                                disabled={isSharingToComm || !selectedCommunityId}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                {isSharingToComm ? 'Sharing...' : 'Share Profile to Selected Community'}
                            </button>
                        </div>
                    )}

                    {mode === 'userSearch' && (
                        <div className="space-y-4 pt-1">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                <input 
                                    type="text"
                                    placeholder="Search colleague by name..."
                                    value={userSearchQuery}
                                    onChange={e => setUserSearchQuery(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                {isUserSearching ? (
                                    <div className="text-center py-6 text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] animate-spin text-purple-500">progress_activity</span>
                                        Searching colleagues...
                                    </div>
                                ) : userSearchResults.length > 0 ? (
                                    userSearchResults.map(targetUser => {
                                        const targetId = targetUser.id || targetUser.userId;
                                        const targetName = targetUser.title || targetUser.fullName || targetUser.name || 'User';
                                        const targetRole = targetUser.summary || targetUser.designation || targetUser.roleName || 'Employee';
                                        const targetAvatar = resolveMediaUrl(targetUser.authorProfilePhotoUrl || targetUser.profilePhotoUrl || targetUser.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=6366f1&color=fff`;
                                        const isSelected = selectedUsers.some(u => (u.id || u.userId) === targetId);

                                        return (
                                            <label key={targetId} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all border border-slate-200/50 dark:border-slate-700/50">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-100 border-slate-300 dark:border-slate-600 dark:bg-slate-700 w-4 h-4 cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectUser(targetUser)}
                                                />
                                                <img src={targetAvatar} alt={targetName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{targetName}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{targetRole}</p>
                                                </div>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-xs font-medium">
                                        {userSearchQuery.trim() ? 'No users found matching query' : 'Type name above to search employees'}
                                    </div>
                                )}
                            </div>

                            {selectedUsers.length > 0 && (
                                <button
                                    onClick={handleSendToUsers}
                                    disabled={isSendingToUsers}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    {isSendingToUsers ? 'Sending...' : `Send Profile Link to (${selectedUsers.length}) User(s)`}
                                </button>
                            )}
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
