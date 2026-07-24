import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import CreateCommunityModal from '../components/modals/CreateCommunityModal';
import { communitiesApi } from '../utils/apiService';

export default function Communities() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Discover');
    const [joinedStatus, setJoinedStatus] = useState({});

    const [communities, setCommunities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadCommunities = async () => {
        setIsLoading(true);
        try {
            const data = await communitiesApi.getAll();
            if (data && Array.isArray(data)) {
                const mapped = data.map(c => ({
                    id: c.communityId,
                    name: c.name,
                    type: c.communityType,
                    members: c.membersCount,
                    activity: `${c.postsCount} posts`,
                    description: c.description || 'No description provided.',
                    banner: c.bannerUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300',
                    membershipStatus: c.currentUserMembershipStatus
                }));
                setCommunities(mapped);
            }
        } catch (err) {
            console.error('Failed to load communities:', err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        loadCommunities();
    }, []);

    const saveJoinedCommunity = async (community) => {
        try {
            await communitiesApi.join(community.id);
            loadCommunities(); // Refresh list to get updated membership status
        } catch (err) {
            console.error('Failed to join community:', err);
        }
    };

    const handleCommunityCreated = (newCommunity) => {
        loadCommunities();
    };

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-32">
                
                {/* Hero Header */}
                <div className="relative rounded-2xl overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-indigo-100/50 dark:from-indigo-900/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-indigo-400/10 dark:bg-indigo-500/10 blur-[80px] pointer-events-none"></div>
                    <div className="absolute top-[35%] left-0 w-[60%] h-[1px] bg-gradient-to-r from-indigo-300/40 dark:from-indigo-400/20 to-transparent"></div>
                    <div className="absolute top-[50%] left-0 w-[40%] h-[2px] bg-gradient-to-r from-blue-300/40 dark:from-blue-400/20 to-transparent blur-[1px]"></div>
                    <div className="absolute top-[65%] left-0 w-[50%] h-[1px] bg-gradient-to-r from-cyan-300/40 dark:from-cyan-400/20 to-transparent"></div>
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
                        <button className="w-full sm:w-auto px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filter
                        </button>
                        {['SYSADM', 'HRADM', 'EMP'].includes(currentUser.role) && (
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

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {communities.map(community => (
                        <div key={community.id} onClick={() => navigate('/community')} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
                            <div className="h-32 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                                <img src={community.banner} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-slate-900/10"></div>
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
                                        {community.type === 'Public' ? (
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (community.membershipStatus !== 'Approved') {
                                                    saveJoinedCommunity(community);
                                                }
                                            }} className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${community.membershipStatus === 'Approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}>
                                                {community.membershipStatus === 'Approved' ? 'Joined' : 'Join'}
                                            </button>
                                        ) : community.type === 'Private' ? (
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (community.membershipStatus !== 'Pending' && community.membershipStatus !== 'Approved') {
                                                    saveJoinedCommunity(community);
                                                }
                                            }} className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${community.membershipStatus === 'Pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : community.membershipStatus === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
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
                                    <div className={`flex items-center gap-1.5 font-bold text-[12px] ${community.type === 'Public' ? 'text-teal-500' : 'text-slate-500'}`}>
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
