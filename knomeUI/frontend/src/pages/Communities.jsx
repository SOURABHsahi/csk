import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import CreateCommunityModal from '../components/modals/CreateCommunityModal';
import { communitiesApi, getCommunityImages, resolveMediaUrl } from '../utils/apiService';

const defaultSeeds = [
    { id: 101, name: 'DotNet Developers Community', category: 'Technology', type: 'Public', members: '12 members', activity: '14 posts', description: 'Collaborative space for DotNet & C# engineering teams across MPOnline.', banner: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 109, name: 'Executive AI & Data Labs', category: 'Technology', type: 'Private', members: '1 member', activity: 'New', description: 'Exclusive private community for AI research, LLM architecture, and enterprise data science leadership.', banner: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 107, name: 'Fullstack Engineering Guild', category: 'Technology', type: 'Public', members: '1 member', activity: 'New', description: 'Test Public Community created for fullstack engineering teams to test joining, discussions, and live member tracking.', banner: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 108, name: 'AI & Data Science Innovation Lab', category: 'Technology', type: 'Private', members: '3 members', activity: '5 posts', description: 'Test Private Community requiring Community Admin approval for join requests.', banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 102, name: 'Technology & Architecture Hub', category: 'Technology', type: 'Default (Org)', members: '84 members', activity: '32 posts', description: 'Official Organization Technology channel auto-subscribed for all tech employees.', banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 103, name: 'HR & People Operations', category: 'Culture & HR', type: 'Default (Org)', members: '120 members', activity: '45 posts', description: 'Central HR announcements, policy updates, and employee engagement.', banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 104, name: 'Finance & Accounting Operations', category: 'Finance', type: 'Default (Org)', members: '45 members', activity: '19 posts', description: 'Finance guidelines, travel reimbursement procedures, and budget updates.', banner: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 105, name: 'Marketing & Brand Strategy', category: 'Marketing', type: 'Public', members: '28 members', activity: '8 posts', description: 'Brand assets, event promotions, and internal marketing initiatives.', banner: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' },
    { id: 106, name: 'CTO Leadership & Strategy Circle', category: 'Leadership', type: 'Private', members: '6 members', activity: '5 posts', description: 'Private discussion channel for CTO leadership and technical directors.', banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800&h=400', membershipStatus: 'none' }
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
        const imgs = getCommunityImages(c.name, c.category);
        return {
            id: c.id,
            name: c.name,
            type: c.type || 'Public',
            category: c.category || 'General',
            members: `${count} ${count === 1 ? 'member' : 'members'}`,
            activity: 'New',
            description: c.description || 'A new community created for MPOnline teams.',
            banner: resolveMediaUrl(c.banner) || imgs.banner,
            thumbnail: resolveMediaUrl(c.thumbnail) || imgs.thumbnail,
            membershipStatus: getStatus(c.id, c.type)
        };
    });

    const seedsMapped = defaultSeeds.map(s => {
        const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${s.id}`) || '[]');
        const count = localMembers.length > 0 ? localMembers.length : (parseInt(s.members) || 1);
        const imgs = getCommunityImages(s.name, s.category);
        return {
            ...s,
            members: `${count} ${count === 1 ? 'member' : 'members'}`,
            banner: resolveMediaUrl(s.banner) || imgs.banner,
            thumbnail: resolveMediaUrl(s.thumbnail) || imgs.thumbnail,
            membershipStatus: getStatus(s.id, s.type)
        };
    });

    return [...customMapped, ...seedsMapped];
};

export default function Communities() {
    const { currentUser, users } = useUser();
    const navigate = useNavigate();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Discover');

    const [communities, setCommunities] = useState(() => getInitialCommunities(currentUser?.id));
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [approvalSuccessMsg, setApprovalSuccessMsg] = useState('');

    const isHRorAdmin = ['SYSADM', 'HRADM', 'CADM'].includes(currentUser?.role) || 
        ['System Administrator', 'HR Administrator', 'Community Administrator', 'HR Manager', 'System Admin'].includes(currentUser?.roleName) ||
        (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'HRADM', 'CADM', 'System Administrator', 'HR Administrator', 'Community Administrator'].includes(r)));

    const loadPendingApprovals = () => {
        try {
            const list = JSON.parse(localStorage.getItem('knome_pending_community_approvals') || '[]');
            setPendingApprovals(list);
        } catch (e) {
            setPendingApprovals([]);
        }
    };

    const loadCommunities = async () => {
        loadPendingApprovals();
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

            let combinedList = [];
            const existingNames = new Set();
            const existingIds = new Set();

            if (data && Array.isArray(data) && data.length > 0) {
                const apiMapped = data.map(c => {
                    const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${c.communityId}`) || '[]');
                    const count = localMembers.length > 0 ? localMembers.length : (c.membersCount || 1);
                    const imgs = getCommunityImages(c.name, c.categoryName);
                    const bannerResolved = resolveMediaUrl(c.bannerUrl || c.bannerImageUrl) || imgs.banner;
                    const thumbResolved = resolveMediaUrl(c.thumbnailUrl) || imgs.thumbnail;
                    existingNames.add((c.name || '').toLowerCase().trim());
                    existingIds.add(String(c.communityId));
                    return {
                        id: c.communityId,
                        name: c.name,
                        type: c.communityType || 'Public',
                        category: c.categoryName || 'General',
                        members: `${count} ${count === 1 ? 'member' : 'members'}`,
                        activity: `${c.postsCount || 0} posts`,
                        description: c.description || 'No description provided.',
                        banner: bannerResolved,
                        thumbnail: thumbResolved,
                        membershipStatus: getStatus(c.communityId, c.currentUserMembershipStatus, c.communityType)
                    };
                });
                combinedList.push(...apiMapped);
            }

            // Merge Custom Created Communities
            const custom = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            custom.forEach(c => {
                const cleanName = (c.name || '').toLowerCase().trim();
                if (!existingIds.has(String(c.id)) && !existingNames.has(cleanName)) {
                    const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${c.id}`) || '[]');
                    const count = localMembers.length > 0 ? localMembers.length : (parseInt(c.members) || 1);
                    const imgs = getCommunityImages(c.name, c.category);
                    existingNames.add(cleanName);
                    existingIds.add(String(c.id));
                    combinedList.unshift({
                        id: c.id,
                        name: c.name,
                        type: c.type || 'Public',
                        category: c.category || 'General',
                        members: `${count} ${count === 1 ? 'member' : 'members'}`,
                        activity: 'New',
                        description: c.description || 'A new community created for MPOnline teams.',
                        banner: resolveMediaUrl(c.banner) || imgs.banner,
                        thumbnail: resolveMediaUrl(c.thumbnail) || imgs.thumbnail,
                        membershipStatus: getStatus(c.id, null, c.type)
                    });
                }
            });

            // Merge Default Seed Communities so all project communities are ALWAYS visible
            defaultSeeds.forEach(s => {
                const cleanName = (s.name || '').toLowerCase().trim();
                if (!existingIds.has(String(s.id)) && !existingNames.has(cleanName)) {
                    const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${s.id}`) || '[]');
                    const count = localMembers.length > 0 ? localMembers.length : (parseInt(s.members) || 1);
                    const imgs = getCommunityImages(s.name, s.category);
                    existingNames.add(cleanName);
                    existingIds.add(String(s.id));
                    combinedList.push({
                        ...s,
                        members: `${count} ${count === 1 ? 'member' : 'members'}`,
                        banner: resolveMediaUrl(s.banner) || imgs.banner,
                        thumbnail: resolveMediaUrl(s.thumbnail) || imgs.thumbnail,
                        membershipStatus: getStatus(s.id, null, s.type)
                    });
                }
            });

            if (combinedList.length > 0) {
                setCommunities(combinedList);
            }
        } catch (err) {
            console.error('Failed to load communities:', err);
        }
    };

    React.useEffect(() => {
        loadCommunities();

        // Check if navigated with ?tab=Approvals
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'Approvals' && isHRorAdmin) {
            setActiveTab('Pending Approvals');
        }

        const handleApprovalRequested = () => {
            loadPendingApprovals();
        };

        window.addEventListener('community-approval-requested', handleApprovalRequested);
        window.addEventListener('storage', loadPendingApprovals);
        return () => {
            window.removeEventListener('community-approval-requested', handleApprovalRequested);
            window.removeEventListener('storage', loadPendingApprovals);
        };
    }, [isHRorAdmin]);

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

    // ── HR APPROVAL HANDLERS ────────────────────────────────────
    const handleApproveCommunity = (e, comm) => {
        e.stopPropagation();
        const approvedComm = {
            ...comm,
            status: 'Approved',
            isApproved: true,
            approvedBy: currentUser?.name || 'HR Administrator',
            approvedAt: new Date().toISOString()
        };

        // 1. Remove from pending approvals
        const currentPending = JSON.parse(localStorage.getItem('knome_pending_community_approvals') || '[]');
        const updatedPending = currentPending.filter(p => String(p.id) !== String(comm.id));
        localStorage.setItem('knome_pending_community_approvals', JSON.stringify(updatedPending));
        setPendingApprovals(updatedPending);

        // 2. Add to active custom communities
        const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
        const updatedCustom = [approvedComm, ...customList.filter(c => String(c.id) !== String(comm.id))];
        localStorage.setItem('knome_custom_communities', JSON.stringify(updatedCustom));

        // 3. Auto-join creator as admin
        const creatorKey = `knome_joined_communities_${comm.creatorUserId || 'guest'}`;
        const creatorJoined = JSON.parse(localStorage.getItem(creatorKey) || '[]');
        localStorage.setItem(creatorKey, JSON.stringify([
            { id: comm.id, name: comm.name, status: 'joined', joinedAt: new Date().toISOString() },
            ...creatorJoined.filter(c => String(c.id) !== String(comm.id))
        ]));

        // 4. Create community members list with creator as Admin
        const creatorMember = {
            userId: comm.creatorUserId || 1,
            fullName: comm.creatorName || 'Employee',
            employeeId: comm.creatorEmployeeId || 'MPO100',
            designation: 'Community Creator / Admin',
            memberType: 'Admin',
            status: 'Approved',
            profilePhotoUrl: comm.creatorAvatar
        };
        const memberList = [creatorMember];

        // 5. Send approval celebration notification to the employee creator
        const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
        const approvalNotif = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            targetUserId: comm.creatorUserId,
            category: 'Community',
            type: 'community_approved',
            icon: 'verified',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            text: `🎉 Great news! Your community "${comm.name}" has been approved by HR Administrator (${currentUser?.name || 'HR Admin'}) and is now live!`,
            message: `🎉 Great news! Your community "${comm.name}" has been approved by HR Administrator (${currentUser?.name || 'HR Admin'}) and is now live!`,
            senderName: currentUser?.name || 'HR Administrator',
            senderAvatar: currentUser?.avatar || null,
            time: 'Just now',
            unread: true,
            communityName: comm.name,
            communityId: comm.id,
            actionLink: `/community/view?id=${comm.id}`
        };

        // Also invite any pre-selected users
        const inviteNotifs = (comm.invitedUserIds || []).map(tId => ({
            id: Date.now() + Math.floor(Math.random() * 10000),
            targetUserId: tId,
            category: 'Community',
            type: 'invite',
            icon: 'group_add',
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            text: `${comm.creatorName || 'An employee'} invited you to join the approved community "${comm.name}".`,
            senderName: comm.creatorName || 'An employee',
            senderAvatar: comm.creatorAvatar || null,
            time: 'Just now',
            unread: true,
            communityName: comm.name,
            communityId: comm.id,
            actionLink: `/community/view?id=${comm.id}`
        }));

        localStorage.setItem('knome_notifications', JSON.stringify([approvalNotif, ...inviteNotifs, ...existingNotifs]));
        localStorage.setItem(`knome_community_members_${comm.id}`, JSON.stringify(memberList));

        window.dispatchEvent(new CustomEvent('knome_notification_received', { detail: approvalNotif }));
        window.dispatchEvent(new CustomEvent('community-joined-change'));

        setApprovalSuccessMsg(`✨ "${comm.name}" has been approved & published live!`);
        setTimeout(() => setApprovalSuccessMsg(''), 4000);
        loadCommunities();
    };

    const handleRejectCommunity = (e, comm) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to reject the community creation request for "${comm.name}"?`)) {
            return;
        }

        // 1. Remove from pending
        const currentPending = JSON.parse(localStorage.getItem('knome_pending_community_approvals') || '[]');
        const updatedPending = currentPending.filter(p => String(p.id) !== String(comm.id));
        localStorage.setItem('knome_pending_community_approvals', JSON.stringify(updatedPending));
        setPendingApprovals(updatedPending);

        // 2. Remove from creator's pending list
        const creatorKey = `knome_joined_communities_${comm.creatorUserId || 'guest'}`;
        const creatorJoined = JSON.parse(localStorage.getItem(creatorKey) || '[]');
        localStorage.setItem(creatorKey, JSON.stringify(creatorJoined.filter(c => String(c.id) !== String(comm.id))));

        // 3. Notify creator
        const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
        const rejectNotif = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            targetUserId: comm.creatorUserId,
            category: 'Community',
            type: 'community_rejected',
            icon: 'cancel',
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            text: `❌ Your community creation request for "${comm.name}" was not approved by HR Administrator (${currentUser?.name || 'HR Admin'}).`,
            message: `❌ Your community creation request for "${comm.name}" was not approved by HR Administrator (${currentUser?.name || 'HR Admin'}).`,
            senderName: currentUser?.name || 'HR Administrator',
            senderAvatar: currentUser?.avatar || null,
            time: 'Just now',
            unread: true,
            communityName: comm.name,
            communityId: comm.id
        };
        localStorage.setItem('knome_notifications', JSON.stringify([rejectNotif, ...existingNotifs]));
        window.dispatchEvent(new CustomEvent('knome_notification_received', { detail: rejectNotif }));

        setApprovalSuccessMsg(`Community request for "${comm.name}" was rejected.`);
        setTimeout(() => setApprovalSuccessMsg(''), 4000);
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

    const handleCommunityCreated = () => {
        loadCommunities();
        loadPendingApprovals();
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

    // Employee's own pending communities for "My Communities" tab
    const myPendingCommunities = pendingApprovals.filter(p => String(p.creatorUserId) === String(currentUser?.id));

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-6">
                
                {/* Hero Header */}
                <div className="relative rounded-2xl overflow-hidden mb-4 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
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
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Create Community
                            </button>
                        )}
                    </div>
                </div>

                {/* Toast / Alert for approvals */}
                {approvalSuccessMsg && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center gap-2 animate-in fade-in">
                        <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                        <span>{approvalSuccessMsg}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
                    {['Discover', 'My Communities', 'Knome (Org)'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 font-bold text-[14px] transition-colors relative flex items-center gap-2 cursor-pointer ${activeTab === tab ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <span>{tab}</span>
                            {tab === 'My Communities' && myPendingCommunities.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                                    {myPendingCommunities.length} Pending
                                </span>
                            )}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                    ))}

                    {/* HR Administrator Approval Tab */}
                    {isHRorAdmin && (
                        <button 
                            onClick={() => setActiveTab('Pending Approvals')}
                            className={`px-6 py-4 font-bold text-[14px] transition-colors relative flex items-center gap-2 cursor-pointer ${activeTab === 'Pending Approvals' ? 'text-amber-500' : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">approval</span>
                            <span>Community Approvals</span>
                            {pendingApprovals.length > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                                    {pendingApprovals.length}
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    0
                                </span>
                            )}
                            {activeTab === 'Pending Approvals' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full"></div>}
                        </button>
                    )}
                </div>

                {/* ─── TAB 1: HR PENDING APPROVALS VIEW ─── */}
                {activeTab === 'Pending Approvals' && isHRorAdmin ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">gavel</span>
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                                        HR Administrator Governance Review
                                    </h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                        Communities submitted by MPOnline employees require HR Administrator review before public launch.
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-black text-amber-600 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-xl">
                                {pendingApprovals.length} Pending
                            </span>
                        </div>

                        {pendingApprovals.length === 0 ? (
                            <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-[32px]">task_alt</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">All Caught Up!</h3>
                                <p className="text-sm text-slate-500 max-w-md mt-1">
                                    There are currently no employee-created community requests awaiting HR approval.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingApprovals.map(comm => (
                                    <div key={comm.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-amber-300 dark:hover:border-amber-700 transition-all">
                                        <div className="h-28 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                                            <img 
                                                src={comm.banner || getCommunityImages(comm.name, comm.category).banner} 
                                                alt={comm.name} 
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = getCommunityImages(comm.name, comm.category).banner;
                                                }}
                                                className="w-full h-full object-cover" 
                                            />
                                            <div className="absolute inset-0 bg-slate-900/20"></div>
                                            <div className="absolute top-3 left-3">
                                                <span className="px-2.5 py-1 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                                                    ⏳ Pending Review
                                                </span>
                                            </div>
                                            <div className="absolute top-3 right-3">
                                                <span className="px-2.5 py-1 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-800 shadow-sm">
                                                    {comm.type}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5 flex flex-col flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                                                    {comm.category || 'General'}
                                                </span>
                                                <span className="text-[11px] text-slate-400 ml-auto">
                                                    {comm.createdDate ? new Date(comm.createdDate).toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>

                                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                                                {comm.name}
                                            </h3>

                                            {/* Creator Info Box */}
                                            <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                                {comm.creatorAvatar ? (
                                                    <img src={comm.creatorAvatar} alt={comm.creatorName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center text-xs shrink-0">
                                                        {(comm.creatorName || 'E').charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {comm.creatorName}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        {comm.creatorEmployeeId} • {comm.creatorDepartment || 'MPOnline'}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4 flex-1">
                                                {comm.description}
                                            </p>

                                            {/* Action Buttons */}
                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleApproveCommunity(e, comm)}
                                                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">verified</span>
                                                    Approve &amp; Launch
                                                </button>
                                                <button
                                                    onClick={(e) => handleRejectCommunity(e, comm)}
                                                    className="py-2.5 px-4 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
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

                        {/* Employee's Own Pending Communities Banner (in My Communities tab) */}
                        {activeTab === 'My Communities' && myPendingCommunities.length > 0 && (
                            <div className="space-y-4 mb-4">
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                        <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-xs text-amber-800 dark:text-amber-300">
                                            Communities Submitted for HR Approval ({myPendingCommunities.length})
                                        </h4>
                                        <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-0.5">
                                            The communities below are currently being reviewed by the HR Administrator. You will receive an instant notification once approved.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {myPendingCommunities.map(c => (
                                        <div key={c.id} className="bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl overflow-hidden shadow-sm flex flex-col opacity-90">
                                            <div className="h-28 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                                                <img 
                                                    src={c.banner || getCommunityImages(c.name, c.category).banner} 
                                                    alt={c.name} 
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = getCommunityImages(c.name, c.category).banner;
                                                    }}
                                                    className="w-full h-full object-cover" 
                                                />
                                                <div className="absolute inset-0 bg-slate-900/40"></div>
                                                <div className="absolute top-3 left-3">
                                                    <span className="px-2.5 py-1 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                                                        Under HR Review
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col flex-1">
                                                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1">{c.name}</h3>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 flex-1">{c.description}</p>
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    Awaiting HR Governance clearance
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Communities Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredCommunities.map(community => (
                                <div key={community.id} onClick={() => navigate(`/community/view?id=${community.id}`)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
                                    <div className="h-32 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                                        <img 
                                            src={community.banner || getCommunityImages(community.name, community.category).banner} 
                                            alt={community.name} 
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = getCommunityImages(community.name, community.category).banner;
                                            }}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
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
                    </>
                )}

            </main>

            <CreateCommunityModal 
                isOpen={isCreateOpen} 
                onClose={() => setIsCreateOpen(false)} 
                onCommunityCreated={handleCommunityCreated}
            />
        </>
    );
}
