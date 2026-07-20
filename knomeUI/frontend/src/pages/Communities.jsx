import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import CreateCommunityModal from '../components/modals/CreateCommunityModal';

export default function Communities() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Discover');
    const [joinedStatus, setJoinedStatus] = useState({});

    const [communities, setCommunities] = useState([
        {
            id: 1,
            name: 'Engineering Excellence',
            type: 'Public',
            members: '1.2k',
            activity: 'High',
            description: 'Sharing best practices, architectural patterns, and scaling strategies across our core services.',
            banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600&h=300'
        },
        {
            id: 2,
            name: 'Product Design Guild',
            type: 'Private',
            members: '458',
            activity: '12 new posts',
            description: 'Central hub for design systems, UX research, and accessibility standards within Knome.',
            banner: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=600&h=300'
        },
        {
            id: 3,
            name: 'HR & Culture',
            type: 'Default (Org)',
            members: '5.4k',
            activity: 'Default',
            description: 'Global announcements, HR policies, and discussions regarding workplace culture.',
            banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300'
        },
        {
            id: 4,
            name: 'AI Innovators',
            type: 'Public',
            members: '890',
            activity: 'Medium',
            description: 'Exploring generative AI use cases, internal LLM tooling, and industry breakthroughs.',
            banner: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600&h=300'
        }
    ]);

    const handleCommunityCreated = (newCommunity) => {
        setCommunities([newCommunity, ...communities]);
    };

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-32">
                
                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Communities</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Connect, share, and grow with specialized interest groups.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filter
                        </button>
                        {['SYSADM', 'HRADM', 'EMP'].includes(currentUser.role) && (
                            <button 
                                onClick={() => setIsCreateOpen(true)}
                                className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2"
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
                                            <button onClick={(e) => { e.stopPropagation(); setJoinedStatus(prev => ({...prev, [community.id]: 'Joined'})) }} className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${joinedStatus[community.id] === 'Joined' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}>
                                                {joinedStatus[community.id] === 'Joined' ? 'Joined' : 'Join'}
                                            </button>
                                        ) : community.type === 'Private' ? (
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (joinedStatus[community.id] !== 'Requested') {
                                                    setJoinedStatus(prev => ({...prev, [community.id]: 'Requested'}));
                                                    window.dispatchEvent(new CustomEvent('community-join-request', {
                                                        detail: { communityName: community.name, requestedBy: currentUser.name }
                                                    }));
                                                }
                                            }} className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${joinedStatus[community.id] === 'Requested' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                                {joinedStatus[community.id] === 'Requested' ? 'Requested' : 'Request'}
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
