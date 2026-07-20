import React, { useState } from 'react';
import { useUser } from '../components/contexts/UserContext';

export default function Network() {
    const { currentUser } = useUser();
    
    // Manage following state locally for prototype (FR-PN-01, FR-PN-04)
    const [followedIds, setFollowedIds] = useState(new Set([2, 4]));
    const [searchQuery, setSearchQuery] = useState('');

    const toggleFollow = (id) => {
        setFollowedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const mockPeople = [
        {
            id: 1,
            name: 'Vishendra Sharma',
            role: 'CADM',
            department: 'Engineering',
            avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
            mutualConnections: 12,
            commonCommunities: 3,
            isSuggested: true,
            reason: 'Works in Engineering'
        },
        {
            id: 2,
            name: 'Meghna Tiwari',
            role: 'Lead Engineer',
            department: 'Engineering',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            mutualConnections: 24,
            commonCommunities: 5,
            isSuggested: true,
            reason: '24 Mutual Connections'
        },
        {
            id: 3,
            name: 'Sourabh Sahu',
            role: 'HRADM',
            department: 'Human Resources',
            avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
            mutualConnections: 2,
            commonCommunities: 1,
            isSuggested: false,
            reason: ''
        },
        {
            id: 4,
            name: 'Rishikesh Ugle',
            role: 'Senior DevOps',
            department: 'Engineering',
            avatar: 'https://randomuser.me/api/portraits/men/33.jpg',
            mutualConnections: 18,
            commonCommunities: 4,
            isSuggested: true,
            reason: 'Common Community: DevOps Guild'
        },
        {
            id: 5,
            name: 'Mayur Verma',
            role: 'Data Analyst',
            department: 'Data Science',
            avatar: 'https://randomuser.me/api/portraits/men/44.jpg',
            mutualConnections: 8,
            commonCommunities: 2,
            isSuggested: true,
            reason: 'Similar Skills: Python, SQL'
        },
        {
            id: 6,
            name: 'Loveneesh Sharma',
            role: 'SYSADM',
            department: 'IT Operations',
            avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
            mutualConnections: 5,
            commonCommunities: 1,
            isSuggested: false,
            reason: ''
        }
    ];

    const suggestedPeople = mockPeople.filter(p => p.isSuggested);
    const allFiltered = mockPeople.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.department.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <main className="flex-1 flex flex-col gap-8 pb-32 min-w-0">
            
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">People Network</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Connect with colleagues across Knome.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or department..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all" 
                    />
                </div>
            </header>

            {!searchQuery && (
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-amber-500 text-[24px]">magic_button</span>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">People You May Know</h2>
                    </div>
                    
                    {/* Horizontal Scroll Carousel (FR-PN-02) */}
                    <div className="flex overflow-x-auto custom-scrollbar pb-4 gap-6 -mx-4 px-4 md:mx-0 md:px-0">
                        {suggestedPeople.map(person => (
                            <PersonCard 
                                key={`sug-${person.id}`} 
                                person={person} 
                                isFollowing={followedIds.has(person.id)} 
                                onToggle={() => toggleFollow(person.id)}
                                isSuggestion={true}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section>
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-indigo-500 text-[24px]">contacts</span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Directory</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allFiltered.map(person => (
                        <PersonCard 
                            key={`dir-${person.id}`} 
                            person={person} 
                            isFollowing={followedIds.has(person.id)} 
                            onToggle={() => toggleFollow(person.id)}
                            isSuggestion={false}
                        />
                    ))}
                    {allFiltered.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            No colleagues found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </section>

        </main>
    );
}

function PersonCard({ person, isFollowing, onToggle, isSuggestion }) {
    return (
        <div className={`group glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center shadow-sm relative ${isSuggestion ? 'w-[260px] shrink-0' : 'w-full'}`}>
            
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-slate-100 dark:border-slate-800 shadow-lg">
                <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
            </div>
            
            <h3 className="font-bold text-[16px] text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors leading-tight mb-1">{person.name}</h3>
            <p className="text-[12px] font-bold text-slate-500 mb-0.5">{person.role}</p>
            <p className="text-[11px] text-slate-400 mb-4">{person.department}</p>
            
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 mb-5">
                <div className="flex flex-col items-center">
                    <span className="text-slate-900 dark:text-white text-[14px]">{person.mutualConnections}</span>
                    Mutuals
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex flex-col items-center">
                    <span className="text-slate-900 dark:text-white text-[14px]">{person.commonCommunities}</span>
                    Groups
                </div>
            </div>
            
            {isSuggestion && person.reason && (
                <div className="mb-5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lightbulb</span>
                    {person.reason}
                </div>
            )}
            
            <button 
                onClick={onToggle}
                className={`w-full py-2.5 rounded-xl font-bold text-[13px] transition-all duration-300 flex items-center justify-center gap-2 mt-auto ${isFollowing ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 hover:scale-[1.02]'}`}
            >
                {isFollowing ? (
                    <>
                        <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                        Following
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Follow
                    </>
                )}
            </button>
        </div>
    );
}
