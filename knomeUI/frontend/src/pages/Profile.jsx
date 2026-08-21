import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUser, users } from '../components/contexts/UserContext';
import { useToast } from '../components/contexts/ToastContext';
import { getKarmaBadge } from '../utils/karmaEngine';
import { 
    profileApi, 
    userApi, 
    postsApi, 
    articlesApi, 
    videosApi, 
    podcastsApi, 
    communitiesApi, 
    karmaApi,
    getCommunityImages, 
    mapPost,
    resolveMediaUrl 
} from '../utils/apiService';
import ShareProfileModal from '../components/modals/ShareProfileModal';

export default function Profile() {
    const { currentUser, refreshCurrentUser } = useUser();
    const { addToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    
    const searchParams = new URLSearchParams(location.search);
    const queryId = params.id || searchParams.get('id');

    const targetUserObj = location.state?.user;
    const targetUserId = queryId || targetUserObj?.userId || targetUserObj?.id;
    
    const isOwnProfile = !targetUserId ? true : (
        (currentUser?.userId && String(targetUserId) === String(currentUser.userId)) ||
        (currentUser?.id && String(targetUserId) === String(currentUser.id)) ||
        (targetUserObj?.employeeId && currentUser?.employeeId && targetUserObj.employeeId === currentUser.employeeId) ||
        (targetUserObj?.name && currentUser?.name && targetUserObj.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
        (targetUserObj?.fullName && currentUser?.fullName && targetUserObj.fullName.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim()) ||
        (targetUserObj?.fullName && currentUser?.name && targetUserObj.fullName.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
    );

    const [fetchedUser, setFetchedUser] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    const activeUserId = isOwnProfile ? (currentUser?.userId || currentUser?.id) : (targetUserId || targetUserObj?.userId || targetUserObj?.id);

    useEffect(() => {
        let isMounted = true;
        if (activeUserId) {
            const fetchFn = isOwnProfile ? profileApi.getMe() : profileApi.getById(activeUserId);
            fetchFn
                .then(data => {
                    if (isMounted && data) {
                        setFetchedUser(data);
                        setFollowersCount(data.followersCount || 0);
                        setIsFollowing(data.isFollowing || false);
                    }
                })
                .catch(err => {
                    if (isMounted) {
                        console.error("Failed to load user profile:", err);
                    }
                });
        } else {
            setFetchedUser(null);
        }
        return () => { isMounted = false; };
    }, [activeUserId, isOwnProfile]);

    // Resolved user object merging backend profile data
    const displayUser = isOwnProfile 
        ? { ...currentUser, ...(fetchedUser || {}) }
        : (fetchedUser || {
            ...targetUserObj,
            userId: targetUserId || targetUserObj?.id,
            id: targetUserId || targetUserObj?.id,
            name: targetUserObj?.name || targetUserObj?.fullName || 'User',
            fullName: targetUserObj?.fullName || targetUserObj?.name || 'User',
            avatar: targetUserObj?.avatar || targetUserObj?.profilePhotoUrl,
            profilePhotoUrl: targetUserObj?.profilePhotoUrl || targetUserObj?.avatar,
            designation: targetUserObj?.roleName || targetUserObj?.designation || targetUserObj?.role || 'Contributor',
            department: targetUserObj?.department || targetUserObj?.departmentName || 'General',
            departmentName: targetUserObj?.departmentName || targetUserObj?.department || 'General',
            location: targetUserObj?.location || 'Main Office',
            bio: targetUserObj?.bio || 'Professional team member at Knome.',
            skills: targetUserObj?.skills || ['Collaboration', 'Problem Solving'],
            interests: targetUserObj?.interests || ['Technology', 'Productivity'],
            postsCount: targetUserObj?.postsCount || 0,
            followersCount: targetUserObj?.followersCount || 0,
            followingCount: targetUserObj?.followingCount || 0,
            mutualConnectionsCount: targetUserObj?.mutualConnectionsCount || 0,
            commonCommunitiesCount: targetUserObj?.commonCommunitiesCount || 0,
            karmaPoints: targetUserObj?.karmaPoints || targetUserObj?.karma || 0,
            karma: targetUserObj?.karma || targetUserObj?.karmaPoints || 0
        });

    useEffect(() => {
        if (fetchedUser) {
            setFollowersCount(fetchedUser.followersCount || 0);
            setIsFollowing(fetchedUser.isFollowing || false);
        } else if (displayUser) {
            setFollowersCount(displayUser.followersCount || 0);
            setIsFollowing(displayUser.isFollowing || false);
        }
    }, [fetchedUser?.followersCount, fetchedUser?.isFollowing, displayUser?.followersCount, displayUser?.isFollowing]);

    const handleToggleFollow = async () => {
        const targetId = activeUserId || displayUser?.userId || displayUser?.id;
        if (!targetId || isOwnProfile || isFollowLoading) return;

        setIsFollowLoading(true);
        const nextFollowingState = !isFollowing;
        setIsFollowing(nextFollowingState);
        setFollowersCount(prev => nextFollowingState ? prev + 1 : Math.max(0, prev - 1));

        try {
            if (nextFollowingState) {
                await profileApi.follow(targetId);
                addToast(`You are now following ${displayUser?.fullName || displayUser?.name || 'user'}! 🎉`, 'success');
            } else {
                await profileApi.unfollow(targetId);
                addToast(`Unfollowed ${displayUser?.fullName || displayUser?.name || 'user'}`, 'info');
            }

            // Sync with backend database
            const updated = await profileApi.getById(targetId);
            if (updated) {
                setFetchedUser(updated);
                setFollowersCount(updated.followersCount);
                setIsFollowing(updated.isFollowing);
            }
            if (refreshCurrentUser) {
                await refreshCurrentUser();
            }
        } catch (err) {
            console.error("Failed to update follow status", err);
            // Revert optimistic update
            setIsFollowing(!nextFollowingState);
            setFollowersCount(prev => nextFollowingState ? Math.max(0, prev - 1) : prev + 1);
            addToast('Failed to update follow status. Please try again.', 'error');
        } finally {
            setIsFollowLoading(false);
        }
    };

    const currentProfileUserId = displayUser?.userId || displayUser?.id || activeUserId;

    const [activeTab, setActiveTab] = useState('About');
    const [networkFilter, setNetworkFilter] = useState('All');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploadingPhoto(true);
        try {
            const updatedProfile = await profileApi.uploadImage(file);
            if (updatedProfile) {
                setFetchedUser(updatedProfile);
            }
            await refreshCurrentUser();
            addToast('Profile photo updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to upload photo:', error);
            addToast('Failed to upload photo. Please try again.', 'error');
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const [editForm, setEditForm] = useState({
        bio: '',
        skills: '',
        interests: '',
        location: '',
        mobileNo: '',
        bioVisibility: 'Public',
        networkVisibility: 'Public',
        interestsVisibility: 'Public'
    });

    const handleOpenEdit = () => {
        setEditForm({
            bio: displayUser?.bio || '',
            skills: Array.isArray(displayUser?.skills) ? displayUser.skills.join(', ') : (displayUser?.skills || ''),
            interests: Array.isArray(displayUser?.interests) ? displayUser.interests.join(', ') : (displayUser?.interests || ''),
            location: displayUser?.location || '',
            mobileNo: displayUser?.mobileNo || '',
            bioVisibility: displayUser?.bioVisibility || 'Public',
            networkVisibility: displayUser?.networkVisibility || 'Public',
            interestsVisibility: displayUser?.interestsVisibility || 'Public'
        });
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const updated = await profileApi.update({
                bio: editForm.bio,
                skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean),
                interests: editForm.interests.split(',').map(i => i.trim()).filter(Boolean),
                location: editForm.location,
                mobileNo: editForm.mobileNo,
                bioVisibility: editForm.bioVisibility,
                networkVisibility: editForm.networkVisibility,
                photosVisibility: 'Public',
                interestsVisibility: editForm.interestsVisibility
            });
            if (updated) {
                setFetchedUser(updated);
            }
            await refreshCurrentUser();
            setIsEditModalOpen(false);
            addToast('Profile updated successfully!', 'success');
        } catch (err) {
            console.error('Failed to update profile:', err);
            addToast('Failed to update profile. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const [tabData, setTabData] = useState({
        posts: [],
        articles: [],
        videos: [],
        podcasts: [],
        communities: [],
        followers: [],
        following: [],
        karmaBalance: null
    });
    const [isTabLoading, setIsTabLoading] = useState(false);

    useEffect(() => {
        let isCancelled = false;
        const fetchTabData = async () => {
            if (!currentProfileUserId) return;
            setIsTabLoading(true);
            try {
                switch (activeTab) {
                    case 'Posts': {
                        const postsRes = isOwnProfile
                            ? await postsApi.getMyPosts(1, 50)
                            : await profileApi.getUserPosts(currentProfileUserId, 1, 50);
                        const rawPosts = Array.isArray(postsRes) ? postsRes : (postsRes?.data || postsRes?.items || []);
                        if (!isCancelled) {
                            setTabData(prev => ({ ...prev, posts: rawPosts.map(mapPost) }));
                        }
                        break;
                    }
                    case 'Articles': {
                        const articlesRes = isOwnProfile
                            ? await articlesApi.getMyArticles(1, 50)
                            : await profileApi.getUserArticles(currentProfileUserId, 1, 50);
                        const rawArticles = Array.isArray(articlesRes) ? articlesRes : (articlesRes?.data || articlesRes?.items || []);
                        if (!isCancelled) {
                            setTabData(prev => ({ ...prev, articles: rawArticles }));
                        }
                        break;
                    }
                    case 'Videos': {
                        const videosRes = isOwnProfile
                            ? await videosApi.getMyVideos(1, 50)
                            : await profileApi.getUserVideos(currentProfileUserId, 1, 50);
                        const rawVideos = Array.isArray(videosRes) ? videosRes : (videosRes?.data || videosRes?.items || []);
                        if (!isCancelled) {
                            setTabData(prev => ({ ...prev, videos: rawVideos }));
                        }
                        break;
                    }
                    case 'Podcasts': {
                        const podcastsRes = isOwnProfile
                            ? await podcastsApi.getMyPodcasts(1, 50)
                            : await profileApi.getUserPodcasts(currentProfileUserId, 1, 50);
                        const rawPodcasts = Array.isArray(podcastsRes) ? podcastsRes : (podcastsRes?.data || podcastsRes?.items || []);
                        if (!isCancelled) {
                            setTabData(prev => ({ ...prev, podcasts: rawPodcasts }));
                        }
                        break;
                    }
                    case 'Communities': {
                        const commsRes = isOwnProfile
                            ? await communitiesApi.getMyCommunities()
                            : await profileApi.getUserCommunities(currentProfileUserId);
                        const rawComms = Array.isArray(commsRes) ? commsRes : (commsRes?.data || commsRes?.items || []);
                        if (!isCancelled) {
                            setTabData(prev => ({ ...prev, communities: rawComms }));
                        }
                        break;
                    }
                    case 'Network': {
                        const [followers, following] = await Promise.all([
                            profileApi.getFollowers(currentProfileUserId).catch(() => []),
                            profileApi.getFollowing(currentProfileUserId).catch(() => [])
                        ]);
                        const rawFollowers = Array.isArray(followers) ? followers : (followers?.data || []);
                        const rawFollowing = Array.isArray(following) ? following : (following?.data || []);
                        if (!isCancelled) {
                            setTabData(prev => ({ ...prev, followers: rawFollowers, following: rawFollowing }));
                        }
                        break;
                    }
                    case 'Karma': {
                        const kBal = isOwnProfile
                            ? await karmaApi.getMyBalance().catch(() => null)
                            : await karmaApi.getUserBalance(currentProfileUserId).catch(() => null);
                        if (!isCancelled && kBal) {
                            setTabData(prev => ({ ...prev, karmaBalance: kBal }));
                        }
                        break;
                    }
                }
            } catch (err) {
                console.error(`Failed to load data for ${activeTab}:`, err);
            } finally {
                if (!isCancelled) setIsTabLoading(false);
            }
        };

        if (activeTab !== 'About') {
            fetchTabData();
        }
        return () => { isCancelled = true; };
    }, [activeTab, currentProfileUserId, isOwnProfile]);

    const realKarmaPoints = Number(displayUser.karmaPoints ?? displayUser.karma ?? 0);
    const karmaBadge = getKarmaBadge(realKarmaPoints);

    const stats = {
        posts: Number(displayUser.postsCount ?? 0),
        followers: followersCount,
        following: Number(displayUser.followingCount ?? 0),
        mutuals: Number(displayUser.mutualConnectionsCount ?? 0),
        commonCommunities: Number(displayUser.commonCommunitiesCount ?? 0),
        karma: realKarmaPoints
    };

    const resolveImageUrl = (url, fallbackName = '') => {
        if (!url) {
            const found = users.find(u => u.name === fallbackName || u.fullName === fallbackName);
            return found?.avatar || null;
        }
        return resolveMediaUrl(url);
    };

    const isSysAdmin = currentUser?.role === 'SYSADM' || 
                       currentUser?.roleName === 'System Administrator' || 
                       (Array.isArray(currentUser?.roles) && (currentUser.roles.includes('SYSADM') || currentUser.roles.includes('System Administrator') || currentUser.roles.includes('SystemAdmin'))) ||
                       displayUser?.role === 'SYSADM' ||
                       displayUser?.roleName === 'System Administrator';

    const tabs = isSysAdmin 
        ? ['About', 'Communities', 'Network'] 
        : ['About', 'Posts', 'Articles', 'Videos', 'Podcasts', 'Communities', 'Network', 'Karma'];

    const avatarSource = resolveImageUrl(displayUser?.avatar || displayUser?.profilePhotoUrl, displayUser?.name || displayUser?.fullName);

    return (
        <main className="flex-1 min-w-0">
            {/* Profile Header & Stats */}
            <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-200 dark:border-slate-800 glass">
                {/* Banner Background */}
                <div className="h-48 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>
                
                {/* Profile Info */}
                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-16 mb-6">
                        <div className="flex items-end gap-6">
                            <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-900 shadow-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-4xl font-black relative overflow-hidden group">
                                {avatarSource ? (
                                    <img 
                                        src={avatarSource} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            const fallback = users.find(u => u.name === (displayUser?.name || displayUser?.fullName) || u.employeeId === displayUser?.employeeId)?.avatar;
                                            if (fallback && e.currentTarget.src !== fallback) {
                                                e.currentTarget.src = fallback;
                                            } else {
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.nextElementSibling) {
                                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                                }
                                            }
                                        }}
                                    />
                                ) : null}
                                <div 
                                    className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-4xl font-black"
                                    style={{ display: avatarSource ? 'none' : 'flex' }}
                                >
                                    {(displayUser?.name || displayUser?.fullName || currentUser?.fullName || 'User').charAt(0).toUpperCase()}
                                </div>
                                {isOwnProfile && (
                                    <div 
                                        className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white" 
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Change Profile Photo"
                                    >
                                        <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                                        <span className="text-[10px] font-bold mt-1 uppercase">Change</span>
                                    </div>
                                )}
                            </div>
                            <div className="pb-2">
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                    {displayUser?.fullName || displayUser?.name || currentUser?.fullName || 'User'}
                                    {displayUser?.employeeId && (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            {displayUser.employeeId}
                                        </span>
                                    )}
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 font-medium text-lg mt-1 flex items-center gap-2">
                                    {displayUser?.designation || displayUser?.roleName || displayUser?.role || 'Employee'} 
                                    <span className="opacity-50">•</span> 
                                    {displayUser?.departmentName || displayUser?.department || 'General'}
                                </p>
                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                                    {displayUser?.location || 'Main Office'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto">
                            {isOwnProfile ? (
                                <button 
                                    onClick={handleOpenEdit}
                                    className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer">
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    {displayUser.connectionStatus === 'PendingReceived' ? (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        if (displayUser.requestId) {
                                                            await userApi.acceptConnection(displayUser.requestId);
                                                        } else {
                                                            await userApi.connect(displayUser.userId);
                                                        }
                                                        window.location.reload();
                                                    } catch (e) {
                                                        console.error(e);
                                                    }
                                                }}
                                                className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                                            >
                                                Accept Request
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        if (displayUser.requestId) {
                                                            await userApi.rejectConnection(displayUser.requestId);
                                                        }
                                                        window.location.reload();
                                                    } catch (e) {
                                                        console.error(e);
                                                    }
                                                }}
                                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                                            >
                                                Ignore
                                            </button>
                                        </>
                                    ) : displayUser.connectionStatus === 'PendingSent' || displayUser.connectionStatus === 'Pending' ? (
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    await userApi.cancelConnection(displayUser.userId);
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold text-sm rounded-xl hover:bg-amber-100 transition-all border border-amber-300 dark:border-amber-700 flex items-center gap-2 cursor-pointer"
                                            title="Click to cancel connection request"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                                            Pending • Cancel
                                        </button>
                                    ) : displayUser.connectionStatus === 'Connected' ? (
                                        <button 
                                            onClick={async () => {
                                                if (!window.confirm('Remove 1st-degree connection?')) return;
                                                try {
                                                    await userApi.removeConnection(displayUser.userId);
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                            Connected
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    await userApi.connect(displayUser.userId);
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-indigo-500 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                                            Connect
                                        </button>
                                    )}

                                    {/* Follow / Following Toggle Button (FR-PN-01 & FR-PN-04) */}
                                    <button
                                        onClick={handleToggleFollow}
                                        disabled={isFollowLoading}
                                        className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all border flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                                            isFollowing 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 shadow-xs' 
                                                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent hover:opacity-90 shadow-md shadow-slate-900/10'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {isFollowing ? 'check_circle' : 'person_add'}
                                        </span>
                                        {isFollowing ? 'Following ✔' : 'Follow'}
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => setIsShareModalOpen(true)}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">share</span>
                                Share Profile
                            </button>
                        </div>
                    </div>

                    {/* Interactive Stats Row */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 py-6 border-t border-slate-100 dark:border-slate-800/50">
                        {!isSysAdmin && (
                            <button onClick={() => setActiveTab('Posts')} className="text-center group cursor-pointer transition-transform hover:scale-105">
                                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">{stats.posts}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 group-hover:text-indigo-500 transition-colors">Posts</p>
                            </button>
                        )}
                        <button onClick={() => { setActiveTab('Network'); setNetworkFilter('Followers'); }} className="text-center border-l border-slate-100 dark:border-slate-800/50 group cursor-pointer transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{stats.followers}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 group-hover:text-indigo-500 transition-colors">Followers</p>
                        </button>
                        <button onClick={() => { setActiveTab('Network'); setNetworkFilter('Following'); }} className="text-center border-l border-slate-100 dark:border-slate-800/50 group cursor-pointer transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{stats.following}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 group-hover:text-indigo-500 transition-colors">Following</p>
                        </button>
                        <button onClick={() => { setActiveTab('Network'); setNetworkFilter('All'); }} className="text-center md:border-l border-slate-100 dark:border-slate-800/50 group cursor-pointer transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-teal-500 dark:text-teal-400">{stats.mutuals}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 group-hover:text-teal-500 transition-colors">Mutuals</p>
                        </button>
                        <button onClick={() => setActiveTab('Communities')} className="text-center border-l border-slate-100 dark:border-slate-800/50 group cursor-pointer transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-pink-500 dark:text-pink-400">{stats.commonCommunities}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 group-hover:text-pink-500 transition-colors">Groups</p>
                        </button>
                        {!isSysAdmin && (
                            <button onClick={() => setActiveTab('Karma')} className="text-center border-l border-slate-100 dark:border-slate-800/50 group cursor-pointer transition-transform hover:scale-105">
                                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-500 to-amber-600">{stats.karma}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1 group-hover:text-amber-500 transition-colors">Karma</p>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-8 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar whitespace-nowrap px-4">
                {tabs.map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-4 font-bold text-sm transition-colors cursor-pointer ${activeTab === tab ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'About' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {/* Bio */}
                            <div className="rounded-2xl border shadow-sm p-6 glass card-lift">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">About Me</h3>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-line">
                                    {displayUser?.bio || 'Dedicated professional working at Knome, focused on innovation, teamwork, and driving platform excellence.'}
                                </p>
                            </div>
                            
                            {/* Skills & Interests */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="rounded-2xl border shadow-sm p-6 glass card-lift">
                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500">psychology</span>
                                        Core Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(Array.isArray(displayUser?.skills) && displayUser.skills.length > 0
                                            ? displayUser.skills
                                            : typeof displayUser?.skills === 'string' && displayUser.skills.trim() !== ''
                                                ? displayUser.skills.split(',').map(s => s.trim())
                                                : ['Collaboration', 'Problem Solving', 'Innovation']
                                        ).map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 text-[12px] font-bold rounded-lg">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-2xl border shadow-sm p-6 glass card-lift">
                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-pink-500">favorite</span>
                                        Interests
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(Array.isArray(displayUser?.interests) && displayUser.interests.length > 0
                                            ? displayUser.interests
                                            : typeof displayUser?.interests === 'string' && displayUser.interests.trim() !== ''
                                                ? displayUser.interests.split(',').map(i => i.trim())
                                                : ['Technology', 'Learning', 'Productivity']
                                        ).map((interest, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-800/50 text-[12px] font-bold rounded-lg">{interest}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Rail: Expertise & Badges */}
                        <div className="flex flex-col gap-6">
                            <div className="rounded-2xl border shadow-sm p-6 glass card-lift overflow-hidden relative group">
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-6">Platform Level</h3>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/50 shadow-md">
                                        <span className="text-xl font-black text-indigo-500">L{Math.max(1, Math.floor(stats.karma / 100) + 1)}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-lg">{karmaBadge.name} Contributor</p>
                                        <p className="text-slate-500 text-xs font-semibold mt-0.5">{stats.karma} Karma Points</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>Progress to Level {Math.max(1, Math.floor(stats.karma / 100) + 1) + 1}</span>
                                        <span className="text-indigo-500">{stats.karma % 100}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500" style={{ width: `${stats.karma % 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Karma' && (
                    <div className="flex flex-col gap-6">
                        {/* Summary / Badge Card */}
                        <div className="rounded-2xl border shadow-sm p-8 glass card-lift bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                            <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-lg"
                                         style={{ 
                                             borderColor: karmaBadge.color ? karmaBadge.color.replace('text-', '') : '#6366f1', 
                                             backgroundColor: 'white' 
                                         }}>
                                        <span className={`material-symbols-outlined text-[48px] ${karmaBadge.color}`} style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{karmaBadge.name} Contributor</h3>
                                        <p className="text-[13px] font-bold text-slate-500 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-amber-500">stars</span>
                                            {stats.karma.toLocaleString()} Lifetime Karma Points
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 min-w-[200px]">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Platform Level</div>
                                    <div className="text-3xl font-black text-indigo-500">Level {Math.max(1, Math.floor(stats.karma / 100) + 1)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent History Table */}
                        <div className="rounded-2xl border shadow-sm glass card-lift overflow-hidden bg-white dark:bg-slate-900">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">history</span>
                                    Recent Karma Ledger
                                </h3>
                                <button onClick={() => navigate('/karma-history')} className="text-xs font-bold text-indigo-500 hover:underline cursor-pointer">
                                    Full History →
                                </button>
                            </div>
                            {isTabLoading ? (
                                <p className="p-6 text-center text-slate-500 text-sm">Loading karma ledger...</p>
                            ) : (!tabData.karmaBalance?.recentTransactions || tabData.karmaBalance.recentTransactions.length === 0) ? (
                                <div className="p-8 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">stars</span>
                                    <p className="text-sm font-medium">No karma transactions recorded yet.</p>
                                    <p className="text-xs text-slate-500 mt-1">Publish posts, articles, or participate in communities to earn karma.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {tabData.karmaBalance.recentTransactions.map((tx, idx) => (
                                            <tr key={tx.transactionId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 text-[12px] font-medium text-slate-400">
                                                    {new Date(tx.createdDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">
                                                    {tx.activityType}
                                                    {tx.relatedContentType ? ` (${tx.relatedContentType})` : ''}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-amber-500">
                                                    +{tx.pointsAwarded}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 text-center border-t border-slate-200 dark:border-slate-800">
                                <button onClick={() => navigate('/karma-history')} className="text-[12px] font-bold text-indigo-500 hover:underline cursor-pointer">
                                    View Full Leaderboard & Rules
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'Posts' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isTabLoading ? (
                            <p className="col-span-2 text-center text-slate-500 font-medium py-8">Loading posts...</p>
                        ) : tabData.posts.length === 0 ? (
                            <div className="col-span-2 text-center py-12 glass rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">article</span>
                                <p className="text-slate-600 dark:text-slate-400 font-bold">No posts published yet</p>
                                <p className="text-xs text-slate-400 mt-1">Updates and posts by this user will appear here.</p>
                            </div>
                        ) : (
                            tabData.posts.map(post => {
                                const authorAvatar = resolveImageUrl(post.authorAvatar || post.authorProfilePhotoUrl, post.authorName);
                                return (
                                    <div key={post.id || post.postId} className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 glass card-lift flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                {authorAvatar ? (
                                                    <img src={authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 font-bold flex items-center justify-center">
                                                        {(post.authorName || 'U').charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{post.authorName || displayUser.name}</p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {post.createdDate ? new Date(post.createdDate).toLocaleDateString() : 'Recent'}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
                                                {post.contentText || post.text || post.content}
                                            </p>
                                            {post.attachments && post.attachments.length > 0 && post.attachments[0].fileUrl && (
                                                <img 
                                                    src={resolveMediaUrl(post.attachments[0].fileUrl)} 
                                                    alt="Post media" 
                                                    className="w-full h-48 object-cover rounded-xl mb-4 border border-slate-100 dark:border-slate-800" 
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs font-bold text-slate-500">
                                            <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer">
                                                <span className="material-symbols-outlined text-[18px]">favorite</span> 
                                                {post.engagementSummary?.likeCount ?? post.likesCount ?? post.likes ?? 0}
                                            </span>
                                            <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer">
                                                <span className="material-symbols-outlined text-[18px]">chat_bubble</span> 
                                                {post.engagementSummary?.commentsCount ?? post.engagementSummary?.commentCount ?? post.commentsCount ?? (Array.isArray(post.comments) ? post.comments.length : (typeof post.comments === 'number' ? post.comments : 0))}
                                            </span>
                                            <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer">
                                                <span className="material-symbols-outlined text-[18px]">share</span> 
                                                {post.engagementSummary?.shareCount ?? post.sharesCount ?? post.shares ?? 0}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'Articles' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">Loading articles...</p>
                        ) : tabData.articles.length === 0 ? (
                            <div className="col-span-3 text-center py-12 glass rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">menu_book</span>
                                <p className="text-slate-600 dark:text-slate-400 font-bold">No articles published yet</p>
                            </div>
                        ) : (
                            tabData.articles.map(article => {
                                const artId = article.articleId || article.id;
                                return (
                                    <div 
                                        key={artId} 
                                        onClick={() => navigate(`/article-view?id=${artId}`)}
                                        className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden glass card-lift flex flex-col cursor-pointer group hover:border-indigo-500 transition-all"
                                    >
                                        <img src={resolveMediaUrl(article.coverImageUrl) || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80'} alt={article.title} className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-500 mb-2">
                                                    <span>{article.readTimeMinutes || 5} min read</span>
                                                    <span className="text-slate-400">{new Date(article.createdDate).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-base mb-2 leading-snug group-hover:text-indigo-500 transition-colors">{article.title}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">{article.description || article.summary}</p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span> {article.viewCount || 0} views
                                                </span>
                                                <button className="text-indigo-500 font-bold hover:underline cursor-pointer">Read Article →</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'Videos' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">Loading videos...</p>
                        ) : tabData.videos.length === 0 ? (
                            <div className="col-span-3 text-center py-12 glass rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">smart_display</span>
                                <p className="text-slate-600 dark:text-slate-400 font-bold">No videos uploaded yet</p>
                            </div>
                        ) : (
                            tabData.videos.map(video => (
                                <div 
                                    key={video.videoId || video.id} 
                                    onClick={() => navigate('/videos')}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden glass card-lift cursor-pointer group hover:border-indigo-500 transition-all"
                                >
                                    <div className="relative h-44 group cursor-pointer">
                                        <img src={resolveMediaUrl(video.thumbnailUrl) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-[28px] pl-1" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
                                            </div>
                                        </div>
                                        <span className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded-md">
                                            {video.durationSeconds ? Math.floor(video.durationSeconds / 60) + ':' + (video.durationSeconds % 60).toString().padStart(2, '0') : '0:00'}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-1 group-hover:text-indigo-500 transition-colors">{video.title}</h4>
                                        <p className="text-xs text-slate-400 font-medium">{video.viewCount || 0} views • {new Date(video.uploadedDate || video.createdDate || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'Podcasts' && (
                    <div className="flex flex-col gap-4">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium text-center py-8">Loading podcasts...</p>
                        ) : tabData.podcasts.length === 0 ? (
                            <div className="text-center py-12 glass rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">podcasts</span>
                                <p className="text-slate-600 dark:text-slate-400 font-bold">No podcasts uploaded yet</p>
                            </div>
                        ) : (
                            tabData.podcasts.map(podcast => (
                                <div 
                                    key={podcast.podcastId || podcast.id} 
                                    onClick={() => navigate('/podcasts')}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 glass card-lift flex items-center gap-5 cursor-pointer group hover:border-indigo-500 transition-all"
                                >
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[32px]">podcasts</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-indigo-500 transition-colors">{podcast.title}</h4>
                                        <p className="text-xs text-slate-400 font-medium mt-1">{podcast.hostName || displayUser.name} • {podcast.durationSeconds ? Math.floor(podcast.durationSeconds / 60) + ' min' : '0 min'}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(podcast.publishedDate || podcast.createdDate || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                    <button className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors shrink-0 cursor-pointer">
                                        <span className="material-symbols-outlined text-[20px] pl-0.5" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'Communities' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">Loading communities...</p>
                        ) : tabData.communities.length === 0 ? (
                            <div className="col-span-3 text-center py-12 glass rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">groups</span>
                                <p className="text-slate-600 dark:text-slate-400 font-bold">No communities joined yet</p>
                            </div>
                        ) : (
                            tabData.communities.map(comm => {
                                const targetCommId = comm.communityId || comm.id;
                                const bannerUrl = resolveMediaUrl(comm.bannerImageUrl) || (comm.banner || getCommunityImages(comm.name).banner);
                                return (
                                    <div 
                                        key={targetCommId} 
                                        onClick={() => navigate(`/community/view?id=${targetCommId}`)}
                                        className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden glass card-lift cursor-pointer hover:border-indigo-500 transition-all group"
                                    >
                                        <div className="h-28 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                                            <img src={bannerUrl} alt={comm.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/10"></div>
                                            <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">{comm.currentUserRole || 'Member'}</span>
                                        </div>
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-500 transition-colors">{comm.name}</h4>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">{comm.memberCount || comm.membersCount || 0} members</p>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/community/view?id=${targetCommId}`);
                                                }}
                                                className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition-all shadow-xs cursor-pointer"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'Network' && (
                    <div className="flex flex-col gap-6">
                        {/* Sub Filter Tabs */}
                        <div className="flex gap-2">
                            {['All', 'Followers', 'Following'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setNetworkFilter(filter)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        networkFilter === filter
                                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isTabLoading ? (
                                <p className="text-slate-500 font-medium col-span-3 text-center py-8">Loading network...</p>
                            ) : (
                                (networkFilter === 'Followers' 
                                    ? tabData.followers 
                                    : networkFilter === 'Following' 
                                    ? tabData.following 
                                    : [...tabData.followers, ...tabData.following].filter((v, i, a) => a.findIndex(t => (t.id || t.userId) === (v.id || v.userId)) === i)
                                ).length === 0 ? (
                                    <div className="col-span-3 text-center py-12 glass rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">group</span>
                                        <p className="text-slate-600 dark:text-slate-400 font-bold">No {networkFilter.toLowerCase()} found</p>
                                    </div>
                                ) : (
                                    (networkFilter === 'Followers' 
                                        ? tabData.followers 
                                        : networkFilter === 'Following' 
                                        ? tabData.following 
                                        : [...tabData.followers, ...tabData.following].filter((v, i, a) => a.findIndex(t => (t.id || t.userId) === (v.id || v.userId)) === i)
                                    ).map(person => {
                                        const personId = person.id || person.userId;
                                        const personName = person.fullName || person.name || 'User';
                                        const personRole = person.roleName || person.designation || person.role || 'Employee';
                                        const personDept = person.departmentName || person.department || 'General';
                                        const personAvatar = resolveImageUrl(person.avatar || person.profilePhotoUrl, personName);

                                        return (
                                            <div key={personId} className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 glass card-lift flex items-center gap-4">
                                                {personAvatar ? (
                                                    <img 
                                                        src={personAvatar} 
                                                        alt={personName} 
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/20 shrink-0" 
                                                        onError={(e) => {
                                                            const fallback = users.find(u => u.name === personName)?.avatar;
                                                            if (fallback && e.currentTarget.src !== fallback) {
                                                                e.currentTarget.src = fallback;
                                                            } else {
                                                                e.currentTarget.style.display = 'none';
                                                                if (e.currentTarget.nextElementSibling) {
                                                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                ) : null}
                                                <div 
                                                    className="w-12 h-12 rounded-full border-2 border-indigo-500/20 shrink-0 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black text-lg"
                                                    style={{ display: personAvatar ? 'none' : 'flex' }}
                                                >
                                                    {personName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{personName}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{personRole}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">{personDept}</p>
                                                </div>
                                                <button 
                                                    onClick={() => navigate(`/profile?id=${personId}`)}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition-colors shrink-0 cursor-pointer"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                        );
                                    })
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all">
                        
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            {/* Photo Upload */}
                            <div>
                                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Photo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-500 text-2xl font-black overflow-hidden border border-slate-200 dark:border-slate-700">
                                        {avatarSource ? (
                                            <img src={avatarSource} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            (displayUser?.name || 'U').charAt(0)
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handlePhotoUpload} 
                                                accept="image/jpeg, image/png, image/gif" 
                                                className="hidden" 
                                            />
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploadingPhoto}
                                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 cursor-pointer">
                                                {isUploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">JPG, GIF or PNG. Max size of 5MB.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bio */}
                            <div>
                                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">About Me (Bio)</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    rows="4"
                                    value={editForm.bio}
                                    onChange={e => setEditForm(prev => ({...prev, bio: e.target.value}))}
                                    placeholder="Write a short summary about yourself and your role..."
                                ></textarea>
                            </div>

                            {/* Location & Mobile */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Location</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                        value={editForm.location}
                                        onChange={e => setEditForm(prev => ({...prev, location: e.target.value}))}
                                        placeholder="e.g. Bhopal, MP"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Mobile Number</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                        value={editForm.mobileNo}
                                        onChange={e => setEditForm(prev => ({...prev, mobileNo: e.target.value}))}
                                        placeholder="e.g. +91 9876543210"
                                    />
                                </div>
                            </div>
                            
                            {/* Skills & Interests */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Skills (Comma separated)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                        value={editForm.skills}
                                        onChange={e => setEditForm(prev => ({...prev, skills: e.target.value}))}
                                        placeholder="e.g. C#, ASP.NET, React, SQL"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Interests (Comma separated)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                        value={editForm.interests}
                                        onChange={e => setEditForm(prev => ({...prev, interests: e.target.value}))}
                                        placeholder="e.g. Cloud Architecture, UI/UX, AI"
                                    />
                                </div>
                            </div>
                            
                            {/* Visibility Settings */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4">Privacy & Visibility Settings</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Profile Bio</span>
                                        <select 
                                            value={editForm.bioVisibility} 
                                            onChange={e => setEditForm(prev => ({...prev, bioVisibility: e.target.value}))}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                            <option>Public</option>
                                            <option>Connections Only</option>
                                            <option>Private</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Network Connections</span>
                                        <select 
                                            value={editForm.networkVisibility} 
                                            onChange={e => setEditForm(prev => ({...prev, networkVisibility: e.target.value}))}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                            <option>Public</option>
                                            <option>Connections Only</option>
                                            <option>Private</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Interests</span>
                                        <select 
                                            value={editForm.interestsVisibility} 
                                            onChange={e => setEditForm(prev => ({...prev, interestsVisibility: e.target.value}))}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                            <option>Public</option>
                                            <option>Connections Only</option>
                                            <option>Private</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button onClick={() => setIsEditModalOpen(false)} disabled={isSaving} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Profile Modal */}
            <ShareProfileModal 
                isOpen={isShareModalOpen} 
                onClose={() => setIsShareModalOpen(false)} 
                user={displayUser} 
            />
        </main>
    );
}
