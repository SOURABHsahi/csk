import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationSettingsModal from '../modals/NotificationSettingsModal';
import NotificationToast from '../ui/NotificationToast';
import knomeLogo from '../../assets/knome_logo.png';
import { notificationsApi, profileApi, searchApi, karmaApi, resolveMediaUrl, saveRecentSearch, getLocalRecentSearches, clearLocalRecentSearches } from '../../utils/apiService';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import * as signalR from '@microsoft/signalr';

export default function Navbar() {
    const { currentUser, setCurrentUser, users, logout } = useUser();
    const confirm = useConfirm();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    
    // User Karma Points State
    const [userKarma, setUserKarma] = useState(currentUser?.karma || 0);

    useEffect(() => {
        if (currentUser?.karma !== undefined) {
            setUserKarma(currentUser.karma);
        }
        const fetchKarma = async () => {
            try {
                const bal = await karmaApi.getMyBalance();
                if (bal && typeof bal.totalPoints === 'number') {
                    setUserKarma(bal.totalPoints);
                }
            } catch {
                /* fallback to existing userKarma */
            }
        };
        fetchKarma();
    }, [currentUser?.userId, currentUser?.employeeId, currentUser?.karma]);

    const isSysAdmin = currentUser?.role === 'SYSADM' || 
                       currentUser?.roleName === 'System Administrator' || 
                       (Array.isArray(currentUser?.roles) && (currentUser.roles.includes('SYSADM') || currentUser.roles.includes('System Administrator') || currentUser.roles.includes('SystemAdmin')));

    // Smart YouTube-Style Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [trendingSearches, setTrendingSearches] = useState([]);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Fetch Recent Searches & Trending Searches when dropdown opens
    useEffect(() => {
        if (!showSuggestions) return;

        const loadInitialSearchData = async () => {
            try {
                const [histRes, trendRes] = await Promise.all([
                    searchApi.getHistory(10).catch(() => null),
                    searchApi.getTrending(6).catch(() => null)
                ]);
                const apiItems = Array.isArray(histRes) ? histRes : (histRes?.data || []);
                const localItems = getLocalRecentSearches();

                const combined = [...localItems];
                apiItems.forEach(item => {
                    const term = typeof item === 'string' ? item : item.searchTerm;
                    if (term && !combined.some(c => c.searchTerm.toLowerCase() === term.toLowerCase())) {
                        combined.push({ searchTerm: term, searchDate: item.searchDate || new Date().toISOString() });
                    }
                });

                setRecentSearches(combined.slice(0, 10));
                setTrendingSearches(Array.isArray(trendRes) ? trendRes : (trendRes?.data || []));
            } catch (e) {
                console.error('Failed to load search history/trending data', e);
                setRecentSearches(getLocalRecentSearches());
            }
        };

        loadInitialSearchData();
    }, [showSuggestions]);

    // Real-time debounced search suggestions (Requires at least 3 characters)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 3) {
            setSuggestions([]);
            setIsSearchingSuggestions(false);
            setSelectedIndex(-1);
            return;
        }

        setIsSearchingSuggestions(true);
        const timer = setTimeout(async () => {
            try {
                const res = await searchApi.getSuggestions(searchQuery, 8);
                const items = Array.isArray(res) ? res : (res?.data || []);
                setSuggestions(items);
            } catch (e) {
                console.error('Failed to fetch search suggestions', e);
                setSuggestions([]);
            } finally {
                setIsSearchingSuggestions(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (query, categoryFilter = null) => {
        const q = query ? query.trim() : searchQuery.trim();
        if (!q || q.length < 3) return;

        // Save immediately to Recent Searches state & localStorage
        saveRecentSearch(q);
        setRecentSearches(prev => [
            { searchTerm: q, searchDate: new Date().toISOString() },
            ...prev.filter(item => item.searchTerm.toLowerCase() !== q.toLowerCase())
        ].slice(0, 10));

        // Push to backend API asynchronously
        searchApi.saveHistory(q);

        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedIndex(-1);

        // If search query matches a specific user name or employee ID, navigate directly to their profile
        const matchedUser = users.find(u => 
            u.name.toLowerCase() === q.toLowerCase() || 
            u.name.toLowerCase().includes(q.toLowerCase()) ||
            u.employeeId?.toLowerCase() === q.toLowerCase()
        );

        if (matchedUser) {
            navigate('/profile', { 
                state: { 
                    user: { 
                        userId: matchedUser.userId || matchedUser.id, 
                        id: matchedUser.userId || matchedUser.id, 
                        employeeId: matchedUser.employeeId,
                        name: matchedUser.name, 
                        fullName: matchedUser.name, 
                        profilePhotoUrl: matchedUser.avatar, 
                        avatar: matchedUser.avatar 
                    } 
                } 
            });
            return;
        }

        const typeParam = categoryFilter ? `&type=${encodeURIComponent(categoryFilter)}` : '';
        navigate(`/search?q=${encodeURIComponent(q)}${typeParam}`);
    };

    const handleClearHistory = async (e, term = null) => {
        if (e) e.stopPropagation();
        
        // 1. Immediately update local state
        if (term) {
            setRecentSearches(prev => prev.filter(item => item.searchTerm.toLowerCase() !== term.toLowerCase()));
        } else {
            setRecentSearches([]);
        }

        // 2. Immediately clear localStorage
        clearLocalRecentSearches(term);

        // 3. Clear backend search history
        try {
            await searchApi.clearHistory(term).catch(() => null);
        } catch (err) {
            console.error('Failed to clear search history', err);
        }
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                const selected = suggestions[selectedIndex];
                setShowSuggestions(false);
                setSearchQuery('');
                if (selected.contentType === 'User' || selected.type === 'User') {
                    navigate('/profile', { 
                        state: { 
                            user: { 
                                userId: selected.id, 
                                id: selected.id, 
                                name: selected.title, 
                                fullName: selected.title, 
                                profilePhotoUrl: selected.thumbnailUrl, 
                                avatar: selected.thumbnailUrl 
                            } 
                        } 
                    });
                } else {
                    handleSearch(selected.title);
                }
            } else {
                handleSearch(searchQuery);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return false;
    });

    // Notifications state (FR-NT-01, FR-NT-04)
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState(false);
    const [allNotifs, setAllNotifs] = useState([]);
    const [toastNotification, setToastNotification] = useState(null);
    const [activeNotifFilter, setActiveNotifFilter] = useState('All'); // All | Reactions | Comments | Connections | Mentions | System
    const [notifSearchQuery, setNotifSearchQuery] = useState('');

    // Refs for outside click detection
    const notifDropdownRef = useRef(null);
    const userMenuDropdownRef = useRef(null);
    const searchDropdownRef = useRef(null);

    // Auto-close notification dropdown, search suggestions & user menu when clicking anywhere outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
            if (userMenuDropdownRef.current && !userMenuDropdownRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsNotifOpen(false);
                setIsUserMenuOpen(false);
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('touchstart', handleClickOutside, true);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('touchstart', handleClickOutside, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const playChimeSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            // Audio context blocked or unsupported
        }
    };

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return 'Just now';
        const diff = (Date.now() - new Date(dateStr)) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const mapNotificationItem = (n) => {
        const type = (n.notificationType || n.eventType || '').toLowerCase();
        const isFollow = type.includes('follow');
        const isConnectionReq = type.includes('connection');
        const msg = (n.message || n.text || n.title || '').toLowerCase();
        const relType = (n.relatedContentType || '').toLowerCase();
        const isReaction = type.includes('reaction') || type.includes('like') || msg.includes('liked') || msg.includes('reacted');
        const isComment = (type.includes('comment') || msg.includes('commented') || msg.includes('replied')) && !isReaction;
        const isMention = type.includes('mention');
        const isShare = type.includes('share') || msg.includes('shared');

        let icon = 'notifications';
        let color = 'text-slate-400';
        let bg = 'bg-slate-500/10';
        let category = 'System';

        if (isFollow || isConnectionReq) {
            icon = isConnectionReq ? 'connect_without_contact' : 'person_add';
            color = 'text-indigo-500';
            bg = 'bg-indigo-500/10';
            category = 'Connections';
        } else if (isReaction) {
            icon = 'favorite';
            color = 'text-rose-500';
            bg = 'bg-rose-500/10';
            category = 'Reactions';
        } else if (isComment) {
            icon = 'chat_bubble';
            color = 'text-blue-500';
            bg = 'bg-blue-500/10';
            category = 'Comments';
        } else if (isMention) {
            icon = 'alternate_email';
            color = 'text-purple-500';
            bg = 'bg-purple-500/10';
            category = 'Mentions';
        } else if (isShare) {
            icon = 'share';
            color = 'text-emerald-500';
            bg = 'bg-emerald-500/10';
            category = 'Shares';
        }

        let senderName = n.senderName || n.actorName;
        if (!senderName || senderName === 'System') {
            const match = (n.message || '').match(/^(.+?)\s+(shared|invited|sent|commented|liked|reacted|posted|mentioned)\b/i);
            if (match && match[1].trim()) {
                senderName = match[1].trim();
            } else {
                senderName = 'Colleague';
            }
        }
        const senderAvatar = resolveMediaUrl(n.senderAvatar) || (senderName && senderName !== 'System' ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=6366f1&color=fff` : null);
        const dateVal = n.createdAt || n.createdDate;
        const refId = n.relatedContentId || n.referenceId;

        let targetUrl = n.targetUrl;
        if (isConnectionReq || type.includes('connection') || msg.includes('connection request')) {
            targetUrl = msg.includes('accepted') ? '/network?tab=Connections' : '/network?tab=Requests';
        } else if (!targetUrl) {
            if (msg.includes('post') || type.includes('post') || type.includes('share') || relType === 'post') {
                targetUrl = refId ? `/posts?id=${refId}` : '/posts';
            } else if (msg.includes('article') || type.includes('article') || relType === 'article') {
                targetUrl = refId ? `/article-view?id=${refId}` : '/articles';
            } else if (msg.includes('community') || type.includes('community') || relType === 'community') {
                targetUrl = refId ? `/community/view?id=${refId}` : '/community';
            } else if (msg.includes('video') || type.includes('video') || relType === 'video') {
                targetUrl = refId ? `/videos?id=${refId}` : '/videos';
            } else if (msg.includes('podcast') || type.includes('podcast') || relType === 'podcast') {
                targetUrl = refId ? `/podcasts?id=${refId}` : '/podcasts';
            }
        }

        return {
            id: n.notificationId || n.id,
            category,
            type: isConnectionReq ? 'follow_request' : (isFollow ? 'follow' : type),
            title: n.title || (isFollow ? 'New Follower' : (isConnectionReq ? 'Connection Request' : 'Notification')),
            text: n.message,
            message: n.message,
            targetUrl,
            relatedContentType: n.relatedContentType,
            relatedContentId: n.relatedContentId || n.referenceId,
            createdDate: dateVal,
            time: formatRelativeTime(dateVal),
            unread: !n.isRead,
            icon,
            color,
            bg,
            senderUserId: n.senderUserId || n.actorUserId,
            senderName,
            senderAvatar,
            handled: n.isRead,
            status: 'pending'
        };
    };

    // Read community notifications from localStorage (invite, join_request, approved, rejected)
    const getLocalCommunityNotifs = () => {
        try {
            const all = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const isCurrentUserAdmin = ['SYSADM', 'CADM'].includes(currentUser?.role) ||
                ['System Administrator', 'HR Administrator', 'Community Administrator', 'System Admin'].includes(currentUser?.roleName);

            return all
                .filter(n => {
                    if (!['community_invite', 'join_request', 'community_approved', 'community_rejected', 'community', 'invite'].includes(n.type) && !(n.category === 'Community')) return false;
                    if (currentUser?.id && String(n.targetUserId) === String(currentUser.id)) return true;
                    if (currentUser?.id && n.targetCreatorId && String(n.targetCreatorId) === String(currentUser.id)) return true;
                    if (n.type === 'join_request' && (n.targetUserId === 'admin' || isCurrentUserAdmin)) return true;
                    return false;
                })
                .map(n => ({
                    id: n.id || `local_${n.communityId}_${n.targetUserId}_${n.type}`,
                    type: n.type || 'community_invite',
                    category: 'Community',
                    icon: n.icon || 'group_add',
                    color: n.color || 'text-indigo-400',
                    bg: n.bg || 'bg-indigo-500/10',
                    text: n.text,
                    senderName: n.senderName || 'Community Admin',
                    senderAvatar: n.senderAvatar || null,
                    time: n.time || 'Just now',
                    unread: n.unread !== false,
                    isLocalNotif: true,
                    targetUrl: n.actionLink || (n.communityId ? `/community/view?id=${n.communityId}` : '/community'),
                    relatedContentId: n.communityId,
                    relatedContentType: 'community',
                    communityName: n.communityName,
                    communityId: n.communityId,
                }));
        } catch (e) {
            return [];
        }
    };

    // Read ALL localStorage notifications including video shares, media approvals, etc.
    const getLocalGenericNotifs = () => {
        try {
            const all = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            return all
                .filter(n => {
                    if (!currentUser?.id) return false;
                    if (String(n.targetUserId) !== String(currentUser.id)) return false;
                    // Skip community-type notifications (handled by getLocalCommunityNotifs)
                    if (['community_invite', 'join_request', 'community_approved', 'community_rejected'].includes(n.type)) return false;
                    if (n.category === 'Community') return false;
                    return true;
                })
                .map(n => {
                    const isVideo = n.type === 'video_shared' || n.relatedContentType === 'Video' || (n.text || '').toLowerCase().includes('video');
                    const isPodcast = n.type === 'podcast_shared' || n.relatedContentType === 'Podcast' || (n.text || '').toLowerCase().includes('podcast');
                    const vTitle = n.videoTitle || n.mediaTitle;
                    const vId = n.videoId || n.relatedContentId;
                    const vUrl = n.videoUrl || n.sourceUrl;
                    
                    let targetUrl = n.targetUrl || n.actionLink || n.linkUrl;
                    if (!targetUrl) {
                        if (isVideo) {
                            const params = new URLSearchParams();
                            if (vId) params.set('id', vId);
                            if (vTitle) params.set('title', vTitle);
                            if (vUrl) params.set('url', vUrl);
                            targetUrl = `/videos${params.toString() ? `?${params.toString()}` : ''}`;
                        } else if (isPodcast) {
                            targetUrl = n.relatedContentId ? `/podcasts?id=${n.relatedContentId}` : '/podcasts';
                        } else {
                            targetUrl = '/posts';
                        }
                    }

                    return {
                        id: n.id,
                        type: n.type || 'notification',
                        category: n.category || (isVideo ? 'Social' : 'System'),
                        icon: isVideo ? 'videocam' : (isPodcast ? 'podcasts' : 'notifications'),
                        color: isVideo ? 'text-cyan-500' : (isPodcast ? 'text-pink-500' : 'text-slate-400'),
                        bg: isVideo ? 'bg-cyan-500/10' : (isPodcast ? 'bg-pink-500/10' : 'bg-slate-500/10'),
                        text: n.text,
                        message: n.text,
                        senderName: n.senderName || 'Teammate',
                        senderAvatar: n.senderAvatar || null,
                        time: n.time || 'Just now',
                        unread: n.unread !== false,
                        isLocalNotif: true,
                        targetUrl,
                        relatedContentType: isVideo ? 'Video' : (isPodcast ? 'Podcast' : n.relatedContentType),
                        relatedContentId: n.relatedContentId || n.videoId,
                        videoId: n.videoId,
                        videoTitle: vTitle,
                        videoUrl: vUrl,
                    };
                });
        } catch (e) {
            return [];
        }
    };

    const sortNotifsDescending = (notifs) => {
        return [...notifs].sort((a, b) => {
            const dateA = new Date(a.createdDate || a.createdAt || a.timestamp || 0).getTime();
            const dateB = new Date(b.createdDate || b.createdAt || b.timestamp || 0).getTime();
            
            if (dateA && dateB && dateA !== dateB) {
                return dateB - dateA; // Newest first
            }
            if (a.time === 'Just now' && b.time !== 'Just now') return -1;
            if (b.time === 'Just now' && a.time !== 'Just now') return 1;

            if (a.unread && !b.unread) return -1;
            if (!a.unread && b.unread) return 1;

            const idA = Number(a.id) || 0;
            const idB = Number(b.id) || 0;
            return idB - idA;
        });
    };

    const fetchNotifications = async () => {
        try {
            const res = await notificationsApi.getAll(false);
            let apiNotifs = [];
            if (Array.isArray(res)) {
                apiNotifs = res.map(mapNotificationItem);
            } else if (res?.items) {
                apiNotifs = res.items.map(mapNotificationItem);
            }
            // Merge local community invite notifications + local video/generic notifications
            const localCommunityNotifs = getLocalCommunityNotifs();
            const localGenericNotifs = getLocalGenericNotifs();
            const apiIds = new Set(apiNotifs.map(n => String(n.id)));
            const freshCommunity = localCommunityNotifs.filter(n => !apiIds.has(String(n.id)));
            const freshGeneric = localGenericNotifs.filter(n => !apiIds.has(String(n.id)) && !freshCommunity.some(c => String(c.id) === String(n.id)));
            const combined = [...freshCommunity, ...freshGeneric, ...apiNotifs];
            setAllNotifs(sortNotifsDescending(combined));
        } catch (error) {
            console.error('Failed to fetch notifications', error);
            // Fallback: show all local notifs sorted newest first
            setAllNotifs(sortNotifsDescending([...getLocalCommunityNotifs(), ...getLocalGenericNotifs()]));
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Listen for real-time community invite events (fired by CreateCommunityModal)
        const handleCommunityInviteSent = (e) => {
            const { invitedUserIds = [], communityName, senderName } = e.detail || {};
            if (!invitedUserIds.includes(currentUser?.id)) return;

            // Re-read localStorage to pick up the new notif
            const localNotifs = getLocalCommunityNotifs();
            const newNotif = localNotifs.find(n => n.communityName === communityName && n.unread);
            if (newNotif) {
                newNotif.createdDate = newNotif.createdDate || new Date().toISOString();
                newNotif.createdAt = newNotif.createdAt || new Date().toISOString();
                newNotif.unread = true;
                newNotif.time = 'Just now';
                setAllNotifs(prev => {
                    const filtered = prev.filter(n => String(n.id) !== String(newNotif.id));
                    return [newNotif, ...filtered];
                });
                setToastNotification(newNotif);
                playChimeSound();
            }
        };

        // Also listen for storage changes (multi-tab invite or video share)
        const handleStorageChange = () => {
            const localCommunityNotifs = getLocalCommunityNotifs();
            const localGenericNotifs = getLocalGenericNotifs();
            const allLocal = [...localCommunityNotifs, ...localGenericNotifs];
            if (allLocal.length > 0) {
                setAllNotifs(prev => {
                    const prevLocalIds = new Set(prev.filter(n => n.isLocalNotif).map(n => String(n.id)));
                    const newOnes = allLocal.filter(n => !prevLocalIds.has(String(n.id)));
                    if (newOnes.length === 0) return prev;
                    // Show toast for brand-new notification
                    if (newOnes[0].unread) {
                        setToastNotification(newOnes[0]);
                        playChimeSound();
                    }
                    return sortNotifsDescending([...newOnes, ...prev.filter(n => !n.isLocalNotif)]);
                });
            }
        };

        // Listen for real-time generic notifications (e.g. profile shares)
        const handleGenericNotificationReceived = (e) => {
            const notif = e.detail;
            if (!notif) return;
            if (notif.targetUserId && currentUser?.id && String(notif.targetUserId) !== String(currentUser.id)) {
                return; // Notification meant for another user
            }
            notif.createdDate = notif.createdDate || new Date().toISOString();
            notif.createdAt = notif.createdAt || new Date().toISOString();
            notif.unread = true;
            notif.time = 'Just now';
            setAllNotifs(prev => [notif, ...prev.filter(n => String(n.id) !== String(notif.id))]);
            setToastNotification(notif);
            playChimeSound();
        };

        window.addEventListener('community-invite-sent', handleCommunityInviteSent);
        window.addEventListener('knome_notification_received', handleGenericNotificationReceived);
        window.addEventListener('storage', handleStorageChange);

        const token = localStorage.getItem('knome_jwt');
        if (!token) return;

        const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`http://${host}:5095/hubs/notifications`, {
                accessTokenFactory: () => token
            })
            .configureLogging(signalR.LogLevel.None)
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveNotification", (notification) => {
            const mapped = mapNotificationItem(notification);
            mapped.time = 'Just now';
            mapped.createdDate = new Date().toISOString();
            mapped.createdAt = new Date().toISOString();
            mapped.unread = true;
            setAllNotifs(prev => {
                const filtered = prev.filter(item => String(item.id) !== String(mapped.id));
                return [mapped, ...filtered];
            });
            setToastNotification(mapped);
            playChimeSound();
            window.dispatchEvent(new CustomEvent('network-updated'));
        });

        connection.on("ReactionCountUpdated", (data) => {
            window.dispatchEvent(new CustomEvent('knome:reaction-updated', { detail: data }));
        });

        connection.on("CommentCountUpdated", (data) => {
            window.dispatchEvent(new CustomEvent('knome:comment-updated', { detail: data }));
        });

        connection.on("ShareCountUpdated", (data) => {
            window.dispatchEvent(new CustomEvent('knome:share-updated', { detail: data }));
        });

        connection.start().catch(() => {
            /* Silently ignore startup/re-negotiation traces */
        });

        return () => {
            window.removeEventListener('community-invite-sent', handleCommunityInviteSent);
            window.removeEventListener('knome_notification_received', handleGenericNotificationReceived);
            window.removeEventListener('storage', handleStorageChange);
            if (connection.state === signalR.HubConnectionState.Connected) {
                connection.stop().catch(() => {});
            }
        };
    }, [currentUser]);

    const notifications = allNotifs.filter(n => {
        const matchesCategory = activeNotifFilter === 'All' || n.category === activeNotifFilter;
        const matchesQuery = !notifSearchQuery || n.text?.toLowerCase().includes(notifSearchQuery.toLowerCase()) || n.senderName?.toLowerCase().includes(notifSearchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    const unreadCount = allNotifs.filter(n => n.unread).length;

    const markAllRead = async () => {
        try {
            await notificationsApi.markAllRead().catch(() => {});
            const stored = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const updated = stored.map(n => ({ ...n, unread: false }));
            localStorage.setItem('knome_notifications', JSON.stringify(updated));
            setAllNotifs(prev => prev.map(n => ({ ...n, unread: false, handled: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const clearAllNotifications = async () => {
        try {
            await notificationsApi.markAllRead().catch(() => {});
            const stored = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const currentUserIdStr = String(currentUser?.id || currentUser?.userId || '');
            const remaining = stored.filter(n => {
                const targetIdStr = String(n.targetUserId || n.userId || '');
                return currentUserIdStr && targetIdStr !== currentUserIdStr;
            });
            localStorage.setItem('knome_notifications', JSON.stringify(remaining));
            setAllNotifs([]);
        } catch (error) {
            setAllNotifs([]);
        }
    };

    const resolveCommunityTarget = (notif) => {
        if (notif.communityId) return `/community/view?id=${notif.communityId}`;
        if (notif.targetUrl && notif.targetUrl.includes('/community/view')) return notif.targetUrl;
        if (notif.linkUrl && notif.linkUrl.includes('/community/view')) return notif.linkUrl;
        if (notif.actionLink && notif.actionLink.includes('/community/view')) return notif.actionLink;

        const txt = notif.text || notif.message || '';
        // Extract community name: look for 'community "Name"' or first quoted text
        const commMatch = txt.match(/community\s+"([^"]+)"/i) || txt.match(/"([^"]+)"/);
        const commName = commMatch ? commMatch[1] : notif.communityName;

        if (commName) {
            const normalizedName = commName.trim().toLowerCase();

            // 1. Check custom communities in localStorage
            try {
                const allCustom = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
                const found = allCustom.find(c => (c.name || c.title || '').trim().toLowerCase() === normalizedName);
                if (found) return `/community/view?id=${found.id}`;
            } catch (e) { /* ignore */ }

            // 2. Check user joined communities
            try {
                const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
                const joined = JSON.parse(localStorage.getItem(userKey) || '[]');
                const foundJoined = joined.find(c => (c.name || '').trim().toLowerCase() === normalizedName);
                if (foundJoined) return `/community/view?id=${foundJoined.id}`;
            } catch (e) { /* ignore */ }

            // 3. Known enterprise seed map
            const seedMap = {
                'higher': 101,
                'devops & ai innovation hub': 101,
                'react developer hub': 102,
                'employee engagement hub': 103,
                'tech innovation hub': 1,
                'technology innovation hub': 1,
                'frontend developers guild': 3,
                'database architects': 4,
                'hr & general announcements': 5,
                'culture & hr hub': 6
            };
            const mappedId = seedMap[normalizedName];
            if (mappedId) return `/community/view?id=${mappedId}`;
        }

        return '/community';
    };

    const handleNotificationClick = (notif) => {
        setIsNotifOpen(false);

        if (notif.unread && notif.id) {
            // Mark read in localStorage for local community invite notifs
            if (notif.isLocalNotif) {
                try {
                    const stored = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                    const updated = stored.map(n => String(n.id) === String(notif.id) ? { ...n, unread: false } : n);
                    localStorage.setItem('knome_notifications', JSON.stringify(updated));
                } catch (e) { /* ignore */ }
            } else {
                notificationsApi.markRead(notif.id).catch(err => console.error('Mark read failed:', err));
            }
            setAllNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false, handled: true } : n));
        }

        let dest = notif.targetUrl || notif.linkUrl || notif.actionLink;
        const msg = (notif.text || notif.message || '').toLowerCase();
        const relType = (notif.relatedContentType || '').toLowerCase();
        const refId = notif.relatedContentId || notif.referenceId || notif.videoId;
        // isProfileShare must NOT trigger on video notifications
        const isProfileShare = (relType === 'profile' || notif.type === 'profile_share' || (msg.includes('profile') && !msg.includes('video') && !msg.includes('podcast')))
            && !msg.includes('video') && !msg.includes('podcast') && notif.type !== 'video_shared' && notif.type !== 'podcast_shared';

        if (isProfileShare) {
            const targetUser = notif.targetProfileUser || {
                userId: refId || notif.senderUserId || 1,
                id: refId || notif.senderUserId || 1,
                name: notif.senderName || 'Employee',
                fullName: notif.senderName || 'Employee',
                avatar: notif.senderAvatar || null
            };
            navigate('/profile', { state: { user: targetUser } });
            return;
        }

        const isCommNotif = notif.category === 'Community' || notif.type?.includes('community') || msg.includes('community') || notif.communityId || notif.communityName;

        if (isCommNotif) {
            dest = resolveCommunityTarget(notif);
        } else if (relType === 'video' || msg.includes('video') || notif.type?.includes('video')) {
            let vId = refId || notif.videoId;
            let vTitle = notif.videoTitle || notif.mediaTitle;
            let videoUrl = notif.videoUrl || notif.sourceUrl;
            
            if (!vTitle && !vId) {
                const titleMatch = (notif.text || notif.message || '').match(/"([^"]+)"|'([^']+)'/);
                if (titleMatch) {
                    vTitle = titleMatch[1] || titleMatch[2];
                }
            }

            const searchParams = new URLSearchParams();
            if (vId) searchParams.set('id', vId);
            if (vTitle) searchParams.set('title', vTitle);
            if (videoUrl) searchParams.set('url', videoUrl);

            const queryString = searchParams.toString();
            dest = `/videos${queryString ? `?${queryString}` : ''}`;
            
            navigate(dest, { 
                state: { 
                    videoTitle: vTitle, 
                    videoId: vId, 
                    videoUrl: videoUrl,
                    senderName: notif.senderName 
                } 
            });
            return;
        } else if (relType === 'podcast' || msg.includes('podcast') || notif.type?.includes('podcast')) {
            dest = refId ? `/podcasts?id=${refId}` : (dest || '/podcasts');
        } else if (relType === 'article' || msg.includes('article') || notif.type?.includes('article')) {
            dest = refId ? `/article-view?id=${refId}` : (dest || '/articles');
        } else if (relType === 'post' || msg.includes('post') || notif.type?.includes('post')) {
            dest = refId ? `/posts?id=${refId}` : (dest || '/posts');
        } else if (notif.type === 'follow_request' || notif.type?.includes('connection') || msg.includes('connection request') || msg.includes('connection')) {
            dest = msg.includes('accepted') ? '/network?tab=Connections' : '/network?tab=Requests';
        } else if (relType === 'user' || notif.type?.includes('follow')) {
            const uId = refId || notif.senderUserId;
            dest = uId ? `/profile?id=${uId}` : '/profile';
        } else if (!dest) {
            dest = '/posts';
        }

        const currentPath = window.location.pathname + window.location.search;
        if (currentPath === dest) {
            window.location.reload();
        } else {
            navigate(dest);
        }
    };

    const handleDeleteNotification = async (e, notifId) => {
        e.stopPropagation();
        // Remove from localStorage if it's a local community invite notif
        try {
            const stored = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const updated = stored.filter(n => String(n.id) !== String(notifId));
            localStorage.setItem('knome_notifications', JSON.stringify(updated));
        } catch (err) { /* ignore */ }
        setAllNotifs(prev => prev.filter(n => n.id !== notifId));
        try {
            await notificationsApi.delete(notifId);
        } catch (err) {
            // Local notif — backend 404 is expected, silently ignore
        }
    };

    const handleApproveFollowRequest = async (e, notifId, approve) => {
        e.stopPropagation();
        const targetNotif = allNotifs.find(n => n.id === notifId);
        if (!targetNotif) return;

        const targetId = targetNotif.senderUserId || targetNotif.relatedContentId || targetNotif.id;

        // Optimistic UI state update
        setAllNotifs(prev => prev.map(n => {
            if (n.id === notifId) {
                return {
                    ...n,
                    unread: false,
                    handled: true,
                    status: approve ? 'approved' : 'declined',
                    text: approve ? `You accepted connection request from ${n.senderName || 'user'}.` : `You declined connection request from ${n.senderName || 'user'}.`
                };
            }
            return n;
        }));

        try {
            if (approve) {
                await profileApi.acceptConnection(targetId);
            } else {
                await profileApi.rejectConnection(targetId);
            }
            window.dispatchEvent(new CustomEvent('network-updated'));
        } catch (error) {
            console.error("Failed to update connection request", error);
        }
    };

    const handleApproveRequest = () => {};
    const handleFollowBack = (e, notif) => {
        e.stopPropagation();
        if (notif.senderUserId) {
            profileApi.follow(notif.senderUserId).catch(err => console.error("Failed to follow back", err));
        }
    };

    // Apply theme on mount and when isDark changes
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <>
        {/* TopNavBar */}
        <nav className="fixed top-0 left-0 right-0 w-full z-50 transition-colors duration-300">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-[72px] grid grid-cols-2 lg:grid-cols-3 items-center gap-4">
                
                {/* ─── LEFT: Logo & Navigation ─── */}
                <div className="flex items-center gap-3 sm:gap-6 justify-start">
                    {/* Mobile Hamburger Menu Toggle Button */}
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('knome_toggle_mobile_sidebar'))}
                        className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95"
                        title="Toggle Navigation Menu"
                        aria-label="Toggle Navigation Menu"
                    >
                        <span className="material-symbols-outlined text-[24px]">menu</span>
                    </button>

                    <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 hover:scale-[1.02] shrink-0 group">
                        <div className="relative p-1 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-md group-hover:shadow-indigo-500/25 transition-all flex items-center justify-center">
                            <img 
                                src={knomeLogo} 
                                alt="Knome Logo" 
                                className="h-10 sm:h-12 w-auto object-contain rounded-xl" 
                            />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[15px] sm:text-[19px] font-black tracking-tight leading-none bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent group-hover:opacity-95 transition-opacity drop-shadow-xs">
                                KNOME PORTAL
                            </span>
                            <span className="hidden xs:inline-block text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-tight tracking-tight">
                                Connecting People & Knowledge
                            </span>
                        </div>
                    </Link>
                </div>

                {/* ─── CENTER: Smart Search ─── */}
                <div className="hidden lg:flex items-center justify-center w-full">
                    <div className="relative w-full max-w-[540px] z-50" ref={searchDropdownRef}>
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none transition-colors"
                            style={{color: 'var(--text-muted)'}}>search</span>
                        <input
                            type="text"
                            placeholder="Search posts, people, articles or tags..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-[130px] py-2 text-[13.5px] font-medium rounded-full outline-none transition-all focus:ring-2 focus:ring-blue-500/25 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                                color: 'var(--text-primary)',
                                backdropFilter: 'blur(12px)',
                            }}
                        />

                        {/* Right-side controls: Clear (close) button + Theme Search button */}
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {searchQuery && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); }}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-center cursor-pointer"
                                    title="Clear search"
                                >
                                    <span className="material-symbols-outlined text-[15px] block">close</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSearch(searchQuery);
                                }}
                                onClick={() => handleSearch(searchQuery)}
                                className="h-[31px] px-3.5 rounded-full text-[12px] font-bold text-white flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md hover:brightness-110 active:scale-95 cursor-pointer select-none shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent-primary, #2563eb), var(--accent-deep, #4f46e5))',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                                }}
                                title="Search"
                            >
                                <span className="material-symbols-outlined text-[15px] leading-none">search</span>
                                <span>Search</span>
                            </button>
                        </div>

                        {/* Search Overlay Dropdown (YouTube-style) */}
                        {showSuggestions && (
                            <div className="absolute top-12 left-0 w-full rounded-2xl overflow-hidden shadow-2xl py-2 z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.97)' : 'rgba(255,255,255,0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: 'var(--shadow-premium)'
                                }}>
                                
                                {/* Mode A: Real-time Suggestions while typing */}
                                {searchQuery.trim() !== '' ? (
                                    isSearchingSuggestions ? (
                                        <div className="px-4 py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <span className="text-[12px] font-medium">Searching...</span>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                                            <div className="px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                                Matching Suggestions
                                            </div>
                                            {suggestions.map((item, idx) => {
                                                const resolvedThumb = resolveMediaUrl(item.thumbnailUrl);
                                                const isHighlighted = idx === selectedIndex;
                                                return (
                                                    <button
                                                        key={`${item.contentType}-${item.id}-${idx}`}
                                                        onMouseDown={() => {
                                                            setShowSuggestions(false);
                                                            setSearchQuery('');
                                                            if (item.contentType === 'User' || item.type === 'User') {
                                                                navigate('/profile', { 
                                                                    state: { 
                                                                        user: { 
                                                                            userId: item.id, 
                                                                            id: item.id, 
                                                                            name: item.title, 
                                                                            fullName: item.title, 
                                                                            profilePhotoUrl: item.thumbnailUrl, 
                                                                            avatar: item.thumbnailUrl 
                                                                        } 
                                                                    } 
                                                                });
                                                            } else if (item.contentType === 'Article') {
                                                                navigate(`/article-view?id=${item.id}`);
                                                            } else if (item.contentType === 'Community') {
                                                                navigate(`/community/view?id=${item.id}`);
                                                            } else {
                                                                handleSearch(item.title);
                                                            }
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${isHighlighted ? 'bg-blue-500/15' : 'hover:bg-blue-500/10'}`}
                                                    >
                                                        {resolvedThumb ? (
                                                            <img src={resolvedThumb} alt={item.title} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {item.contentType === 'User' ? '👤' : item.contentType === 'Community' ? '👥' : item.contentType === 'Video' ? '🎥' : '📄'}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-bold truncate leading-tight" style={{color: 'var(--text-primary)'}}>{item.title}</p>
                                                            <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                            {item.contentType}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-6 text-center text-[13px] text-slate-500">
                                            No matches for "{searchQuery}". Press Enter to search all results.
                                        </div>
                                    )
                                ) : (
                                    /* Mode B: Recent Searches & Trending Terms when empty/focused */
                                    <div className="flex flex-col gap-3 py-1">
                                        {/* Recent Searches */}
                                        {recentSearches.length > 0 && (
                                            <div>
                                                <div className="px-4 py-1 flex items-center justify-between">
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">history</span>
                                                        Recent Searches ({Math.min(recentSearches.length, 10)})
                                                    </span>
                                                    <button 
                                                        onMouseDown={(e) => handleClearHistory(e, null)}
                                                        className="text-[10px] font-bold text-blue-500 hover:underline"
                                                    >
                                                        Clear All
                                                    </button>
                                                </div>
                                                {recentSearches.slice(0, 10).map((rec, idx) => (
                                                    <div 
                                                        key={`rec-${idx}`}
                                                        onMouseDown={() => handleSearch(rec.searchTerm)}
                                                        className="px-4 py-2 flex items-center justify-between hover:bg-blue-500/10 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="material-symbols-outlined text-[16px] text-slate-400">history</span>
                                                            <span className="text-[13px] font-semibold" style={{color: 'var(--text-primary)'}}>{rec.searchTerm}</span>
                                                        </div>
                                                        <button 
                                                            onMouseDown={(e) => handleClearHistory(e, rec.searchTerm)}
                                                            className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                                            title="Remove search"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}


                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: Actions & Profile ─── */}
                <div className="flex items-center gap-2.5 justify-end">

                    {/* Karma Badge (Hidden for System Admin) */}
                    {!isSysAdmin && (
                        <Link to="/karma-history" className="relative hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))',
                                border: '1px solid rgba(251, 191, 36, 0.25)',
                            }}
                            title={`${userKarma.toLocaleString()} Karma Points`}>
                            <span className="material-symbols-outlined text-amber-400 text-[15px]" style={{fontVariationSettings:"'FILL' 1"}}>military_tech</span>
                            <span className="text-[12px] font-black text-amber-400">{userKarma.toLocaleString()}</span>
                        </Link>
                    )}

                    {/* ─── Theme Toggle ─── */}
                    <button
                        onClick={toggleTheme}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 group"
                        style={{
                            background: isDark
                                ? 'rgba(14, 26, 56, 0.7)'
                                : 'rgba(239, 246, 255, 0.85)',
                            border: '1px solid var(--border-mid)',
                        }}
                    >
                        <span className="material-symbols-outlined text-[18px] transition-all duration-300"
                            style={{
                                color: isDark ? '#fbbf24' : '#2563eb',
                                fontVariationSettings: "'FILL' 1"
                            }}>
                            {isDark ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notifDropdownRef}>
                        <button
                            onClick={() => {
                                const nextState = !isNotifOpen;
                                setIsNotifOpen(nextState);
                                if (nextState) fetchNotifications();
                            }}
                            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                            }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-theme-30-text" style={{fontVariationSettings:"'FILL' 1"}}>notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                                    style={{
                                        background: 'linear-gradient(135deg, #f43f5e, #fb923c)',
                                        minWidth: '18px', height: '18px',
                                        boxShadow: '0 0 10px rgba(244,63,94,0.6)'
                                    }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotifOpen && (
                            <div className="absolute right-0 top-12 w-88 rounded-2xl overflow-hidden shadow-2xl z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.97)' : 'rgba(255,255,255,0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.8)' : '0 24px 80px rgba(37,99,235,0.12), 0 4px 24px rgba(0,0,0,0.08)'
                                }}>
                                <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor: 'var(--border-mid)'}}>
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
                                    <div className="flex items-center gap-2.5">
                                        {allNotifs.length > 0 && (
                                            <>
                                                <button onClick={markAllRead} className="text-[11px] font-bold text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">Mark read</button>
                                                <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                                                <button onClick={clearAllNotifications} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors">Clear all</button>
                                            </>
                                        )}
                                        <button onClick={() => { setIsNotifSettingsOpen(true); setIsNotifOpen(false); }} className="text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors ml-1">
                                            <span className="material-symbols-outlined text-[16px]">settings</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Category Filters */}
                                <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                                    {['All', 'Shares', 'Reactions', 'Comments', 'Connections', 'Mentions'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveNotifFilter(cat)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                                                activeNotifFilter === cat 
                                                    ? 'bg-blue-600 text-white shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Live Notification Search */}
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                        <input
                                            type="text"
                                            value={notifSearchQuery}
                                            onChange={(e) => setNotifSearchQuery(e.target.value)}
                                            placeholder="Search notifications..."
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.map((n, idx) => (
                                        <div 
                                            key={n.id ? `${n.id}-${idx}` : idx} 
                                            onClick={() => handleNotificationClick(n)}
                                            className={`group relative flex flex-col gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${n.unread ? 'border-l-2 border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {n.senderAvatar ? (
                                                    <img 
                                                        src={n.senderAvatar} 
                                                        alt={n.senderName} 
                                                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.bg}`}>
                                                        <span className={`material-symbols-outlined text-[18px] ${n.color}`} style={{fontVariationSettings:"'FILL' 1"}}>{n.icon}</span>
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 truncate">{n.senderName || n.title}</span>
                                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">{n.time}</span>
                                                    </div>
                                                    <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-snug mt-0.5">{n.text}</p>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {n.unread && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                                    <button 
                                                        onClick={(e) => handleDeleteNotification(e, n.id)} 
                                                        title="Delete notification"
                                                        className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-lg cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined text-[17px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action Buttons for Admin Join Requests */}
                                            {n.type === 'request' && !n.handled && (
                                                <div className="flex items-center gap-2 pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => handleApproveRequest(e, n.id, true)}
                                                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleApproveRequest(e, n.id, false)}
                                                        className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Action Buttons for Follow Requests */}
                                            {n.type === 'follow_request' && !n.handled && (
                                                <div className="flex items-center gap-2 pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => handleApproveFollowRequest(e, n.id, true)}
                                                        className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-600 transition-colors shadow-sm"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleApproveFollowRequest(e, n.id, false)}
                                                        className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Follow Back Button */}
                                            {n.type === 'follow_request' && n.handled && n.status === 'approved' && !n.followedBack && (
                                                <div className="flex items-center gap-2 pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => handleFollowBack(e, n)}
                                                        className="px-3 py-1 bg-pink-500/10 text-pink-500 rounded-lg text-[11px] font-bold hover:bg-pink-500/20 transition-colors border border-pink-500/20 shadow-sm"
                                                    >
                                                        Follow Back
                                                    </button>
                                                                                     {/* Action Button for Community Invitations & Shares */}
                                            {(n.type === 'invite' || n.type === 'community_invite' || n.type === 'community_shared' || (n.text && n.text.toLowerCase().includes('community'))) && (
                                                <div className="pl-12 mt-1">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleNotificationClick(n);
                                                        }}
                                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined text-[15px]">groups</span>
                                                        View Community
                                                    </button>
                                                </div>
                                            )}           </div>
                                            )}
                                        </div>
                                    ))}
                                    {notifications.length === 0 && (
                                        <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                                                <span className="material-symbols-outlined text-[24px]">notifications_paused</span>
                                            </div>
                                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">No Notifications</p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Only real & current notifications for your account will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Avatar & Menu */}
                    <div className="relative" ref={userMenuDropdownRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-3 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                            style={{
                                background: isDark ? 'rgba(14, 26, 56, 0.7)' : 'rgba(239, 246, 255, 0.85)',
                                border: '1px solid var(--border-mid)',
                            }}
                        >
                            <img 
                                className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0 border border-slate-200 dark:border-slate-700" 
                                alt="Avatar" 
                                src={resolveMediaUrl(currentUser?.profilePhotoUrl) || currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || currentUser?.fullName || 'User')}&background=6366f1&color=fff`}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || currentUser?.fullName || 'User')}&background=6366f1&color=fff`;
                                }}
                            />
                            <div className="hidden sm:flex flex-col items-start text-left min-w-0">
                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{(currentUser?.name || currentUser?.fullName || 'User').split(' ')[0]}</span>
                                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-none">{currentUser?.roleName || currentUser?.role || 'Employee'}</span>
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">expand_more</span>
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-12 w-64 rounded-2xl overflow-hidden shadow-2xl z-50"
                                style={{
                                    background: isDark ? 'rgba(8, 15, 32, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                                    border: '1px solid var(--border-mid)',
                                    backdropFilter: 'blur(24px)',
                                    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.8)' : '0 24px 80px rgba(37,99,235,0.12), 0 4px 24px rgba(0,0,0,0.08)'
                                }}>
                                <div className="px-4 py-3.5 border-b" style={{borderColor: 'var(--border-mid)'}}>
                                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{currentUser.roleName}</p>
                                </div>
                                <div className="py-1.5">
                                    <div className="border-t px-3 py-2" style={{borderColor: 'var(--border-mid)'}}>
                                        <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">person</span> My Profile
                                        </Link>
                                        <button
                                            onClick={async () => {
                                                setIsUserMenuOpen(false);
                                                const ok = await confirm({
                                                    title: 'Confirm Logout',
                                                    message: "Are you sure you want to log out of Knome? You'll need to sign in again to access your account.",
                                                    confirmText: 'Yes, Log Out',
                                                    cancelText: 'Cancel',
                                                    variant: 'danger'
                                                });
                                                if (ok) {
                                                    logout();
                                                }
                                            }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors mt-0.5 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">logout</span> Log Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>

        {isNotifSettingsOpen && <NotificationSettingsModal isOpen={isNotifSettingsOpen} onClose={() => setIsNotifSettingsOpen(false)} />}
        {toastNotification && <NotificationToast notification={toastNotification} onClose={() => setToastNotification(null)} />}
        </>
    );
}
