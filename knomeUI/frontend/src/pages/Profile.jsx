import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { getKarmaBadge } from '../utils/karmaEngine';
import { profileApi, userApi, postsApi, articlesApi, videosApi, podcastsApi, communitiesApi, mapPost } from '../utils/apiService';

export default function Profile() {
    const { currentUser, refreshCurrentUser } = useUser();
    const location = useLocation();
    
    const isOwnProfile = !location.state?.user || location.state.user.employeeId === currentUser?.employeeId || location.state.user.userId === currentUser?.userId;

    // Check if we are viewing someone else's profile
    const displayUser = isOwnProfile ? currentUser : {
        ...location.state.user,
        designation: location.state.user.role || 'Contributor',
        department: 'Product', // Default mock since author doesn't have department
        location: 'Remote'     // Default mock
    };

    const [activeTab, setActiveTab] = useState('About');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploadingPhoto(true);
        try {
            await profileApi.uploadImage(file);
            await refreshCurrentUser();
        } catch (error) {
            console.error('Failed to upload photo:', error);
            alert('Failed to upload photo. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const [editForm, setEditForm] = useState({
        bio: currentUser?.bio || '',
        skills: currentUser?.skills ? currentUser.skills.join(', ') : '',
        interests: currentUser?.interests ? currentUser.interests.join(', ') : '',
        bioVisibility: currentUser?.bioVisibility || 'Public',
        networkVisibility: currentUser?.networkVisibility || 'Public',
        interestsVisibility: currentUser?.interestsVisibility || 'Public'
    });

    const handleOpenEdit = () => {
        setEditForm({
            bio: currentUser?.bio || '',
            skills: currentUser?.skills ? currentUser.skills.join(', ') : '',
            interests: currentUser?.interests ? currentUser.interests.join(', ') : '',
            bioVisibility: currentUser?.bioVisibility || 'Public',
            networkVisibility: currentUser?.networkVisibility || 'Public',
            interestsVisibility: currentUser?.interestsVisibility || 'Public'
        });
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await profileApi.update({
                bio: editForm.bio,
                skills: editForm.skills.split(',').map(s => s.trim()).filter(s => s),
                interests: editForm.interests.split(',').map(i => i.trim()).filter(i => i),
                location: currentUser?.location || '',
                mobileNo: currentUser?.mobileNo || '',
                bioVisibility: editForm.bioVisibility,
                networkVisibility: editForm.networkVisibility,
                photosVisibility: 'Public',
                interestsVisibility: editForm.interestsVisibility
            });
            await refreshCurrentUser();
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('Failed to update profile. Please try again.');
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
        following: []
    });
    const [isTabLoading, setIsTabLoading] = useState(false);

    React.useEffect(() => {
        const fetchTabData = async () => {
            setIsTabLoading(true);
            try {
                switch (activeTab) {
                    case 'Posts':
                        const postsRes = await postsApi.getMyPosts();
                        setTabData(prev => ({ ...prev, posts: (postsRes || []).map(mapPost) }));
                        break;
                    case 'Articles':
                        const articlesRes = await articlesApi.getMyArticles();
                        setTabData(prev => ({ ...prev, articles: articlesRes || [] }));
                        break;
                    case 'Videos':
                        const videosRes = await videosApi.getMyVideos();
                        setTabData(prev => ({ ...prev, videos: videosRes || [] }));
                        break;
                    case 'Podcasts':
                        const podcastsRes = await podcastsApi.getMyPodcasts();
                        setTabData(prev => ({ ...prev, podcasts: podcastsRes || [] }));
                        break;
                    case 'Communities':
                        const commsRes = await communitiesApi.getMyCommunities();
                        setTabData(prev => ({ ...prev, communities: commsRes || [] }));
                        break;
                    case 'Network':
                        if (displayUser.userId) {
                            const [followers, following] = await Promise.all([
                                profileApi.getFollowers(displayUser.userId),
                                profileApi.getFollowing(displayUser.userId)
                            ]);
                            setTabData(prev => ({ ...prev, followers: followers || [], following: following || [] }));
                        }
                        break;
                }
            } catch (err) {
                console.error(`Failed to load data for ${activeTab}:`, err);
            } finally {
                setIsTabLoading(false);
            }
        };

        if (activeTab !== 'About' && activeTab !== 'Karma') {
            fetchTabData();
        }
    }, [activeTab, displayUser.userId]);

    const stats = {
        posts: displayUser.postsCount || 0,
        followers: displayUser.followersCount || 0,
        following: displayUser.followingCount || 0,
        mutuals: displayUser.mutualConnectionsCount || 0,
        commonCommunities: displayUser.commonCommunitiesCount || 0,
        karma: displayUser.karma || 0
    };

    const tabs = ['About', 'Posts', 'Articles', 'Videos', 'Podcasts', 'Communities', 'Network', 'Karma'];

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
                                {displayUser?.avatar || displayUser?.profilePhotoUrl ? (
                                    <img src={displayUser.avatar || displayUser.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    (displayUser?.name || displayUser?.fullName || currentUser?.fullName || 'User').charAt(0)
                                )}
                                {/* Mock photo upload overlay */}
                                {isOwnProfile && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white" onClick={handleOpenEdit}>
                                        <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                                    </div>
                                )}
                            </div>
                            <div className="pb-2">
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {displayUser?.name || displayUser?.fullName || currentUser?.fullName || 'User'}
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 font-medium text-lg mt-1 flex items-center gap-2">
                                    {displayUser?.designation || displayUser?.role || 'Employee'} <span className="opacity-50">•</span> {displayUser?.department || displayUser?.departmentName || 'General'}
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
                                    className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
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
                                            className="px-6 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold text-sm rounded-xl hover:bg-amber-100 transition-all border border-amber-300 dark:border-amber-700 flex items-center gap-2"
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
                                            className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
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
                                            className="px-6 py-2.5 bg-indigo-500 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                                            Connect
                                        </button>
                                    )}

                                    {/* Follow / Following Toggle Button (FR-PN-01 & FR-PN-04) */}
                                    <button
                                        onClick={async () => {
                                            try {
                                                if (displayUser.isFollowing) {
                                                    await profileApi.unfollow(displayUser.userId);
                                                } else {
                                                    await profileApi.follow(displayUser.userId);
                                                }
                                                window.location.reload();
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all border flex items-center gap-2 ${
                                            displayUser.isFollowing 
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200' 
                                                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent hover:opacity-90'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {displayUser.isFollowing ? 'check' : 'add'}
                                        </span>
                                        {displayUser.isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            )}
                            <button className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
                                Share Profile
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 py-6 border-t border-slate-100 dark:border-slate-800/50">
                        <div className="text-center">
                            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">{stats.posts}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Posts</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.followers}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Followers</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.following}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Following</p>
                        </div>
                        <div className="text-center md:border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-teal-500 dark:text-teal-400">{stats.mutuals}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Mutuals</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-pink-500 dark:text-pink-400">{stats.commonCommunities}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Groups</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-500 to-amber-600">{stats.karma}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Karma</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-8 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar whitespace-nowrap px-4">
                {tabs.map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-4 font-bold text-sm transition-colors ${activeTab === tab ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
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
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                    I am a dedicated professional working at Knome, focused on bridging the gap between innovative technology and user needs. I spend my days strategizing, analyzing metrics, and collaborating with cross-functional teams to deliver excellence.
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
                                        {['Product Strategy', 'Agile Methodologies', 'Data Analysis', 'Cross-functional Leadership', 'UX Research'].map((skill, i) => (
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
                                        {['AI & Machine Learning', 'Design Systems', 'Mentorship', 'Open Source', 'Photography'].map((interest, i) => (
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
                                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/50">
                                        <span className="text-xl font-black text-indigo-500">L4</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-lg">Senior Contributor</p>
                                        <p className="text-slate-500 text-xs font-semibold mt-0.5">Top 15% Platform Wide</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>Progress to L5</span>
                                        <span className="text-indigo-500">85%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
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
                                             borderColor: getKarmaBadge(12800).color.replace('text-', ''), 
                                             backgroundColor: 'white' 
                                         }}>
                                        <span className={`material-symbols-outlined text-[48px] ${getKarmaBadge(12800).color}`} style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{getKarmaBadge(12800).name} Contributor</h3>
                                        <p className="text-[13px] font-bold text-slate-500 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-amber-500">stars</span>
                                            {stats.karma} Lifetime Karma Points
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 min-w-[200px]">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Global Rank</div>
                                    <div className="text-3xl font-black text-indigo-500">#42</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent History Table */}
                        <div className="rounded-2xl border shadow-sm glass card-lift overflow-hidden bg-white dark:bg-slate-900">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">history</span>
                                    Recent Karma History
                                </h3>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">Today, 10:42 AM</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">Published an Article: "Modern UI Design Systems"</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500">+10</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">Today, 09:15 AM</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">Active Community Participation</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500">+5</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">Yesterday, 4:30 PM</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">Received a Share on your video</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500">+3</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 text-center border-t border-slate-200 dark:border-slate-800">
                                <button className="text-[12px] font-bold text-indigo-500 hover:underline">View Full Ledger</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'Posts' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { id: 1, text: 'Excited to announce our new Design System v2.0 rollout across all MPOnline internal portals! 🎨🚀 #design #ui', date: '2 hours ago', likes: 24, comments: 5, shares: 2, image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80' },
                            { id: 2, text: 'Had a great brainstorming session with the product design team on enhancing employee engagement metrics.', date: '3 days ago', likes: 42, comments: 12, shares: 8, image: null },
                            { id: 3, text: 'Check out our latest article on building scalable ASP.NET Core microservices!', date: '1 week ago', likes: 89, comments: 19, shares: 14, image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80' }
                        ].map(post => (
                            <div key={post.id} className="rounded-2xl border shadow-sm p-6 glass card-lift flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <img src={displayUser.avatar || 'https://randomuser.me/api/portraits/men/40.jpg'} alt={displayUser.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{displayUser.name}</p>
                                            <p className="text-[11px] text-slate-400 font-medium">{post.date}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{post.text}</p>
                                    {post.image && (
                                        <img src={post.image} alt="Post content" className="w-full h-48 object-cover rounded-xl mb-4" />
                                    )}
                                </div>
                                <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer">
                                        <span className="material-symbols-outlined text-[18px]">favorite</span> {post.likes}
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer">
                                        <span className="material-symbols-outlined text-[18px]">chat_bubble</span> {post.comments}
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer">
                                        <span className="material-symbols-outlined text-[18px]">share</span> {post.shares}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'Articles' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium">Loading articles...</p>
                        ) : tabData.articles.length === 0 ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">No articles found.</p>
                        ) : (
                            tabData.articles.map(article => (
                                <div key={article.articleId} className="rounded-2xl border shadow-sm overflow-hidden glass card-lift flex flex-col">
                                    <img src={article.coverImageUrl?.startsWith('http') ? article.coverImageUrl : `http://localhost:5095${article.coverImageUrl}`} alt={article.title} className="h-40 w-full object-cover" />
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-500 mb-2">
                                                <span>{article.readTimeMinutes || 5} min read</span>
                                                <span className="text-slate-400">{new Date(article.createdDate).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-2 leading-snug hover:text-indigo-500 cursor-pointer">{article.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{article.summary}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">visibility</span> {article.viewCount || 0} views
                                            </span>
                                            <button className="text-indigo-500 font-bold hover:underline">Read Article →</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'Videos' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium">Loading videos...</p>
                        ) : tabData.videos.length === 0 ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">No videos found.</p>
                        ) : (
                            tabData.videos.map(video => (
                                <div key={video.videoId} className="rounded-2xl border shadow-sm overflow-hidden glass card-lift">
                                    <div className="relative h-44 group cursor-pointer">
                                        <img src={video.thumbnailUrl?.startsWith('http') ? video.thumbnailUrl : `http://localhost:5095${video.thumbnailUrl}`} alt={video.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-[28px] pl-1" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
                                            </div>
                                        </div>
                                        <span className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded-md">{video.durationSeconds ? Math.floor(video.durationSeconds / 60) + ':' + (video.durationSeconds % 60).toString().padStart(2, '0') : '0:00'}</span>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-1">{video.title}</h4>
                                        <p className="text-xs text-slate-400 font-medium">{video.viewCount || 0} views • {new Date(video.createdDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'Podcasts' && (
                    <div className="flex flex-col gap-4">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium">Loading podcasts...</p>
                        ) : tabData.podcasts.length === 0 ? (
                            <p className="text-slate-500 font-medium text-center py-8">No podcasts found.</p>
                        ) : (
                            tabData.podcasts.map(podcast => (
                                <div key={podcast.podcastId} className="rounded-2xl border shadow-sm p-5 glass card-lift flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <span className="material-symbols-outlined text-[32px]">podcasts</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{podcast.title}</h4>
                                        <p className="text-xs text-slate-400 font-medium mt-1">{podcast.hostName || 'Host'} • {podcast.durationSeconds ? Math.floor(podcast.durationSeconds / 60) + ' min' : '0 min'}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(podcast.createdDate).toLocaleDateString()}</p>
                                    </div>
                                    <button className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors shrink-0">
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
                            <p className="text-slate-500 font-medium">Loading communities...</p>
                        ) : tabData.communities.length === 0 ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">No communities found.</p>
                        ) : (
                            tabData.communities.map(comm => (
                                <div key={comm.communityId} className="rounded-2xl border shadow-sm overflow-hidden glass card-lift">
                                    <div className="h-28 relative">
                                        {comm.bannerImageUrl ? (
                                            <img src={comm.bannerImageUrl.startsWith('http') ? comm.bannerImageUrl : `http://localhost:5095${comm.bannerImageUrl}`} alt={comm.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
                                        )}
                                        <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{comm.currentUserRole || 'Member'}</span>
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{comm.name}</h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{comm.memberCount || 0} members</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors">
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'Network' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isTabLoading ? (
                            <p className="text-slate-500 font-medium">Loading network...</p>
                        ) : tabData.followers.length === 0 && tabData.following.length === 0 ? (
                            <p className="text-slate-500 font-medium col-span-3 text-center py-8">No connections found.</p>
                        ) : (
                            [...tabData.followers, ...tabData.following].filter((v, i, a) => a.findIndex(t => (t.userId === v.userId)) === i).map(person => (
                                <div key={person.userId} className="rounded-2xl border shadow-sm p-5 glass card-lift flex items-center gap-4">
                                    {person.profilePhotoUrl ? (
                                        <img src={person.profilePhotoUrl.startsWith('http') ? person.profilePhotoUrl : `http://localhost:5095${person.profilePhotoUrl}`} alt={person.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/20 shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/20 shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-500 font-bold">
                                            {person.fullName?.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{person.fullName}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{person.designation || 'Member'}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{person.departmentName || 'General'}</p>
                                    </div>
                                    <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                                        View
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Edit Profile Modal (FR-UP-02, FR-UP-04, FR-UP-06) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all">
                        
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            {/* Photo Upload (FR-UP-06) */}
                            <div>
                                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Photo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-500 text-2xl font-black overflow-hidden">
                                        {currentUser?.avatar ? (
                                            <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            currentUser?.name?.charAt(0)
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
                                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50">
                                                {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                                            </button>
                                            <button className="px-4 py-2 text-slate-500 hover:text-red-500 text-sm font-bold transition-colors">
                                                Remove
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">JPG, GIF or PNG. Max size of 5MB. Photo will be auto-resized to 256x256.</p>
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
                                ></textarea>
                            </div>
                            
                            {/* Skills & Interests */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Skills (Comma separated)</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                        value={editForm.skills}
                                        onChange={e => setEditForm(prev => ({...prev, skills: e.target.value}))} />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Interests (Comma separated)</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                        value={editForm.interests}
                                        onChange={e => setEditForm(prev => ({...prev, interests: e.target.value}))} />
                                </div>
                            </div>
                            
                            {/* Visibility Settings (FR-UP-04) */}
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
                            <button onClick={() => setIsEditModalOpen(false)} disabled={isSaving} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50">
                                Cancel
                            </button>
                            <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
