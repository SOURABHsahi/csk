import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { communitiesApi } from '../../utils/apiService';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5;

export default function CreateCommunityModal({ isOpen, onClose, onCommunityCreated, existingCommunities = [] }) {
    const { currentUser, users } = useUser();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdCommunityLink, setCreatedCommunityLink] = useState(null);
    const [isSubmittedForApproval, setIsSubmittedForApproval] = useState(false);
    const [pendingCommunityData, setPendingCommunityData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [nameError, setNameError] = useState('');
    const [bannerError, setBannerError] = useState('');
    const [avatarError, setAvatarError] = useState('');
    const [liveCommunities, setLiveCommunities] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        communitiesApi.getAll()
            .then(res => {
                if (Array.isArray(res)) setLiveCommunities(res);
                else if (res?.data && Array.isArray(res.data)) setLiveCommunities(res.data);
            })
            .catch(() => {});
    }, [isOpen]);

    const isHRorAdmin = ['SYSADM', 'HRADM', 'CADM'].includes(currentUser?.role) ||
        ['System Administrator', 'HR Administrator', 'Community Administrator', 'HR Manager', 'System Admin'].includes(currentUser?.roleName) ||
        (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'HRADM', 'CADM', 'System Administrator', 'HR Administrator', 'Community Administrator'].includes(r)));

    // Form State
    const [type, setType] = useState('public');
    const [defaultOrg, setDefaultOrg] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Technology');
    const [banner, setBanner] = useState('');
    const [avatar, setAvatar] = useState('');
    // Structured Rules list
    const [rulesList, setRulesList] = useState(['Be respectful and constructive.', 'Keep discussions relevant to the community topic.', 'Follow MPOnline company guidelines.']);
    // Structured FAQ pairs
    const [faqList, setFaqList] = useState([{ q: 'Who can join?', a: 'All MPOnline employees may join or request access.' }]);
    const [invitedUserIds, setInvitedUserIds] = useState([]);

    const bannerInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const checkNameDebounceRef = useRef(null);

    useEffect(() => {
        return () => {
            if (checkNameDebounceRef.current) {
                clearTimeout(checkNameDebounceRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    // ── Helpers ─────────────────────────────────────────────────
    const toggleInviteUser = (userId) => {
        setInvitedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const validateImageFile = (file, setError) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setError('Invalid format. Only JPG, PNG, and WebP images are allowed.');
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            setError(`File too large. Maximum size is ${MAX_IMAGE_SIZE_MB} MB.`);
            return false;
        }
        setError('');
        return true;
    };

    const handleBannerUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!validateImageFile(file, setBannerError)) return;
        const reader = new FileReader();
        reader.onload = (ev) => setBanner(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!validateImageFile(file, setAvatarError)) return;
        const reader = new FileReader();
        reader.onload = (ev) => setAvatar(ev.target.result);
        reader.readAsDataURL(file);
    };

    // Rules list management
    const addRule = () => {
        if (rulesList.length >= 10) return;
        setRulesList(prev => [...prev, '']);
    };
    const updateRule = (idx, val) => setRulesList(prev => prev.map((r, i) => i === idx ? val : r));
    const removeRule = (idx) => setRulesList(prev => prev.filter((_, i) => i !== idx));

    // FAQ list management
    const addFaq = () => {
        if (faqList.length >= 5) return;
        setFaqList(prev => [...prev, { q: '', a: '' }]);
    };
    const updateFaq = (idx, field, val) => setFaqList(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    const removeFaq = (idx) => setFaqList(prev => prev.filter((_, i) => i !== idx));

    // Comprehensive Duplicate Name Check
    const checkIsDuplicateCommunityName = (targetName) => {
        if (!targetName || !targetName.trim()) return false;
        const normalized = targetName.trim().toLowerCase();

        // 0. Check live active communities from API
        if (liveCommunities.some(c => (c.name || '').trim().toLowerCase() === normalized && c.isActive !== false && c.isActive !== 0)) {
            return true;
        }

        // 0b. Check existingCommunities passed from parent
        if (existingCommunities.some(c => (c.name || '').trim().toLowerCase() === normalized)) {
            return true;
        }

        // 1. Check custom communities in localStorage
        const customComms = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
        if (customComms.some(c => c.name && c.name.trim().toLowerCase() === normalized)) {
            return true;
        }

        // 2. Check pending approval communities
        const pendingComms = JSON.parse(localStorage.getItem('knome_pending_community_approvals') || '[]');
        if (pendingComms.some(c => c.name && c.name.trim().toLowerCase() === normalized)) {
            return true;
        }

        // 3. Check all seed & enterprise system communities
        const knownCommunities = [
            'tech innovation hub',
            'devops & ai innovation hub',
            'frontend developers guild',
            'database architects',
            'hr & general announcements',
            'culture & hr hub',
            'dotnet developers community',
            'fullstack engineering guild',
            'ai & data science innovation lab',
            'technology & architecture hub',
            'hr & people operations',
            'finance & accounting operations',
            'marketing & brand strategy',
            'cto leadership & strategy circle',
            'executive ai & data labs'
        ];
        if (knownCommunities.some(k => k === normalized)) {
            return true;
        }

        // 4. Check joined/persisted user communities
        const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
        const joinedComms = JSON.parse(localStorage.getItem(userKey) || '[]');
        if (joinedComms.some(c => c.name && c.name.trim().toLowerCase() === normalized)) {
            return true;
        }

        return false;
    };

    // Helper to auto-select target users based on Default Org group
    const autoSelectEmployeesForTargetGroup = (targetGroup) => {
        if (!targetGroup || targetGroup === 'All Employees') {
            const allOtherIds = (users || []).filter(u => u.id !== currentUser?.id).map(u => u.id);
            setInvitedUserIds(allOtherIds);
        } else {
            const deptFilteredIds = (users || []).filter(u => 
                u.id !== currentUser?.id && 
                ((u.department || u.departmentName || '').toLowerCase().includes(targetGroup.toLowerCase()) || 
                 (u.designation || '').toLowerCase().includes(targetGroup.toLowerCase()))
            ).map(u => u.id);
            setInvitedUserIds(deptFilteredIds.length > 0 ? deptFilteredIds : (users || []).filter(u => u.id !== currentUser?.id).map(u => u.id));
        }
    };

    // Step 1 validation
    const handleNextStep = async () => {
        if (!name.trim()) { 
            setNameError('Community name is required.'); 
            return; 
        }

        if (checkIsDuplicateCommunityName(name)) {
            setNameError('community name already existing');
            return;
        }

        try {
            const res = await communitiesApi.checkName(name.trim());
            const exists = res?.data !== undefined ? res.data : res;
            if (exists === true) {
                setNameError('community name already existing');
                return;
            }
        } catch (err) {}

        setNameError('');

        // If Organization Default is selected, auto-select all employees before moving to Step 2
        if (type === 'default') {
            autoSelectEmployeesForTargetGroup(defaultOrg || 'All Employees');
        }

        setStep(2);
    };

    const safeSetStorage = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.warn(`LocalStorage quota reached for key: ${key}.`, err);
            try {
                localStorage.removeItem('knome_notifications');
                if (Array.isArray(value)) {
                    localStorage.setItem(key, JSON.stringify(value.slice(0, 15)));
                }
            } catch (e) {
                console.error('LocalStorage save fallback failed:', e);
            }
        }
    };

    const handleSubmit = async () => {
        if (checkIsDuplicateCommunityName(name)) {
            setNameError('community name already existing');
            setStep(1);
            return;
        }

        try {
            const res = await communitiesApi.checkName(name.trim());
            const exists = res?.data !== undefined ? res.data : res;
            if (exists === true) {
                setNameError('community name already existing');
                setStep(1);
                return;
            }
        } catch (err) {}

        setIsSubmitting(true);
        try {
            const communityId = Math.floor(Date.now() / 1000);

            const safeBanner = banner && banner.length > 50000
                ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300'
                : (banner || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300');
            const safeAvatar = avatar && avatar.length > 50000
                ? 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200'
                : (avatar || null);

            const filteredRules = rulesList.filter(r => r.trim());
            const filteredFaq = faqList.filter(f => f.q.trim() && f.a.trim());

            const newCommunity = {
                id: communityId,
                name: name.trim(),
                type: type === 'default' ? 'Default (Org)' : type.charAt(0).toUpperCase() + type.slice(1),
                category,
                members: '1 member',
                activity: 'New',
                description: description.trim() || 'A new community created for MPOnline teams.',
                banner: safeBanner,
                avatar: safeAvatar,
                createdBy: currentUser?.name || currentUser?.fullName || 'Employee',
                creatorUserId: currentUser?.id || 1,
                creatorEmployeeId: currentUser?.employeeId || `MPO${currentUser?.id || '101'}`,
                creatorDepartment: currentUser?.department || currentUser?.departmentName || 'MPOnline Limited',
                creatorAvatar: currentUser?.avatar || null,
                createdDate: new Date().toISOString(),
                rules: filteredRules.length > 0 ? filteredRules : ['Be respectful.', 'Stay on topic.'],
                faq: filteredFaq.length > 0 ? filteredFaq : [{ q: 'Who can join?', a: 'All MPOnline employees.' }],
                defaultOrg: type === 'default' ? defaultOrg : null,
                status: isHRorAdmin ? 'Approved' : 'Pending Approval',
                isApproved: isHRorAdmin ? true : false,
                invitedUserIds: invitedUserIds || []
            };

            // ── CASE A: Regular Employee -> Goes to HR Admin for Approval ──
            if (!isHRorAdmin) {
                // 1. Add to pending approvals list
                const existingApprovals = JSON.parse(localStorage.getItem('knome_pending_community_approvals') || '[]');
                safeSetStorage('knome_pending_community_approvals', [newCommunity, ...existingApprovals.filter(c => String(c.id) !== String(communityId))]);

                // 2. Track in user's joined list as pending approval
                const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
                const userJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
                safeSetStorage(userKey, [{ 
                    id: communityId, 
                    name: newCommunity.name, 
                    status: 'pending_approval', 
                    category,
                    type: newCommunity.type,
                    description: newCommunity.description,
                    banner: safeBanner,
                    joinedAt: new Date().toISOString() 
                }, ...userJoined.filter(c => String(c.id) !== String(communityId))]);

                // 3. Send Notification to HR Administrator & System Administrator
                const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                const hrNotif = {
                    id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
                    targetRole: 'HRADM',
                    targetUserId: 'hr_admin',
                    category: 'Community',
                    type: 'community_approval_request',
                    icon: 'approval',
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/10',
                    text: `📋 New Community Approval Request: ${currentUser?.name || 'Employee'} (${currentUser?.employeeId || 'MPOnline'}) created "${newCommunity.name}". Awaiting HR Approval.`,
                    message: `📋 New Community Approval Request: ${currentUser?.name || 'Employee'} (${currentUser?.employeeId || 'MPOnline'}) created "${newCommunity.name}". Awaiting HR Approval.`,
                    senderName: currentUser?.name || 'Employee',
                    senderAvatar: currentUser?.avatar || null,
                    time: 'Just now',
                    unread: true,
                    communityName: newCommunity.name,
                    communityId: newCommunity.id,
                    actionLink: '/communities?tab=Approvals'
                };
                safeSetStorage('knome_notifications', [hrNotif, ...existingNotifs]);
                window.dispatchEvent(new CustomEvent('knome_notification_received', { detail: hrNotif }));
                window.dispatchEvent(new CustomEvent('community-approval-requested', { detail: newCommunity }));

                setPendingCommunityData(newCommunity);
                setIsSubmittedForApproval(true);
                return;
            }

            // ── CASE B: HR / System Admin -> Auto-Approved Immediately ──
            // Notifications for invited members
            const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const newInviteNotifs = invitedUserIds.map(targetId => ({
                id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
                targetUserId: targetId,
                type: 'invite',
                text: `${currentUser?.name || 'An employee'} invited you to join the community "${newCommunity.name}".`,
                senderName: currentUser?.name || 'An employee',
                senderAvatar: currentUser?.avatar || null,
                time: 'Just now',
                unread: true,
                icon: 'group_add',
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
                communityName: newCommunity.name,
                communityId: newCommunity.id,
                actionLink: `/community/view?id=${newCommunity.id}`
            }));
            safeSetStorage('knome_notifications', [...newInviteNotifs, ...existingNotifs]);

            // Save community
            const customCommunities = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            safeSetStorage('knome_custom_communities', [newCommunity, ...customCommunities]);

            // Save to creator's joined list with proper format
            const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
            const userJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
            safeSetStorage(userKey, [{ id: communityId, name: newCommunity.name, status: 'joined', joinedAt: new Date().toISOString() }, ...userJoined.filter(c => String(c.id) !== String(communityId))]);

            // Seed creator as admin member
            const creatorMember = {
                userId: currentUser?.id || 1,
                fullName: currentUser?.name || 'Employee',
                employeeId: currentUser?.employeeId || 'MPO100',
                designation: currentUser?.roleName || 'Community Admin',
                memberType: 'Admin',
                status: 'Approved',
                profilePhotoUrl: currentUser?.avatar
            };

            const memberList = [creatorMember];
            const targetUserEnrollIds = (type === 'default' && (!invitedUserIds || invitedUserIds.length === 0))
                ? (users || []).filter(u => u.id !== currentUser?.id).map(u => u.id)
                : invitedUserIds;

            (targetUserEnrollIds || []).forEach(uId => {
                const targetUserObj = (users || []).find(u => String(u.id) === String(uId));
                if (targetUserObj) {
                    memberList.push({
                        userId: targetUserObj.id,
                        fullName: targetUserObj.name,
                        employeeId: targetUserObj.employeeId || `MPO${targetUserObj.id}`,
                        designation: targetUserObj.designation || 'Member',
                        memberType: 'Member',
                        status: 'Approved',
                        profilePhotoUrl: targetUserObj.avatar
                    });

                    // Auto-join directly to target user's joined community list
                    try {
                        const targetUserKey = `knome_joined_communities_${targetUserObj.id}`;
                        const targetUserJoined = JSON.parse(localStorage.getItem(targetUserKey) || '[]');
                        safeSetStorage(targetUserKey, [{ id: communityId, name: newCommunity.name, status: 'joined', joinedAt: new Date().toISOString() }, ...targetUserJoined.filter(c => String(c.id) !== String(communityId))]);
                    } catch (e) { /* ignore */ }
                }
            });

            newCommunity.members = `${memberList.length} ${memberList.length === 1 ? 'member' : 'members'}`;
            safeSetStorage(`knome_community_members_${communityId}`, memberList);

            // FR-CM-04: Default (Org) community — save department assignment
            if (type === 'default') {
                const deptAssignments = JSON.parse(localStorage.getItem('knome_default_community_assignments') || '[]');
                deptAssignments.push({ communityId, communityName: newCommunity.name, department: defaultOrg || 'All Employees', createdAt: new Date().toISOString() });
                localStorage.setItem('knome_default_community_assignments', JSON.stringify(deptAssignments));
                window.dispatchEvent(new CustomEvent('default-community-assigned', {
                    detail: { community: newCommunity, targetDept: defaultOrg || 'All Employees' }
                }));
            }

            window.dispatchEvent(new CustomEvent('community-joined-change'));
            window.dispatchEvent(new CustomEvent('community-invite-sent', {
                detail: { invitedUserIds, communityName: newCommunity.name, senderName: currentUser?.name }
            }));

            if (onCommunityCreated) onCommunityCreated(newCommunity);

            const generatedLink = `${window.location.origin}/community/view?id=${communityId}`;
            setCreatedCommunityLink(generatedLink);
        } catch (error) {
            console.error('Failed to process community creation:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyLink = () => {
        if (createdCommunityLink) {
            navigator.clipboard.writeText(createdCommunityLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleFinish = () => {
        setCreatedCommunityLink(null);
        setIsSubmittedForApproval(false);
        setPendingCommunityData(null);
        setStep(1); setName(''); setDescription(''); setType('public');
        setBanner(''); setAvatar('');
        setRulesList(['Be respectful and constructive.', 'Keep discussions relevant.', 'Follow MPOnline guidelines.']);
        setFaqList([{ q: 'Who can join?', a: 'All MPOnline employees may join or request access.' }]);
        setInvitedUserIds([]);
        setNameError(''); setBannerError(''); setAvatarError('');
        if (onCommunityCreated) onCommunityCreated();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">
                                {isSubmittedForApproval ? 'hourglass_top' : createdCommunityLink ? 'check_circle' : 'group_add'}
                            </span>
                            {isSubmittedForApproval 
                                ? 'Submitted for HR Approval' 
                                : createdCommunityLink 
                                    ? 'Community Created Successfully!' 
                                    : 'Create New Community'}
                        </h2>
                        {!createdCommunityLink && !isSubmittedForApproval && (
                            <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${step >= 1 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                                    <span className={`text-[12px] font-bold ${step === 1 ? 'text-indigo-500' : 'text-slate-400'}`}>Details & Media</span>
                                </div>
                                <div className={`h-0.5 w-8 rounded ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${step >= 2 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                                    <span className={`text-[12px] font-bold ${step === 2 ? 'text-indigo-500' : 'text-slate-400'}`}>Rules, FAQ & Members</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-slate-900/50">

                    {/* View 1: Pending Approval View for Regular Employees */}
                    {isSubmittedForApproval ? (
                        <div className="flex flex-col items-center justify-center text-center py-8 px-4 animate-in zoom-in-95 duration-200 max-w-xl mx-auto">
                            <div className="w-18 h-18 bg-amber-100 dark:bg-amber-900/40 text-amber-500 rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10 ring-8 ring-amber-50 dark:ring-amber-900/20">
                                <span className="material-symbols-outlined text-[42px] animate-pulse">hourglass_top</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
                                ⏳ Pending HR Admin Approval
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                "{name}" Submitted for Review!
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                                Your community request has been forwarded to the <strong>HR Administrator</strong> for governance review. Once approved, it will be published live across the organization and you will receive an instant notification.
                            </p>

                            {/* Summary Card */}
                            <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-left mb-6 shadow-sm">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-3">
                                    <span className="text-xs font-extrabold uppercase text-slate-400">Request Summary</span>
                                    <span className="text-xs font-black text-amber-500 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-full">Awaiting Approval</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Community Name:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Category:</span>
                                        <span className="font-bold text-indigo-500">{category}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Visibility:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{type === 'default' ? 'Default (Org)' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Created By:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.name} ({currentUser?.employeeId || 'MPOnline'})</span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleFinish}
                                className="px-8 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer">
                                <span>Done & View Communities</span>
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </div>
                    ) : createdCommunityLink ? (
                        <div className="flex flex-col items-center justify-center text-center py-8 px-4 animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[36px]">check_circle</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                "{name}" is Live!
                            </h3>
                            <p className="text-slate-500 text-sm max-w-md mb-6">
                                {invitedUserIds.length > 0
                                    ? `Direct notifications with the join link have been sent to ${invitedUserIds.length} selected employee(s).`
                                    : 'Your community has been created. Share the link below with your team members.'}
                            </p>
                            <div className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm mb-6">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">
                                    🔗 Shareable Invite Link
                                </label>
                                <div className="flex items-center gap-2">
                                    <input type="text" readOnly value={createdCommunityLink}
                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none" />
                                    <button onClick={handleCopyLink}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20'}`}>
                                        <span className="material-symbols-outlined text-[16px]">{copied ? 'done' : 'content_copy'}</span>
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>
                            <button onClick={handleFinish}
                                className="px-8 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                                Done & Go to Communities
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* ── STEP 1: Details & Media ── */}
                            {step === 1 && (
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Left: Text Inputs */}
                                    <div className="flex-1 space-y-5">
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Community Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                value={name}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setName(val);
                                                    if (checkNameDebounceRef.current) {
                                                        clearTimeout(checkNameDebounceRef.current);
                                                    }
                                                    if (!val.trim()) {
                                                        setNameError('');
                                                        return;
                                                    }
                                                    if (checkIsDuplicateCommunityName(val)) {
                                                        setNameError('community name already existing');
                                                        return;
                                                    }
                                                    setNameError('');
                                                    checkNameDebounceRef.current = setTimeout(() => {
                                                        communitiesApi.checkName(val.trim())
                                                            .then(res => {
                                                                const exists = res?.data !== undefined ? res.data : res;
                                                                if (exists === true) {
                                                                    setNameError('community name already existing');
                                                                }
                                                            })
                                                            .catch(() => {});
                                                    }, 300);
                                                }}
                                                type="text"
                                                placeholder="e.g. Engineering Excellence"
                                                className={`w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold transition-colors ${nameError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                                            />
                                            {nameError && (
                                                <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1 font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">error</span> {nameError}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is the purpose of this community?" rows="3"
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none"></textarea>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Category</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium">
                                                <option>Technology</option>
                                                <option>Product & Design</option>
                                                <option>Culture & HR</option>
                                                <option>Operations</option>
                                                <option>Finance</option>
                                                <option>Marketing</option>
                                                <option>Leadership</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Privacy & Governance Type</label>

                                            <label className={`block p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all ${type === 'public' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name="type" checked={type === 'public'} onChange={() => setType('public')} className="text-indigo-500 focus:ring-indigo-500" />
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[16px] text-emerald-500">public</span> Public
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">Anyone can find and join instantly. No approval needed.</p>
                                                    </div>
                                                </div>
                                            </label>

                                            <label className={`block p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all ${type === 'private' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name="type" checked={type === 'private'} onChange={() => setType('private')} className="text-indigo-500 focus:ring-indigo-500" />
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span> Private
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">Requires Admin approval. Join requests are reviewed before access is granted.</p>
                                                    </div>
                                                </div>
                                            </label>

                                            {((['HRADM', 'HR'].includes(currentUser?.role)) ||
                                               (['HR Administrator', 'HR Admin'].includes(currentUser?.roleName)) ||
                                               (currentUser?.roleName && currentUser.roleName.toLowerCase().includes('hr') && !currentUser.roleName.toLowerCase().includes('system')) ||
                                               (currentUser?.role && currentUser.role.toLowerCase().includes('hr') && currentUser.role !== 'SYSADM') ||
                                               currentUser?.isHrAdmin === true) && (
                                                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${type === 'default' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="radio" 
                                                            name="type" 
                                                            checked={type === 'default'} 
                                                            onChange={() => {
                                                                setType('default');
                                                                const chosen = defaultOrg || 'All Employees';
                                                                if (!defaultOrg) setDefaultOrg('All Employees');
                                                                autoSelectEmployeesForTargetGroup(chosen);
                                                            }} 
                                                            className="text-indigo-500 focus:ring-indigo-500 cursor-pointer" 
                                                        />
                                                        <div>
                                                            <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                <span className="material-symbols-outlined text-[16px] text-purple-500">corporate_fare</span> Organization Default (Auto-Assigned)
                                                            </h4>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">Strictly HR Administrator Only: Auto-subscribes all employees or specific department members automatically.</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            )}

                                            {type === 'default' && (
                                                <div className="mt-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">groups</span> Auto-Subscribe Target Group *
                                                    </label>
                                                    <select 
                                                        value={defaultOrg || 'All Employees'} 
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDefaultOrg(val);
                                                            autoSelectEmployeesForTargetGroup(val);
                                                        }}
                                                        className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white font-bold"
                                                    >
                                                        <option value="All Employees">🏢 All Employees (Entire Organization)</option>
                                                        <option value="Technology">💻 Technology / Engineering Department</option>
                                                        <option value="HR">👥 HR & People Operations Department</option>
                                                        <option value="Finance">💰 Finance & Accounting Department</option>
                                                        <option value="Marketing">📢 Marketing & Brand Strategy Department</option>
                                                        <option value="Operations">⚙️ Operations & Logistics Department</option>
                                                    </select>
                                                    <p className="text-[10px] text-purple-500 dark:text-purple-300 mt-1.5 font-medium">
                                                        ✨ All employees in the selected target group will be automatically selected and enrolled as joined members upon creation (FR-CM-04).
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Media Uploads */}
                                    <div className="w-full md:w-80 flex flex-col gap-5">
                                        {/* Banner */}
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Banner Image <span className="text-slate-400 font-normal normal-case">(JPG/PNG/WebP, max 5MB)</span>
                                            </label>
                                            <div onClick={() => bannerInputRef.current?.click()}
                                                className="relative w-full h-36 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors cursor-pointer group overflow-hidden">
                                                {banner ? (
                                                    <>
                                                        <img src={banner} alt="Banner Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white text-[12px] font-bold">Click to change</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[32px] mb-2 group-hover:scale-110 transition-transform">wallpaper</span>
                                                        <span className="text-[11px] font-bold">Click to upload banner</span>
                                                        <span className="text-[10px] text-slate-400 mt-1">Recommended: 1200 x 400px</span>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" ref={bannerInputRef} className="hidden" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleBannerUpload} />
                                            {bannerError && (
                                                <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1 font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">error</span> {bannerError}
                                                </p>
                                            )}
                                        </div>

                                        {/* Avatar */}
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Thumbnail Avatar <span className="text-slate-400 font-normal normal-case">(JPG/PNG/WebP, max 5MB)</span>
                                            </label>
                                            <div onClick={() => avatarInputRef.current?.click()}
                                                className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors cursor-pointer group overflow-hidden">
                                                {avatar ? (
                                                    <>
                                                        <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold text-center">Change</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">add_photo_alternate</span>
                                                        <span className="text-[9px] font-bold mt-1 text-center px-1">Click to upload avatar</span>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarUpload} />
                                            {avatarError && (
                                                <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1 font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">error</span> {avatarError}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2: Rules, FAQ & Invite Members ── */}
                            {step === 2 && (
                                <div className="space-y-8">

                                    {/* Rules Builder */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[15px] text-indigo-500">gavel</span>
                                                Community Rules <span className="text-slate-400 font-normal normal-case ml-1">({rulesList.length}/10)</span>
                                            </label>
                                            {rulesList.length < 10 && (
                                                <button onClick={addRule} className="flex items-center gap-1 text-[12px] text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">add_circle</span> Add Rule
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {rulesList.map((rule, idx) => (
                                                <div key={idx} className="flex items-center gap-2 group">
                                                    <span className="text-[12px] font-black text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                                                    <input
                                                        value={rule}
                                                        onChange={(e) => updateRule(idx, e.target.value)}
                                                        placeholder={`Rule ${idx + 1}...`}
                                                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                                    />
                                                    {rulesList.length > 1 && (
                                                        <button onClick={() => removeRule(idx)}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all cursor-pointer p-1">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* FAQ Builder */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[15px] text-indigo-500">help</span>
                                                FAQ <span className="text-slate-400 font-normal normal-case ml-1">({faqList.length}/5)</span>
                                            </label>
                                            {faqList.length < 5 && (
                                                <button onClick={addFaq} className="flex items-center gap-1 text-[12px] text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">add_circle</span> Add Q&A
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            {faqList.map((item, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 group relative">
                                                    {faqList.length > 1 && (
                                                        <button onClick={() => removeFaq(idx)}
                                                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all cursor-pointer">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-black text-indigo-500 uppercase w-4">Q</span>
                                                            <input
                                                                value={item.q}
                                                                onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                                                                placeholder="Question..."
                                                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-black text-emerald-500 uppercase w-4">A</span>
                                                            <textarea
                                                                value={item.a}
                                                                onChange={(e) => updateFaq(idx, 'a', e.target.value)}
                                                                placeholder="Answer..."
                                                                rows="2"
                                                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Invite Employees */}
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-5">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-indigo-500">group_add</span>
                                                <h3 className="font-bold text-[15px] text-slate-900 dark:text-white">
                                                    {type === 'default' ? '🏢 Auto-Enrolled Organization Employees' : 'Auto-Add / Invite Employees'}
                                                </h3>
                                                {invitedUserIds.length > 0 && (
                                                    <span className="bg-indigo-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold">{invitedUserIds.length} selected</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allOtherIds = (users || []).filter(u => u.id !== currentUser?.id).map(u => u.id);
                                                    if (invitedUserIds.length === allOtherIds.length) {
                                                        setInvitedUserIds([]);
                                                    } else {
                                                        setInvitedUserIds(allOtherIds);
                                                    }
                                                }}
                                                className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-600 dark:text-indigo-400 font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-500/20"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">done_all</span>
                                                {invitedUserIds.length === (users || []).filter(u => u.id !== currentUser?.id).length ? 'Deselect All' : 'Select All Employees'}
                                            </button>
                                        </div>
                                        <p className="text-[12px] text-slate-500 mb-4">
                                            {type === 'default' 
                                                ? `✨ Organization Default (${defaultOrg || 'All Employees'}): All selected employees will automatically be joined as active members upon creation without needing manual invitations (FR-CM-04).`
                                                : 'Selected employees will automatically be added as active community members upon creation — no manual invitations needed!'}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {(users || []).filter(u => u.id !== currentUser?.id).map(user => {
                                                const isSelected = invitedUserIds.includes(user.id);
                                                return (
                                                    <div key={user.id} onClick={() => toggleInviteUser(user.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                                                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt={user.name}
                                                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`; }} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[13px] font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{user.name}</p>
                                                            <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{user.designation}</p>
                                                        </div>
                                                        <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                            {isSelected ? 'check_circle' : 'add_circle'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                {!createdCommunityLink && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-b-2xl bg-white dark:bg-slate-900">
                        <button onClick={onClose} className="px-6 py-2.5 text-[13px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            Cancel
                        </button>
                        <div className="flex gap-3">
                            {step === 2 && (
                                <button onClick={() => setStep(1)}
                                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    Back
                                </button>
                            )}
                            {step === 1 ? (
                                <button onClick={handleNextStep}
                                    className="px-8 py-2.5 bg-indigo-500 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 flex items-center gap-2">
                                    Next Step
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>
                            ) : (
                                <button onClick={handleSubmit} disabled={isSubmitting}
                                    className="px-8 py-2.5 bg-indigo-500 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    {isSubmitting ? 'Creating...' : (invitedUserIds.length === (users || []).filter(u => u.id !== currentUser?.id).length ? '⚡ Create & Auto-Add All Members' : 'Create & Add Members')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
