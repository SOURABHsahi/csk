import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import CreateCommunityModal from '../components/modals/CreateCommunityModal';
import { communitiesApi, getCommunityImages } from '../utils/apiService';

const defaultSeeds = [
    { id: 101, name: 'DotNet Developers Community', type: 'Public', members: '12 members', activity: '14 posts', description: 'Collaborative space for DotNet & C# engineering teams across MPOnline.', banner: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 109, name: 'Executive AI & Data Labs', type: 'Private', members: '1 member', activity: 'New', description: 'Exclusive private community for AI research, LLM architecture, and enterprise data science leadership.', banner: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 107, name: 'Fullstack Engineering Guild', type: 'Public', members: '1 member', activity: 'New', description: 'Test Public Community created for fullstack engineering teams to test joining, discussions, and live member tracking.', banner: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 108, name: 'AI & Data Science Innovation Lab', type: 'Private', members: '3 members', activity: '5 posts', description: 'Test Private Community requiring Community Admin approval for join requests.', banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 102, name: 'Technology & Architecture Hub', type: 'Default (Org)', members: '84 members', activity: '32 posts', description: 'Official Organization Technology channel auto-subscribed for all tech employees.', banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=400', membershipStatus: 'none' },
    { id: 103, name: 'HR & People Operations', type: 'Default (Org)', members: '120 members', activity: '45 posts', description: 'Central HR announcements, policy updates, and employee engagement.', banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 104, name: 'Finance & Accounting Operations', type: 'Default (Org)', members: '45 members', activity: '19 posts', description: 'Finance guidelines, travel reimbursement procedures, and budget updates.', banner: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 105, name: 'Marketing & Brand Strategy', type: 'Public', members: '28 members', activity: '8 posts', description: 'Brand assets, event promotions, and internal marketing initiatives.', banner: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' },
    { id: 106, name: 'CTO Leadership & Strategy Circle', type: 'Private', members: '6 members', activity: '5 posts', description: 'Private discussion channel for CTO leadership and technical directors.', banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=600&h=300', membershipStatus: 'none' }
];

const getInitialCommunities = (userId) => {
    // Load user's joined/subscribed communities from localStorage
    const userJoinedList = JSON.parse(localStorage.getItem(`knome_joined_communities_${userId || 'guest'}`) || '[]');
    const getStatus = (id, type) => {
        const entry = userJoinedList.find(c => String(c.id) === String(id));
        if (entry) return entry.status === 'joined' ? 'Approved' : 'Subscribed';
        if (type?.toLowerCase().includes('default') || type?.toLowerCase().includes('org')) return 'Approved';
        const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${id}`) || '[]');
        if (userId && localMembers.some(m => String(m.userId || m.id) === String(userId))) return 'Approved';
        return 'none';
    };

    const custom = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
    const customMapped = custom.map(c => {
        const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${c.id}`) || '[]');
        const count = localMembers.length > 0 ? localMembers.length : (parseInt(c.members) || 1);
        return {
            id: c.id,
            name: c.name,
            type: c.type || 'Public',
            members: `${count} ${count === 1 ? 'member' : 'members'}`,
            activity: 'New',
            description: c.description || 'A new community created for MPOnline teams.',
            banner: c.banner || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300',
            membershipStatus: getStatus(c.id, c.type)
        };
    });

    const seedsMapped = defaultSeeds.map(s => {
        const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${s.id}`) || '[]');
        const count = localMembers.length > 0 ? localMembers.length : (parseInt(s.members) || 1);
        return {
            ...s,
            members: `${count} ${count === 1 ? 'member' : 'members'}`,
            membershipStatus: getStatus(s.id, s.type)
        };
    });

    return [...customMapped, ...seedsMapped];
};

export default function Communities() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Discover');

    const [communities, setCommunities] = useState(() => getInitialCommunities(currentUser?.id));
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');

    const loadCommunities = async () => {
        try {
            const data = await communitiesApi.getAll().catch(() => null);
            // Check localStorage for user's actual join status
            const userJoinedList = JSON.parse(localStorage.getItem(`knome_joined_communities_${currentUser?.id || 'guest'}`) || '[]');
            const getStatus = (id, apiStatus, type) => {
                const entry = userJoinedList.find(c => String(c.id) === String(id));
                if (entry) return entry.status === 'joined' ? 'Approved' : 'Subscribed';
                if (type?.toLowerCase().includes('default') || type?.toLowerCase().includes('org')) return 'Approved';
                const s = (apiStatus || '').toLowerCase();
                if (s === 'approved' || s === 'joined') return 'Approved';
                if (s === 'pending') return 'Pending';
                const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${id}`) || '[]');
                if (currentUser && localMembers.some(m => String(m.userId || m.id) === String(currentUser.id) || (currentUser.name && (m.fullName || m.name || '').toLowerCase() === currentUser.name.toLowerCase()))) return 'Approved';
                return 'none';
            };

            if (data && Array.isArray(data) && data.length > 0) {
                const apiMapped = data.map(c => {
                    const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${c.communityId}`) || '[]');
                    const count = localMembers.length > 0 ? localMembers.length : (c.membersCount || 1);
                    const imgs = getCommunityImages(c.name, c.categoryName);
                    return {
                        id: c.communityId,
                        name: c.name,
                        type: c.communityType || 'Public',
                        members: `${count} ${count === 1 ? 'member' : 'members'}`,
                        activity: `${c.postsCount || 0} posts`,
                        description: c.description || 'No description provided.',
                        banner: c.bannerUrl || imgs.banner,
                        thumbnail: c.thumbnailUrl || imgs.thumbnail,
                        membershipStatus: getStatus(c.communityId, c.currentUserMembershipStatus, c.communityType)
                    };
                });
                const existingIds = new Set(apiMapped.map(c => String(c.id)));
                const custom = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
                custom.forEach(c => {
                    if (!existingIds.has(String(c.id))) {
                        const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${c.id}`) || '[]');
                        const count = localMembers.length > 0 ? localMembers.length : (parseInt(c.members) || 1);
                        const imgs = getCommunityImages(c.name);
                        apiMapped.unshift({
                            id: c.id,
                            name: c.name,
                            type: c.type || 'Public',
                            members: `${count} ${count === 1 ? 'member' : 'members'}`,
                            activity: 'New',
                            description: c.description || 'A new community created for MPOnline teams.',
                            banner: c.banner || imgs.banner,
                            thumbnail: c.thumbnail || imgs.thumbnail,
                            membershipStatus: getStatus(c.id, null, c.type)
                        });
                    }
                });
                setCommunities(apiMapped);
            }
        } catch (err) {
            console.error('Failed to load communities:', err);
        }
    };

    React.useEffect(() => {
        loadCommunities();
    }, []);

    const isSysAdmin = ['SYSADM', 'CADM'].includes(currentUser?.role) || ['System Administrator', 'HR Administrator', 'Community Administrator', 'System Admin'].includes(currentUser?.roleName);

    const handleDeleteCommunityCard = async (e, community) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete/remove "${community.name}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await communitiesApi.delete(community.id);
            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const updatedCustom = customList.filter(c => String(c.id) !== String(community.id));
            localStorage.setItem('knome_custom_communities', JSON.stringify(updatedCustom));
            setCommunities(prev => prev.filter(c => c.id !== community.id));
            alert(`Community "${community.name}" has been removed.`);
        } catch (err) {
            console.error('Failed to delete community:', err);
            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const updatedCustom = customList.filter(c => String(c.id) !== String(community.id));
            localStorage.setItem('knome_custom_communities', JSON.stringify(updatedCustom));
            setCommunities(prev => prev.filter(c => c.id !== community.id));
            alert(`Community "${community.name}" has been removed.`);
        }
    };

    const saveJoinedCommunity = async (community) => {
        try {
            await communitiesApi.join(community.id).catch(() => null);
        } catch (err) {
            console.error('Failed to join community via API:', err);
        }
        // FR-CM-09: Persist join to localStorage regardless of API success
        const newStatus = community.type === 'Private' ? 'Pending' : 'Approved';
        const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
        const existingJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
        if (!existingJoined.some(c => String(c.id) === String(community.id))) {
            existingJoined.push({
                id: community.id,
                name: community.name,
                status: newStatus === 'Approved' ? 'joined' : 'pending',
                joinedAt: new Date().toISOString()
            });
            localStorage.setItem(userKey, JSON.stringify(existingJoined));
        }
        setCommunities(prev => prev.map(c => c.id === community.id ? { 
            ...c, 
            membershipStatus: newStatus 
        } : c));
    };

    const handleCommunityCreated = (newCommunity) => {
        loadCommunities();
    };

    // Filter communities based on activeTab + search + type + category (FR-CM-09)
    const filteredCommunities = communities.filter(c => {
        // Tab filter
        if (activeTab === 'My Communities') {
            // FR-CM-06: Include joined (Approved), subscribed, and pending request communities
            const s = (c.membershipStatus || '').toLowerCase();
            if (!(s === 'approved' || s === 'joined' || s === 'subscribed' || s === 'pending')) return false;
        }
        if (activeTab === 'Knome (Org)') {
            if (!(c.type?.includes('Default') || c.type?.includes('Org'))) return false;
        }
        // Type filter
        if (filterType !== 'All') {
            if (filterType === 'Default (Org)') {
                if (!(c.type?.includes('Default') || c.type?.includes('Org'))) return false;
            } else if (!c.type?.toLowerCase().startsWith(filterType.toLowerCase())) return false;
        }
        // Category filter
        if (filterCategory !== 'All' && c.category && c.category !== filterCategory) return false;
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!c.name?.toLowerCase().includes(q) && !c.description?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-32">
                
                {/* Hero Header */}
                <div className="relative rounded-2xl overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-indigo-100/50 dark:from-indigo-900/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-indigo-400/10 dark:bg-indigo-500/10 blur-[80px] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col items-start max-w-3xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
                            ✨ Empowering MPOnline Teams
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-slate-900 dark:text-white" style={{ lineHeight: '1.2' }}>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">
                                Build & Grow Communities
                            </span>
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
                            Connect, share, and grow with specialized interest groups across the organization.
                        </p>
                    </div>
                    <div className="relative z-10 shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        {['SYSADM', 'HRADM', 'EMP'].includes(currentUser?.role || 'EMP') && (
                            <button 
                                onClick={() => setIsCreateOpen(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Create Community
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    {['Discover', 'My Communities', 'Knome (Org)'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 font-bold text-[14px] transition-colors relative ${activeTab === tab ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                    ))}
                </div>

                {/* Search + Type + Category Filter Bar (FR-CM-09) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search communities by name or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        )}
                    </div>

                    {/* Type Pills */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {['All', 'Public', 'Private', 'Default (Org)'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    filterType === t
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                                }`}
                            >
                                {t === 'Default (Org)' ? '🏢 Org' : t === 'Public' ? '🌐 Public' : t === 'Private' ? '🔒 Private' : '✨ All'}
                            </button>
                        ))}
                    </div>

                    {/* Category Dropdown */}
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                    >
                        <option value="All">All Categories</option>
                        <option>Technology</option>
                        <option>Product &amp; Design</option>
                        <option>Culture &amp; HR</option>
                        <option>Operations</option>
                        <option>Finance</option>
                        <option>Marketing</option>
                        <option>Leadership</option>
                    </select>

                    {/* Result count */}
                    {(searchQuery || filterType !== 'All' || filterCategory !== 'All') && (
                        <span className="text-[12px] text-slate-500 font-bold shrink-0">
                            {filteredCommunities.length} result{filteredCommunities.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCommunities.map(community => (
                        <div key={community.id} onClick={() => navigate(`/community/view?id=${community.id}`)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
                            <div className="h-32 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                                <img src={community.banner} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-slate-900/10"></div>
                                {isSysAdmin && (
                                    <button 
                                        onClick={(e) => handleDeleteCommunityCard(e, community)}
                                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all hover:scale-110 z-10 cursor-pointer"
                                        title="Remove Community (System Admin)"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                )}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2.5 py-1 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                        community.type === 'Private' ? 'bg-amber-500/90 text-white border-amber-400' :
                                        community.type === 'Public' ? 'bg-white/90 text-indigo-600 border-white/50' :
                                        'bg-purple-500/90 text-white border-purple-400'
                                    }`}>
                                        {community.type}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-[16px] text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors leading-tight">
                                        {community.name}
                                    </h3>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* FR-CM-01/FR-CM-09: Card action buttons */}
                                        {(community.type?.toLowerCase().includes('default') || community.type?.toLowerCase().includes('org')) ? (
                                            // Default (Org) — always auto-subscribed
                                            community.membershipStatus === 'Approved' ? (
                                                <button onClick={(e) => e.stopPropagation()} className="px-3 py-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg font-bold text-[11px] cursor-default">Joined</button>
                                            ) : (
                                                <button onClick={(e) => e.stopPropagation()} className="px-3 py-1 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg font-bold text-[11px] cursor-default flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
                                                    Subscribed
                                                </button>
                                            )
                                        ) : community.type === 'Public' ? (
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (community.membershipStatus !== 'Approved') {
                                                    saveJoinedCommunity(community);
                                                }
                                            }} className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${community.membershipStatus === 'Approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default' : community.membershipStatus === 'Subscribed' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-indigo-100 cursor-pointer' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer'}`}>
                                                {community.membershipStatus === 'Approved' ? 'Joined' : community.membershipStatus === 'Subscribed' ? 'Upgrade →' : 'Join'}
                                            </button>
                                        ) : community.type === 'Private' ? (
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (community.membershipStatus !== 'Pending' && community.membershipStatus !== 'Approved') {
                                                    saveJoinedCommunity(community);
                                                }
                                            }} className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${community.membershipStatus === 'Pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 cursor-default' : community.membershipStatus === 'Approved' ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'}`}>
                                                {community.membershipStatus === 'Pending' ? 'Requested' : community.membershipStatus === 'Approved' ? 'Joined' : 'Request'}
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); }} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg font-bold text-[11px] cursor-default">Subscribed</button>
                                        )}
                                    </div>
                                </div>

                                <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed mb-4 flex-1">
                                    {community.description}
                                </p>

                                <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[12px]">
                                        <span className="material-symbols-outlined text-[16px]">group</span>
                                        {community.members}
                                    </div>
                                    {community.category && (
                                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{community.category}</span>
                                    )}
                                    <div className={`flex items-center gap-1.5 font-bold text-[12px] ml-auto ${community.type === 'Public' ? 'text-teal-500' : 'text-slate-500'}`}>
                                        <span className="material-symbols-outlined text-[16px]">{community.type === 'Public' ? 'trending_up' : 'forum'}</span>
                                        {community.activity}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </main>

            <CreateCommunityModal 
                isOpen={isCreateOpen} 
                onClose={() => setIsCreateOpen(false)} 
                onCommunityCreated={handleCommunityCreated}
            />
        </>
    );
}
