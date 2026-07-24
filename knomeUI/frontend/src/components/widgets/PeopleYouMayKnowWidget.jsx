import React, { useState, useEffect } from 'react';
import { useUser, users } from '../contexts/UserContext';

export default function PeopleYouMayKnowWidget() {
    const { currentUser } = useUser();
    
    // Map exported mock users, filter out current user, limit to 3
    const [people, setPeople] = useState([]);

    const loadStatus = () => {
        const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
        const userRelations = storedRelations[currentUser?.employeeId] || {};
        
        setPeople(prev => prev.map(p => ({
            ...p,
            status: userRelations[p.id] || 'none'
        })));
    };

    useEffect(() => {
        if (currentUser) {
            const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
            const userRelations = storedRelations[currentUser.employeeId] || {};

            const others = users
                .filter(u => u.employeeId !== currentUser.employeeId)
                .slice(0, 3)
                .map(u => ({
                    id: u.employeeId,
                    name: u.name,
                    role: u.designation,
                    avatar: u.avatar,
                    mutual: Math.floor(Math.random() * 10) + 1,
                    status: userRelations[u.employeeId] || 'none'
                }));
            setPeople(others);
        }
    }, [currentUser]);


    useEffect(() => {
        loadStatus();
        
        const handleFollowApproved = (e) => {
            const { targetUserId, requestedUserId } = e.detail;
            if (requestedUserId === currentUser?.employeeId) {
                const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
                if (!storedRelations[currentUser?.employeeId]) storedRelations[currentUser?.employeeId] = {};
                storedRelations[currentUser?.employeeId][targetUserId] = 'following';
                localStorage.setItem('knome_user_relations', JSON.stringify(storedRelations));
                loadStatus();
            }
        };

        window.addEventListener('follow-request-approved', handleFollowApproved);
        window.addEventListener('storage', loadStatus);
        return () => {
            window.removeEventListener('follow-request-approved', handleFollowApproved);
            window.removeEventListener('storage', loadStatus);
        };
    }, [currentUser]);

    const handleFollowClick = (person) => {
        if (person.status !== 'none') return; // Cannot click if requested or following

        // Optimistic UI update
        const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
        if (!storedRelations[currentUser?.employeeId]) storedRelations[currentUser?.employeeId] = {};
        storedRelations[currentUser?.employeeId][person.id] = 'requested';
        localStorage.setItem('knome_user_relations', JSON.stringify(storedRelations));
        loadStatus();

        // Dispatch follow request
        window.dispatchEvent(new CustomEvent('follow-request', {
            detail: {
                targetUserId: person.id,
                targetUserName: person.name,
                requestedUserId: currentUser?.employeeId || 'guest',
                requestedBy: currentUser?.name || 'A user'
            }
        }));
    };

    // Filter out the current user from the list
    const visiblePeople = people.filter(p => p.id !== currentUser?.employeeId).slice(0, 3);

    return (
        <div className="rounded-2xl p-5"
            style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
            <h3 className="text-[14px] font-black mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                <span className="material-symbols-outlined text-[18px] text-pink-500" style={{fontVariationSettings:"'FILL' 1"}}>group_add</span>
                People You May Know
            </h3>
            <div className="flex flex-col gap-3">
                {visiblePeople.map(person => (
                    <div key={person.id} className="flex items-center gap-3">
                        <img src={person.avatar} alt={person.name} className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-800 shadow-sm" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold truncate" style={{color: 'var(--text-primary)'}}>{person.name}</p>
                            <p className="text-[11px] truncate" style={{color: 'var(--text-muted)'}}>{person.role} · {person.mutual} mutual</p>
                        </div>
                        <button 
                            onClick={() => handleFollowClick(person)}
                            className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                            style={{
                                background: person.status !== 'none' ? 'transparent' : '#6366f115', 
                                color: person.status !== 'none' ? 'var(--text-muted)' : '#6366f1', 
                                border: person.status !== 'none' ? '1px solid var(--border-subtle)' : '1px solid #6366f130',
                                cursor: person.status !== 'none' ? 'default' : 'pointer'
                            }}>
                            {person.status === 'following' ? 'Following' : person.status === 'requested' ? 'Requested' : '+ Follow'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
