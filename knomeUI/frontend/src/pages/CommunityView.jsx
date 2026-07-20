import React, { useState } from 'react';
import { useUser } from '../components/contexts/UserContext';

export default function CommunityView() {
    const { currentUser } = useUser();
    
    // Treat SYSADM and CADM as Community Admins for this prototype
    const isAdmin = currentUser.role === 'SYSADM' || currentUser.role === 'CADM';
    
    const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'admin'
    const [membershipStatus, setMembershipStatus] = useState('joined'); // 'none', 'requested', 'joined', 'subscribed'

    const community = {
        name: 'Engineering Excellence',
        type: 'Public',
        category: 'Technology',
        membersCount: '1.2k',
        adminContact: 'Vishendra Sharma (CADM)',
        banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=400',
        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200',
        description: 'Sharing best practices, architectural patterns, and scaling strategies across our core services.',
        rules: [
            '1. Be respectful and constructive.',
            '2. Share code snippets via approved platforms.',
            '3. No marketing or sales pitches.',
            '4. Keep discussions focused on technology and engineering.'
        ],
        faq: [
            { q: 'Who can join?', a: 'Any engineer or technical staff member.' },
            { q: 'Can I invite external contractors?', a: 'No, this is internal only.' },
            { q: 'How do I propose a tech talk?', a: 'Message the admins directly.' }
        ]
    };

    const [posts, setPosts] = useState([
        {
            id: 1,
            author: 'Meghna Tiwari',
            role: 'Lead Engineer',
            time: '2 hours ago',
            content: 'We just successfully migrated the legacy user service to the new microservice architecture! Latency is down by 40% across the board. Great job to everyone involved. I will be hosting a quick retro on Friday to discuss the learnings.',
            likes: 42,
            comments: 12,
            isPinned: true
        },
        {
            id: 2,
            author: 'Rishikesh Ugle',
            role: 'Senior DevOps',
            time: '5 hours ago',
            content: 'Has anyone encountered issues with the new CI/CD pipeline cache not invalidating properly? I am seeing old builds being deployed to staging.',
            likes: 5,
            comments: 8,
            isPinned: false
        }
    ]);

    const [joinRequests, setJoinRequests] = useState([
        { id: 101, name: 'Sourabh Sahu', role: 'HR Admin', department: 'HR' },
        { id: 102, name: 'Mayur Verma', role: 'Data Analyst', department: 'Data Science' }
    ]);

    // Admin Tools
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
        if(window.confirm('Are you sure you want to delete this post?')) {
            setPosts(prev => prev.filter(p => p.id !== postId));
        }
    };

    const handleSuspend = (author) => {
        if(window.confirm(`Suspend ${author} from this community?`)) {
            setPosts(prev => prev.filter(p => p.author !== author));
            alert(`${author} has been suspended and their content removed.`);
        }
    };

    // Sort pinned posts first
    const sortedPosts = [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.id - a.id;
    });

    return (
        <main className="flex-1 pb-32">
            
            {/* Hero Section (FR-CM-08) */}
            <section className="relative h-64 md:h-80 w-full rounded-b-3xl overflow-hidden -mt-8 shadow-sm">
                <img src={community.banner} alt="Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row items-end gap-6 max-w-7xl mx-auto">
                    <img src={community.thumbnail} alt="Thumbnail" className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-slate-900 object-cover shadow-2xl bg-white" />
                    
                    <div className="flex-1 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-indigo-500/90 backdrop-blur-sm text-white rounded text-[10px] font-black uppercase tracking-wider">{community.type}</span>
                            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded text-[10px] font-black uppercase tracking-wider">{community.category}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{community.name}</h1>
                        <p className="text-slate-300 font-medium text-sm max-w-2xl">{community.description}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        {/* FR-CM-09: Actions */}
                        {membershipStatus === 'joined' ? (
                            <button onClick={() => setMembershipStatus('none')} className="px-6 py-2.5 bg-white/10 hover:bg-red-500/80 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 group">
                                <span className="material-symbols-outlined text-[20px] group-hover:hidden">check_circle</span>
                                <span className="material-symbols-outlined text-[20px] hidden group-hover:block">logout</span>
                                <span className="group-hover:hidden">Joined</span>
                                <span className="hidden group-hover:block">Leave</span>
                            </button>
                        ) : membershipStatus === 'subscribed' ? (
                            <button onClick={() => setMembershipStatus('none')} className="px-6 py-2.5 bg-white/10 hover:bg-red-500/80 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 group">
                                <span className="material-symbols-outlined text-[20px] group-hover:hidden">notifications_active</span>
                                <span className="material-symbols-outlined text-[20px] hidden group-hover:block">notifications_off</span>
                                <span className="group-hover:hidden">Subscribed</span>
                                <span className="hidden group-hover:block">Unsubscribe</span>
                            </button>
                        ) : membershipStatus === 'requested' ? (
                            <button onClick={() => setMembershipStatus('none')} className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2 opacity-80 hover:bg-red-500/80 hover:opacity-100 group">
                                <span className="material-symbols-outlined text-[20px] group-hover:hidden">schedule</span>
                                <span className="material-symbols-outlined text-[20px] hidden group-hover:block">close</span>
                                <span className="group-hover:hidden">Requested</span>
                                <span className="hidden group-hover:block">Cancel Request</span>
                            </button>
                        ) : (
                            <>
                                <button onClick={() => setMembershipStatus('subscribed')} className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                                    Subscribe
                                </button>
                                <button onClick={() => setMembershipStatus(community.type === 'Private' ? 'requested' : 'joined')} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">group_add</span>
                                    {community.type === 'Private' ? 'Request to Join' : 'Join'}
                                </button>
                            </>
                        )}
                        <button className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md border border-white/20">
                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col lg:flex-row gap-8">
                
                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                        <button 
                            onClick={() => setActiveTab('feed')}
                            className={`px-6 py-3 font-bold text-[14px] transition-colors relative ${activeTab === 'feed' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Community Feed
                            {activeTab === 'feed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                        <button className="px-6 py-3 font-bold text-[14px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            Files & Media
                        </button>
                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`px-6 py-3 font-bold text-[14px] transition-colors relative flex items-center gap-2 ${activeTab === 'admin' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                Admin Tools
                                {joinRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>}
                                {activeTab === 'admin' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                            </button>
                        )}
                    </div>

                    {activeTab === 'feed' && (
                        <div className="space-y-6">
                            {/* Create Post Input */}
                            {membershipStatus === 'joined' && (
                                <div className="glass card-lift bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 font-bold shrink-0">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                    <input type="text" placeholder={`Share something with ${community.name}...`} className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none text-slate-900 dark:text-white" />
                                    <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-500 transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">image</span>
                                    </button>
                                </div>
                            )}

                            {/* Posts Feed */}
                            {sortedPosts.map(post => (
                                <div key={post.id} className={`glass bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5 ${post.isPinned ? 'ring-1 ring-indigo-500' : ''}`}>
                                    {post.isPinned && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500 mb-3 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-[14px]">push_pin</span>
                                            Pinned by Admin
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
                                        
                                        {/* Moderation Controls (FR-CM-07) */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handlePin(post.id)} className={`w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors ${post.isPinned ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-indigo-500'}`} title={post.isPinned ? "Unpin Post" : "Pin Post"}>
                                                    <span className="material-symbols-outlined text-[18px]">{post.isPinned ? 'do_not_disturb_on' : 'push_pin'}</span>
                                                </button>
                                                <button onClick={() => handleDelete(post.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors" title="Delete Post">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                                <button onClick={() => handleSuspend(post.author)} className="w-8 h-8 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors" title="Suspend Member">
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

                    {activeTab === 'admin' && isAdmin && (
                        <div className="space-y-6">
                            <div className="glass bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden">
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
                </div>

                {/* Right Sidebar (FR-CM-08) */}
                <div className="w-full lg:w-80 shrink-0 space-y-6">
                    {/* About */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px]">About Community</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">group</span>
                                <span className="font-bold">{community.membersCount}</span> Members
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">shield_person</span>
                                Admin: <span className="font-medium text-slate-500">{community.adminContact}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">public</span>
                                Type: <span className="font-medium text-slate-500">{community.type}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rules */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
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

                    {/* FAQ */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px] flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">help</span>
                            FAQ
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
        </main>
    );
}
