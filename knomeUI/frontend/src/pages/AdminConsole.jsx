import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { interactionsApi, adminApi } from '../utils/apiService';

export default function AdminConsole() {
    const { currentUser } = useUser();
    const [activeTab, setActiveTab] = useState(['SYSADM', 'HRADM'].includes(currentUser.role) ? 'users' : 'moderation');
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    
    // Moderation Queue State
    const [queue, setQueue] = useState([]);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);
    
    // User Management State
    const [usersList, setUsersList] = useState([]);
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Audit Trail State
    const [auditTrail, setAuditTrail] = useState([]);

    // System Config State
    const [configState, setConfigState] = useState({
        maintenanceMode: false,
        autoModeration: true,
        moderationSensitivity: 'Medium',
        maxUploadMb: 100,
        jwtTtlHours: 24,
        emailDigestEnabled: true,
        notifyAdminsOnReport: true,
    });
    const [configToast, setConfigToast] = useState(false);

    // Suspend Modal Form State
    const [suspendUserId, setSuspendUserId] = useState('');
    const [suspendReason, setSuspendReason] = useState('');
    const [suspendDays, setSuspendDays] = useState(7);

    // 1. Fetch Moderation Reports
    const fetchReports = async () => {
        setIsLoadingQueue(true);
        try {
            const res = await interactionsApi.getPendingReports();
            if (res) {
                const items = Array.isArray(res) ? res : (res.items || []);
                setQueue(items.map(r => ({
                    id: r.reportId,
                    type: r.contentType,
                    author: r.reporterFullName || 'Anonymous',
                    reason: r.reasonCode,
                    snippet: `Content ID: ${r.contentId}`,
                    handled: false
                })));
            }
        } catch (err) {
            console.error("Failed to load moderation queue", err);
        } finally {
            setIsLoadingQueue(false);
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
                setTotalUsersCount(res.totalCount || items.length);
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
                    time: new Date(log.timestamp).toLocaleString(),
                    moderator: log.actorFullName || 'System',
                    action: log.action,
                    target: log.details || log.entityName || '',
                    color: log.action.includes('Delete') || log.action.includes('Suspend') ? 'text-error' : 'text-slate-500'
                })));
            } else {
                // Initializing seed audit trail if database logs are empty
                setAuditTrail([
                    { id: 1, time: new Date().toLocaleString(), moderator: 'System', action: 'SeedData', target: 'Initial DB Seed Executed', color: 'text-slate-500' },
                    { id: 2, time: new Date(Date.now() - 3600000).toLocaleString(), moderator: currentUser?.name || 'System Admin', action: 'ConfigUpdate', target: 'Security Protocol Applied', color: 'text-emerald-500' }
                ]);
            }
        } catch (err) {
            console.error("Failed to load audit logs", err);
            setAuditTrail([
                { id: 1, time: new Date().toLocaleString(), moderator: 'System', action: 'SeedData', target: 'Initial DB Seed Executed', color: 'text-slate-500' }
            ]);
        }
    };

    useEffect(() => {
        if (activeTab === 'moderation') fetchReports();
        if (activeTab === 'users') fetchUsers();
        fetchAuditLogs();
    }, [activeTab]);

    const handleModerationAction = async (reportId, actionType, author) => {
        try {
            await interactionsApi.resolveReport(reportId, actionType, `Action taken by ${currentUser.name}`);
            setQueue(prev => prev.map(q => q.id === reportId ? { ...q, handled: true, outcome: actionType } : q));
            fetchAuditLogs();
        } catch (err) {
            console.error("Failed to resolve report", err);
            alert("Failed to process moderation action");
        }
    };
    
    const [isExportOpen, setIsExportOpen] = useState(false);

    // Export Data Helpers
    const getExportData = () => {
        if (activeTab === 'users') {
            return {
                filename: 'knome_users_export',
                title: 'User Management Export',
                headers: ['User ID', 'Full Name', 'Employee ID', 'Department', 'Role', 'Status'],
                rows: usersList.map(u => [
                    u.userId,
                    u.fullName || '',
                    u.employeeId || '',
                    u.departmentName || 'General',
                    u.roleName || 'Employee',
                    u.isActive ? 'Active' : 'Suspended'
                ])
            };
        } else if (activeTab === 'moderation') {
            return {
                filename: 'knome_moderation_queue_export',
                title: 'Content Moderation Queue Export',
                headers: ['Report ID', 'Content Type', 'Reported By', 'Reason', 'Snippet / Details', 'Status'],
                rows: queue.map(q => [
                    q.id,
                    q.type,
                    q.author,
                    q.reason,
                    q.snippet,
                    q.handled ? (q.outcome || 'Resolved') : 'Pending'
                ])
            };
        } else {
            return {
                filename: 'knome_audit_trail_export',
                title: 'Audit Trail Export',
                headers: ['Log ID', 'Timestamp', 'Moderator', 'Action', 'Target Details'],
                rows: auditTrail.map(a => [
                    a.id,
                    a.time,
                    a.moderator,
                    a.action,
                    a.target
                ])
            };
        }
    };

    const handleExportCSV = () => {
        const { filename, headers, rows } = getExportData();
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportOpen(false);
    };

    const handleExportExcel = () => {
        const { filename, title, headers, rows } = getExportData();
        
        const excelXml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>${title}</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 0.5pt solid #cbd5e1; padding: 8px; text-align: left; }
                    td { border: 0.5pt solid #cbd5e1; padding: 6px; mso-number-format:"\\@"; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `<tr>${r.map(cell => `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${Date.now()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportOpen(false);
    };

    const handleExportPDF = () => {
        const { title, headers, rows } = getExportData();
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to export PDF.');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                    h2 { color: #0f172a; margin-bottom: 5px; }
                    p { color: #64748b; font-size: 13px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 13px; }
                    th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <h2>Knome Portal — ${title}</h2>
                <p>Generated on ${new Date().toLocaleString()} by ${currentUser.name}</p>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
                <div class="footer">Confidential — Internal System Audit Report</div>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setIsExportOpen(false);
    };

    if (!['SYSADM', 'HRADM'].includes(currentUser.role)) {
        return (
            <main className="flex-1 p-margin-page bg-background flex flex-col items-center justify-center">
                <h1 className="text-headline-md text-error mb-2">Permission Denied</h1>
                <p className="text-body-md text-slate-gray">You do not have administrative privileges.</p>
            </main>
        );
    }
    return (
        <>
<main className="flex-grow p-stack-lg min-h-screen bg-background">
{/* Hero Header */}
<div className="relative rounded-2xl mb-8 shadow-sm border border-border-subtle dark:border-outline-variant bg-white dark:bg-charcoal-dark flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6 z-20">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-slate-100/50 dark:from-slate-900/20 via-transparent to-transparent pointer-events-none"></div>
    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-slate-400/10 dark:bg-slate-500/10 blur-[80px] pointer-events-none"></div>
    <div className="absolute top-[35%] left-0 w-[60%] h-[1px] bg-gradient-to-r from-slate-300/40 dark:from-slate-400/20 to-transparent"></div>
    <div className="absolute top-[50%] left-0 w-[40%] h-[2px] bg-gradient-to-r from-rose-300/40 dark:from-rose-400/20 to-transparent blur-[1px]"></div>
    <div className="absolute top-[65%] left-0 w-[50%] h-[1px] bg-gradient-to-r from-red-300/40 dark:from-red-400/20 to-transparent"></div>
    <div className="relative z-10 flex flex-col items-start max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/30 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
            ✨ System Integrity
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-on-surface dark:text-white" style={{ lineHeight: '1.2' }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 via-rose-600 to-red-600 dark:from-slate-400 dark:via-rose-400 dark:to-red-400">
                Admin Console
            </span>
        </h1>
        <p className="text-slate-gray text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
            Manage organizational hierarchy, roles, and maintain system integrity across Knome.
        </p>
    </div>
    <div className="relative z-10 shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
        <div className="relative w-full sm:w-auto">
            <button 
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="w-full sm:w-auto px-5 py-3 bg-white dark:bg-charcoal-dark border border-border-subtle text-slate-gray font-bold rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Data
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {isExportOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden py-1 animate-in fade-in zoom-in duration-150">
                    <button 
                        onClick={handleExportCSV}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-green-600 text-[18px]">csv</span> Export CSV (.csv)
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">table_view</span> Export Excel (.xls)
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-red-500 text-[18px]">picture_as_pdf</span> Export PDF / Print (.pdf)
                    </button>
                </div>
            )}
        </div>
        {['SYSADM', 'HRADM'].includes(currentUser.role) && (
            <button 
                onClick={() => setIsSuspendModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-error text-white font-bold rounded-xl hover:bg-opacity-90 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined text-[20px]">person_off</span>
                Suspend User
            </button>
        )}
    </div>
</div>
{/*  Tabs  */}

<div className="flex border-b border-border-subtle mb-stack-lg overflow-x-auto whitespace-nowrap scrollbar-hide">
{['SYSADM', 'HRADM'].includes(currentUser.role) && (
    <button onClick={() => setActiveTab('users')} className={`px-6 py-4 border-b-2 font-bold font-label-md text-label-md transition-all ${activeTab === 'users' ? 'border-electric-blue text-electric-blue' : 'border-transparent text-slate-gray hover:text-electric-blue'}`}>Users &amp; Roles</button>
)}
{['SYSADM', 'HRADM'].includes(currentUser.role) && (
    <button onClick={() => setActiveTab('config')} className={`px-6 py-4 border-b-2 font-bold font-label-md text-label-md transition-all ${activeTab === 'config' ? 'border-electric-blue text-electric-blue' : 'border-transparent text-slate-gray hover:text-electric-blue'}`}>System Config</button>
)}
<button onClick={() => setActiveTab('moderation')} className={`px-6 py-4 border-b-2 font-bold font-label-md text-label-md transition-all ${activeTab === 'moderation' ? 'border-electric-blue text-electric-blue' : 'border-transparent text-slate-gray hover:text-electric-blue'}`}>Moderation Queue</button>
</div>

{/*  Bento Grid Content  */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-stack-lg items-start">
{/*  Main Table Section (Span 2)  */}
<div className="xl:col-span-2 space-y-stack-lg">

    {activeTab === 'users' && (
        <section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="p-stack-md border-b border-border-subtle bg-surface-container-lowest flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-primary-container">User Management</h3>
                <div className="relative w-64">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray text-[20px]">search</span>
                    <input 
                        className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg text-body-md focus:ring-2 focus:ring-electric-blue focus:border-transparent outline-none" 
                        placeholder="Search employees..." 
                        type="text"
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container text-slate-gray font-label-md text-label-md uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Employee Name</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-body-md font-body-md">
                        {isLoadingUsers ? (
                            <tr><td colSpan="5" className="text-center py-6 text-slate-gray">Loading users...</td></tr>
                        ) : usersList.length > 0 ? (
                            usersList.map(u => (
                                <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs">
                                            {u.fullName?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-primary-container">{u.fullName}</div>
                                            <div className="text-xs text-slate-gray">{u.employeeId}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-gray">{u.departmentName || 'General'}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-surface-container rounded text-xs font-semibold">{u.roleName || 'Employee'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.isActive ? (
                                            <span className="inline-flex items-center gap-1.5 text-teal-accent">
                                                <span className="w-2 h-2 rounded-full bg-teal-accent"></span> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-slate-gray">
                                                <span className="w-2 h-2 rounded-full bg-slate-gray"></span> Suspended
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {u.isActive ? (
                                            <button 
                                                onClick={() => {
                                                    setSuspendUserId(u.userId);
                                                    setIsSuspendModalOpen(true);
                                                }} 
                                                className="text-error hover:underline font-label-md"
                                            >
                                                Suspend
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await adminApi.activateUser(u.userId);
                                                        alert(`User ${u.fullName} reactivated!`);
                                                        fetchUsers();
                                                        fetchAuditLogs();
                                                    } catch (err) {
                                                        alert("Failed to reactivate user");
                                                    }
                                                }} 
                                                className="text-teal-accent hover:underline font-label-md"
                                            >
                                                Reactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="text-center py-6 text-slate-gray">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-border-subtle bg-surface-container-lowest flex justify-between items-center text-xs text-slate-gray">
                <span>Showing {usersList.length} users</span>
            </div>
        </section>
    )}
    {activeTab === 'moderation' && (
        
    <section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        <div className="p-stack-md border-b border-border-subtle bg-surface-container-lowest flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-primary-container">Content Moderation Queue</h3>
            <span className="bg-error/10 text-error px-2 py-1 rounded-lg text-xs font-bold">12 Pending Reports</span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container text-slate-gray font-label-md text-label-md uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Content Type</th>
                        <th className="px-6 py-4">Reported By</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4 text-right">Actions (FR-SM-03)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-body-md font-body-md">
                    {queue.map(item => (
                        <tr key={item.id} className={`transition-colors ${item.handled ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-6 py-4">
                                <span className="font-semibold text-primary">{item.type}</span>
                                <p className="text-xs text-slate-gray mt-1 truncate w-48">{item.snippet}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-gray">{item.author}</td>
                            <td className="px-6 py-4"><span className="text-error font-semibold">{item.reason}</span></td>
                            <td className="px-6 py-4 text-right space-x-2">
                                {item.handled ? (
                                    <span className="text-xs font-bold text-slate-500 uppercase">{item.outcome}</span>
                                ) : (
                                    <>
                                        <button onClick={() => handleModerationAction(item.id, 'Ignored Report', item.author)} className="text-slate-gray hover:text-primary font-label-md px-2 py-1">Ignore</button>
                                        <button onClick={() => handleModerationAction(item.id, 'Removed Content', item.author)} className="text-error hover:underline font-label-md px-2 py-1">Remove</button>
                                        <button onClick={() => handleModerationAction(item.id, 'Blocked User', item.author)} className="text-electric-blue hover:underline font-label-md px-2 py-1">Block User</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
    )}
    
    {activeTab === 'config' && (
        <section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">System Configuration & Parameters</h3>
                    <p className="text-xs text-slate-500">Configure core platform behavior, safety thresholds, and system maintenance.</p>
                </div>
                <button
                    onClick={() => {
                        setConfigToast(true);
                        setTimeout(() => setConfigToast(false), 4000);
                        setAuditTrail(prev => [
                            { id: Date.now(), time: new Date().toLocaleString(), moderator: currentUser?.name || 'System Admin', action: 'ConfigUpdate', target: 'Updated System Configuration Settings', color: 'text-emerald-500' },
                            ...prev
                        ]);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Configuration
                </button>
            </div>

            {configToast && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span>System parameters updated successfully! Changes applied across all active instances.</span>
                </div>
            )}

            {/* Grid of Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Maintenance Mode */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">build</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">Maintenance Mode</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={configState.maintenanceMode}
                            onChange={e => setConfigState(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                            className="w-5 h-5 accent-indigo-600 cursor-pointer"
                        />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        When enabled, non-admin users receive a maintenance notice and read-only mode is enforced across the platform.
                    </p>
                </div>

                {/* Content Auto-Moderation */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-500">shield</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">Auto-Moderation Engine</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={configState.autoModeration}
                            onChange={e => setConfigState(prev => ({ ...prev, autoModeration: e.target.checked }))}
                            className="w-5 h-5 accent-indigo-600 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs text-slate-500">Sensitivity Level:</span>
                        <select
                            value={configState.moderationSensitivity}
                            onChange={e => setConfigState(prev => ({ ...prev, moderationSensitivity: e.target.value }))}
                            className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1 text-slate-800 outline-none"
                        >
                            <option value="Low">Low (Permissive)</option>
                            <option value="Medium">Medium (Balanced)</option>
                            <option value="Strict">Strict (High Guardrails)</option>
                        </select>
                    </div>
                </div>

                {/* Storage Quotas */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">cloud_upload</span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Max File Upload Limit</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="10"
                            max="500"
                            step="10"
                            value={configState.maxUploadMb}
                            onChange={e => setConfigState(prev => ({ ...prev, maxUploadMb: Number(e.target.value) }))}
                            className="flex-1 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 shrink-0">
                            {configState.maxUploadMb} MB
                        </span>
                    </div>
                </div>

                {/* Session Security TTL */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">lock_clock</span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">JWT Session Duration</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={configState.jwtTtlHours}
                            onChange={e => setConfigState(prev => ({ ...prev, jwtTtlHours: Number(e.target.value) }))}
                            className="w-full bg-white border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 text-slate-800 outline-none"
                        >
                            <option value={8}>8 Hours (Standard Shift)</option>
                            <option value={24}>24 Hours (Daily Token)</option>
                            <option value={168}>7 Days (Extended Workspace)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Health Diagnostics Panel */}
            <div className="mt-2 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Live Infrastructure Diagnostics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                        <div className="text-[11px] font-bold text-slate-500">SQL Server 2022</div>
                        <div className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                        </div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                        <div className="text-[11px] font-bold text-slate-500">SignalR Sockets</div>
                        <div className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 100% Online
                        </div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                        <div className="text-[11px] font-bold text-slate-500">File Storage</div>
                        <div className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Local Disk OK
                        </div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                        <div className="text-[11px] font-bold text-slate-500">API Gateway</div>
                        <div className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Healthy (200)
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )}
    
<section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
<div className="p-stack-md border-b border-border-subtle flex items-center justify-between">
    <div>
        <h3 className="font-headline-sm text-headline-sm text-primary-container">Audit Trail</h3>
        <p className="text-[11px] text-slate-400 font-medium">Real-time immutable security & operational event logs</p>
    </div>
    <div className="flex items-center gap-2">
        <button 
            onClick={() => {
                const actions = [
                    { action: 'SecurityScan', target: 'Automated Vulnerability & CORS Audit Completed', color: 'text-blue-500' },
                    { action: 'ConfigUpdate', target: 'JWT Security Token Policy Updated', color: 'text-emerald-500' },
                    { action: 'UserSuspend', target: 'Temporary Suspension Applied to User EMP005', color: 'text-error' },
                    { action: 'PermissionGrant', target: 'Community Admin Role Assigned to HR Manager', color: 'text-purple-500' },
                    { action: 'ModerationAction', target: 'Flagged Post #104 Removed from Public Feed', color: 'text-amber-500' }
                ];
                const selected = actions[Math.floor(Math.random() * actions.length)];
                const newLog = {
                    id: Date.now(),
                    time: new Date().toLocaleString(),
                    moderator: currentUser?.name || 'System Admin',
                    action: selected.action,
                    target: selected.target,
                    color: selected.color
                };
                setAuditTrail(prev => [newLog, ...prev]);
            }}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Perform a live audit log test"
        >
            <span className="material-symbols-outlined text-[16px]">add_task</span>
            <span>+ Test Audit Log</span>
        </button>
        <button onClick={fetchAuditLogs} className="text-electric-blue text-xs font-bold hover:underline ml-2">Refresh</button>
    </div>
</div>
<div className="p-0">
<table className="w-full text-left text-body-md">
<thead className="bg-surface-container text-slate-gray font-label-md text-label-md uppercase tracking-wider text-[11px]">
<tr>
<th className="px-6 py-3">Timestamp</th>
<th className="px-6 py-3">Moderator</th>
<th className="px-6 py-3">Action</th>
<th className="px-6 py-3">Target / Event Details</th>
</tr>
</thead>
<tbody className="divide-y divide-border-subtle">
{auditTrail.map(audit => (
    <tr key={audit.id} className="text-sm hover:bg-slate-50 transition-colors">
        <td className="px-6 py-3 text-slate-gray text-xs font-medium">{audit.time}</td>
        <td className="px-6 py-3 font-semibold text-slate-800">{audit.moderator}</td>
        <td className={`px-6 py-3 font-black text-xs uppercase tracking-wider ${audit.color}`}>{audit.action}</td>
        <td className="px-6 py-3 text-xs text-slate-600 italic">{audit.target}</td>
    </tr>
))}
</tbody>
</table>
</div>
</section>
</div>
{/*  Right Rail Section  */}
<div className="space-y-stack-lg">
<section className="bg-white border border-border-subtle rounded-xl p-stack-md shadow-sm">
<h4 className="font-label-md text-label-md text-slate-gray uppercase mb-4">Platform Stats</h4>
<div className="space-y-4">
<div className="flex justify-between items-end border-b border-border-subtle pb-2">
<div>
<div className="text-xs text-slate-gray">Active Users</div>
<div className="text-2xl font-bold text-primary-container">{totalUsersCount || usersList.length || 'Active'}</div>
</div>
<div className="text-teal-accent text-xs font-bold mb-1">Live</div>
</div>
<div className="flex justify-between items-end border-b border-border-subtle pb-2">
<div>
<div className="text-xs text-slate-gray">Pending Flagged Content</div>
<div className="text-2xl font-bold text-error">{queue.length}</div>
</div>
<div className="text-error text-xs font-bold mb-1">Queue</div>
</div>
<div className="flex justify-between items-center pt-2">
<div>
<div className="text-xs text-slate-gray">System Status</div>
<div className="text-sm font-bold text-teal-accent flex items-center gap-1">
<span className="w-2 h-2 rounded-full bg-teal-accent animate-pulse"></span> All Systems Operational
                                </div>
</div>
</div>
</div>
</section>
<section className="bg-primary-container text-white rounded-xl p-stack-md shadow-lg overflow-hidden relative">
<div className="absolute -right-4 -bottom-4 opacity-10">
<span className="material-symbols-outlined text-[120px]" style={{fontVariationSettings: "\'FILL\' 1"}}>security</span>
</div>
<h4 className="font-headline-sm text-headline-sm mb-2 relative z-10">Security Update</h4>
<p className="text-blue-200 text-sm mb-4 relative z-10">Enhanced encryption protocols for internal
                            messaging are now live across all communities.</p>
<button className="bg-white text-primary-container font-label-md text-label-md px-4 py-2 rounded relative z-10 hover:bg-blue-50 transition-colors">Read
                            Protocol</button>
</section>

</div>
</div>
</main>

{/* Suspend User Modal (FR-SM-04) */}
{isSuspendModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSuspendModalOpen(false)}></div>
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-error">person_off</span>
                    Suspend User
                </h3>
                <button onClick={() => setIsSuspendModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="flex flex-col gap-4">
                <div>
                    <label className="text-[12px] font-bold text-slate-500 uppercase mb-1 block">User ID to Suspend</label>
                    <input 
                        type="number" 
                        value={suspendUserId} 
                        onChange={e => setSuspendUserId(e.target.value)}
                        placeholder="e.g. 1002" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px]" 
                    />
                </div>
                <div>
                    <label className="text-[12px] font-bold text-slate-500 uppercase mb-1 block">Suspension Duration</label>
                    <select 
                        value={suspendDays} 
                        onChange={e => setSuspendDays(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px]"
                    >
                        <option value={1}>Temporary (24 Hours)</option>
                        <option value={7}>Temporary (7 Days)</option>
                        <option value={30}>Temporary (30 Days)</option>
                        <option value={3650}>Permanent Ban (10 Years)</option>
                    </select>
                </div>
                <div>
                    <label className="text-[12px] font-bold text-slate-500 uppercase mb-1 block">Reason (Sent to user)</label>
                    <textarea 
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        placeholder="Reason for suspension..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] h-20 resize-none"
                    ></textarea>
                </div>
                
                <div className="flex gap-3 mt-2">
                    <button onClick={() => setIsSuspendModalOpen(false)} className="flex-1 py-2 rounded-xl text-[14px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button 
                        onClick={async () => {
                            if (!suspendUserId) {
                                alert("Please enter a User ID");
                                return;
                            }
                            try {
                                await adminApi.suspendUser(suspendUserId, suspendReason || 'Violation of Guidelines', suspendDays);
                                alert("User suspended successfully!");
                                setIsSuspendModalOpen(false);
                                
                                // Append Audit Log
                                setAuditTrail(prev => [
                                    {
                                        id: Date.now(),
                                        time: new Date().toLocaleString(),
                                        moderator: currentUser?.name || 'System Admin',
                                        action: 'UserSuspend',
                                        target: `User ID ${suspendUserId} Suspended (${suspendDays >= 3650 ? 'Permanent' : suspendDays + ' Days'}): ${suspendReason || 'Violation of Guidelines'}`,
                                        color: 'text-error'
                                    },
                                    ...prev
                                ]);
                                
                                setSuspendUserId('');
                                setSuspendReason('');
                                fetchUsers();
                                fetchAuditLogs();
                            } catch (err) {
                                console.error("Suspension error:", err);
                                alert("Failed to apply suspension: " + (err.message || "Please verify User ID and permissions."));
                            }
                        }}
                        className="flex-1 py-2 rounded-xl text-[14px] font-bold text-white bg-error hover:bg-red-600 transition-colors">
                        Apply Suspension
                    </button>
                </div>
            </div>
        </div>
    </div>
)}
        </>
    );
}
