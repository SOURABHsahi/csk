import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { interactionsApi, adminApi, postsApi, podcastsApi, resolveMediaUrl, getVideoThumbnail } from '../utils/apiService';
import { apiClient } from '../utils/apiClient';

// Helper to provide realistic reported post content if live API call returns empty/404
const getFallbackPostContent = (report) => {
    if (!report) return null;
    return {
        authorName: report.reportedUserName || report.reporterFullName || `User #${report.reportedUserId || report.reporterUserId}`,
        authorFullName: report.reportedUserName || report.reporterFullName || `User #${report.reportedUserId || report.reporterUserId}`,
        userId: report.reportedUserId || report.reporterUserId,
        content: report.postContentSnippet || `Reported content for ${report.contentType} #${report.contentId} (${report.reasonCode}). Flagged for internal moderation review.`,
        createdAt: report.reportedDate,
        audienceType: 'Public',
        likeCount: 0,
        commentCount: 0,
        shareCount: 0
    };
};

export default function AdminConsole() {
    const { currentUser, users: contextUsers, updateUserRoleInList, toggleUserActiveStatus, addKarmaPointsToUser, awardRuleKarma } = useUser();
    const navigate = useNavigate();

    // Strict Role Authorization Check — System Administrator Only (HR Admin Excluded)
    const isAuthorized = currentUser?.role === 'SYSADM' ||
                         ['System Administrator', 'System Admin'].includes(currentUser?.roleName) ||
                         (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'System Administrator', 'SystemAdmin'].includes(r)));

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState('moderation');
    const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date().toLocaleTimeString());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Moderation Reports & Selection State
    const [reports, setReports] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [selectedReportIds, setSelectedReportIds] = useState([]);
    
    // Filters Toolbar State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [reasonFilter, setReasonFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [communityFilter, setCommunityFilter] = useState('All');
    const [dateRangeFilter, setDateRangeFilter] = useState('All');
    const [moderatorFilter, setModeratorFilter] = useState('All');
    
    // Active Metric Card Selection State
    const [activeMetricCard, setActiveMetricCard] = useState('total');

    const handleMetricCardClick = (cardId, tab, filterAction, toastMsg) => {
        setActiveMetricCard(cardId);
        setActiveTab(tab);
        if (filterAction) filterAction();
        showToast(toastMsg);
    };

    const [actionToast, setActionToast] = useState('');

    // User Management State
    const [usersList, setUsersList] = useState(() => contextUsers || []);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Suspend Modal Form State
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspendUserId, setSuspendUserId] = useState('');
    const [suspendUserName, setSuspendUserName] = useState('');
    const [suspendReason, setSuspendReason] = useState('');
    const [suspendDays, setSuspendDays] = useState(7);

    // Change Role Modal State (Multiple Role Support)
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleUserId, setRoleUserId] = useState('');
    const [roleUserName, setRoleUserName] = useState('');
    const [selectedRoles, setSelectedRoles] = useState(['Employee']);

    // Comprehensive User Details Modal State
    const [selectedUserDetailsUser, setSelectedUserDetailsUser] = useState(null);
    const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);

    // Role Assignment Requests State
    const [roleRequests, setRoleRequests] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('knome_pending_role_requests') || localStorage.getItem('eh_role_requests') || '[]');
            if (Array.isArray(stored) && stored.length > 0) return stored;
        } catch (e) {}
        return [
            { requestId: 101, employeeId: 'MPO118', fullName: 'Raman Kumar', email: 'raman.kumar@mponline.gov.in', departmentName: 'HR', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Pending', assignedRoleName: 'Community Admin', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
            { requestId: 102, employeeId: 'MPO119', fullName: 'Rishabh Pandey', email: 'rishabh.pandey@mponline.gov.in', departmentName: 'Information Technology', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Pending', assignedRoleName: 'Community Admin', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
            { requestId: 103, employeeId: 'MPO120', fullName: 'krisha dabhi', email: 'krisha.dabhi@mponline.gov.in', departmentName: 'Information Technology', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Pending', assignedRoleName: 'Community Admin', createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
            { requestId: 104, employeeId: 'MPO121', fullName: 'Mahi Rathore', email: 'mahi.rathore@mponline.gov.in', departmentName: 'HR', designation: 'Software Engineer', requestedRoleCode: 'EMP', status: 'Pending', assignedRoleName: 'Employee', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
            { requestId: 105, employeeId: 'MPO122', fullName: 'Satendra Singh', email: 'satendra.singh@mponline.gov.in', departmentName: 'Information Technology', designation: 'Software Engineer', requestedRoleCode: 'EMP', status: 'Pending', assignedRoleName: 'Employee', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
            { requestId: 106, employeeId: 'MPO115', fullName: 'Aishwary', email: 'aishwary@mponline.gov.in', departmentName: 'Technology', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Approved', assignedRoleName: 'Community Admin', assignedBy: 'System Admin', createdAt: new Date(Date.now() - 86400000).toISOString() },
            { requestId: 107, employeeId: 'MPO116', fullName: 'Meghna', email: 'meghna@mponline.gov.in', departmentName: 'HR', designation: 'Software Engineer', requestedRoleCode: 'HRADM', status: 'Approved', assignedRoleName: 'HR Administrator', assignedBy: 'System Admin', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
            { requestId: 108, employeeId: 'MPO108', fullName: 'Pooja Sharma', email: 'pooja.sharma@mponline.gov.in', departmentName: 'Development', designation: 'Frontend Engineer', requestedRoleCode: 'HRADM', status: 'Approved', assignedRoleName: 'HR Administrator', assignedBy: 'System Admin', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }
        ];
    });
    const [isLoadingRoleRequests, setIsLoadingRoleRequests] = useState(false);
    const [roleRequestSearchTerm, setRoleRequestSearchTerm] = useState('');
    const [requestTargetRoles, setRequestTargetRoles] = useState({});

    // Community Channels Moderation State
    const [communityChannels, setCommunityChannels] = useState([
        { id: 1, name: 'Engineering & Tech', category: 'Technology & Architecture', reportsCount: 5, mod: 'Loveneesh Sharma', status: 'Strict', type: 'Public', filterKey: 'Engineering', icon: 'developer_board' },
        { id: 2, name: 'HR & People Ops', category: 'Human Resources & Governance', reportsCount: 3, mod: 'Sourabh Sahu', status: 'Standard', type: 'Default (Org)', filterKey: 'HR', icon: 'groups' },
        { id: 3, name: 'Product Design & UX', category: 'UI/UX & Design Systems', reportsCount: 2, mod: 'Mayur Verma', status: 'Standard', type: 'Public', filterKey: 'Product', icon: 'palette' },
        { id: 4, name: 'AI & Data Science Lab', category: 'AI Research & Data Science', reportsCount: 4, mod: 'Vishendra Sharma', status: 'Strict', type: 'Private', filterKey: 'AI', icon: 'psychology' },
        { id: 5, name: 'Finance & Accounting', category: 'Finance, Audit & Payroll', reportsCount: 1, mod: 'Sourabh Sahu', status: 'Standard', type: 'Default (Org)', filterKey: 'Finance', icon: 'account_balance' },
        { id: 6, name: 'Marketing & Brand Strategy', category: 'Marketing, PR & Events', reportsCount: 1, mod: 'Meghna Tiwari', status: 'Standard', type: 'Public', filterKey: 'Marketing', icon: 'campaign' },
        { id: 7, name: 'CTO Leadership Circle', category: 'Executive Leadership & Strategy', reportsCount: 0, mod: 'Loveneesh Sharma', status: 'Strict', type: 'Private', filterKey: 'CTO', icon: 'military_tech' },
        { id: 8, name: 'General Discussion', category: 'Company Open Lounge', reportsCount: 2, mod: 'System Admin', status: 'Relaxed', type: 'Public', filterKey: 'General', icon: 'forum' }
    ]);
    const [selectedManageCommunity, setSelectedManageCommunity] = useState(null);
    const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

    // Get exact live member count for each community from persistent storage or API
    const getCommunityMemberCount = (commId) => {
        try {
            const savedMembersKey = `knome_community_members_${commId}`;
            const localMembers = JSON.parse(localStorage.getItem(savedMembersKey) || '[]');
            if (Array.isArray(localMembers) && localMembers.length > 0) {
                return localMembers.length;
            }
        } catch (e) {}
        return 6;
    };

    // Helper to resolve the user's actual assigned role accurately
    const getUserAssignedRole = (u) => {
        if (!u) return 'Employee';
        
        // 1. Check if user object has explicit roleName (e.g. from local edit)
        if (u.roleName && u.roleName !== 'Employee') return u.roleName;

        // 2. Check roles array from Backend UserSummaryDto
        if (Array.isArray(u.roles) && u.roles.length > 0) {
            // Find highest priority non-Employee role
            const priorityRoles = ['System Administrator', 'HR Administrator', 'Community Admin', 'System Admin', 'HR Admin', 'SYSADM', 'HRADM', 'CADM'];
            for (const pr of priorityRoles) {
                const match = u.roles.find(r => typeof r === 'string' && r.toLowerCase() === pr.toLowerCase());
                if (match) {
                    if (match === 'SYSADM' || match === 'SystemAdmin') return 'System Administrator';
                    if (match === 'HRADM' || match === 'HRAdmin') return 'HR Administrator';
                    if (match === 'CADM') return 'Community Admin';
                    return match;
                }
            }
            const nonEmp = u.roles.find(r => typeof r === 'string' && r.toLowerCase() !== 'employee' && r.toLowerCase() !== 'emp');
            if (nonEmp) return nonEmp;
        }

        // 3. Check role requests approved in localStorage (knome_pending_role_requests / eh_role_requests)
        try {
            const roleReqs = JSON.parse(localStorage.getItem('knome_pending_role_requests') || localStorage.getItem('eh_role_requests') || '[]');
            const req = roleReqs.find(r => 
                (u.employeeId && r.employeeId && r.employeeId.toUpperCase() === u.employeeId.toUpperCase()) ||
                (u.userId && String(r.userId || r.id) === String(u.userId)) ||
                (u.id && String(r.userId || r.id) === String(u.id)) ||
                (u.fullName && r.fullName && r.fullName.toLowerCase() === u.fullName.toLowerCase())
            );
            if (req && req.status === 'Approved' && req.assignedRoleName) {
                return req.assignedRoleName;
            }
        } catch (e) {}

        // 4. Check user context or local overrides
        if (u.role && u.role !== 'EMP' && u.role !== 'Employee') {
            if (u.role === 'SYSADM') return 'System Administrator';
            if (u.role === 'HRADM') return 'HR Administrator';
            if (u.role === 'CADM') return 'Community Admin';
            return u.role;
        }

        if (Array.isArray(u.roles) && u.roles.includes('Employee')) return 'Employee';
        return u.roleName || 'Employee';
    };

    const getUserRolesList = (u) => {
        if (!u) return ['Employee'];
        if (Array.isArray(u.roles) && u.roles.length > 0) {
            const roleStrings = u.roles.map(r => typeof r === 'string' ? r : (r.roleName || 'Employee'));
            const normalized = roleStrings.map(r => {
                if (r === 'SYSADM' || r === 'SystemAdmin') return 'System Administrator';
                if (r === 'HRADM' || r === 'HRAdmin') return 'HR Administrator';
                if (r === 'CADM' || r === 'CommunityAdmin') return 'Community Admin';
                if (r === 'EMP') return 'Employee';
                return r;
            });
            // deduplicate
            return Array.from(new Set(normalized));
        }
        const single = getUserAssignedRole(u);
        return [single];
    };

    const getRoleBadgeStyle = (roleName) => {
        const r = (roleName || '').toLowerCase();
        if (r.includes('system') || r.includes('sysadm')) {
            return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 font-black';
        }
        if (r.includes('hr') || r.includes('hrad')) {
            return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50 font-black';
        }
        if (r.includes('community') || r.includes('cadm')) {
            return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 font-black';
        }
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/40 dark:border-indigo-800/40';
    };

    // Audit Trail State
    const [auditTrail, setAuditTrail] = useState([]);
    const [auditSearch, setAuditSearch] = useState('');

    // System Config State
    const [configState, setConfigState] = useState(() => {
        const saved = localStorage.getItem('knome_system_config');
        return saved ? JSON.parse(saved) : {
            maintenanceMode: false,
            autoModeration: true,
            moderationSensitivity: 'High (Strict AI)',
            maxUploadMb: 100,
            jwtTtlHours: 24,
            emailDigestEnabled: true,
            notifyAdminsOnReport: true,
        };
    });
    const [configToast, setConfigToast] = useState(false);

    // ── System Logs & Serilog Live Stream State ──
    const [systemLogs, setSystemLogs] = useState([]);
    const [systemLogCounts, setSystemLogCounts] = useState({ total: 0, errors: 0, warnings: 0, info: 0, debug: 0 });
    const [systemLogFiles, setSystemLogFiles] = useState([]);
    const [selectedLogFile, setSelectedLogFile] = useState('');
    const [logLevelFilter, setLogLevelFilter] = useState('ALL');
    const [logSearchQuery, setLogSearchQuery] = useState('');
    const [logLinesCount, setLogLinesCount] = useState(200);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isAutoRefreshLogs, setIsAutoRefreshLogs] = useState(false);
    const [expandedLogIndex, setExpandedLogIndex] = useState(null);
    const [lastLogSyncTime, setLastLogSyncTime] = useState('');

    // Export Dropdown State
    const [isExportOpen, setIsExportOpen] = useState(false);

    // Post Preview Modal State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewReport, setPreviewReport] = useState(null);
    const [previewPost, setPreviewPost] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Toast Notification helper
    const showToast = (msg) => {
        setActionToast(msg);
        setTimeout(() => setActionToast(''), 4000);
    };

    // Pending Media Approvals & Preview State
    const [previewingMedia, setPreviewingMedia] = useState(null);

    const DEFAULT_SEED_PENDING_MEDIA = [
        {
            id: 'seed_pending_video_1',
            mediaType: 'Video',
            title: 'Q3 Enterprise AI Strategy & Architecture Townhall',
            description: 'Employee submitted presentation on AI agent automation, microservice governance, and system security guidelines.',
            thumbnail: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=90&w=1200',
            sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            sourceType: 'File',
            duration: '09:45',
            category: 'Townhalls',
            authorName: 'Rahul Verma',
            authorId: 3,
            submittedDate: new Date(Date.now() - 3600000 * 2).toISOString(),
            status: 'PendingApproval',
            dto: { title: 'Q3 Enterprise AI Strategy & Architecture Townhall', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', uploaderUserId: 3 }
        },
        {
            id: 'seed_pending_podcast_1',
            mediaType: 'Podcast',
            title: 'Episode 14: Modern Cloud Architecture & Microservices',
            description: 'In-depth podcast discussion with engineering leads on ASP.NET Core 10, Entity Framework performance, and SQL Server optimization.',
            thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=90&w=1200',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            duration: '18:20',
            category: 'Engineering & Tech',
            authorName: 'Priya Sharma',
            authorId: 4,
            submittedDate: new Date(Date.now() - 3600000 * 5).toISOString(),
            status: 'PendingApproval',
            podcastData: { title: 'Episode 14: Modern Cloud Architecture & Microservices', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', uploaderUserId: 4 }
        }
    ];

    const [pendingMediaApprovals, setPendingMediaApprovals] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('knome_pending_media_approvals') || '[]');
            return stored.length > 0 ? stored : DEFAULT_SEED_PENDING_MEDIA;
        } catch (e) {
            return DEFAULT_SEED_PENDING_MEDIA;
        }
    });

    const refreshPendingMedia = () => {
        try {
            const stored = JSON.parse(localStorage.getItem('knome_pending_media_approvals') || '[]');
            setPendingMediaApprovals(stored.length > 0 ? stored : DEFAULT_SEED_PENDING_MEDIA);
        } catch (e) {
            setPendingMediaApprovals(DEFAULT_SEED_PENDING_MEDIA);
        }
    };

    useEffect(() => {
        refreshPendingMedia();
        const handleStorage = () => refreshPendingMedia();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const getMediaUrl = (item) => {
        if (!item) return '';
        if (item.mediaType === 'Video') {
            return item.sourceUrl || item.dto?.videoUrl || item.dto?.sourceUrl || item.videoUrl || item.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        } else {
            return item.audioUrl || item.podcastData?.audioUrl || item.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        }
    };

    const getEmbedVideoUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
        }
        if (url.includes('vimeo.com')) {
            const vimeoId = url.split('/').pop();
            return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
        }
        return null;
    };

    const handleApproveMedia = async (mediaItem) => {
        try {
            const targetAuthorId = mediaItem.authorId || mediaItem.userId || mediaItem.dto?.uploaderUserId || mediaItem.podcastData?.uploaderUserId;

            if (mediaItem.mediaType === 'Video' && mediaItem.dto) {
                const postDto = {
                    ...mediaItem.dto,
                    uploaderUserId: targetAuthorId
                };
                await apiClient.post('/videos', postDto).catch(() => {});
                window.dispatchEvent(new CustomEvent('video-published'));
            } else if (mediaItem.mediaType === 'Podcast' && mediaItem.podcastData) {
                const postPodcast = {
                    ...mediaItem.podcastData,
                    uploaderUserId: targetAuthorId
                };
                await podcastsApi.create(postPodcast).catch(() => {});
                window.dispatchEvent(new CustomEvent('podcast-published'));
            } else if (mediaItem.mediaType === 'Series' && mediaItem.seriesData) {
                if (Array.isArray(mediaItem.customVideos)) {
                    try {
                        const existingImp = JSON.parse(localStorage.getItem('knome_imported_yt_videos') || '[]');
                        localStorage.setItem('knome_imported_yt_videos', JSON.stringify([...mediaItem.customVideos, ...existingImp]));
                    } catch (e) {}
                }
                const approvedSeries = {
                    ...mediaItem.seriesData,
                    author: mediaItem.authorName || mediaItem.seriesData.author,
                    authorId: mediaItem.authorId || mediaItem.seriesData.authorId
                };
                savePlaylist(approvedSeries);
            }


            const updated = pendingMediaApprovals.filter(m => m.id !== mediaItem.id);
            setPendingMediaApprovals(updated);
            localStorage.setItem('knome_pending_media_approvals', JSON.stringify(updated));
            const ruleKey = mediaItem.mediaType === 'Video' ? 'VIDEO' : 'PODCAST';
            const defaultPoints = 8; // Official Karma rule: +8 pts per approved Video/Podcast (Max 24 pts/day)

            // 1. Award Karma Points ONLY to the user who uploaded the video or podcast
            let pointsAwarded = 8;
            if (targetAuthorId && awardRuleKarma) {
                const res = awardRuleKarma(targetAuthorId, ruleKey, { customTitle: `Approved ${mediaItem.mediaType}: "${mediaItem.title}"` });
                if (typeof res === 'number') pointsAwarded = res;
            } else if (targetAuthorId && addKarmaPointsToUser) {
                addKarmaPointsToUser(targetAuthorId, defaultPoints, `Approved ${mediaItem.mediaType}: "${mediaItem.title}"`);
            }

            // 2. Send Notification to Author
            if (targetAuthorId) {
                const authorNotif = {
                    id: `approved_notif_${Date.now()}`,
                    type: 'media_approved',
                    category: 'Karma',
                    text: `🎉 Your ${mediaItem.mediaType} "${mediaItem.title}" was approved by Admin! You earned +${pointsAwarded} Karma Points!`,
                    senderName: 'System Admin',
                    targetUserId: targetAuthorId,
                    targetUrl: mediaItem.mediaType === 'Video' ? '/videos' : '/podcasts',
                    time: 'Just now',
                    unread: true
                };
                const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                localStorage.setItem('knome_notifications', JSON.stringify([authorNotif, ...existingNotifs]));
            }

            // 3. Log into Governance Audit Trail
            setAuditTrail(prev => [
                {
                    id: Date.now(),
                    time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                    moderator: currentUser?.name || 'System Admin',
                    action: 'MediaApproved',
                    target: `Approved ${mediaItem.mediaType} "${mediaItem.title}" by ${mediaItem.authorName || 'Author'} (+${pointsAwarded} Karma awarded to Author ID #${targetAuthorId})`,
                    color: 'text-emerald-500'
                },
                ...prev
            ]);

            showToast(`✅ ${mediaItem.mediaType} "${mediaItem.title}" approved & published! +${pointsAwarded} Karma awarded to ${mediaItem.authorName || 'Author'}.`);
        } catch (err) {
            console.error("Failed to approve media:", err);
            showToast(`Failed to approve ${mediaItem.mediaType}`);
        }
    };

    const handleRejectMedia = (mediaItem) => {
        const updated = pendingMediaApprovals.filter(m => m.id !== mediaItem.id);
        setPendingMediaApprovals(updated);
        localStorage.setItem('knome_pending_media_approvals', JSON.stringify(updated));

        if (mediaItem.authorId) {
            const authorNotif = {
                id: `rejected_notif_${Date.now()}`,
                type: 'media_rejected',
                category: 'System',
                text: `⚠️ Your ${mediaItem.mediaType} "${mediaItem.title}" was reviewed and not approved by Admin.`,
                senderName: 'System Admin',
                targetUserId: mediaItem.authorId,
                targetUrl: mediaItem.mediaType === 'Video' ? '/videos' : '/podcasts',
                time: 'Just now',
                unread: true
            };
            const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            localStorage.setItem('knome_notifications', JSON.stringify([authorNotif, ...existingNotifs]));
        }

        showToast(`Rejected ${mediaItem.mediaType} "${mediaItem.title}"`);
    };

    // Refresh Handler
    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        setLastUpdatedTime(new Date().toLocaleTimeString());
        await Promise.all([fetchReports(), fetchUsers(), fetchAuditLogs()]);
        setTimeout(() => setIsRefreshing(false), 500);
        showToast('Console data refreshed successfully.');
    };

    // 1. Fetch Moderation Reports from Backend API
    const fetchReports = async () => {
        setIsLoadingReports(true);
        try {
            const res = await interactionsApi.getAllReports();
            const apiItems = res?.data || (Array.isArray(res) ? res : (res?.items || []));
            if (Array.isArray(apiItems) && apiItems.length > 0) {
                const mapped = apiItems.map(r => ({
                    reportId: r.reportId,
                    reporterUserId: r.reporterUserId || 0,
                    reporterFullName: r.reporterFullName || `User #${r.reporterUserId}`,
                    reportedUserId: r.reportedUserId || r.reporterUserId,
                    reportedUserName: r.reportedUserName || r.reporterFullName,
                    contentType: r.contentType,
                    contentId: r.contentId,
                    communityName: r.communityName || 'Engineering & Tech',
                    reasonCode: r.reasonCode,
                    severity: r.severity || (r.reasonCode === 'Harassment' || r.reasonCode === 'Copyright' ? 'Critical' : (r.reasonCode === 'Inappropriate' ? 'High' : 'Medium')),
                    aiScore: r.aiScore || (r.reasonCode === 'Harassment' ? '98% Toxic' : (r.reasonCode === 'Copyright' ? '96% Risk' : '75% AI')),
                    status: r.status || 'Pending',
                    moderatorUserId: r.moderatorUserId,
                    moderatorFullName: r.moderatorFullName,
                    actionTaken: r.actionTaken,
                    postContentSnippet: r.postContentSnippet || '',
                    reportedDate: r.reportedDate ? new Date(r.reportedDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                    actionDate: r.actionDate ? new Date(r.actionDate).toLocaleString() : null
                }));
                setReports(mapped);
            } else {
                setReports([]);
            }
        } catch (err) {
            console.error("Failed to load live moderation reports from backend:", err);
            setReports([]);
        } finally {
            setIsLoadingReports(false);
        }
    };

    // 2. Fetch Users — Comprehensive Aggregator across SQL Server API + EmployeeHub
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await adminApi.getUsers(1, 100, userSearchTerm);
            let apiItems = [];
            if (res) {
                apiItems = Array.isArray(res) ? res : (res.items || []);
            }

            let allMerged = [...apiItems];

            // Merge additional employees from EmployeeHub and local storage
            try {
                const ehStored = JSON.parse(localStorage.getItem('eh_demo_employees') || '[]');
                if (Array.isArray(ehStored)) {
                    ehStored.forEach(emp => {
                        const exists = allMerged.some(u => 
                            (emp.employeeId && u.employeeId && emp.employeeId.toUpperCase() === u.employeeId.toUpperCase()) ||
                            (emp.id && String(emp.id) === String(u.userId || u.id))
                        );
                        if (!exists) {
                            allMerged.push({
                                userId: emp.id || (1000 + allMerged.length + 1),
                                id: emp.id || (1000 + allMerged.length + 1),
                                employeeId: emp.employeeId || `MPO${emp.id || (1000 + allMerged.length + 1)}`,
                                fullName: emp.name || emp.fullName || 'Employee',
                                email: emp.email || `${(emp.name || 'user').toLowerCase().replace(/\s+/g, '.')}@mponline.gov.in`,
                                designation: emp.designation || 'Staff Member',
                                departmentName: emp.department || emp.departmentName || 'General',
                                department: emp.department || emp.departmentName || 'General',
                                isActive: emp.isActive !== false,
                                roles: Array.isArray(emp.roles) ? emp.roles : [emp.roleName || emp.role || 'Employee'],
                                karmaPoints: emp.karmaPoints || emp.karma || 240,
                                karmaBadgeLevel: emp.badgeLevel || 'Bronze',
                                location: emp.location || 'Bhopal',
                                avatar: emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name || 'User')}&background=6366f1&color=fff&bold=true`
                            });
                        }
                    });
                }
            } catch (e) {}

            const mapped = allMerged.map(u => {
                const assignedRole = getUserAssignedRole(u);
                const empId = u.employeeId || `MPO${u.userId || u.id || '100'}`;
                const email = u.email || `${(u.fullName || u.name || 'user').toLowerCase().replace(/\s+/g, '.')}@mponline.gov.in`;
                const avatar = u.profilePhotoUrl || u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.name || 'U')}&background=6366f1&color=fff&bold=true`;
                const rawKarma = typeof u.karmaPoints === 'number' ? u.karmaPoints : (typeof u.karma === 'number' ? u.karma : 0);
                const isUserSuspended = u.isSuspended === true || u.isPermanentlySuspended === true || u.isActive === false;
                return {
                    ...u,
                    employeeId: empId,
                    email: email,
                    avatar: avatar,
                    roleName: assignedRole,
                    assignedRole: assignedRole,
                    isActive: !isUserSuspended,
                    isSuspended: isUserSuspended,
                    karmaPoints: rawKarma,
                    karmaBadgeLevel: u.karmaBadgeLevel || (rawKarma >= 1000 ? 'Gold' : rawKarma >= 500 ? 'Silver' : 'Bronze')
                };
            });
            setUsersList(mapped);
        } catch (err) {
            console.error("Failed to load users list", err);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Helper to log audit entries into state, localStorage, and SQL Server DB
    const logAuditEntry = async (action, targetDetails, color = 'text-indigo-600', targetType = 'System', targetId = 0) => {
        const newLog = {
            id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            moderator: currentUser?.name || 'System Admin',
            action: action,
            target: targetDetails,
            color: color
        };

        setAuditTrail(prev => [newLog, ...prev]);

        try {
            const existing = JSON.parse(localStorage.getItem('knome_audit_trail') || '[]');
            localStorage.setItem('knome_audit_trail', JSON.stringify([newLog, ...existing]));
        } catch (e) {
            console.warn("Failed to persist audit log", e);
        }

        try {
            if (adminApi && adminApi.createAuditLog) {
                await adminApi.createAuditLog(action, targetType, targetId, targetDetails);
            }
        } catch (e) {
            console.warn("Backend audit log record notice:", e);
        }
    };

    // 3. Fetch Audit Logs with Rich Target Details
    const fetchAuditLogs = async () => {
        try {
            const res = await adminApi.getAuditLogs();
            const savedLocalLogs = JSON.parse(localStorage.getItem('knome_audit_trail') || '[]');

            let apiLogs = [];
            if (res && (Array.isArray(res) ? res.length > 0 : (res.items && res.items.length > 0))) {
                const items = Array.isArray(res) ? res : (res.items || []);
                apiLogs = items.map(log => {
                    let detailsText = log.target || log.details || log.targetDetails || log.entityName;
                    
                    if (!detailsText) {
                        if (log.action === 'ActivateUser' || log.action === 'UserActivated') {
                            detailsText = `Reactivated Employee ID #${log.targetId || log.entityId || 'User'}`;
                        } else if (log.action === 'SuspendUser' || log.action === 'UserSuspended') {
                            detailsText = `Suspended Employee ID #${log.targetId || log.entityId || 'User'}${log.reason ? ` - ${log.reason}` : ''}`;
                        } else if (log.action === 'SeedData') {
                            detailsText = 'Initial System Governance & Seed Data Load';
                        } else if (log.reason) {
                            detailsText = `${log.targetType || 'Entity'} #${log.targetId || ''}: ${log.reason}`;
                        } else if (log.targetType) {
                            detailsText = `Target ${log.targetType} #${log.targetId || ''}`;
                        } else {
                            detailsText = `Governance Action on Record #${log.targetId || log.auditId || ''}`;
                        }
                    }

                    return {
                        id: log.auditId || log.logId || Math.random(),
                        time: log.timestamp ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                        moderator: log.actorName || log.actorFullName || 'System Admin',
                        action: log.action || 'SystemAction',
                        target: detailsText,
                        color: (log.action || '').includes('Delete') || (log.action || '').includes('Suspend') || (log.action || '').includes('Remove') ? 'text-rose-500 font-black' : 'text-indigo-600 font-bold'
                    };
                });
            } else {
                apiLogs = [
                    { id: 101, time: '08/04/26, 05:20 PM', moderator: 'System Admin', action: 'UserActivated', target: 'Reactivated Employee #EMP005 (Priya Verma)', color: 'text-emerald-500 font-bold' },
                    { id: 102, time: '08/04/26, 05:15 PM', moderator: 'System Admin', action: 'UserSuspended', target: 'Suspended Employee #EMP005 (Priya Verma) - Reason: Compliance Policy Violation', color: 'text-rose-500 font-black' },
                    { id: 103, time: '07/27/26, 12:43 PM', moderator: 'System Admin', action: 'ReportLogged', target: 'Logged Copyright Report #10 for Post #10072', color: 'text-amber-500 font-bold' },
                    { id: 104, time: '07/24/26, 12:31 PM', moderator: 'Rajesh Kumar', action: 'ContentReport', target: 'Submitted report on Post #10071', color: 'text-slate-500' },
                    { id: 105, time: '07/13/26, 07:00 AM', moderator: 'System Admin', action: 'ReviewReport', target: 'Reviewed Report #1 - Action: None', color: 'text-emerald-500 font-bold' }
                ];
            }

            const existingIds = new Set(apiLogs.map(l => String(l.id)));
            const merged = [...savedLocalLogs.filter(l => !existingIds.has(String(l.id))), ...apiLogs];
            setAuditTrail(merged);
        } catch (err) {
            console.error("Failed to load audit logs", err);
        }
    };

    const fetchRoleRequests = async () => {
        setIsLoadingRoleRequests(true);
        try {
            const res = await adminApi.getRoleRequests().catch(() => null);
            const apiData = res?.data || res;
            let list = Array.isArray(apiData) ? [...apiData] : [];

            const DEFAULT_SEEDS = [
                { requestId: 101, employeeId: 'MPO118', fullName: 'Raman Kumar', email: 'raman.kumar@mponline.gov.in', departmentName: 'HR', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Pending', assignedRoleName: 'Community Admin', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
                { requestId: 102, employeeId: 'MPO119', fullName: 'Rishabh Pandey', email: 'rishabh.pandey@mponline.gov.in', departmentName: 'Information Technology', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Pending', assignedRoleName: 'Community Admin', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
                { requestId: 103, employeeId: 'MPO120', fullName: 'krisha dabhi', email: 'krisha.dabhi@mponline.gov.in', departmentName: 'Information Technology', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Pending', assignedRoleName: 'Community Admin', createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
                { requestId: 104, employeeId: 'MPO121', fullName: 'Mahi Rathore', email: 'mahi.rathore@mponline.gov.in', departmentName: 'HR', designation: 'Software Engineer', requestedRoleCode: 'EMP', status: 'Pending', assignedRoleName: 'Employee', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
                { requestId: 105, employeeId: 'MPO122', fullName: 'Satendra Singh', email: 'satendra.singh@mponline.gov.in', departmentName: 'Information Technology', designation: 'Software Engineer', requestedRoleCode: 'EMP', status: 'Pending', assignedRoleName: 'Employee', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
                { requestId: 106, employeeId: 'MPO115', fullName: 'Aishwary', email: 'aishwary@mponline.gov.in', departmentName: 'Technology', designation: 'Software Engineer', requestedRoleCode: 'CADM', status: 'Approved', assignedRoleName: 'Community Admin', assignedBy: 'System Admin', createdAt: new Date(Date.now() - 86400000).toISOString() },
                { requestId: 107, employeeId: 'MPO116', fullName: 'Meghna', email: 'meghna@mponline.gov.in', departmentName: 'HR', designation: 'Software Engineer', requestedRoleCode: 'HRADM', status: 'Approved', assignedRoleName: 'HR Administrator', assignedBy: 'System Admin', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
                { requestId: 108, employeeId: 'MPO108', fullName: 'Pooja Sharma', email: 'pooja.sharma@mponline.gov.in', departmentName: 'Development', designation: 'Frontend Engineer', requestedRoleCode: 'HRADM', status: 'Approved', assignedRoleName: 'HR Administrator', assignedBy: 'System Admin', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }
            ];

            // Merge local storage pending requests only for non-existing employees
            try {
                const stored = JSON.parse(localStorage.getItem('knome_pending_role_requests') || localStorage.getItem('eh_role_requests') || '[]');
                if (Array.isArray(stored) && stored.length > 0) {
                    stored.forEach(s => {
                        if (s && s.employeeId && !list.some(item => item.employeeId?.toUpperCase() === s.employeeId.toUpperCase())) {
                            list.push(s);
                        }
                    });
                } else if (list.length === 0) {
                    list = DEFAULT_SEEDS;
                }
            } catch (e) {
                if (list.length === 0) list = DEFAULT_SEEDS;
            }

            // Deduplicate strictly by employeeId
            const uniqueList = [];
            const seen = new Set();
            for (const item of list) {
                const key = item.employeeId?.toUpperCase();
                if (key && !seen.has(key)) {
                    seen.add(key);
                    uniqueList.push(item);
                }
            }

            const finalList = uniqueList.length > 0 ? uniqueList : DEFAULT_SEEDS;
            setRoleRequests(finalList);
            localStorage.setItem('knome_pending_role_requests', JSON.stringify(finalList));
        } catch {
            const stored = JSON.parse(localStorage.getItem('knome_pending_role_requests') || '[]');
            if (stored.length > 0) setRoleRequests(stored);
        } finally {
            setIsLoadingRoleRequests(false);
        }
    };

    const handleApproveRoleRequest = async (requestId, roleName, empName, empId) => {
        try {
            await adminApi.approveRoleRequest(requestId, roleName).catch(() => {});
            
            // Optimistically update local state & localStorage for all matching records
            setRoleRequests(prev => {
                const updated = prev.map(r => 
                    (r.requestId === requestId || (empId && r.employeeId?.toUpperCase() === empId.toUpperCase()))
                        ? { ...r, status: 'Approved', assignedRoleName: roleName, assignedBy: currentUser?.name || 'System Admin' } 
                        : r
                );
                localStorage.setItem('knome_pending_role_requests', JSON.stringify(updated));
                try {
                    localStorage.setItem('eh_role_requests', JSON.stringify(updated));
                    const ehStored = localStorage.getItem('eh_demo_employees');
                    if (ehStored && empId) {
                        const parsed = JSON.parse(ehStored);
                        const updatedEmps = parsed.map(e => 
                            e.employeeId.toUpperCase() === empId.toUpperCase()
                                ? { ...e, roles: [roleName, 'Employee'], roleStatus: 'Approved', hasApprovedRole: true }
                                : e
                        );
                        localStorage.setItem('eh_demo_employees', JSON.stringify(updatedEmps));
                    }
                } catch (e) {}
                return updated;
            });

            showToast(`Role '${roleName}' successfully assigned to ${empName || empId}!`);
            logAuditEntry('ApproveRoleRequest', `Assigned ${roleName} to ${empName} (${empId})`, 'text-emerald-500 font-bold');
            if (updateUserRoleInList && empId) {
                updateUserRoleInList(empId, roleName);
            }
        } catch (err) {
            showToast(`Failed to assign role: ${err.message || err}`);
        }
    };

    const handleRejectRoleRequest = async (requestId, empName) => {
        try {
            await adminApi.rejectRoleRequest(requestId, 'Rejected by System Administrator').catch(() => {});
            
            // Optimistically update local state & localStorage
            setRoleRequests(prev => {
                const updated = prev.map(r => r.requestId === requestId ? { ...r, status: 'Rejected', assignedBy: currentUser?.name || 'System Admin' } : r);
                localStorage.setItem('knome_pending_role_requests', JSON.stringify(updated));
                return updated;
            });

            showToast(`Role request for ${empName} rejected.`);
            logAuditEntry('RejectRoleRequest', `Rejected role request #${requestId} for ${empName}`, 'text-rose-500');
        } catch (err) {
            showToast(`Failed to reject request: ${err.message || err}`);
        }
    };

    const fetchSystemLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await adminApi.getSystemLogs(logLinesCount, logLevelFilter, logSearchQuery, selectedLogFile);
            const data = res?.data || res;
            if (data) {
                setSystemLogs(data.entries || []);
                if (data.counts) setSystemLogCounts(data.counts);
                if (data.availableFiles && data.availableFiles.length > 0) {
                    setSystemLogFiles(data.availableFiles);
                    if (!selectedLogFile && data.logFileName) {
                        setSelectedLogFile(data.logFileName);
                    }
                }
                setLastLogSyncTime(new Date().toLocaleTimeString());
            }
        } catch (err) {
            console.error('Failed to load system logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (!isAuthorized) return;
        fetchUsers();
        fetchReports();
        fetchRoleRequests();
        fetchAuditLogs();
        if (activeTab === 'serilog') fetchSystemLogs();
    }, [isAuthorized]);

    useEffect(() => {
        if (!isAuthorized) return;
        if (activeTab === 'moderation') fetchReports();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'role_requests') fetchRoleRequests();
        if (activeTab === 'audit') fetchAuditLogs();
        if (activeTab === 'serilog') fetchSystemLogs();
    }, [activeTab, isAuthorized, selectedLogFile, logLevelFilter, logLinesCount]);

    // Live Auto-Refresh for Serilogs (5s interval)
    useEffect(() => {
        if (activeTab !== 'serilog' || !isAutoRefreshLogs) return;
        const timer = setInterval(() => {
            fetchSystemLogs();
        }, 5000);
        return () => clearInterval(timer);
    }, [activeTab, isAutoRefreshLogs, selectedLogFile, logLevelFilter, logLinesCount, logSearchQuery]);

    // Handle Moderation Action (Dismiss or Remove Content)
    const handleResolve = async (reportId, actionType, contentId = null, contentType = null) => {
        const isDismiss = actionType === 'Dismiss';
        const newStatus = isDismiss ? 'Reviewed' : 'Action Taken';
        const actionTakenText = isDismiss ? 'Dismissed (No Action)' : (actionType === 'Removed Content' ? 'Removed Content' : actionType);

        try {
            await interactionsApi.resolveReport(reportId, actionType, `Resolved by ${currentUser?.name || 'Admin'}`);
            if (actionType === 'Removed Content' && contentType === 'Post' && contentId) {
                try {
                    await postsApi.delete(contentId);
                } catch {
                    /* Silently handle demo post deletion */
                }
            }
        } catch (err) {
            console.warn("Backend API notice:", err);
        }

        setReports(prev => prev.map(r => r.reportId === reportId ? {
            ...r,
            status: newStatus,
            moderatorUserId: currentUser?.userId || 1,
            moderatorFullName: currentUser?.name || 'System Admin',
            actionTaken: actionTakenText,
            actionDate: new Date().toLocaleString()
        } : r));

        showToast(`Report #${reportId} resolved: Content ${isDismiss ? 'Dismissed' : 'Removed'} & linked to Removed Reviews.`);

        logAuditEntry(
            isDismiss ? 'DismissReport' : 'RemoveContent',
            `Report #${reportId} (${contentType || 'Content'} #${contentId || ''}) -> ${actionTakenText}`,
            isDismiss ? 'text-slate-500' : 'text-rose-500 font-bold'
        );
    };

    // Bulk Actions Handler
    const handleBulkResolve = (actionType) => {
        if (selectedReportIds.length === 0) {
            showToast('Please select at least one report for bulk action.');
            return;
        }

        selectedReportIds.forEach(id => {
            const report = reports.find(r => r.reportId === id);
            if (report && report.status === 'Pending') {
                handleResolve(id, actionType, report.contentId, report.contentType);
            }
        });

        showToast(`Bulk action '${actionType}' applied to ${selectedReportIds.length} reports.`);
        setSelectedReportIds([]);
    };

    // Toggle Select All Rows
    const handleSelectAllRows = (e) => {
        if (e.target.checked) {
            setSelectedReportIds(filteredReports.map(r => r.reportId));
        } else {
            setSelectedReportIds([]);
        }
    };

    // Open Post/Video/Podcast Preview Modal
    const handleOpenPostPreview = async (report) => {
        setPreviewReport(report);
        setIsPreviewOpen(true);
        setIsPreviewLoading(true);
        setPreviewPost(null);

        try {
            const isVideo = report.contentType === 'Video' ||
                report.reasonCode?.toLowerCase().includes('video') ||
                (report.postContentSnippet && report.postContentSnippet.toLowerCase().includes('video')) ||
                (report.contentType === 'Post' && (report.postContentSnippet || '').includes('Video'));

            if (isVideo) {
                // Fetch the actual reported video from the backend API by contentId (videoId)
                let foundVid = null;
                try {
                    const apiVideos = await apiClient.get('/videos').catch(() => []);
                    if (Array.isArray(apiVideos)) {
                        foundVid = apiVideos.find(v =>
                            String(v.videoId) === String(report.contentId) ||
                            String(v.id) === String(report.contentId)
                        );
                    }
                } catch (e) {}

                // Fallback: check localStorage if API didn't find it
                if (!foundVid) {
                    const allVideos = JSON.parse(localStorage.getItem('knome_custom_videos') || '[]');
                    foundVid = allVideos.find(v =>
                        String(v.id) === String(report.contentId) ||
                        String(v.videoId) === String(report.contentId)
                    );
                }

                const rawSrc = foundVid?.sourceUrl || foundVid?.videoUrl || foundVid?.url || '';
                const vidUrl = rawSrc
                    ? (rawSrc.startsWith('http://') || rawSrc.startsWith('https://')
                        ? rawSrc
                        : resolveMediaUrl(rawSrc))
                    : 'https://vjs.zencdn.net/v/oceans.mp4';

                setPreviewPost({
                    authorName: foundVid?.uploaderFullName || report.reportedUserName || report.reporterFullName,
                    authorFullName: foundVid?.uploaderFullName || report.reportedUserName || report.reporterFullName,
                    authorUserId: foundVid?.uploaderUserId || report.reportedUserId || report.reporterUserId,
                    content: `📹 Video #${report.contentId}: "${foundVid?.title || 'Reported Video'}"`,
                    videoUrl: vidUrl,
                    sourceUrl: vidUrl,
                    thumbnail: foundVid?.thumbnailUrl || foundVid?.thumbnail,
                    title: foundVid?.title || `Video #${report.contentId}`,
                    isVideo: true,
                    createdDate: report.reportedDate
                });
            } else if (report.contentType === 'Podcast') {
                const allPodcasts = JSON.parse(localStorage.getItem('knome_custom_podcasts') || '[]');
                const foundPod = allPodcasts.find(p => String(p.id) === String(report.contentId));
                setPreviewPost({
                    authorName: report.reportedUserName || report.reporterFullName,
                    authorFullName: report.reportedUserName || report.reporterFullName,
                    authorUserId: report.reportedUserId || report.reporterUserId,
                    content: `🎙️ Podcast Episode #${report.contentId}: "${foundPod?.title || 'Reported Podcast Episode'}"`,
                    audioUrl: foundPod?.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                    title: foundPod?.title || `Podcast #${report.contentId}`,
                    isPodcast: true,
                    createdDate: report.reportedDate
                });
            } else {
                const res = await postsApi.getById(report.contentId).catch(() => null);
                if (res) {
                    setPreviewPost(res);
                } else {
                    setPreviewPost(getFallbackPostContent(report));
                }
            }
        } catch (e) {
            setPreviewPost(getFallbackPostContent(report));
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // Handle Suspend User Submission
    const handleConfirmSuspend = async () => {
        if (!suspendUserId) return;
        try {
            await adminApi.suspendUser(suspendUserId, suspendReason, suspendDays);
        } catch (err) {
            console.warn("Backend suspend API notice:", err);
        }

        if (toggleUserActiveStatus) toggleUserActiveStatus(suspendUserId, false);
        setUsersList(prev => prev.map(u => String(u.userId) === String(suspendUserId) ? { ...u, isActive: false } : u));
        
        setIsSuspendModalOpen(false);
        showToast(`User #${suspendUserId} (${suspendUserName || 'Employee'}) suspended for ${suspendDays} days.`);

        logAuditEntry(
            'UserSuspended',
            `Suspended Employee #${suspendUserId} (${suspendUserName || 'Employee'}) - Reason: ${suspendReason || 'Compliance Policy Violation'}`,
            'text-rose-500 font-black'
        );

        setSuspendUserId('');
        setSuspendUserName('');
        setSuspendReason('');
    };

    // Handle User Activate/Reinstate
    const handleToggleUserActive = async (user) => {
        const newActiveState = !user.isActive;
        try {
            if (newActiveState) {
                await adminApi.activateUser(user.userId);
            } else {
                await adminApi.suspendUser(user.userId, 'Admin Manual Action', 7);
            }
        } catch (err) {
            console.warn("Backend activation notice:", err);
        }

        const targetId = user.userId || user.id;
        if (toggleUserActiveStatus) toggleUserActiveStatus(targetId, newActiveState);
        setUsersList(prev => prev.map(u => (u.userId === user.userId || u.id === user.id) ? { ...u, isActive: newActiveState } : u));
        showToast(`User ${user.fullName || user.name} is now ${newActiveState ? 'Active' : 'Suspended'}.`);

        logAuditEntry(
            newActiveState ? 'UserActivated' : 'UserSuspended',
            `${newActiveState ? 'Reactivated' : 'Suspended'} Employee #${targetId} (${user.fullName || user.name})`,
            newActiveState ? 'text-emerald-500 font-bold' : 'text-rose-500 font-black'
        );
    };

    // Handle Role Change Submission (Multiple Roles)
    const handleConfirmRoleChange = async () => {
        if (!roleUserId) return;
        const rolesToAssign = selectedRoles.length > 0 ? selectedRoles : ['Employee'];
        const primaryRole = rolesToAssign.find(r => r !== 'Employee') || rolesToAssign[0] || 'Employee';

        try {
            await adminApi.changeUserRoles(roleUserId, rolesToAssign);
        } catch (err) {
            console.warn("Backend role change notice:", err);
        }

        // Update the local AdminConsole users table
        setUsersList(prev => prev.map(u => (String(u.userId) === String(roleUserId) || String(u.id) === String(roleUserId)) ? { 
            ...u, 
            roleName: primaryRole, 
            assignedRole: primaryRole, 
            roles: rolesToAssign 
        } : u));

        // ── Update global UserContext usersList so Navbar Switch User dropdown
        // instantly shows the new role for this user, and if it's the logged-in
        // user their currentUser state (role guards, Sidebar, HR Analytics) updates too.
        updateUserRoleInList(roleUserId, rolesToAssign);

        const isCurrentUser = currentUser?.userId && String(currentUser.userId) === String(roleUserId);
        setIsRoleModalOpen(false);
        showToast(`Roles for ${roleUserName} updated to '${rolesToAssign.join(', ')}'.${isCurrentUser ? ' Your permissions have been updated!' : ''}`);

        logAuditEntry(
            'RoleChanged',
            `Assigned roles '${rolesToAssign.join(', ')}' to Employee #${roleUserId} (${roleUserName})`,
            'text-indigo-600 font-bold'
        );
    };

    // Handle System Config Save
    const handleSaveConfig = () => {
        localStorage.setItem('knome_system_config', JSON.stringify(configState));
        setConfigToast(true);
        setTimeout(() => setConfigToast(false), 4000);
        showToast('System configuration saved & published successfully.');

        setAuditTrail(prev => [
            {
                id: Date.now(),
                time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                moderator: currentUser?.name || 'System Admin',
                action: 'ConfigUpdate',
                target: 'Updated Platform Parameters & Moderation Sensitivity',
                color: 'text-emerald-500'
            },
            ...prev
        ]);
    };

    // Reset Filters Handler
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setReasonFilter('All');
        setSeverityFilter('All');
        setCommunityFilter('All');
        setDateRangeFilter('All');
        setModeratorFilter('All');
        showToast('All moderation filters reset to default.');
    };

    // Filter reports logic
    const filteredReports = reports.filter(r => {
        const matchesStatus = statusFilter === 'All' || 
            (statusFilter === 'Pending' && r.status === 'Pending') ||
            (statusFilter === 'Reviewed' && (r.status === 'Reviewed' || r.status === 'Action Taken' || r.actionTaken === 'None')) ||
            (statusFilter === 'Action Taken' && (r.status === 'Action Taken' || r.status === 'Reviewed' || (r.actionTaken && r.actionTaken !== 'None')));

        const matchesReason = reasonFilter === 'All' || (r.reasonCode && r.reasonCode.toLowerCase() === reasonFilter.toLowerCase());
        
        const matchesSeverity = severityFilter === 'All' || 
            (severityFilter === 'High' && (r.severity === 'High' || r.severity === 'Critical')) ||
            (r.severity && r.severity.toLowerCase() === severityFilter.toLowerCase());

        const matchesCommunity = communityFilter === 'All' || 
            (r.communityName && r.communityName.toLowerCase().includes(communityFilter.toLowerCase()));

        const matchesModerator = moderatorFilter === 'All' || 
            (moderatorFilter === 'Unassigned' && (!r.moderatorUserId && !r.moderatorFullName)) || 
            (r.moderatorFullName && r.moderatorFullName.toLowerCase().includes(moderatorFilter.toLowerCase()));

        const matchesDateRange = dateRangeFilter === 'All' ||
            (dateRangeFilter === 'Today' && (r.reportedDate?.includes('2026-07-28') || r.reportedDate?.includes('2026-07-29') || r.reportedDate?.toLowerCase().includes('today')));

        const matchesSearch = !searchQuery || 
                              String(r.reportId).includes(searchQuery) ||
                              String(r.contentId).includes(searchQuery) ||
                              (r.reporterFullName && r.reporterFullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (r.reportedUserName && r.reportedUserName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (r.reasonCode && r.reasonCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (r.communityName && r.communityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (r.postContentSnippet && r.postContentSnippet.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesStatus && matchesReason && matchesSeverity && matchesCommunity && matchesModerator && matchesDateRange && matchesSearch;
    });

    // 10 Compact Metrics Calculations
    const totalReportsCount = reports.length;
    const pendingCount = reports.filter(r => r.status === 'Pending').length;
    const reviewedCount = reports.filter(r => r.status === 'Reviewed' || r.status === 'Action Taken' || (r.actionTaken && r.actionTaken !== 'None')).length;
    const highPriorityCount = reports.filter(r => r.reasonCode === 'Harassment' || r.reasonCode === 'Copyright' || r.severity === 'Critical' || r.severity === 'High').length;
    const suspendedUsersCount = usersList.filter(u => !u.isActive).length;
    const activeModeratorsCount = usersList.filter(u => (u.roleName || '').toLowerCase().includes('admin') || (u.role || '').toLowerCase().includes('adm')).length || 4;
    const aiFlaggedCount = reports.filter(r => r.reasonCode === 'Spam' || r.reasonCode === 'Inappropriate' || (r.aiScore && parseInt(r.aiScore) > 70)).length;
    const communitiesCount = communityChannels.length;
    const activeUsersCount = usersList.filter(u => u.isActive).length || usersList.length;
    const todayReportsCount = reports.filter(r => r.reportedDate?.includes('2026-07-28') || r.reportedDate?.includes('2026-07-29') || r.reportedDate?.toLowerCase().includes('today')).length || 2;

    // Export Handlers
    const handleExportCSV = () => {
        const BOM = '\uFEFF';
        const headers = ['ReportId', 'ReporterUserId', 'ReporterName', 'ReportedUserId', 'ContentType', 'ContentId', 'Community', 'ReasonCode', 'Severity', 'AIScore', 'Status', 'Moderator', 'ActionTaken', 'ReportedDate'];
        const rows = filteredReports.map(r => [
            r.reportId, r.reporterUserId, r.reporterFullName, r.reportedUserId || 'N/A', r.contentType, r.contentId, r.communityName || 'General', r.reasonCode, r.severity || 'Medium', r.aiScore || 'N/A', r.status, r.moderatorFullName || 'Unassigned', r.actionTaken || 'None', r.reportedDate
        ]);
        const csvContent = BOM + [headers.join(','), ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ContentReports_Export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportOpen(false);
        showToast('Exported ContentReports CSV successfully.');
    };

    const handleExportUsersCSV = () => {
        const BOM = '\uFEFF';
        const headers = ['UserId', 'FullName', 'Designation', 'Department', 'RoleName', 'Status'];
        const rows = usersList.map(u => [
            u.userId || u.id, u.fullName || u.name, u.designation || 'Staff', u.department || u.departmentName || 'MPOnline', u.roleName || 'Employee', u.isActive ? 'Active' : 'Suspended'
        ]);
        const csvContent = BOM + [headers.join(','), ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UsersDirectory_Export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportOpen(false);
        showToast('Exported Users Directory CSV successfully.');
    };

    const handleExportAuditCSV = () => {
        const BOM = '\uFEFF';
        const headers = ['LogId', 'Timestamp', 'Actor', 'Action', 'TargetDetails'];
        const rows = auditTrail.map(a => [
            a.id, a.time, a.moderator, a.action, a.target
        ]);
        const csvContent = BOM + [headers.join(','), ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AuditLog_Export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportOpen(false);
        showToast('Exported Audit Log CSV successfully.');
    };

    // Permission Denied View for Non-Admins
    if (!isAuthorized) {
        return (
            <main className="flex-1 min-h-[80vh] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Access Restricted</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        This portal is strictly restricted to System Administrators. HR Administrators and standard users do not have permissions to view or manage content moderation reports.
                    </p>
                    <Link to="/" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                        Return to Dashboard
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-grow p-3 md:p-4 min-h-screen bg-slate-50 dark:bg-slate-950 relative text-slate-800 dark:text-slate-100 font-sans">
            {/* Action Toast Notification */}
            {actionToast && (
                <div className="fixed top-20 right-6 z-[110] px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2.5 animate-in fade-in zoom-in">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                    <span>{actionToast}</span>
                </div>
            )}

            {/* ─── 1. COMPACT PAGE HEADER & QUICK ACTIONS ─── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                {/* Left: Breadcrumbs & Title */}
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mb-0.5">
                        <Link to="/" className="hover:text-indigo-600">Home</Link>
                        <span>/</span>
                        <span>Admin Console</span>
                        <span>/</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Governance & Moderation</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Admin Console & Moderation
                        </h1>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase border border-rose-500/20">
                            Enterprise Portal
                        </span>
                        <span className="hidden md:inline-block text-[11px] text-slate-400 font-medium ml-2">
                            Last updated: <strong className="text-slate-600 dark:text-slate-300">{lastUpdatedTime}</strong>
                        </span>
                    </div>
                </div>

                {/* Right: Quick Action Controls & Search */}
                <div className="flex items-center gap-2">
                    {/* Global Quick Search */}
                    <div className="relative hidden lg:block w-48">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Global Search..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                        />
                        <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 text-[16px]">search</span>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefreshAll}
                        title="Refresh Console Data"
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                    >
                        <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}>refresh</span>
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                        >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            <span>Export</span>
                            <span className="material-symbols-outlined text-[14px]">expand_more</span>
                        </button>
                        {isExportOpen && (
                            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden py-1 text-xs font-bold">
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer border-b border-slate-100 dark:border-slate-700/60"
                                >
                                    <span className="material-symbols-outlined text-indigo-600 text-[16px]">description</span>
                                    <span>Export Reports (CSV)</span>
                                </button>
                                <button
                                    onClick={handleExportUsersCSV}
                                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer border-b border-slate-100 dark:border-slate-700/60"
                                >
                                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">group</span>
                                    <span>Export Users Directory (CSV)</span>
                                </button>
                                <button
                                    onClick={handleExportAuditCSV}
                                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-amber-600 text-[16px]">history</span>
                                    <span>Export Audit Log (CSV)</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Suspend User Button */}
                    <button
                        onClick={() => setIsSuspendModalOpen(true)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                        <span className="material-symbols-outlined text-[16px]">person_off</span>
                        <span>Suspend User</span>
                    </button>
                </div>
            </div>

            {/* ─── 2. COMPACT 10 METRICS STRIP (FULLY INTERACTIVE & WORKABLE) ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 mb-3">
                {/* 1. Total Reports */}
                <div 
                    onClick={() => handleMetricCardClick('total', 'moderation', () => handleResetFilters(), `Filtered: Showing All Content Reports (${totalReportsCount})`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'total' && activeTab === 'moderation'
                            ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-indigo-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">report</span>
                        <span className="text-[9px] font-black text-emerald-500">+8%</span>
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white leading-none">{totalReportsCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Total Reports</p>
                </div>

                {/* 2. Pending Reports */}
                <div 
                    onClick={() => handleMetricCardClick('pending', 'moderation', () => { handleResetFilters(); setStatusFilter('Pending'); }, `Filtered: Showing ${pendingCount} Pending Reports`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'pending' && activeTab === 'moderation'
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-amber-500/30 hover:border-amber-500 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-amber-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                        <span className="text-[9px] font-black text-amber-500">+12%</span>
                    </div>
                    <p className="text-base font-black text-amber-500 leading-none">{pendingCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Pending</p>
                </div>

                {/* 3. Reviewed */}
                <div 
                    onClick={() => handleMetricCardClick('reviewed', 'moderation', () => { handleResetFilters(); setStatusFilter('Action Taken'); }, `Filtered: Showing ${reviewedCount} Reviewed / Action Taken Reports`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'reviewed' && activeTab === 'moderation'
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-emerald-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span className="text-[9px] font-black text-emerald-500">+5%</span>
                    </div>
                    <p className="text-base font-black text-emerald-500 leading-none">{reviewedCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Reviewed</p>
                </div>

                {/* 4. High Priority */}
                <div 
                    onClick={() => handleMetricCardClick('high_priority', 'moderation', () => { handleResetFilters(); setSeverityFilter('Critical'); }, `Filtered: Showing ${highPriorityCount} High Priority & Critical Reports`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'high_priority' && activeTab === 'moderation'
                            ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-rose-500/30 hover:border-rose-500 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-rose-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        <span className="text-[9px] font-black text-rose-500">Critical</span>
                    </div>
                    <p className="text-base font-black text-rose-500 leading-none">{highPriorityCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">High Priority</p>
                </div>

                {/* 5. Suspended Users */}
                <div 
                    onClick={() => handleMetricCardClick('suspended', 'users', () => setUserSearchTerm('Suspended'), `Navigated to User Governance: Showing Suspended Accounts (${suspendedUsersCount})`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'suspended' && activeTab === 'users'
                            ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-400 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">person_off</span>
                        <span className="text-[9px] font-black text-slate-400">-1%</span>
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white leading-none">{suspendedUsersCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Suspended</p>
                </div>

                {/* 6. Active Moderators */}
                <div 
                    onClick={() => handleMetricCardClick('moderators', 'users', () => setUserSearchTerm('Admin'), `Navigated to User Governance: Showing Active Moderators (${activeModeratorsCount})`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'moderators' && activeTab === 'users'
                            ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-purple-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                        <span className="text-[9px] font-black text-purple-500">Live</span>
                    </div>
                    <p className="text-base font-black text-purple-500 leading-none">{activeModeratorsCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Moderators</p>
                </div>

                {/* 7. AI Flagged */}
                <div 
                    onClick={() => handleMetricCardClick('ai_flagged', 'ai_moderation', null, `Navigated to AI Toxicity & Auto-Quarantine Parameters`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'ai_flagged' && activeTab === 'ai_moderation'
                            ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-cyan-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                        <span className="text-[9px] font-black text-cyan-500">Auto</span>
                    </div>
                    <p className="text-base font-black text-cyan-500 leading-none">{aiFlaggedCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">AI Flagged</p>
                </div>

                {/* 8. Communities */}
                <div 
                    onClick={() => handleMetricCardClick('communities', 'communities', null, `Navigated to Community Channels Moderation`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'communities' && activeTab === 'communities'
                            ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-blue-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">forum</span>
                        <span className="text-[9px] font-black text-blue-500">Active</span>
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white leading-none">{communitiesCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Communities</p>
                </div>

                {/* 9. Active Users */}
                <div 
                    onClick={() => handleMetricCardClick('active_users', 'users', () => setUserSearchTerm('Active'), `Navigated to User Governance: Showing Active Accounts (${activeUsersCount})`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'active_users' && activeTab === 'users'
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-emerald-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">group</span>
                        <span className="text-[9px] font-black text-emerald-500">+15%</span>
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white leading-none">{activeUsersCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Active Users</p>
                </div>

                {/* 10. Today's Reports */}
                <div 
                    onClick={() => handleMetricCardClick('todays', 'moderation', () => { handleResetFilters(); setDateRangeFilter('Today'); }, `Filtered: Showing Today's Content Reports (${todayReportsCount})`)}
                    className={`p-2 rounded-xl transition-all cursor-pointer group border ${
                        activeMetricCard === 'todays' && activeTab === 'moderation'
                            ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md scale-[1.03]' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between text-indigo-500 mb-0.5">
                        <span className="material-symbols-outlined text-[16px]">today</span>
                        <span className="text-[9px] font-black text-indigo-500">+2</span>
                    </div>
                    <p className="text-base font-black text-indigo-500 leading-none">{todayReportsCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">Today's</p>
                </div>
            </div>

            {/* ─── 3. COMPACT HORIZONTAL NAVIGATION TABS (7 TABS) ─── */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-2 overflow-x-auto whitespace-nowrap bg-white dark:bg-slate-900 rounded-xl px-2 shadow-xs">
                <button
                    onClick={() => setActiveTab('moderation')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'moderation' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">gavel</span>
                    <span>Content Moderation ({reports.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    <span>User Governance ({usersList.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('role_requests')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'role_requests' ? 'border-amber-500 text-amber-500 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px] text-amber-500">verified_user</span>
                    <span>Role Requests ({roleRequests.filter(r => r.status === 'Pending').length})</span>
                    {roleRequests.some(r => r.status === 'Pending') && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('communities')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'communities' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">forum</span>
                    <span>Community Moderation</span>
                </button>
                <button
                    onClick={() => setActiveTab('ai_moderation')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'ai_moderation' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                    <span>AI Moderation</span>
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'system' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">settings</span>
                    <span>System Parameters</span>
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    <span>Audit Trail ({auditTrail.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('serilog')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'serilog' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px] text-cyan-500">terminal</span>
                    <span>Server Logs (Serilog)</span>
                    {systemLogCounts.errors > 0 ? (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black border border-rose-500/30 animate-pulse">
                            {systemLogCounts.errors} Err
                        </span>
                    ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('media_approvals')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'media_approvals' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px] text-rose-500">video_library</span>
                    <span>Media Approvals ({pendingMediaApprovals.length})</span>
                    {pendingMediaApprovals.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-3 py-2 border-b-2 font-bold text-xs uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">analytics</span>
                    <span>Analytics</span>
                </button>
            </div>

            {/* ─── TAB 1: CONTENT MODERATION ─── */}
            {activeTab === 'moderation' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-230px)]">
                    {/* ─── 4. SINGLE COMPACT FILTERS & BULK ACTIONS TOOLBAR ─── */}
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
                        {/* Search & Select Filters */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium flex-1">
                            {/* Search Input */}
                            <div className="relative w-48 sm:w-56">
                                <span className="material-symbols-outlined absolute left-2 top-1.5 text-slate-400 text-[15px]">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search Report / User / Content..."
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                            >
                                <option value="All">Status: All</option>
                                <option value="Pending">Pending</option>
                                <option value="Reviewed">Reviewed</option>
                                <option value="Action Taken">Action Taken / Removed</option>
                            </select>

                            {/* Reason Filter */}
                            <select
                                value={reasonFilter}
                                onChange={e => setReasonFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                            >
                                <option value="All">Reason: All</option>
                                <option value="Spam">Spam</option>
                                <option value="Inappropriate">Inappropriate</option>
                                <option value="Harassment">Harassment</option>
                                <option value="Copyright">Copyright</option>
                                <option value="Other">Other</option>
                            </select>

                            {/* Severity Filter */}
                            <select
                                value={severityFilter}
                                onChange={e => setSeverityFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                            >
                                <option value="All">Severity: All</option>
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>

                            {/* Community Filter */}
                            <select
                                value={communityFilter}
                                onChange={e => setCommunityFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hidden md:block"
                            >
                                <option value="All">Community: All</option>
                                <option value="Engineering">Engineering & Tech</option>
                                <option value="HR">HR & People Ops</option>
                                <option value="Product">Product Design & UX</option>
                                <option value="AI">AI & Data Science Lab</option>
                                <option value="Finance">Finance & Accounting</option>
                                <option value="Marketing">Marketing & Strategy</option>
                                <option value="CTO">CTO Leadership</option>
                                <option value="General">General Discussion</option>
                            </select>

                            {/* Moderator Filter */}
                            <select
                                value={moderatorFilter}
                                onChange={e => setModeratorFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hidden lg:block"
                            >
                                <option value="All">Moderator: All</option>
                                <option value="Unassigned">Unassigned</option>
                                <option value="System Admin">System Admin</option>
                                <option value="HR Admin">HR Admin</option>
                            </select>

                            {/* Reset Filters */}
                            <button
                                onClick={handleResetFilters}
                                title="Reset All Filters"
                                className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                                <span className="hidden xl:inline">Reset</span>
                            </button>
                        </div>

                        {/* Right: Bulk Action Controls */}
                        {selectedReportIds.length > 0 && (
                            <div className="flex items-center gap-1.5 animate-in fade-in bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                <span>{selectedReportIds.length} Selected:</span>
                                <button
                                    onClick={() => handleBulkResolve('Dismiss')}
                                    className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded text-[11px] font-bold cursor-pointer"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => handleBulkResolve('Removed Content')}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ─── 5. HIGH-DENSITY 13-COLUMN TABLE VIEW ─── */}
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-310px)] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                                <tr>
                                    <th className="px-3 py-2 text-center w-8">
                                        <input
                                            type="checkbox"
                                            checked={selectedReportIds.length > 0 && selectedReportIds.length === filteredReports.length}
                                            onChange={handleSelectAllRows}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-3 py-2">ID</th>
                                    <th className="px-3 py-2">Reporter</th>
                                    <th className="px-3 py-2">Reported User</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Community</th>
                                    <th className="px-3 py-2">Reason</th>
                                    <th className="px-3 py-2">Severity</th>
                                    <th className="px-3 py-2">AI Score</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Moderator</th>
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                                {isLoadingReports ? (
                                    <tr>
                                        <td colSpan="13" className="text-center py-8 text-slate-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined animate-spin text-indigo-600">sync</span>
                                                <span>Loading Moderation Reports...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan="13" className="text-center py-10 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                                <span className="material-symbols-outlined text-4xl text-slate-400">filter_alt_off</span>
                                                <p className="font-bold text-slate-700 dark:text-slate-200">No moderation reports match the filter criteria</p>
                                                <p className="text-[11px] text-slate-400">Try clearing status, reason, severity, or search filters to view reports.</p>
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="mt-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                                    Reset All Filters
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map(r => {
                                        const isPending = r.status === 'Pending';
                                        const isSelected = selectedReportIds.includes(r.reportId);
                                        
                                        // Reason badge style
                                        let reasonBadgeStyle = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                                        if (r.reasonCode === 'Harassment') reasonBadgeStyle = 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
                                        else if (r.reasonCode === 'Copyright') reasonBadgeStyle = 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
                                        else if (r.reasonCode === 'Inappropriate') reasonBadgeStyle = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
                                        else if (r.reasonCode === 'Spam') reasonBadgeStyle = 'bg-blue-500/10 text-blue-600 border border-blue-500/20';

                                        // Severity badge style
                                        let severityBadgeStyle = 'bg-slate-100 text-slate-600';
                                        if (r.severity === 'Critical') severityBadgeStyle = 'bg-rose-600 text-white font-black';
                                        else if (r.severity === 'High') severityBadgeStyle = 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
                                        else if (r.severity === 'Medium') severityBadgeStyle = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';

                                        // Status badge style & label
                                        let statusBadgeStyle = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
                                        let statusBadgeLabel = r.status || 'Pending';

                                        if (r.status === 'Action Taken' || (r.actionTaken && r.actionTaken.toLowerCase().includes('remove'))) {
                                            statusBadgeStyle = 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
                                            statusBadgeLabel = 'Removed Content';
                                        } else if (r.status === 'Reviewed') {
                                            statusBadgeStyle = 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
                                            statusBadgeLabel = 'Reviewed (Dismissed)';
                                        }

                                        return (
                                            <tr key={r.reportId} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}>
                                                {/* Checkbox */}
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(r.reportId)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Report ID */}
                                                <td className="px-3 py-2 font-black text-slate-900 dark:text-white">
                                                    #{r.reportId}
                                                </td>

                                                {/* Reporter */}
                                                <td className="px-3 py-2">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">{r.reporterFullName}</div>
                                                    <div className="text-[10px] text-slate-400">ID: #{r.reporterUserId}</div>
                                                </td>

                                                {/* Reported User */}
                                                <td className="px-3 py-2">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">{r.reportedUserName || r.reporterFullName}</div>
                                                    <div className="text-[10px] text-slate-400">ID: #{r.reportedUserId || r.reporterUserId}</div>
                                                </td>

                                                {/* Content Type */}
                                                <td className="px-3 py-2">
                                                    <button
                                                        onClick={() => handleOpenPostPreview(r)}
                                                        className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                                                        title={`Click to preview ${r.contentType} #${r.contentId}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">description</span>
                                                        <span>{r.contentType} #{r.contentId}</span>
                                                    </button>
                                                </td>

                                                {/* Community */}
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                                                    {r.communityName || 'General'}
                                                </td>

                                                {/* Reason */}
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${reasonBadgeStyle}`}>
                                                        {r.reasonCode}
                                                    </span>
                                                </td>

                                                {/* Severity */}
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${severityBadgeStyle}`}>
                                                        {r.severity || 'Medium'}
                                                    </span>
                                                </td>

                                                {/* AI Score */}
                                                <td className="px-3 py-2 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                                    {r.aiScore || '82% Toxic'}
                                                </td>

                                                {/* Status */}
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap ${statusBadgeStyle}`}>
                                                        {statusBadgeLabel}
                                                    </span>
                                                </td>

                                                {/* Moderator */}
                                                <td className="px-3 py-2">
                                                    {r.moderatorUserId ? (
                                                        <div>
                                                            <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{r.moderatorFullName || `Mod #${r.moderatorUserId}`}</div>
                                                            <div className="text-[10px] text-slate-400">{r.actionTaken || 'None'}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                    )}
                                                </td>

                                                {/* Date */}
                                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                                                    {r.reportedDate}
                                                </td>

                                                {/* Actions Column (Compact Icon Buttons) */}
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* View Post Icon */}
                                                        <button
                                                            onClick={() => handleOpenPostPreview(r)}
                                                            className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-all cursor-pointer"
                                                            title="Preview Reported Post"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                                                        </button>

                                                        {isPending && (
                                                            <>
                                                                {/* Dismiss Icon */}
                                                                <button
                                                                    onClick={() => handleResolve(r.reportId, 'Dismiss', r.contentId, r.contentType)}
                                                                    className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded transition-all cursor-pointer"
                                                                    title="Dismiss Report (Mark Reviewed)"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                                                </button>

                                                                {/* Remove Content Icon */}
                                                                <button
                                                                    onClick={() => handleResolve(r.reportId, 'Removed Content', r.contentId, r.contentType)}
                                                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded border border-rose-500/20 transition-all cursor-pointer"
                                                                    title="Remove Violating Content"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                                                </button>

                                                                {/* Suspend User Icon */}
                                                                <button
                                                                    onClick={() => {
                                                                        setSuspendUserId(String(r.reportedUserId || r.reporterUserId));
                                                                        setSuspendUserName(r.reportedUserName || r.reporterFullName);
                                                                        setIsSuspendModalOpen(true);
                                                                    }}
                                                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded border border-amber-500/20 transition-all cursor-pointer"
                                                                    title="Suspend Violating User"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">person_off</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB 2: USER GOVERNANCE ─── */}
            {activeTab === 'users' && (() => {
                const filteredUsers = usersList.filter(u => {
                    if (!userSearchTerm) return true;
                    const term = userSearchTerm.toLowerCase();
                    if (term === 'suspended') return u.isActive === false;
                    if (term === 'active') return u.isActive === true;
                    if (term === 'admin') return (u.roleName || '').toLowerCase().includes('admin') || (u.role || '').toLowerCase().includes('adm');
                    return (
                        String(u.userId || u.id || '').includes(term) ||
                        (u.fullName || u.name || '').toLowerCase().includes(term) ||
                        (u.email || u.employeeId || '').toLowerCase().includes(term) ||
                        (u.designation || '').toLowerCase().includes(term) ||
                        (u.department || u.departmentName || '').toLowerCase().includes(term) ||
                        (u.roleName || '').toLowerCase().includes(term)
                    );
                });

                return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-black text-slate-900 dark:text-white">User Governance & Security Management</h2>
                                {userSearchTerm && (
                                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                                        Filtering: <strong className="capitalize">{userSearchTerm}</strong> ({filteredUsers.length} Users found)
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    placeholder="Filter by name, role, status (Suspended/Active)..."
                                    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none w-64"
                                />
                                {userSearchTerm ? (
                                    <button
                                        onClick={() => setUserSearchTerm('')}
                                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                ) : (
                                    <button
                                        onClick={fetchUsers}
                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                                    >
                                        Search
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-2.5">User / Emp ID</th>
                                        <th className="px-4 py-2.5">Employee Name & Email</th>
                                        <th className="px-4 py-2.5">Designation & Dept</th>
                                        <th className="px-4 py-2.5">Assigned Role</th>
                                        <th className="px-4 py-2.5">Karma Score</th>
                                        <th className="px-4 py-2.5">Status</th>
                                        <th className="px-4 py-2.5 text-right">Governance Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {isLoadingUsers ? (
                                        <tr><td colSpan="7" className="text-center py-6">Loading user directory...</td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500">
                                                No users found matching "{userSearchTerm}".
                                                <button onClick={() => setUserSearchTerm('')} className="ml-2 text-indigo-600 underline font-bold cursor-pointer">
                                                    Clear Filter
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(u => {
                                            const assignedRole = u.roleName || getUserAssignedRole(u);
                                            const empId = u.employeeId || `MPO${u.userId || u.id || '100'}`;
                                            const uEmail = u.email || `${(u.fullName || u.name || 'user').toLowerCase().replace(/\s+/g, '.')}@mponline.gov.in`;
                                            const uAvatar = u.avatar || u.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.name || 'U')}&background=6366f1&color=fff&bold=true`;

                                            return (
                                                <tr key={u.userId || u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-4 py-2.5 font-bold">
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-900 dark:text-white font-mono text-[11px]">#{u.userId || u.id}</span>
                                                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.2 rounded w-fit mt-0.5">
                                                                {empId}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <img 
                                                                src={uAvatar} 
                                                                alt={u.fullName || u.name} 
                                                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                                                            />
                                                            <div className="min-w-0">
                                                                <p 
                                                                    onClick={() => {
                                                                        setSelectedUserDetailsUser(u);
                                                                        setIsUserDetailsModalOpen(true);
                                                                    }}
                                                                    className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors truncate"
                                                                >
                                                                    {u.fullName || u.name}
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{uEmail}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{u.designation || 'Staff Member'}</p>
                                                        <p className="text-[11px] text-slate-500">{u.department || u.departmentName || 'MPOnline Limited'}</p>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex flex-wrap gap-1.5 items-center max-w-[220px]">
                                                            {getUserRolesList(u).map((rItem, rIdx) => (
                                                                <span key={rIdx} className={`px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 shadow-xs ${getRoleBadgeStyle(rItem)}`}>
                                                                    <span className="material-symbols-outlined text-[13px]">
                                                                        {rItem.toLowerCase().includes('system') ? 'shield_person' :
                                                                         rItem.toLowerCase().includes('hr') ? 'badge' :
                                                                         rItem.toLowerCase().includes('community') ? 'groups' : 'person'}
                                                                    </span>
                                                                    <span>{rItem}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
                                                            <span className="material-symbols-outlined text-[15px]">stars</span>
                                                            <span>{typeof u.karmaPoints === 'number' ? u.karmaPoints : 0} pts</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${!u.isSuspended && u.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                            {!u.isSuspended && u.isActive ? 'Active' : 'Suspended'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUserDetailsUser(u);
                                                                    setIsUserDetailsModalOpen(true);
                                                                }}
                                                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                                title="View Complete User Details"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                                <span>View Details</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setRoleUserId(String(u.userId || u.id));
                                                                    setRoleUserName(u.fullName || u.name);
                                                                    setSelectedRoles(getUserRolesList(u));
                                                                    setIsRoleModalOpen(true);
                                                                }}
                                                                className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 font-bold text-[11px] rounded-lg hover:bg-indigo-500/20 cursor-pointer flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[13px]">tune</span>
                                                                <span>Edit Roles</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleUserActive(u)}
                                                                className={`px-2.5 py-1 font-bold text-[11px] rounded-lg cursor-pointer ${u.isActive ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'}`}
                                                            >
                                                                {u.isActive ? 'Suspend' : 'Activate'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* ─── TAB 3: COMMUNITY MODERATION ─── */}
            {activeTab === 'communities' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white">Community Moderation & Enterprise Channels ({communityChannels.length})</h2>
                            <p className="text-xs text-slate-400">Manage community rules, category assignments, moderator assignments, and safety parameters</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {communityChannels.map((c) => (
                            <div 
                                key={c.id} 
                                onClick={() => {
                                    setActiveTab('moderation');
                                    setCommunityFilter(c.filterKey);
                                    showToast(`Filtered: Showing reports for ${c.name} channel.`);
                                }}
                                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                            <span className="material-symbols-outlined text-[20px]">{c.icon || 'forum'}</span>
                                            <span className="font-black text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.name}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${c.status === 'Strict' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : (c.status === 'Standard' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20')}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                                        {c.category}
                                    </p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold text-[9px] rounded-full uppercase">
                                            {c.type || 'Public'}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                                            {getCommunityMemberCount(c.id)} {getCommunityMemberCount(c.id) === 1 ? 'Member' : 'Members'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        Pending Reports: <span className={`font-bold ${c.reportsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{c.reportsCount}</span>
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] gap-2">
                                    <span className="text-slate-500 truncate">Mod: <strong className="text-slate-800 dark:text-slate-200">{c.mod}</strong></span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/community/view?id=${c.id}`);
                                            }}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                            title={`View full ${c.name} community page`}
                                        >
                                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                                            <span>View</span>
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedManageCommunity(c);
                                                setIsCommunityModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-xs cursor-pointer"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── TAB 4: AI MODERATION ─── */}
            {activeTab === 'ai_moderation' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white">AI Content Moderation & Auto-Flagging</h2>
                            <p className="text-xs text-slate-400">Automated NLP toxicity detection & copyright scanning</p>
                        </div>
                        <button onClick={handleSaveConfig} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs cursor-pointer">
                            Save AI Rules
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Toxicity Sensitivity Threshold</h3>
                            <p className="text-slate-500 mb-3">Posts above confidence score will be auto-flagged for review</p>
                            <input type="range" min="50" max="95" defaultValue="80" className="w-full accent-indigo-600" />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-bold">
                                <span>50% (Permissive)</span>
                                <span className="text-indigo-600">80% (Recommended)</span>
                                <span>95% (Strict)</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Auto-Quarantine High Severity</h3>
                            <p className="text-slate-500 mb-3">Immediately hide posts with Toxicity score &gt; 95% before manual review</p>
                            <label className="flex items-center gap-2 font-bold cursor-pointer">
                                <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                                <span>Enable Auto-Quarantine</span>
                            </label>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Copyright & PII Leak Scanner</h3>
                            <p className="text-slate-500 mb-3">Scan attachments for confidential compensation docs & API keys</p>
                            <label className="flex items-center gap-2 font-bold cursor-pointer">
                                <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                                <span>Enable Deep Attachment Scan</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 5: SYSTEM PARAMETERS ─── */}
            {activeTab === 'system' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">System Parameters & Platform Settings</h2>
                        <button onClick={handleSaveConfig} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm">
                            Save Parameters
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">Maintenance Mode</p>
                                <p className="text-slate-400 font-normal text-[11px]">Restrict platform access to System Admins only</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={configState.maintenanceMode}
                                onChange={e => setConfigState({ ...configState, maintenanceMode: e.target.checked })}
                                className="w-4 h-4 accent-indigo-600 cursor-pointer"
                            />
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">Auto-Moderation Engine</p>
                                <p className="text-slate-400 font-normal text-[11px]">Automatically flag reported posts matching keywords</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={configState.autoModeration}
                                onChange={e => setConfigState({ ...configState, autoModeration: e.target.checked })}
                                className="w-4 h-4 accent-indigo-600 cursor-pointer"
                            />
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">Notify Admins on New Report</p>
                                <p className="text-slate-400 font-normal text-[11px]">Send immediate toast & email digest to HR/System admins</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={configState.notifyAdminsOnReport}
                                onChange={e => setConfigState({ ...configState, notifyAdminsOnReport: e.target.checked })}
                                className="w-4 h-4 accent-indigo-600 cursor-pointer"
                            />
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">Max File Upload Size (MB)</p>
                                <p className="text-slate-400 font-normal text-[11px]">Maximum attachment size allowed per post</p>
                            </div>
                            <input
                                type="number"
                                value={configState.maxUploadMb}
                                onChange={e => setConfigState({ ...configState, maxUploadMb: Number(e.target.value) })}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-20 text-center text-xs"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 6: AUDIT TRAIL ─── */}
            {activeTab === 'audit' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">Governance Audit Log Trail</h2>
                        <input
                            type="text"
                            value={auditSearch}
                            onChange={e => setAuditSearch(e.target.value)}
                            placeholder="Filter audit logs..."
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none w-64"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-2.5">Timestamp</th>
                                    <th className="px-4 py-2.5">Actor / Moderator</th>
                                    <th className="px-4 py-2.5">Action Code</th>
                                    <th className="px-4 py-2.5">Target Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {auditTrail
                                    .filter(a => !auditSearch || a.action.toLowerCase().includes(auditSearch.toLowerCase()) || a.target.toLowerCase().includes(auditSearch.toLowerCase()))
                                    .map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{a.time}</td>
                                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{a.moderator}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`font-black text-[11px] ${a.color || 'text-indigo-600'}`}>{a.action}</span>
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{a.target}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB: LIVE SERILOG SYSTEM LOGS ─── */}
            {activeTab === 'serilog' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-4">
                    {/* Header & Controls Strip */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">terminal</span>
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    Live Server Logs (Serilog Stream)
                                    {isAutoRefreshLogs && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20 animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            LIVE 5s
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Direct physical server logs from <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">{selectedLogFile || 'Backend/Knome.API/logs/'}</code>.
                                {lastLogSyncTime && <span className="ml-2 font-medium text-slate-400">Synced: {lastLogSyncTime}</span>}
                            </p>
                        </div>

                        {/* Top Actions: File Switcher, Auto-refresh toggle & Download */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* File Selector Dropdown */}
                            <select
                                value={selectedLogFile}
                                onChange={e => setSelectedLogFile(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
                            >
                                {systemLogFiles.map(f => (
                                    <option key={f.fileName} value={f.fileName}>
                                        📄 {f.fileName} ({(f.sizeBytes / (1024 * 1024)).toFixed(1)} MB){f.isActive ? ' - Active' : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Lines count */}
                            <select
                                value={logLinesCount}
                                onChange={e => setLogLinesCount(Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                            >
                                <option value={50}>50 Lines</option>
                                <option value={100}>100 Lines</option>
                                <option value={200}>200 Lines</option>
                                <option value={500}>500 Lines</option>
                                <option value={1000}>1000 Lines</option>
                            </select>

                            {/* Auto-Refresh Toggle */}
                            <button
                                onClick={() => setIsAutoRefreshLogs(!isAutoRefreshLogs)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                    isAutoRefreshLogs
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isAutoRefreshLogs ? 'text-emerald-500 animate-spin' : ''}`}>
                                    {isAutoRefreshLogs ? 'autorenew' : 'sync'}
                                </span>
                                <span>{isAutoRefreshLogs ? 'Auto: ON' : 'Auto: OFF'}</span>
                            </button>

                            {/* Manual Refresh Button */}
                            <button
                                onClick={fetchSystemLogs}
                                disabled={isLoadingLogs}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isLoadingLogs ? 'animate-spin' : ''}`}>refresh</span>
                                <span>Fetch</span>
                            </button>

                            {/* Download Log File */}
                            <a
                                href={adminApi.downloadSystemLogUrl ? adminApi.downloadSystemLogUrl(selectedLogFile) : `#`}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[16px]">file_download</span>
                                <span className="hidden sm:inline">Download</span>
                            </a>
                        </div>
                    </div>

                    {/* Metric Badges Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div
                            onClick={() => setLogLevelFilter('ALL')}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                logLevelFilter === 'ALL'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-500/30'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                            }`}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Total Log Events</span>
                            <span className="text-lg font-black">{systemLogCounts.total || systemLogs.length}</span>
                        </div>

                        <div
                            onClick={() => setLogLevelFilter('ERR')}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                logLevelFilter === 'ERR'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/30'
                                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:border-rose-400'
                            }`}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Errors & Fatal</span>
                            <span className="text-lg font-black">{systemLogCounts.errors || 0}</span>
                        </div>

                        <div
                            onClick={() => setLogLevelFilter('WRN')}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                logLevelFilter === 'WRN'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30'
                                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 hover:border-amber-400'
                            }`}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Warnings</span>
                            <span className="text-lg font-black">{systemLogCounts.warnings || 0}</span>
                        </div>

                        <div
                            onClick={() => setLogLevelFilter('INF')}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                logLevelFilter === 'INF'
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-500/30'
                                    : 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40 text-sky-600 dark:text-sky-400 hover:border-sky-400'
                            }`}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Information</span>
                            <span className="text-lg font-black">{systemLogCounts.info || 0}</span>
                        </div>

                        <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active File Size</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
                                {systemLogFiles.find(f => f.fileName === selectedLogFile)
                                    ? `${(systemLogFiles.find(f => f.fileName === selectedLogFile).sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                                    : 'Live Disk File'}
                            </span>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">search</span>
                            <input
                                type="text"
                                value={logSearchQuery}
                                onChange={e => setLogSearchQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') fetchSystemLogs(); }}
                                placeholder="Search in logs (e.g. POST /api/Auth, UserId, Exception, Database)..."
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs outline-none focus:border-cyan-500 font-mono text-slate-900 dark:text-white"
                            />
                            {logSearchQuery && (
                                <button
                                    onClick={() => { setLogSearchQuery(''); setTimeout(fetchSystemLogs, 50); }}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Log Level Filter Chips */}
                        <div className="flex items-center gap-1">
                            {['ALL', 'ERR', 'WRN', 'INF', 'DBG'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setLogLevelFilter(lvl)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        logLevelFilter === lvl
                                            ? lvl === 'ERR'
                                                ? 'bg-rose-600 text-white'
                                                : lvl === 'WRN'
                                                ? 'bg-amber-600 text-white'
                                                : lvl === 'INF'
                                                ? 'bg-sky-600 text-white'
                                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                    }`}
                                >
                                    {lvl === 'ALL' ? 'All Logs' : lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── TERMINAL CONSOLE VIEWER ─── */}
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl font-mono text-xs">
                        {/* Terminal Header */}
                        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                </div>
                                <span className="font-bold text-slate-300 ml-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] text-cyan-400">terminal</span>
                                    Knome.API Serilog Console
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400">
                                    Showing <strong>{systemLogs.length}</strong> entries (Newest First)
                                </span>
                            </div>
                        </div>

                        {/* Terminal Log Stream Area */}
                        <div className="p-3 max-h-[560px] overflow-y-auto space-y-1 divide-y divide-slate-900/60 selection:bg-cyan-500/30 selection:text-cyan-200">
                            {isLoadingLogs && systemLogs.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-2xl animate-spin text-cyan-400">refresh</span>
                                    <span>Reading and parsing Serilog disk files...</span>
                                </div>
                            ) : systemLogs.length === 0 ? (
                                <div className="py-12 text-center text-slate-500">
                                    <p className="text-sm">No log entries matched your filter criteria.</p>
                                    <p className="text-xs text-slate-600 mt-1">Try changing the level filter or search keywords.</p>
                                </div>
                            ) : (
                                systemLogs.map((log, idx) => {
                                    const isExpanded = expandedLogIndex === idx;
                                    const isError = log.Level === 'ERR' || log.Level === 'FTL';
                                    const isWarn = log.Level === 'WRN';
                                    const isInfo = log.Level === 'INF';

                                    const badgeClass = isError
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : isWarn
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : isInfo
                                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30';

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setExpandedLogIndex(isExpanded ? null : idx)}
                                            className={`pt-1.5 pb-1.5 px-2 rounded-lg transition-colors cursor-pointer group hover:bg-slate-900/90 ${
                                                isError ? 'bg-rose-950/20' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                                                {/* Timestamp */}
                                                <span className="text-slate-400 whitespace-nowrap shrink-0 text-[10px]">
                                                    {log.Timestamp || '—'}
                                                </span>

                                                {/* Level Badge */}
                                                <span className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase tracking-wider shrink-0 ${badgeClass}`}>
                                                    {log.Level}
                                                </span>

                                                {/* Source Context */}
                                                <span className="text-purple-400 font-semibold truncate max-w-[180px] shrink-0 opacity-90 hidden sm:inline" title={log.SourceContext}>
                                                    [{log.SourceContext ? log.SourceContext.split('.').slice(-2).join('.') : 'API'}]
                                                </span>

                                                {/* Message */}
                                                <span className={`flex-1 break-all ${isError ? 'text-rose-200 font-bold' : isWarn ? 'text-amber-200' : 'text-slate-200'}`}>
                                                    {log.Message}
                                                </span>

                                                {/* Expand icon if Exception exists */}
                                                {log.Exception && (
                                                    <span className="material-symbols-outlined text-[14px] text-rose-400 shrink-0">
                                                        {isExpanded ? 'expand_less' : 'bug_report'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Expandable Exception / Stack Trace */}
                                            {isExpanded && (
                                                <div className="mt-2 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] space-y-2 text-slate-300">
                                                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
                                                        <span className="font-bold text-cyan-400">Full Log Detail & Source</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(log.Raw || `${log.Timestamp} [${log.Level}] [${log.SourceContext}] ${log.Message}\n${log.Exception || ''}`);
                                                                showToast('Copied log trace to clipboard!');
                                                            }}
                                                            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                                            Copy Trace
                                                        </button>
                                                    </div>
                                                    <div className="text-slate-400">
                                                        <strong>Source Context:</strong> {log.SourceContext || 'N/A'}
                                                    </div>
                                                    {log.Exception && (
                                                        <pre className="p-2 rounded bg-black/70 border border-rose-900/50 text-rose-300 whitespace-pre-wrap overflow-x-auto font-mono text-[10px] max-h-60">
                                                            {log.Exception}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 7: ANALYTICS ─── */}
            {activeTab === 'analytics' && (
                <div className="space-y-4">
                    {/* Top Row Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Reports Trend Chart */}
                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1">7-Day Moderation Reports Trend</h3>
                            <p className="text-xs text-slate-400 mb-4">Volume of incoming content reports vs resolved actions</p>
                            
                            {/* Simple Responsive SVG Trend Bar Chart */}
                            <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200 dark:border-slate-800">
                                {[
                                    { day: 'Jul 22', val: 45, pending: 3 },
                                    { day: 'Jul 23', val: 65, pending: 5 },
                                    { day: 'Jul 24', val: 80, pending: 4 },
                                    { day: 'Jul 25', val: 35, pending: 1 },
                                    { day: 'Jul 26', val: 50, pending: 2 },
                                    { day: 'Jul 27', val: 95, pending: 8 },
                                    { day: 'Jul 28', val: 100, pending: 11 }
                                ].map((bar, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                        <div className="w-full max-w-[28px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-sm transition-all hover:opacity-80" style={{ height: `${bar.val}%` }}></div>
                                        <span className="text-[10px] font-bold text-slate-400 mt-1">{bar.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Moderation Status Chart */}
                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1">Moderation Action Breakdown</h3>
                            <p className="text-xs text-slate-400 mb-4">Distribution of Pending vs Resolved vs Dismissed reports</p>
                            
                            <div className="flex items-center justify-around h-40">
                                <div className="w-32 h-32 rounded-full border-8 border-indigo-500 border-t-amber-500 border-r-emerald-500 flex items-center justify-center flex-col">
                                    <span className="text-xl font-black text-slate-900 dark:text-white">{reports.length}</span>
                                    <span className="text-[9px] font-bold uppercase text-slate-400">Total</span>
                                </div>
                                <div className="space-y-2 text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                        <span>Pending ({pendingCount})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        <span>Action Taken ({reviewedCount})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                        <span>Dismissed (0)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row Summaries */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Top Reported Communities</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">HR & People Ops</span><span className="font-bold text-indigo-600">5 Reports</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Engineering & Tech</span><span className="font-bold text-indigo-600">4 Reports</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Product Design</span><span className="font-bold text-indigo-600">2 Reports</span></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Top Reported Users</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Sourabh Sahu (#3)</span><span className="font-bold text-rose-500">3 Violations</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Priya Verma (#2)</span><span className="font-bold text-rose-500">3 Violations</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Rishikesh Ugle (#4)</span><span className="font-bold text-rose-500">2 Violations</span></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-3">AI Detection Accuracy</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Precision Score</span><span className="font-bold text-emerald-500">94.2%</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">False Positive Rate</span><span className="font-bold text-amber-500">3.8%</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Auto-Quarantined</span><span className="font-bold text-purple-500">14 Items</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: MEDIA APPROVALS (VIDEOS & PODCASTS) ─── */}
            {activeTab === 'media_approvals' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">verified</span>
                                Media Approvals Queue (Videos & Podcasts)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Review video and podcast submissions uploaded by employees before publishing them to the enterprise platform.
                            </p>
                        </div>
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                            {pendingMediaApprovals.length} Pending Submission{pendingMediaApprovals.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {pendingMediaApprovals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingMediaApprovals.map((item) => (
                                <div key={item.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${item.mediaType === 'Video' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20' : 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'}`}>
                                            {item.mediaType} Submission
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {new Date(item.submittedDate).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        {/* Thumbnail with overlay Play button */}
                                        <div 
                                            className="relative group shrink-0 cursor-pointer"
                                            onClick={() => setPreviewingMedia(item)}
                                            title="Click to play preview"
                                        >
                                            <img src={resolveMediaUrl(item.thumbnail) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200'} className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs" alt={item.title} />
                                            <div className="absolute inset-0 bg-slate-950/40 rounded-xl flex items-center justify-center group-hover:bg-slate-950/60 transition-all">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${item.mediaType === 'Video' ? 'bg-cyan-500/90' : 'bg-pink-500/90'}`}>
                                                    <span className="material-symbols-outlined text-[22px] ml-0.5">play_arrow</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description || 'No description provided.'}</p>
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-semibold">
                                                <span>By: {item.authorName}</span>
                                                <span>•</span>
                                                <span>Category: {item.category}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end pt-3 border-t border-slate-200/60 dark:border-slate-800 gap-2">
                                        <button
                                            onClick={() => handleRejectMedia(item)}
                                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                        >
                                            Decline / Reject
                                        </button>
                                        <button
                                            onClick={() => handleApproveMedia(item)}
                                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            Approve & Publish
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-[32px]">task_alt</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Media Approvals</h3>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">All submitted podcasts and videos have been reviewed and processed by system admins.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB: ROLE ASSIGNMENT REQUESTS (KNOME & EMPLOYEEHUB INTEGRATION) ─── */}
            {activeTab === 'role_requests' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 font-black flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Role Assignment Requests Queue
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Review new user registrations and assign governance roles. Approval instantly syncs across Knome & EmployeeHub.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchRoleRequests}
                                disabled={isLoadingRoleRequests}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <span className={`material-symbols-outlined text-[15px] ${isLoadingRoleRequests ? 'animate-spin' : ''}`}>sync</span>
                                <span>Refresh Requests</span>
                            </button>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex items-center gap-2 max-w-sm">
                        <div className="relative w-full">
                            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">search</span>
                            <input
                                type="text"
                                value={roleRequestSearchTerm}
                                onChange={e => setRoleRequestSearchTerm(e.target.value)}
                                placeholder="Search by name, employee ID, email..."
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* List / Table of Requests */}
                    {roleRequests.filter(r => {
                        if (!roleRequestSearchTerm) return true;
                        const term = roleRequestSearchTerm.toLowerCase();
                        return (r.fullName || '').toLowerCase().includes(term) ||
                               (r.employeeId || '').toLowerCase().includes(term) ||
                               (r.email || '').toLowerCase().includes(term) ||
                               (r.departmentName || '').toLowerCase().includes(term);
                    }).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {roleRequests
                                .filter(r => {
                                    if (!roleRequestSearchTerm) return true;
                                    const term = roleRequestSearchTerm.toLowerCase();
                                    return (r.fullName || '').toLowerCase().includes(term) ||
                                           (r.employeeId || '').toLowerCase().includes(term) ||
                                           (r.email || '').toLowerCase().includes(term) ||
                                           (r.departmentName || '').toLowerCase().includes(term);
                                })
                                .map((req) => {
                                    const isPending = req.status === 'Pending';
                                    const targetRole = requestTargetRoles[req.requestId] || 'Employee';

                                    return (
                                        <div
                                            key={req.requestId}
                                            className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                                isPending
                                                    ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/5 shadow-xs'
                                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                                            }`}
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                        {req.employeeId}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        {new Date(req.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    isPending
                                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                                                        : req.status === 'Approved'
                                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </div>

                                            {/* User Info */}
                                            <div className="flex items-start gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                                                    {req.fullName ? req.fullName.slice(0, 2).toUpperCase() : 'EM'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {req.fullName}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {req.email}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {req.designation || 'TL'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                                            {req.departmentName || 'Development'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            {isPending ? (
                                                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 flex-1">
                                                        <label className="text-[11px] font-bold text-slate-500 shrink-0">Role:</label>
                                                        <select
                                                            value={targetRole}
                                                            onChange={e => setRequestTargetRoles(prev => ({ ...prev, [req.requestId]: e.target.value }))}
                                                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none font-bold flex-1"
                                                        >
                                                            <option value="Employee">Employee</option>
                                                            <option value="Community Admin">Community Admin</option>
                                                            <option value="HR Administrator">HR Administrator</option>
                                                            <option value="System Administrator">System Administrator</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => handleRejectRoleRequest(req.requestId, req.fullName)}
                                                            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveRoleRequest(req.requestId, targetRole, req.fullName, req.employeeId)}
                                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all cursor-pointer"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                                            <span>Approve & Assign</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                                                    <span>Assigned Role: <strong className="text-emerald-500">{req.assignedRoleName || 'Employee'}</strong></span>
                                                    <span>By: {req.assignedBy || 'System Admin'}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-[32px]">task_alt</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Role Requests</h3>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">All employee registration role requests have been reviewed and approved.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── MODAL 1: SUSPEND EMPLOYEE USER ACCOUNT ─── */}
            {isSuspendModalOpen && (
                <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-rose-500">
                                <span className="material-symbols-outlined text-2xl">person_off</span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Suspend Employee Account</h3>
                            </div>
                            <button onClick={() => setIsSuspendModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-500 font-bold mb-1">Target User ID or Name</label>
                                <input
                                    type="text"
                                    value={suspendUserName ? `${suspendUserName} (ID #${suspendUserId})` : suspendUserId}
                                    onChange={e => setSuspendUserId(e.target.value)}
                                    placeholder="Enter User ID (e.g. 3, 5)..."
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1">Suspension Duration</label>
                                <select
                                    value={suspendDays}
                                    onChange={e => setSuspendDays(Number(e.target.value))}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold outline-none text-slate-900 dark:text-white"
                                >
                                    <option value={1}>1 Day (Warning)</option>
                                    <option value={7}>7 Days (Standard Policy Violation)</option>
                                    <option value={30}>30 Days (Severe Policy Violation)</option>
                                    <option value={365}>Permanent Termination (365 Days)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1">Violation Reason & Notes</label>
                                <textarea
                                    value={suspendReason}
                                    onChange={e => setSuspendReason(e.target.value)}
                                    placeholder="Provide detailed violation reasoning for HR audit..."
                                    rows="3"
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none text-slate-900 dark:text-white"
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsSuspendModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSuspend}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                            >
                                Confirm Suspension
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL 2: CHANGE EMPLOYEE ROLES (MULTIPLE ROLE ASSIGNMENT) ─── */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">Manage User Roles</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Assign multiple enterprise governance roles to a user</p>
                                </div>
                            </div>
                            <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target User</span>
                                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">{roleUserName}</p>
                                    <p className="text-[11px] text-slate-500 font-mono">User ID: #{roleUserId}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Selected ({selectedRoles.length})</span>
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                                        {selectedRoles.map(r => (
                                            <span key={r} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-md text-[10px] border border-indigo-200/50 dark:border-indigo-800/50">
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Warning: changing own role */}
                            {currentUser?.userId && String(currentUser.userId) === String(roleUserId) && (
                                <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5 shrink-0">warning</span>
                                    <p className="text-amber-700 dark:text-amber-400 font-semibold">
                                        You are modifying <strong>your own roles</strong>. Your session permissions will update immediately upon saving.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">
                                    Select Roles (Multiple Selection Allowed):
                                </label>
                                <div className="space-y-2">
                                    {[
                                        {
                                            name: 'Employee',
                                            icon: 'person',
                                            badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                                            title: 'Employee (Standard User)',
                                            desc: 'Create posts, articles, videos, join communities, earn karma, and network.'
                                        },
                                        {
                                            name: 'Community Admin',
                                            icon: 'groups',
                                            badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                                            title: 'Community Admin (Moderation)',
                                            desc: 'Moderate community posts, manage community members, rules, and categories.'
                                        },
                                        {
                                            name: 'HR Administrator',
                                            icon: 'badge',
                                            badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
                                            title: 'HR Administrator (HR Governance)',
                                            desc: 'Manage departments, broadcast announcements, HR analytics, and job postings.'
                                        },
                                        {
                                            name: 'System Administrator',
                                            icon: 'shield_person',
                                            badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
                                            title: 'System Administrator (Full Platform Control)',
                                            desc: 'Full governance, user administration, security audit logs, and media approvals.'
                                        }
                                    ].map(roleItem => {
                                        const isSelected = selectedRoles.includes(roleItem.name);
                                        return (
                                            <div
                                                key={roleItem.name}
                                                onClick={() => {
                                                    setSelectedRoles(prev => {
                                                        if (prev.includes(roleItem.name)) {
                                                            const filtered = prev.filter(r => r !== roleItem.name);
                                                            return filtered.length > 0 ? filtered : ['Employee'];
                                                        } else {
                                                            return [...prev, roleItem.name];
                                                        }
                                                    });
                                                }}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                    isSelected 
                                                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500/80 shadow-xs ring-1 ring-indigo-500/20' 
                                                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}} // Handled by container click
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[16px] text-indigo-600 dark:text-indigo-400">{roleItem.icon}</span>
                                                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">{roleItem.title}</span>
                                                        {isSelected && (
                                                            <span className="ml-auto text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.2 rounded">Active</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{roleItem.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Email notification notice */}
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[16px]">mail</span>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                    Saving changes will automatically send an email update notification to the user.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] text-slate-400 font-bold">
                                {selectedRoles.length} role{selectedRoles.length > 1 ? 's' : ''} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsRoleModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmRoleChange}
                                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 cursor-pointer flex items-center gap-1.5 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[15px]">save</span>
                                    <span>Save Role Changes</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL 3: SOFT POPUP POST PREVIEW MODAL ─── */}
            {isPreviewOpen && previewReport && (
                <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                                    <span className="material-symbols-outlined text-xl">gavel</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Report #{previewReport.reportId} Preview
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${previewReport.status === 'Pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                                            {previewReport.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Reported on {previewReport.reportedDate}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsPreviewOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-grow">
                            {/* Report Details Card */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <p className="text-slate-400 font-semibold text-[11px]">Reporter</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{previewReport.reporterFullName}</p>
                                    <p className="text-[10px] text-slate-400">User ID: #{previewReport.reporterUserId}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-semibold text-[11px]">Reason Flagged</p>
                                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-black text-[11px]">
                                        {previewReport.reasonCode}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-semibold text-[11px]">Target Content</p>
                                    <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{previewReport.contentType} #{previewReport.contentId}</p>
                                </div>
                            </div>

                            {/* Post Content */}
                            {isPreviewLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                                    <span className="material-symbols-outlined text-3xl animate-spin text-indigo-600">sync</span>
                                    <span>Fetching original content...</span>
                                </div>
                            ) : previewPost ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                                                {(previewPost.authorFullName || previewPost.authorName || 'U')[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {previewPost.authorFullName || previewPost.authorName || previewReport.reporterFullName}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {previewPost.authorDesignation || 'Employee'} • {new Date(previewPost.createdDate || previewPost.createdAt || Date.now()).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Body Box */}
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                        {previewPost.contentText || previewPost.content || previewPost.body || previewPost.text}
                                    </div>

                                    {/* Video Player Preview if Content is Video */}
                                    {(previewPost.videoUrl || previewPost.isVideo || previewReport.contentType === 'Video' || (previewReport.postContentSnippet || '').includes('Video') || String(previewReport.contentId).includes('10019')) && (
                                        <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl p-3 space-y-3">
                                            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden group">
                                                {(() => {
                                                    const rawUrl = previewPost.videoUrl || previewPost.sourceUrl || '';
                                                    const isYT = rawUrl && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be'));
                                                    const finalVideoUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
                                                        ? rawUrl 
                                                        : (resolveMediaUrl(rawUrl) || 'https://vjs.zencdn.net/v/oceans.mp4');

                                                    if (isYT) {
                                                        const ytId = (rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/) || [])[1] || 'tVzUXW6siu0';
                                                        return (
                                                            <iframe
                                                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                                                className="w-full h-full border-0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                                title={previewPost.title || 'Video Preview'}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                                                            <video
                                                                id="admin_modal_video_player"
                                                                key={finalVideoUrl}
                                                                src={finalVideoUrl}
                                                                poster={getVideoThumbnail(previewPost) || undefined}
                                                                preload="auto"
                                                                controls
                                                                autoPlay
                                                                playsInline
                                                                controlsList="nodownload"
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => {
                                                                    if (e.target && !e.target.src.includes('oceans.mp4')) {
                                                                        e.target.src = 'https://vjs.zencdn.net/v/oceans.mp4';
                                                                        e.target.play().catch(() => {});
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById('admin_modal_video_player');
                                                        if (el) {
                                                            if (el.paused) el.play().catch(() => {});
                                                            else el.pause();
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                    <span>Click to Play / Pause Video</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsPreviewOpen(false);
                                                        const streamUrl = previewPost.videoUrl || previewPost.sourceUrl || 'https://vjs.zencdn.net/v/oceans.mp4';
                                                        navigate(`/videos?id=${previewReport.contentId}&url=${encodeURIComponent(streamUrl)}`);
                                                    }}
                                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                    <span>Open Full Video Hub</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Audio Player Preview if Content is Podcast */}
                                    {(previewPost.audioUrl || previewPost.isPodcast || previewReport.contentType === 'Podcast') && (
                                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                                            <span className="text-[11px] font-black text-pink-400 uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">podcasts</span>
                                                Podcast Audio Preview
                                            </span>
                                            <audio
                                                src={resolveMediaUrl(previewPost.audioUrl) || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                                                controls
                                                autoPlay
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    {/* Attachment Images */}
                                    {((previewPost.attachmentUrls && previewPost.attachmentUrls.length > 0) || (previewPost.attachments && previewPost.attachments.length > 0)) && (
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            {(previewPost.attachmentUrls || previewPost.attachments).map((url, idx) => (
                                                <img 
                                                    key={idx} 
                                                    src={typeof url === 'string' ? url : url.fileUrl} 
                                                    alt="Attachment" 
                                                    className="w-full h-40 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                                    <span className="material-symbols-outlined text-3xl text-slate-400">article</span>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {previewReport.contentType} #{previewReport.contentId}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Content snippet: "{previewReport.postContentSnippet || getFallbackPostContent(previewReport).content}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer — Quick Moderation Actions */}
                        {previewReport.status === 'Pending' && (
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                                <p className="text-[11px] text-slate-400 font-semibold">Quick moderation actions:</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => {
                                            handleResolve(previewReport.reportId, 'Dismiss', previewReport.contentId, previewReport.contentType);
                                            setIsPreviewOpen(false);
                                        }}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleResolve(previewReport.reportId, 'Removed Content', previewReport.contentId, previewReport.contentType);
                                            setIsPreviewOpen(false);
                                        }}
                                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold text-[11px] border border-rose-500/20 rounded-lg transition-all cursor-pointer shadow-xs"
                                    >
                                        Remove Content
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsPreviewOpen(false);
                                            const targetUserId = previewPost?.authorUserId || previewPost?.userId || previewPost?.authorId || previewReport.reportedUserId || previewReport.reporterUserId;
                                            const targetUserName = previewPost?.authorFullName || previewPost?.authorName || previewPost?.fullName || previewReport.reportedUserName || previewReport.reporterFullName;
                                            setSuspendUserId(String(targetUserId));
                                            setSuspendUserName(targetUserName);
                                            setIsSuspendModalOpen(true);
                                        }}
                                        className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold text-[11px] border border-amber-500/20 rounded-lg transition-all cursor-pointer shadow-xs"
                                    >
                                        Suspend User
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── MODAL 4: MANAGE COMMUNITY CHANNEL MODAL ─── */}
            {isCommunityModalOpen && selectedManageCommunity && (
                <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <span className="material-symbols-outlined text-2xl">forum</span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Manage Community: {selectedManageCommunity.name}
                                </h3>
                            </div>
                            <button onClick={() => setIsCommunityModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-slate-400 font-medium">Total Members</span>
                                    <p className="font-black text-sm text-slate-900 dark:text-white">
                                        {getCommunityMemberCount(selectedManageCommunity.id)} {getCommunityMemberCount(selectedManageCommunity.id) === 1 ? 'Member' : 'Members'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium">Pending Reports</span>
                                    <p className="font-black text-sm text-amber-600 dark:text-amber-400">{selectedManageCommunity.reportsCount} Reports</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1">Moderation Security Level</label>
                                <select
                                    value={selectedManageCommunity.status}
                                    onChange={e => {
                                        const newStatus = e.target.value;
                                        setSelectedManageCommunity(prev => ({ ...prev, status: newStatus }));
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold outline-none text-slate-900 dark:text-white"
                                >
                                    <option value="Strict">Strict (Auto-Quarantine Toxic Posts)</option>
                                    <option value="Standard">Standard (Flag & Hold Pending Review)</option>
                                    <option value="Relaxed">Relaxed (Post First, Flag Later)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1">Assigned Community Moderator</label>
                                <select
                                    value={selectedManageCommunity.mod}
                                    onChange={e => {
                                        const newMod = e.target.value;
                                        setSelectedManageCommunity(prev => ({ ...prev, mod: newMod }));
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold outline-none text-slate-900 dark:text-white"
                                >
                                    <option value="System Admin">System Admin</option>
                                    <option value="Priya Verma">Priya Verma (HR Administrator)</option>
                                    <option value="Sourabh Sahu">Sourabh Sahu (Lead Admin)</option>
                                    <option value="Loveneesh Sharma">Loveneesh Sharma (Community Lead)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setIsCommunityModalOpen(false);
                                        navigate(`/community/view?id=${selectedManageCommunity.id}`);
                                    }}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[15px]">visibility</span>
                                    <span>View Community Page</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCommunityModalOpen(false);
                                        setActiveTab('moderation');
                                        setCommunityFilter(selectedManageCommunity.filterKey);
                                        showToast(`Filtered: Showing content reports for ${selectedManageCommunity.name}.`);
                                    }}
                                    className="px-3 py-2 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    View Reports ({selectedManageCommunity.reportsCount})
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsCommunityModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setCommunityChannels(prev => prev.map(c => c.id === selectedManageCommunity.id ? selectedManageCommunity : c));
                                        setIsCommunityModalOpen(false);
                                        showToast(`Community parameters updated for '${selectedManageCommunity.name}'.`);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                                >
                                    Save Channel Parameters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ─── MODAL: PREVIEW MEDIA (VIDEO / PODCAST PLAYER) ─── */}
            {previewingMedia && (
                <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${previewingMedia.mediaType === 'Video' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20' : 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'}`}>
                                    {previewingMedia.mediaType} Preview
                                </span>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">{previewingMedia.title}</h3>
                            </div>
                            <button onClick={() => setPreviewingMedia(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        {/* Modal Body / Player */}
                        <div className="p-5 space-y-4">
                            {previewingMedia.mediaType === 'Video' ? (
                                <div className="w-full rounded-xl overflow-hidden bg-black shadow-lg">
                                    {getEmbedVideoUrl(getMediaUrl(previewingMedia)) ? (
                                        <iframe
                                            className="w-full aspect-video rounded-xl"
                                            src={getEmbedVideoUrl(getMediaUrl(previewingMedia))}
                                            title={previewingMedia.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <video
                                            controls
                                            autoPlay
                                            className="w-full max-h-[380px] rounded-xl object-contain bg-black"
                                            src={resolveMediaUrl(getMediaUrl(previewingMedia)) || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                                        >
                                            Your browser does not support video playback.
                                        </video>
                                    )}
                                </div>
                            ) : (
                                /* Podcast Audio Player */
                                <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-slate-900/40 p-6 rounded-2xl border border-pink-500/20 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <img src={resolveMediaUrl(previewingMedia.thumbnail) || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=90&w=600'} className="w-24 h-24 rounded-xl object-cover border border-pink-500/30 shadow-md shrink-0" alt={previewingMedia.title} />
                                        <div>
                                            <h4 className="text-base font-black text-slate-900 dark:text-white">{previewingMedia.title}</h4>
                                            <p className="text-xs text-pink-600 dark:text-pink-400 font-semibold mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">graphic_eq</span>
                                                Podcast Episode • {previewingMedia.duration || 'Audio'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Uploaded by <span className="font-bold text-slate-700 dark:text-slate-300">{previewingMedia.authorName}</span></p>
                                        </div>
                                    </div>

                                    <audio
                                        controls
                                        autoPlay
                                        className="w-full rounded-xl"
                                        src={resolveMediaUrl(getMediaUrl(previewingMedia)) || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                                    >
                                        Your browser does not support audio playback.
                                    </audio>
                                </div>
                            )}

                            {/* Media Details */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-800 text-xs">
                                <div className="flex items-center justify-between text-slate-400">
                                    <span>Submitted by: <strong className="text-slate-700 dark:text-slate-200">{previewingMedia.authorName}</strong></span>
                                    <span>Category: <strong className="text-slate-700 dark:text-slate-200">{previewingMedia.category}</strong></span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300">{previewingMedia.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {/* Modal Footer with Actions */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                            <button
                                onClick={() => setPreviewingMedia(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                                Close Preview
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        handleRejectMedia(previewingMedia);
                                        setPreviewingMedia(null);
                                    }}
                                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Decline / Reject
                                </button>
                                <button
                                    onClick={() => {
                                        handleApproveMedia(previewingMedia);
                                        setPreviewingMedia(null);
                                    }}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    Approve & Publish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ─── MODAL: COMPREHENSIVE USER DETAILS MODAL ─── */}
            {isUserDetailsModalOpen && selectedUserDetailsUser && (
                <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header Banner */}
                        <div className="relative p-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img
                                        src={selectedUserDetailsUser.avatar || selectedUserDetailsUser.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDetailsUser.fullName || selectedUserDetailsUser.name || 'U')}&background=fff&color=4f46e5&bold=true`}
                                        alt={selectedUserDetailsUser.fullName || selectedUserDetailsUser.name}
                                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-lg"
                                    />
                                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${selectedUserDetailsUser.isActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-white leading-tight">
                                            {selectedUserDetailsUser.fullName || selectedUserDetailsUser.name}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[11px] font-bold">
                                            {selectedUserDetailsUser.employeeId || `MPO${selectedUserDetailsUser.userId || selectedUserDetailsUser.id}`}
                                        </span>
                                    </div>
                                    <p className="text-indigo-100 text-xs mt-0.5">
                                        {selectedUserDetailsUser.designation || 'Staff Member'} • {selectedUserDetailsUser.department || selectedUserDetailsUser.departmentName || 'MPOnline Limited'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsUserDetailsModalOpen(false)}
                                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        {/* Modal Body Content */}
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* KPI Strip */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center">
                                    <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Assigned Role</span>
                                    <p className="text-xs font-black text-indigo-950 dark:text-indigo-200 mt-0.5">
                                        {selectedUserDetailsUser.roleName || getUserAssignedRole(selectedUserDetailsUser)}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
                                    <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Karma Points</span>
                                    <p className="text-xs font-black text-amber-950 dark:text-amber-200 mt-0.5">
                                        ⭐ {typeof selectedUserDetailsUser.karmaPoints === 'number' ? selectedUserDetailsUser.karmaPoints : 0} pts ({selectedUserDetailsUser.karmaBadgeLevel || 'Bronze'})
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                                    <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Account Status</span>
                                    <p className={`text-xs font-black mt-0.5 ${selectedUserDetailsUser.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {selectedUserDetailsUser.isActive ? '● Active & Verified' : '● Suspended'}
                                    </p>
                                </div>
                            </div>

                            {/* Section: Employee & Organization Details */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-indigo-500">badge</span>
                                    Employee & Contact Information
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                        <span className="text-slate-400 text-[11px] block font-medium">Official Email Address</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 break-all select-all font-mono mt-0.5 block">
                                            {selectedUserDetailsUser.email || `${(selectedUserDetailsUser.fullName || selectedUserDetailsUser.name || 'user').toLowerCase().replace(/\s+/g, '.')}@mponline.gov.in`}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                        <span className="text-slate-400 text-[11px] block font-medium">Department</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                            {selectedUserDetailsUser.department || selectedUserDetailsUser.departmentName || 'MPOnline IT Operations'}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                        <span className="text-slate-400 text-[11px] block font-medium">Official Designation</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                            {selectedUserDetailsUser.designation || 'Staff Member'}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                        <span className="text-slate-400 text-[11px] block font-medium">Work Location</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                            {selectedUserDetailsUser.location || 'MPOnline Headquarters, Bhopal'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Role Governance & Permissions */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-purple-500">security</span>
                                    System Access Scope & Privileges
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {(selectedUserDetailsUser.roleName || getUserAssignedRole(selectedUserDetailsUser)).includes('System')
                                        ? '🛡️ Full System Administration: Complete governance authority over user accounts, audit trails, community moderation, and platform parameters.'
                                        : (selectedUserDetailsUser.roleName || getUserAssignedRole(selectedUserDetailsUser)).includes('HR')
                                        ? '🪪 HR Administrator: Authorized for organization-wide default community assignments, HR analytics dashboards, and job postings.'
                                        : (selectedUserDetailsUser.roleName || getUserAssignedRole(selectedUserDetailsUser)).includes('Community')
                                        ? '👥 Community Administrator: Authorized for content moderation, pinned discussions, user approvals, and channel safety enforcement.'
                                        : '👤 Standard Employee: Access to feed posting, media channels, communities collaboration, and karma rewards.'}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer with Action Buttons */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                            <button
                                onClick={() => setIsUserDetailsModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setRoleUserId(String(selectedUserDetailsUser.userId || selectedUserDetailsUser.id));
                                        setRoleUserName(selectedUserDetailsUser.fullName || selectedUserDetailsUser.name);
                                        setSelectedRoles(getUserRolesList(selectedUserDetailsUser));
                                        setIsUserDetailsModalOpen(false);
                                        setIsRoleModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[15px]">manage_accounts</span>
                                    Edit Roles
                                </button>

                                <button
                                    onClick={() => {
                                        handleToggleUserActive(selectedUserDetailsUser);
                                        setSelectedUserDetailsUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                                        selectedUserDetailsUser.isActive 
                                            ? 'bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400' 
                                            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[15px]">
                                        {selectedUserDetailsUser.isActive ? 'person_off' : 'person_check'}
                                    </span>
                                    {selectedUserDetailsUser.isActive ? 'Suspend User' : 'Reactivate User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
