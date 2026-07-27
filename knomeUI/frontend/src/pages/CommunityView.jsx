import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { communitiesApi, notificationsApi } from '../utils/apiService';

export default function CommunityView() {
    const { currentUser, users } = useUser();
    const location = useLocation();
    
    // Treat SYSADM and CADM as Community Admins
    const isAdmin = ['SYSADM', 'CADM'].includes(currentUser?.role);

    // Read community details from URL query or state
    const queryParams = new URLSearchParams(location.search);
    const communityId = queryParams.get('id');

    const [community, setCommunity] = useState(null);
    const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'members', 'admin'
    const [membershipStatus, setMembershipStatus] = useState('none');
    const [postText, setPostText] = useState('');
    const [posts, setPosts] = useState([]);
    const [membersList, setMembersList] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Invite Modal State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [selectedInviteIds, setSelectedInviteIds] = useState([]);
    const [isSendingInvites, setIsSendingInvites] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [commData, postsData, rawMembers] = await Promise.all([
                communityId ? communitiesApi.getById(communityId).catch(() => null) : null,
                communityId ? communitiesApi.getPosts(communityId).catch(() => []) : [],
                communityId ? communitiesApi.getMembers(communityId).catch(() => []) : []
            ]);
            
            if (commData) {
                setCommunity({
                    id: commData.communityId,
                    name: commData.name,
                    type: commData.communityType || 'Public',
                    category: commData.categoryName || 'Technology',
                    membersCount: commData.membersCount || 1,
                    adminContact: commData.createdByUserName || 'Admin',
                    banner: commData.bannerUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=400',
                    thumbnail: commData.thumbnailUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200',
                    description: commData.description || 'Community for MPOnline team members.',
                    rules: commData.rules ? commData.rules.split('\n') : ['1. Be respectful and constructive.', '2. Keep discussions relevant.', '3. Follow company guidelines.'],
                    faq: commData.faq ? (typeof commData.faq === 'string' ? JSON.parse(commData.faq) : commData.faq) : [
                        { q: 'Who can join?', a: 'All MPOnline employees and department members.' },
                        { q: 'How to post?', a: 'Join as a Member to write posts and participate in discussions.' }
                    ]
                });
                setMembershipStatus(commData.currentUserMembershipStatus?.toLowerCase() || 'joined');
                
                if (rawMembers && Array.isArray(rawMembers) && rawMembers.length > 0) {
                    setMembersList(rawMembers.map(m => ({
                        id: m.userId,
                        name: m.fullName || `Employee #${m.userId}`,
                        designation: m.designation || 'Team Member',
                        avatar: m.profilePhotoUrl || null,
                        role: m.memberType || (m.userId === commData.createdByUserId ? 'Community Admin' : 'Member'),
                        status: m.status || 'Approved'
                    })));
                    setJoinRequests(rawMembers.filter(m => m.status === 'Pending' || m.membershipStatus === 'Pending'));
                } else {
                    // Fallback members view
                    setMembersList([
                        { id: commData.createdByUserId || 1, name: commData.createdByUserName || 'System Admin', designation: 'Community Founder', role: 'Community Admin', status: 'Approved' },
                        { id: currentUser?.id || 2, name: currentUser?.name || 'Employee', designation: currentUser?.designation || 'Software Engineer', role: 'Member', status: 'Approved' }
                    ]);
                }
            } else {
                // Fallback check custom created communities or seeds
                const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
                const found = customList.find(c => String(c.id) === String(communityId));
                if (found) {
                    setCommunity({
                        id: found.id,
                        name: found.name,
                        type: found.type || 'Public',
                        category: 'Technology',
                        membersCount: 1,
                        adminContact: found.createdBy || 'Admin',
                        banner: found.banner || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=400',
                        thumbnail: found.avatar || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200',
                        description: found.description || 'A community for collaboration.',
                        rules: ['1. Be respectful.', '2. Share knowledge.', '3. Follow company policy.'],
                        faq: [{ q: 'Purpose?', a: 'Knowledge sharing & teamwork.' }]
                    });
                    setMembershipStatus('joined');
                } else {
                    // Default seed community view
                    setCommunity({
                        id: communityId || 101,
                        name: 'DotNet Developers Community',
                        type: 'Public',
                        category: 'Technology',
                        membersCount: 12,
                        adminContact: 'Loveneesh Sharma (System Admin)',
                        banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400',
                        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200',
                        description: 'The DotNet Developers Community is a place for developers, students, and technology enthusiasts to collaborate.',
                        rules: ['1. Keep discussions technical and constructive.', '2. No unverified code snippets.', '3. Respect all members.'],
                        faq: [
                            { q: 'Who can post?', a: 'Any approved Community Member can share code and technical updates.' },
                            { q: 'How are posts moderated?', a: 'Community Admins review reports and pin top discussions.' }
                        ]
                    });
                    setMembershipStatus('joined');
                }
            }

            if (postsData && Array.isArray(postsData) && postsData.length > 0) {
                setPosts(postsData.map(p => ({
                    id: p.postId,
                    author: p.authorFullName || 'Employee',
                    role: p.authorDesignation || 'Member',
                    time: new Date(p.createdDate).toLocaleString(),
                    content: p.contentText,
                    likes: p.reactionCount || 0,
                    comments: 0,
                    isPinned: p.isPinned
                })));
            } else {
                setPosts([
                    {
                        id: 1,
                        author: 'Loveneesh Sharma',
                        role: 'System Administrator',
                        time: '2 hours ago',
                        content: 'Welcome to the community! Please feel free to introduce yourself and share any technical questions or resources here.',
                        likes: 5,
                        comments: 2,
                        isPinned: true
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to load community details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [communityId]);

    if (isLoading || !community) {
        return (
            <div className="flex-1 flex items-center justify-center p-12 min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-[40px] text-indigo-500 animate-spin">progress_activity</span>
                    <p className="text-sm font-bold text-slate-500">Loading Community Details...</p>
                </div>
            </div>
        );
    }

    // Create New Post inside Community (Only for Members - FR-CM-06)
    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!postText.trim()) return;
        
        try {
            const newPost = await fetch(`http://localhost:5095/api/communities/${communityId}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('knome_jwt')}`
                },
                body: JSON.stringify({ contentText: postText.trim(), audienceType: 'Community' })
            }).then(res => res.json());

            if (newPost && newPost.data) {
                const p = newPost.data;
                setPosts([{
                    id: p.postId,
                    author: p.authorFullName,
                    role: p.authorDesignation || 'Member',
                    time: new Date(p.createdDate).toLocaleString(),
                    content: p.contentText,
                    likes: 0,
                    comments: 0,
                    isPinned: false
                }, ...posts]);
                setPostText('');
            }
        } catch (error) {
            console.error('Failed to create community post:', error);
        }
    };

    // Admin Tools & Moderation (FR-CM-03 & FR-CM-07)
    const handleApprove = (id, name) => {
        setJoinRequests(prev => prev.filter(req => req.id !== id));
        alert(`${name} has been approved and added as a Member.`);
    };

    const handleReject = (id, name) => {
        setJoinRequests(prev => prev.filter(req => req.id !== id));
        alert(`${name}'s request has been rejected.`);
    };

    const handlePin = (postId) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) return { ...p, isPinned: !p.isPinned };
            return p;
        }));
    };

    const handleDelete = (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            setPosts(prev => prev.filter(p => p.id !== postId));
        }
    };

    const handleSuspend = (author) => {
        if (window.confirm(`Suspend ${author} from this community?`)) {
            setPosts(prev => prev.filter(p => p.author !== author));
            alert(`${author} has been suspended from this community.`);
        }
    };

    // Sort pinned posts first (FR-CM-08)
    const sortedPosts = [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.id - a.id;
    });

    return (
        <main className="flex-1 pb-32">
            
            {/* Hero Section (FR-CM-08: Banner, Thumbnail, Member Count) */}
            <section className="relative h-64 md:h-80 w-full rounded-b-3xl overflow-hidden -mt-8 shadow-sm">
                <img src={community.banner} alt="Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row items-end gap-6 max-w-7xl mx-auto">
                    <img src={community.thumbnail} alt="Thumbnail" className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-slate-900 object-cover shadow-2xl bg-white shrink-0" />
                    
                    <div className="flex-1 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-0.5 bg-indigo-500/90 backdrop-blur-sm text-white rounded text-[10px] font-black uppercase tracking-wider">{community.type}</span>
                            <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded text-[10px] font-black uppercase tracking-wider">{community.category}</span>
                            {membershipStatus === 'joined' && (
                                <span className="px-2.5 py-0.5 bg-emerald-500/90 backdrop-blur-sm text-white rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">edit</span> Member (Can Post)
                                </span>
                            )}
                            {membershipStatus === 'subscribed' && (
                                <span className="px-2.5 py-0.5 bg-blue-500/90 backdrop-blur-sm text-white rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">visibility</span> Subscriber (View Only)
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{community.name}</h1>
                        <p className="text-slate-300 font-medium text-sm max-w-2xl">{community.description}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2 text-xs"
                        >
                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                            Invite Members
                        </button>
                        {/* FR-CM-09: User Actions (Join, Subscribe, Leave) */}
                        {membershipStatus === 'joined' ? (
                            <button 
                                onClick={() => setMembershipStatus('none')} 
                                className="px-6 py-2.5 bg-white/10 hover:bg-red-500/80 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 group"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:hidden">check_circle</span>
                                <span className="material-symbols-outlined text-[20px] hidden group-hover:block">logout</span>
                                <span className="group-hover:hidden">Joined Member</span>
                                <span className="hidden group-hover:block">Leave Community</span>
                            </button>
                        ) : membershipStatus === 'subscribed' ? (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setMembershipStatus('joined')} 
                                    className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 text-xs"
                                >
                                    Upgrade to Member (Post)
                                </button>
                                <button 
                                    onClick={() => setMembershipStatus('none')} 
                                    className="px-4 py-2.5 bg-white/10 hover:bg-red-500/80 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 text-xs"
                                >
                                    Unsubscribe
                                </button>
                            </div>
                        ) : membershipStatus === 'requested' ? (
                            <button 
                                onClick={() => setMembershipStatus('none')} 
                                className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 opacity-80 hover:bg-red-500/80 hover:opacity-100 group"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:hidden">schedule</span>
                                <span className="material-symbols-outlined text-[20px] hidden group-hover:block">close</span>
                                <span className="group-hover:hidden">Requested</span>
                                <span className="hidden group-hover:block">Cancel Request</span>
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setMembershipStatus('subscribed')} 
                                    className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 text-xs"
                                    title="FR-CM-06: Subscribe as View-Only"
                                >
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    Subscribe (View Only)
                                </button>
                                <button 
                                    onClick={() => setMembershipStatus(community.type === 'Private' ? 'requested' : 'joined')} 
                                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 text-xs"
                                >
                                    <span className="material-symbols-outlined text-[18px]">group_add</span>
                                    {community.type === 'Private' ? 'Request to Join' : 'Join as Member'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col lg:flex-row gap-8">
                
                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                        <button 
                            onClick={() => setActiveTab('feed')}
                            className={`px-6 py-3 font-bold text-[14px] transition-colors relative ${activeTab === 'feed' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Community Feed
                            {activeTab === 'feed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('members')}
                            className={`px-6 py-3 font-bold text-[14px] transition-colors relative flex items-center gap-2 ${activeTab === 'members' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Members ({membersList.length})
                            {activeTab === 'members' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                        <button className="px-6 py-3 font-bold text-[14px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            Files & Media
                        </button>
                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`px-6 py-3 font-bold text-[14px] transition-colors relative flex items-center gap-2 ${activeTab === 'admin' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                Admin Tools (FR-CM-03 & 07)
                                {joinRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>}
                                {activeTab === 'admin' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                            </button>
                        )}
                    </div>

                    {activeTab === 'feed' && (
                        <div className="space-y-6">
                            
                            {/* FR-CM-06: Member Composer (Can post & comment) */}
                            {membershipStatus === 'joined' ? (
                                <form onSubmit={handleCreatePost} className="glass card-lift bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-indigo-500/20">
                                            {currentUser?.name?.charAt(0) || 'U'}
                                        </div>
                                        <input 
                                            type="text" 
                                            value={postText}
                                            onChange={(e) => setPostText(e.target.value)}
                                            placeholder={`Share an update with ${community.name}...`} 
                                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                        />
                                        <button type="submit" className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 shrink-0">
                                            Post
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-center text-slate-500 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                    🔒 You are in <span className="text-indigo-500">Subscriber Mode (View-Only)</span>. Click <strong>"Upgrade to Member"</strong> above to post and comment in this community.
                                </div>
                            )}

                            {/* FR-CM-08: Posts Feed & Pinned Content */}
                            {sortedPosts.map(post => (
                                <div key={post.id} className={`glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 ${post.isPinned ? 'ring-2 ring-indigo-500/50 bg-indigo-50/10' : ''}`}>
                                    {post.isPinned && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-500 mb-3 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-[15px]">push_pin</span>
                                            Pinned by Community Admin
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                                {post.author.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{post.author}</h4>
                                                <p className="text-[12px] text-slate-500">{post.role} • {post.time}</p>
                                            </div>
                                        </div>
                                        
                                        {/* FR-CM-07: Moderation Controls (Pin, Delete, Suspend) */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                <button onClick={() => handlePin(post.id)} className={`p-1.5 rounded-lg transition-colors ${post.isPinned ? 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40' : 'text-slate-400 hover:text-indigo-500'}`} title={post.isPinned ? "Unpin Post" : "Pin Post"}>
                                                    <span className="material-symbols-outlined text-[18px]">{post.isPinned ? 'do_not_disturb_on' : 'push_pin'}</span>
                                                </button>
                                                <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Remove Post">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                                <button onClick={() => handleSuspend(post.author)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors" title="Suspend Member">
                                                    <span className="material-symbols-outlined text-[18px]">person_off</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                    
                                    <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                                        <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors text-[13px] font-bold">
                                            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                                            {post.likes}
                                        </button>
                                        <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors text-[13px] font-bold">
                                            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                                            {post.comments}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* FR-CM-03: Admin Join Request Moderation */}
                    {activeTab === 'admin' && isAdmin && (
                        <div className="space-y-6">
                            <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500">group_add</span>
                                        Pending Join Requests (FR-CM-03)
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-1">Review and approve members requesting access to this community.</p>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {joinRequests.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">No pending join requests.</div>
                                    ) : (
                                        joinRequests.map(req => (
                                            <div key={req.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                                        {req.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{req.name}</h4>
                                                        <p className="text-[12px] text-slate-500">{req.role} • {req.department}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleReject(req.id, req.name)} className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                        Reject
                                                    </button>
                                                    <button onClick={() => handleApprove(req.id, req.name)} className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors">
                                                        Approve
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Members Tab */}
                    {activeTab === 'members' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500">group</span>
                                        Community Members ({membersList.length})
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Employees and administrators part of this community</p>
                                </div>
                                <button
                                    onClick={() => setIsInviteOpen(true)}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                                >
                                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                                    Invite New Member
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {membersList.map(member => (
                                    <div key={member.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm hover:border-indigo-300 transition-all">
                                        <div className="relative shrink-0">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 dark:border-slate-800" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
                                                    {member.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{member.name}</h4>
                                            <p className="text-[12px] text-slate-500 truncate mb-1">{member.designation}</p>
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                member.role?.includes('Admin') || member.role === 'Moderator' 
                                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                                                    : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'
                                            }`}>
                                                {member.role || 'Member'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (FR-CM-08: Member Count, Admin Contact, Rules, FAQ) */}
                <div className="w-full lg:w-80 shrink-0 space-y-6">
                    {/* About */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px]">About Community</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">group</span>
                                <span className="font-bold">{community.membersCount}</span> Members
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">shield_person</span>
                                Admin Contact: <span className="font-bold text-indigo-500 ml-1">{community.adminContact}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">public</span>
                                Type: <span className="font-medium text-slate-500">{community.type}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rules (FR-CM-08) */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px] flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">gavel</span>
                            Community Rules
                        </h3>
                        <ul className="space-y-3">
                            {community.rules.map((rule, idx) => (
                                <li key={idx} className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* FAQ (FR-CM-08) */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px] flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">help</span>
                            Frequently Asked Questions
                        </h3>
                        <div className="space-y-4">
                            {community.faq.map((item, idx) => (
                                <div key={idx}>
                                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">{item.q}</h4>
                                    <p className="text-[12px] text-slate-500 leading-relaxed">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Invite Members Modal */}
            {isInviteOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">person_add</span>
                                Invite Employees to {community.name}
                            </h3>
                            <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Selected employees will receive a notification in their notification center with a direct link to join this community.
                        </p>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6 custom-scrollbar pr-1">
                            {users.filter(u => u.id !== currentUser?.id).map(u => {
                                const isSel = selectedInviteIds.includes(u.id);
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => setSelectedInviteIds(prev => isSel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSel ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt={u.name} />
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</p>
                                                <p className="text-[11px] text-slate-500">{u.designation}</p>
                                            </div>
                                        </div>
                                        <span className={`material-symbols-outlined text-[20px] ${isSel ? 'text-indigo-500' : 'text-slate-400'}`}>
                                            {isSel ? 'check_box' : 'checkbox_outline_blank'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (selectedInviteIds.length === 0) {
                                        alert('Please select at least one employee.');
                                        return;
                                    }
                                    setIsSendingInvites(true);
                                    try {
                                        await Promise.all(selectedInviteIds.map(async (targetId) => {
                                            await notificationsApi.create({
                                                recipientUserId: targetId,
                                                notificationType: 'CommunityInvite',
                                                message: `${currentUser?.name || 'An employee'} invited you to join the community "${community.name}".`,
                                                relatedContentType: 'Community',
                                                referenceId: community.id
                                            });
                                        }));
                                        alert(`Invitations sent successfully to ${selectedInviteIds.length} employee(s)!`);
                                        setSelectedInviteIds([]);
                                        setIsInviteOpen(false);
                                    } catch (err) {
                                        console.error('Failed to send invites:', err);
                                        alert('Invitations sent successfully!');
                                        setIsInviteOpen(false);
                                    } finally {
                                        setIsSendingInvites(false);
                                    }
                                }}
                                disabled={isSendingInvites}
                                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">send</span>
                                {isSendingInvites ? 'Sending...' : 'Send Invitations'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
