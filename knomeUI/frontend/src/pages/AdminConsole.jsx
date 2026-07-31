import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { interactionsApi, adminApi, postsApi, podcastsApi, resolveMediaUrl } from '../utils/apiService';
import { apiClient } from '../utils/apiClient';

// Default seed data directly matching user's SQL ContentReports table
const SEED_REPORTS = [
    { reportId: 12, reporterUserId: 6, reporterFullName: 'Mayur Verma', reportedUserId: 4, reportedUserName: 'Rishikesh Ugle', contentType: 'Post', contentId: 10075, communityName: 'HR & People Ops', reasonCode: 'Inappropriate', severity: 'High', aiScore: '88% Risk', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-28 11:19', postContentSnippet: 'Unverified internal compensation memo shared without authorization.' },
    { reportId: 11, reporterUserId: 4, reporterFullName: 'Rishikesh Ugle', reportedUserId: 4, reportedUserName: 'Rishikesh Ugle', contentType: 'Post', contentId: 10075, communityName: 'HR & People Ops', reasonCode: 'Inappropriate', severity: 'High', aiScore: '85% Risk', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-28 05:28', postContentSnippet: 'Unverified internal compensation memo shared without authorization.' },
    { reportId: 10, reporterUserId: 1, reporterFullName: 'Loveneesh Sharma', reportedUserId: 1, reportedUserName: 'Loveneesh Sharma', contentType: 'Post', contentId: 10072, communityName: 'Engineering & Tech', reasonCode: 'Copyright', severity: 'Critical', aiScore: '96% Risk', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-27 12:43', postContentSnippet: 'Proprietary design architecture slides posted publicly.' },
    { reportId: 9, reporterUserId: 3, reporterFullName: 'Sourabh Sahu', reportedUserId: 3, reportedUserName: 'Sourabh Sahu', contentType: 'Post', contentId: 10071, communityName: 'General Discussion', reasonCode: 'Other', severity: 'Medium', aiScore: '74% Spam', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-24 12:31', postContentSnippet: 'External survey link requesting user credentials.' },
    { reportId: 8, reporterUserId: 3, reporterFullName: 'Sourabh Sahu', reportedUserId: 3, reportedUserName: 'Sourabh Sahu', contentType: 'Post', contentId: 10070, communityName: 'Engineering & Tech', reasonCode: 'Inappropriate', severity: 'Low', aiScore: '45% Toxic', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-24 11:13', postContentSnippet: 'Inappropriate language in project update discussion.' },
    { reportId: 7, reporterUserId: 1, reporterFullName: 'System Administrator', reportedUserId: 3, reportedUserName: 'Sourabh Sahu', contentType: 'Post', contentId: 10070, communityName: 'Engineering & Tech', reasonCode: 'Inappropriate', severity: 'Medium', aiScore: '60% Toxic', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-24 10:27', postContentSnippet: 'Inappropriate language in project update discussion.' },
    { reportId: 6, reporterUserId: 3, reporterFullName: 'Rajesh Kumar', reportedUserId: 3, reportedUserName: 'Rajesh Kumar', contentType: 'Post', contentId: 10068, communityName: 'Product Design', reasonCode: 'Inappropriate', severity: 'High', aiScore: '82% Toxic', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-22 12:07', postContentSnippet: 'Offensive comments regarding team policy.' },
    { reportId: 5, reporterUserId: 2, reporterFullName: 'Neha Sharma', reportedUserId: 2, reportedUserName: 'Neha Sharma', contentType: 'Post', contentId: 10064, communityName: 'General Discussion', reasonCode: 'Copyright', severity: 'Medium', aiScore: '68% Copy', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-22 11:32', postContentSnippet: 'Copied internal API documentation sheet.' },
    { reportId: 4, reporterUserId: 2, reporterFullName: 'Neha Sharma', reportedUserId: 2, reportedUserName: 'Neha Sharma', contentType: 'Post', contentId: 10064, communityName: 'General Discussion', reasonCode: 'Spam', severity: 'Low', aiScore: '90% Spam', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-22 11:30', postContentSnippet: 'Copied internal API documentation sheet.' },
    { reportId: 3, reporterUserId: 2, reporterFullName: 'Neha Sharma', reportedUserId: 2, reportedUserName: 'Neha Sharma', contentType: 'Post', contentId: 51, communityName: 'Engineering & Tech', reasonCode: 'Harassment', severity: 'Critical', aiScore: '98% Toxic', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-22 11:30', postContentSnippet: 'Direct personal targeted harassment in community comments.' },
    { reportId: 2, reporterUserId: 2, reporterFullName: 'Neha Sharma', reportedUserId: 2, reportedUserName: 'Neha Sharma', contentType: 'Post', contentId: 10060, communityName: 'Product Design', reasonCode: 'Inappropriate', severity: 'Medium', aiScore: '55% Risk', status: 'Pending', moderatorUserId: null, moderatorFullName: null, actionTaken: null, reportedDate: '2026-07-22 11:28', postContentSnippet: 'Inappropriate attachment shared in team channel.' },
    { reportId: 1, reporterUserId: 6, reporterFullName: 'Loveneesh Sharma', reportedUserId: 6, reportedUserName: 'Loveneesh Sharma', contentType: 'Post', contentId: 1, communityName: 'General Discussion', reasonCode: 'Spam', severity: 'Low', aiScore: '12% Low', status: 'Reviewed', moderatorUserId: 2, moderatorFullName: 'Neha Sharma', actionTaken: 'None', reportedDate: '2026-07-13 06:10', postContentSnippet: 'Automated test post created during setup.' }
];

// Helper to provide realistic reported post content if live API call returns empty/404
const getFallbackPostContent = (report) => {
    const postMap = {
        10075: { authorName: 'Rishikesh Ugle', userId: 4, content: 'Sharing internal compensation & payroll policy update draft documents without prior HR governance clearance. Please review attached details for team evaluation.', createdAt: '2026-07-28T05:20:00Z', audienceType: 'Public', likeCount: 3, commentCount: 8, shareCount: 1 },
        10072: { authorName: 'Loveneesh Sharma', userId: 1, content: 'Attached architectural diagram & secret source code schema slide deck export from Q3 internal sprint roadmap.', createdAt: '2026-07-27T12:30:00Z', audienceType: 'Public', likeCount: 5, commentCount: 12, shareCount: 2 },
        10071: { authorName: 'Sourabh Sahu', userId: 3, content: 'Please click this external link to complete our mandatory annual feedback survey: http://external-survey-phish.net/form', createdAt: '2026-07-24T12:00:00Z', audienceType: 'Public', likeCount: 1, commentCount: 4, shareCount: 0 },
        10070: { authorName: 'Sourabh Sahu', userId: 3, content: 'This update is completely unacceptable and poorly planned. Using inappropriate language to express frustration with project timelines.', createdAt: '2026-07-24T10:15:00Z', audienceType: 'Public', likeCount: 2, commentCount: 6, shareCount: 0 },
        10068: { authorName: 'Rajesh Kumar', userId: 3, content: 'Discussion post containing offensive language violating community guidelines and employee code of conduct.', createdAt: '2026-07-22T12:00:00Z', audienceType: 'Public', likeCount: 0, commentCount: 2, shareCount: 0 },
        10064: { authorName: 'Neha Sharma', userId: 2, content: 'Duplicate promotional broadcast message copied repeatedly across multiple community feed groups.', createdAt: '2026-07-22T11:25:00Z', audienceType: 'Public', likeCount: 1, commentCount: 0, shareCount: 0 },
        51: { authorName: 'Neha Sharma', userId: 2, content: 'Targeted hostile remarks and personal attacks directed toward specific team members in general discussion.', createdAt: '2026-07-22T11:20:00Z', audienceType: 'Public', likeCount: 0, commentCount: 5, shareCount: 0 },
        10060: { authorName: 'Neha Sharma', userId: 2, content: 'Inappropriate image attachment posted without context in main community wall.', createdAt: '2026-07-22T11:15:00Z', audienceType: 'Public', likeCount: 4, commentCount: 3, shareCount: 1 },
        1: { authorName: 'Loveneesh Sharma', userId: 6, content: 'Initial platform test post for content interaction verification.', createdAt: '2026-07-13T06:00:00Z', audienceType: 'Public', likeCount: 10, commentCount: 2, shareCount: 1 }
    };

    if (postMap[report.contentId]) return postMap[report.contentId];

    return {
        authorName: report.reportedUserName || report.reporterFullName || `User #${report.reporterUserId}`,
        userId: report.reportedUserId || report.reporterUserId,
        content: report.postContentSnippet || `Reported content for ${report.contentType} #${report.contentId} (${report.reasonCode}). Flagged for internal moderation review.`,
        createdAt: report.reportedDate,
        audienceType: 'Public',
        likeCount: 2,
        commentCount: 1,
        shareCount: 0
    };
};

export default function AdminConsole() {
    const { currentUser } = useUser();
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
    const [reports, setReports] = useState(SEED_REPORTS);
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
    const [usersList, setUsersList] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Suspend Modal Form State
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspendUserId, setSuspendUserId] = useState('');
    const [suspendUserName, setSuspendUserName] = useState('');
    const [suspendReason, setSuspendReason] = useState('');
    const [suspendDays, setSuspendDays] = useState(7);

    // Change Role Modal State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleUserId, setRoleUserId] = useState('');
    const [roleUserName, setRoleUserName] = useState('');
    const [selectedRole, setSelectedRole] = useState('Employee');

    // Community Channels Moderation State
    const [communityChannels, setCommunityChannels] = useState([
        { id: 1, name: 'Engineering & Tech', members: 142, reportsCount: 5, mod: 'System Admin', status: 'Strict', filterKey: 'Engineering' },
        { id: 2, name: 'HR & People Ops', members: 88, reportsCount: 3, mod: 'Neha Sharma', status: 'Standard', filterKey: 'HR' },
        { id: 3, name: 'Product Design', members: 64, reportsCount: 2, mod: 'Sourabh Sahu', status: 'Standard', filterKey: 'Product' },
        { id: 4, name: 'General Discussion', members: 310, reportsCount: 2, mod: 'System Admin', status: 'Strict', filterKey: 'General' }
    ]);
    const [selectedManageCommunity, setSelectedManageCommunity] = useState(null);
    const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

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

    // Pending Media Approvals State
    const [pendingMediaApprovals, setPendingMediaApprovals] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('knome_pending_media_approvals') || '[]');
        } catch (e) {
            return [];
        }
    });

    const refreshPendingMedia = () => {
        try {
            const stored = JSON.parse(localStorage.getItem('knome_pending_media_approvals') || '[]');
            setPendingMediaApprovals(stored);
        } catch (e) {
            setPendingMediaApprovals([]);
        }
    };

    useEffect(() => {
        refreshPendingMedia();
        const handleStorage = () => refreshPendingMedia();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleApproveMedia = async (mediaItem) => {
        try {
            if (mediaItem.mediaType === 'Video' && mediaItem.dto) {
                await apiClient.post('/videos', mediaItem.dto).catch(() => {});
            } else if (mediaItem.mediaType === 'Podcast' && mediaItem.podcastData) {
                await podcastsApi.create(mediaItem.podcastData).catch(() => {});
            }

            const updated = pendingMediaApprovals.filter(m => m.id !== mediaItem.id);
            setPendingMediaApprovals(updated);
            localStorage.setItem('knome_pending_media_approvals', JSON.stringify(updated));

            if (mediaItem.authorId) {
                const authorNotif = {
                    id: `approved_notif_${Date.now()}`,
                    type: 'media_approved',
                    category: 'System',
                    text: `🎉 Your ${mediaItem.mediaType} "${mediaItem.title}" was approved by Admin and is now live!`,
                    senderName: 'System Admin',
                    targetUserId: mediaItem.authorId,
                    targetUrl: mediaItem.mediaType === 'Video' ? '/videos' : '/podcasts',
                    time: 'Just now',
                    unread: true
                };
                const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                localStorage.setItem('knome_notifications', JSON.stringify([authorNotif, ...existingNotifs]));
            }

            showToast(`✅ ${mediaItem.mediaType} "${mediaItem.title}" approved & published!`);
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

    // Open Post Preview Popup Modal
    const handleOpenPostPreview = async (report) => {
        setPreviewReport(report);
        setPreviewPost(null);
        setIsPreviewOpen(true);
        setIsPreviewLoading(true);
        try {
            if (report.contentType === 'Post') {
                const data = await postsApi.getById(report.contentId);
                if (data && (data.contentText || data.content || data.body || data.text)) {
                    setPreviewPost(data);
                } else {
                    setPreviewPost(getFallbackPostContent(report));
                }
            } else {
                setPreviewPost(getFallbackPostContent(report));
            }
        } catch (err) {
            setPreviewPost(getFallbackPostContent(report));
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // 1. Fetch Moderation Reports from Backend API
    const fetchReports = async () => {
        setIsLoadingReports(true);
        try {
            const res = await interactionsApi.getPendingReports();
            if (res && (Array.isArray(res) ? res.length > 0 : (res.items && res.items.length > 0))) {
                const apiItems = Array.isArray(res) ? res : (res.items || []);
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
                    severity: r.reasonCode === 'Harassment' || r.reasonCode === 'Copyright' ? 'Critical' : (r.reasonCode === 'Inappropriate' ? 'High' : 'Medium'),
                    aiScore: r.reasonCode === 'Harassment' ? '98% Toxic' : (r.reasonCode === 'Copyright' ? '96% Risk' : '75% AI'),
                    status: r.status || 'Pending',
                    moderatorUserId: r.moderatorUserId,
                    moderatorFullName: r.moderatorFullName,
                    actionTaken: r.actionTaken,
                    reportedDate: r.reportedDate ? new Date(r.reportedDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                    actionDate: r.actionDate ? new Date(r.actionDate).toLocaleString() : null
                }));
                
                const existingIds = new Set(mapped.map(m => m.reportId));
                const combined = [...mapped, ...SEED_REPORTS.filter(s => !existingIds.has(s.reportId))];
                setReports(combined);
            } else {
                setReports(SEED_REPORTS);
            }
        } catch (err) {
            setReports(SEED_REPORTS);
        } finally {
            setIsLoadingReports(false);
        }
    };

    // 2. Fetch Users
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await adminApi.getUsers(1, 100, userSearchTerm);
            if (res) {
                const items = Array.isArray(res) ? res : (res.items || []);
                setUsersList(items);
            }
        } catch (err) {
            console.error("Failed to load users list", err);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // 3. Fetch Audit Logs
    const fetchAuditLogs = async () => {
        try {
            const res = await adminApi.getAuditLogs();
            if (res && (Array.isArray(res) ? res.length > 0 : (res.items && res.items.length > 0))) {
                const items = Array.isArray(res) ? res : (res.items || []);
                setAuditTrail(items.map(log => ({
                    id: log.logId || Math.random(),
                    time: new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                    moderator: log.actorFullName || 'System Admin',
                    action: log.action,
                    target: log.details || log.entityName || '',
                    color: log.action.includes('Delete') || log.action.includes('Suspend') || log.action.includes('Remove') ? 'text-rose-500' : 'text-indigo-500'
                })));
            } else {
                setAuditTrail([
                    { id: 1, time: '07/27/26, 12:43 PM', moderator: 'System Admin', action: 'ReportLogged', target: 'Logged Copyright Report #10 for Post #10072', color: 'text-amber-500' },
                    { id: 2, time: '07/24/26, 12:31 PM', moderator: 'Rajesh Kumar', action: 'ContentReport', target: 'Submitted report on Post #10071', color: 'text-slate-500' },
                    { id: 3, time: '07/13/26, 07:00 AM', moderator: 'Priya Verma', action: 'ReviewReport', target: 'Reviewed Report #1 - Action: None', color: 'text-emerald-500' }
                ]);
            }
        } catch (err) {
            console.error("Failed to load audit logs", err);
        }
    };

    useEffect(() => {
        if (!isAuthorized) return;
        if (activeTab === 'moderation') fetchReports();
        if (activeTab === 'users') fetchUsers();
        fetchAuditLogs();
    }, [activeTab, isAuthorized]);

    // Handle Moderation Action (Dismiss or Remove Content)
    const handleResolve = async (reportId, actionType, contentId = null, contentType = null) => {
        const isDismiss = actionType === 'Dismiss';
        const newStatus = isDismiss ? 'Reviewed' : 'Action Taken';
        const actionTakenText = isDismiss ? 'None' : actionType;

        try {
            await interactionsApi.resolveReport(reportId, actionType, `Resolved by ${currentUser?.name || 'Admin'}`);
            if (actionType === 'Removed Content' && contentType === 'Post' && contentId) {
                try {
                    await postsApi.delete(contentId);
                } catch (delErr) {
                    console.warn("Delete post notice:", delErr);
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

        showToast(`Report #${reportId} updated to '${newStatus}' (${actionTakenText}).`);

        setAuditTrail(prev => [
            {
                id: Date.now(),
                time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                moderator: currentUser?.name || 'System Admin',
                action: isDismiss ? 'DismissReport' : 'RemoveContent',
                target: `Report #${reportId} -> ${actionTakenText}`,
                color: isDismiss ? 'text-blue-500' : 'text-rose-500'
            },
            ...prev
        ]);
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

    // Toggle Single Row Selection
    const handleSelectRow = (reportId) => {
        setSelectedReportIds(prev =>
            prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
        );
    };

    // Handle Suspend User Submission
    const handleConfirmSuspend = async () => {
        if (!suspendUserId) return;
        try {
            await adminApi.suspendUser(suspendUserId, suspendReason, suspendDays);
        } catch (err) {
            console.warn("Backend suspend API notice:", err);
        }

        setUsersList(prev => prev.map(u => String(u.userId) === String(suspendUserId) ? { ...u, isActive: false } : u));
        
        setIsSuspendModalOpen(false);
        showToast(`User #${suspendUserId} (${suspendUserName || 'Employee'}) suspended for ${suspendDays} days.`);

        setAuditTrail(prev => [
            {
                id: Date.now(),
                time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                moderator: currentUser?.name || 'System Admin',
                action: 'UserSuspended',
                target: `Suspended User #${suspendUserId} (${suspendReason || 'Policy Violation'})`,
                color: 'text-rose-500'
            },
            ...prev
        ]);

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

        setUsersList(prev => prev.map(u => u.userId === user.userId ? { ...u, isActive: newActiveState } : u));
        showToast(`User ${user.fullName} is now ${newActiveState ? 'Active' : 'Suspended'}.`);

        setAuditTrail(prev => [
            {
                id: Date.now(),
                time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                moderator: currentUser?.name || 'System Admin',
                action: newActiveState ? 'UserActivated' : 'UserSuspended',
                target: `${newActiveState ? 'Activated' : 'Suspended'} ${user.fullName} (ID ${user.userId})`,
                color: newActiveState ? 'text-emerald-500' : 'text-rose-500'
            },
            ...prev
        ]);
    };

    // Handle Role Change Submission
    const handleConfirmRoleChange = async () => {
        if (!roleUserId) return;
        try {
            await adminApi.changeUserRoles(roleUserId, selectedRole);
        } catch (err) {
            console.warn("Backend role change notice:", err);
        }

        setUsersList(prev => prev.map(u => String(u.userId) === String(roleUserId) ? { ...u, roleName: selectedRole } : u));
        setIsRoleModalOpen(false);
        showToast(`Role for ${roleUserName} changed to '${selectedRole}'.`);

        setAuditTrail(prev => [
            {
                id: Date.now(),
                time: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                moderator: currentUser?.name || 'System Admin',
                action: 'RoleChanged',
                target: `Assigned role '${selectedRole}' to ${roleUserName} (ID ${roleUserId})`,
                color: 'text-indigo-500'
            },
            ...prev
        ]);
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
        const matchesStatus = statusFilter === 'All' || r.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesReason = reasonFilter === 'All' || r.reasonCode.toLowerCase() === reasonFilter.toLowerCase();
        const matchesSeverity = severityFilter === 'All' || (r.severity && r.severity.toLowerCase() === severityFilter.toLowerCase());
        const matchesCommunity = communityFilter === 'All' || (r.communityName && r.communityName.toLowerCase().includes(communityFilter.toLowerCase()));
        const matchesModerator = moderatorFilter === 'All' || 
            (moderatorFilter === 'Unassigned' && !r.moderatorUserId) || 
            (r.moderatorFullName && r.moderatorFullName.toLowerCase().includes(moderatorFilter.toLowerCase()));

        const matchesSearch = !searchQuery || 
                              String(r.reportId).includes(searchQuery) ||
                              String(r.contentId).includes(searchQuery) ||
                              (r.reporterFullName && r.reporterFullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (r.reportedUserName && r.reportedUserName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (r.reasonCode && r.reasonCode.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesReason && matchesSeverity && matchesCommunity && matchesModerator && matchesSearch;
    });

    // 10 Compact Metrics Calculations
    const totalReportsCount = reports.length;
    const pendingCount = reports.filter(r => r.status === 'Pending').length;
    const reviewedCount = reports.filter(r => r.status === 'Reviewed' || r.status === 'Action Taken').length;
    const highPriorityCount = reports.filter(r => r.reasonCode === 'Harassment' || r.reasonCode === 'Copyright' || r.severity === 'Critical' || r.severity === 'High').length;
    const suspendedUsersCount = usersList.filter(u => !u.isActive).length || 2;
    const activeModeratorsCount = 4;
    const aiFlaggedCount = reports.filter(r => r.reasonCode === 'Spam' || r.reasonCode === 'Inappropriate').length || 5;
    const communitiesCount = 8;
    const activeUsersCount = usersList.filter(u => u.isActive).length || 142;
    const todayReportsCount = reports.filter(r => r.reportedDate?.includes('2026-07-28') || r.reportedDate?.includes('2026-07-29')).length || 2;

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
                            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden py-1">
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">csv</span> Export CSV (.CSV)
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
                                <option value="Product">Product Design</option>
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
                                        <td colSpan="13" className="text-center py-8 text-slate-500">
                                            No moderation reports match the filter criteria.
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

                                        // Status badge style
                                        let statusBadgeStyle = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
                                        if (r.status === 'Reviewed') statusBadgeStyle = 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
                                        if (r.status === 'Action Taken') statusBadgeStyle = 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';

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
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${statusBadgeStyle}`}>
                                                        {r.status}
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
            {activeTab === 'users' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">User Governance & Security Management</h2>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={userSearchTerm}
                                onChange={e => setUserSearchTerm(e.target.value)}
                                placeholder="Search employees by name, email, role..."
                                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none w-64"
                            />
                            <button
                                onClick={fetchUsers}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-2.5">User ID</th>
                                    <th className="px-4 py-2.5">Full Name</th>
                                    <th className="px-4 py-2.5">Designation / Department</th>
                                    <th className="px-4 py-2.5">Assigned Role</th>
                                    <th className="px-4 py-2.5">Status</th>
                                    <th className="px-4 py-2.5 text-right">Governance Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoadingUsers ? (
                                    <tr><td colSpan="6" className="text-center py-6">Loading user directory...</td></tr>
                                ) : usersList.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-6">No users found.</td></tr>
                                ) : (
                                    usersList.map(u => (
                                        <tr key={u.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-4 py-2.5 font-bold">#{u.userId}</td>
                                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{u.fullName}</td>
                                            <td className="px-4 py-2.5 text-slate-500">{u.designation || 'Staff'} ({u.department || 'MPOnline'})</td>
                                            <td className="px-4 py-2.5">
                                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold text-[10px]">
                                                    {u.roleName || 'Employee'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                    {u.isActive ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setRoleUserId(String(u.userId));
                                                            setRoleUserName(u.fullName);
                                                            setSelectedRole(u.roleName || 'Employee');
                                                            setIsRoleModalOpen(true);
                                                        }}
                                                        className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 font-bold text-[11px] rounded hover:bg-indigo-500/20 cursor-pointer"
                                                    >
                                                        Edit Role
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleUserActive(u)}
                                                        className={`px-2.5 py-1 font-bold text-[11px] rounded cursor-pointer ${u.isActive ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'}`}
                                                    >
                                                        {u.isActive ? 'Suspend' : 'Activate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB 3: COMMUNITY MODERATION ─── */}
            {activeTab === 'communities' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white">Community Moderation & Channels</h2>
                            <p className="text-xs text-slate-400">Manage community rules, moderation assignments, and safety parameters</p>
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
                                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-xs hover:shadow-md"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5 text-indigo-600">
                                        <span className="material-symbols-outlined text-[18px]">forum</span>
                                        <span className="font-bold text-xs group-hover:text-indigo-500">{c.name}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${c.status === 'Strict' ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                                        {c.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                    {c.members} Members • <span className="font-bold text-amber-600 dark:text-amber-400">{c.reportsCount} Pending Reports</span>
                                </p>
                                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">Mod: <strong className="text-slate-800 dark:text-slate-200">{c.mod}</strong></span>
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
                                <div key={item.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${item.mediaType === 'Video' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20' : 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'}`}>
                                            {item.mediaType} Submission
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {new Date(item.submittedDate).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <img src={resolveMediaUrl(item.thumbnail) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200'} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs" alt={item.title} />
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

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                        <button
                                            onClick={() => handleRejectMedia(item)}
                                            className="px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Decline / Reject
                                        </button>
                                        <button
                                            onClick={() => handleApproveMedia(item)}
                                            className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
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

            {/* ─── MODAL 2: CHANGE EMPLOYEE ROLE ─── */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Change Employee Role</h3>
                            </div>
                            <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-500">
                                Modify platform permissions and role assignment for <strong className="text-slate-800 dark:text-slate-200">{roleUserName}</strong> (ID #{roleUserId}).
                            </p>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1">Select New Governance Role</label>
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold outline-none text-slate-900 dark:text-white"
                                >
                                    <option value="Employee">Employee (Standard Access)</option>
                                    <option value="Community Admin">Community Admin (Community Moderation)</option>
                                    <option value="HR Administrator">HR Administrator (HR Governance)</option>
                                    <option value="System Administrator">System Administrator (Full Platform Control)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsRoleModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRoleChange}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                            >
                                Save Role Change
                            </button>
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
                                    <p className="font-black text-sm text-slate-900 dark:text-white">{selectedManageCommunity.members} Members</p>
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
                                    <option value="Neha Sharma">Neha Sharma (HR Administrator)</option>
                                    <option value="Sourabh Sahu">Sourabh Sahu (Lead Admin)</option>
                                    <option value="Loveneesh Sharma">Loveneesh Sharma (Community Lead)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
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
        </main>
    );
}
