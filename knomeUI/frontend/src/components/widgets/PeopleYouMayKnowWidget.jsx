import React, { useState, useEffect } from 'react';
import { useUser, users } from '../contexts/UserContext';
import { userApi, resolveMediaUrl } from '../../utils/apiService';
import { useNavigate } from 'react-router-dom';

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
    'from-blue-600 to-indigo-600',
    'from-indigo-600 to-purple-600',
    'from-purple-600 to-pink-600',
    'from-emerald-600 to-teal-600',
    'from-cyan-600 to-blue-600',
    'from-amber-600 to-rose-600'
];

function getAvatarGradient(name) {
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function UserAvatarBadge({ avatar, name, size = 'w-9 h-9', textSize = 'text-xs' }) {
    const [imgFailed, setImgFailed] = useState(false);
    const resolved = resolveMediaUrl(avatar);

    if (!resolved || imgFailed) {
        return (
            <div 
                className={`${size} rounded-full bg-gradient-to-tr ${getAvatarGradient(name)} text-white font-black ${textSize} flex items-center justify-center shrink-0 shadow-xs border-2 border-white dark:border-slate-800 tracking-tight uppercase select-none`}
            >
                {getInitials(name)}
            </div>
        );
    }

    return (
        <img 
            src={resolved} 
            alt="" 
            onError={() => setImgFailed(true)}
            className={`${size} rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-800 shadow-xs`} 
        />
    );
}

export default function PeopleYouMayKnowWidget() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [people, setPeople] = useState([]);

    const loadStatus = () => {
        const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
        const userRelations = storedRelations[currentUser?.employeeId] || {};
        
        setPeople(prev => prev.map(p => ({
            ...p,
            status: userRelations[p.id] || p.status || 'none'
        })));
    };

    useEffect(() => {
        if (!currentUser) return;
        let isMounted = true;

        const loadPeople = async () => {
            const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
            const userRelations = storedRelations[currentUser.employeeId] || {};

            try {
                const res = await userApi.getSuggestions();
                const list = Array.isArray(res) ? res : (res?.data || []);
                const filtered = list
                    .filter(u => String(u.id || u.userId) !== String(currentUser.userId || currentUser.id))
                    .slice(0, 3)
                    .map(u => ({
                        id: u.employeeId || String(u.id || u.userId),
                        userId: u.id || u.userId,
                        name: u.name || u.fullName,
                        role: u.role || u.designation || 'Employee',
                        avatar: u.avatar || u.profilePhotoUrl,
                        mutual: u.mutualConnections || (Math.floor(Math.random() * 5) + 1),
                        status: userRelations[u.employeeId || String(u.id)] || 'none'
                    }));

                if (isMounted && filtered.length > 0) {
                    setPeople(filtered);
                    return;
                }
            } catch (e) {
                // fallback to local roster
            }

            const fallback = users
                .filter(u => u.employeeId !== currentUser.employeeId && u.isActive)
                .slice(0, 3)
                .map(u => ({
                    id: u.employeeId,
                    userId: u.id || u.userId,
                    name: u.name || u.fullName,
                    role: u.designation || 'Employee',
                    avatar: u.avatar,
                    mutual: Math.floor(Math.random() * 8) + 1,
                    status: userRelations[u.employeeId] || 'none'
                }));
            if (isMounted) setPeople(fallback);
        };

        loadPeople();

        return () => { isMounted = false; };
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

    const handleFollowClick = async (person) => {
        if (person.status !== 'none') return;

        // Optimistic UI update
        const storedRelations = JSON.parse(localStorage.getItem('knome_user_relations') || '{}');
        if (!storedRelations[currentUser?.employeeId]) storedRelations[currentUser?.employeeId] = {};
        storedRelations[currentUser?.employeeId][person.id] = 'requested';
        localStorage.setItem('knome_user_relations', JSON.stringify(storedRelations));
        loadStatus();

        // Send connection request via userApi if numeric userId is available
        if (person.userId) {
            try {
                await userApi.connect(person.userId);
            } catch (err) {
                // silent
            }
        }

        // Dispatch follow request for notifications
        window.dispatchEvent(new CustomEvent('follow-request', {
            detail: {
                targetUserId: person.id,
                targetUserName: person.name,
                requestedUserId: currentUser?.employeeId || 'guest',
                requestedBy: currentUser?.name || 'A user'
            }
        }));
    };

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
                        <div 
                            onClick={() => person.userId && navigate(`/profile/${person.userId}`)}
                            className="cursor-pointer hover:scale-105 transition-transform shrink-0"
                        >
                            <UserAvatarBadge avatar={person.avatar} name={person.name} />
                        </div>
                        <div 
                            onClick={() => person.userId && navigate(`/profile/${person.userId}`)}
                            className="flex-1 min-w-0 cursor-pointer"
                        >
                            <p className="text-[13px] font-bold truncate hover:text-blue-500 transition-colors" style={{color: 'var(--text-primary)'}}>
                                {person.name}
                            </p>
                            <p className="text-[11px] truncate" style={{color: 'var(--text-muted)'}}>
                                {person.role} · {person.mutual} mutual
                            </p>
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
