import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const DEFAULT_JOINED = [];

export default function MyCommunitiesWidget() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [joinedCommunities, setJoinedCommunities] = useState([]);

    const loadJoinedCommunities = () => {
        // 1. Specific user joined communities
        const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
        const userStored = JSON.parse(localStorage.getItem(userKey) || '[]');
        
        // 2. Global joined communities (fallback)
        const globalJoined = JSON.parse(localStorage.getItem('knome_joined_communities') || '[]');

        // 3. Custom created communities
        const customCreated = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');

        // Merge all sources
        const combined = [...userStored, ...globalJoined, ...customCreated, ...DEFAULT_JOINED];

        // Unique by id or name
        const unique = [];
        const seen = new Set();
        for (const item of combined) {
            const identifier = item.id || item.name;
            if (!seen.has(identifier)) {
                seen.add(identifier);
                unique.push(item);
            }
        }

        setJoinedCommunities(unique);
    };

    useEffect(() => {
        loadJoinedCommunities();

        const handleJoinedChange = () => loadJoinedCommunities();
        window.addEventListener('community-joined-change', handleJoinedChange);
        window.addEventListener('storage', handleJoinedChange);
        return () => {
            window.removeEventListener('community-joined-change', handleJoinedChange);
            window.removeEventListener('storage', handleJoinedChange);
        };
    }, [currentUser?.id]);

    return (
        <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-indigo-500" style={{fontVariationSettings:"'FILL' 1"}}>groups</span>
                    My Joined Communities
                </h3>
                <Link to="/communities" className="text-[11px] font-bold text-indigo-500 hover:underline">
                    + Discover
                </Link>
            </div>

            <div className="flex flex-col gap-3">
                {joinedCommunities.map((community, idx) => (
                    <div 
                        key={community.id ? `${community.id}-${idx}` : `${community.name}-${idx}`}
                        onClick={() => navigate(`/community/view?id=${community.id || 101}`)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group"
                    >
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 relative">
                            <img 
                                src={community.banner || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=150&h=150'} 
                                alt={community.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 bg-slate-200" 
                                onError={(e) => { 
                                    e.target.onerror = null; 
                                    e.target.src = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=150&h=150'; 
                                }}
                            />
                            <div className="absolute inset-0 bg-slate-900/10"></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 transition-colors">
                                {community.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">group</span>
                                {(() => {
                                    const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${community.id}`) || '[]');
                                    const count = localMembers.length > 0 ? localMembers.length : (parseInt(community.members) || 1);
                                    return `${count} ${count === 1 ? 'member' : 'members'}`;
                                })()} · <span className="text-emerald-500 font-bold">Joined</span>
                            </p>
                        </div>

                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all">
                            chevron_right
                        </span>
                    </div>
                ))}

                {joinedCommunities.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                        You haven't joined any communities yet.
                    </div>
                )}
            </div>
        </div>
    );
}
