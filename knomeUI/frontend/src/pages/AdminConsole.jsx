import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';

export default function AdminConsole() {
    const { currentUser } = useUser();
    const [activeTab, setActiveTab] = useState(currentUser.role === 'SYSADM' ? 'users' : 'moderation');
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    
    // Moderation Queue State
    const [queue, setQueue] = useState([
        { id: 1, type: 'Post', author: 'Mayur Verma', reason: 'Spam/Marketing', snippet: '"Check out this amazing new diet pill..."', handled: false },
        { id: 2, type: 'Comment', author: 'Rahul Kumar', reason: 'Harassment', snippet: '"You are absolutely clueless..."', handled: false },
        { id: 3, type: 'Video', author: 'Priya Singh', reason: 'Illegal Content', snippet: '[Flagged embedded video]', handled: false }
    ]);
    
    // Audit Trail State
    const [auditTrail, setAuditTrail] = useState([
        { id: 101, time: 'Oct 24, 2024 • 14:22', moderator: 'Sourabh Sahu (HR)', action: 'Suspended User', target: '@r.king', color: 'text-error' },
        { id: 102, time: 'Oct 24, 2024 • 12:05', moderator: 'Admin System', action: 'Auto-Archive', target: '#archived-topics', color: 'text-teal-accent' },
        { id: 103, time: 'Oct 23, 2024 • 09:45', moderator: 'Rishikesh Ugle', action: 'Updated Role', target: '@loveneesh.s', color: 'text-electric-blue' }
    ]);

    const handleModerationAction = (id, actionType, author) => {
        // Mark as handled
        setQueue(queue.map(q => q.id === id ? { ...q, handled: true, outcome: actionType } : q));
        
        // Log to audit trail
        setAuditTrail([{
            id: Date.now(),
            time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            moderator: currentUser.name,
            action: actionType,
            target: `@${author.split(' ')[0].toLowerCase()}`,
            color: actionType === 'Removed Content' || actionType === 'Blocked User' ? 'text-error' : 'text-slate-500'
        }, ...auditTrail]);
    };
    
    if (!['SYSADM', 'HRADM', 'CADM'].includes(currentUser.role)) {
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
<header className="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
<div>
<h1 className="font-headline-lg text-headline-lg text-primary-container">Admin Console</h1>
<p className="text-slate-gray font-body-lg text-body-lg">Manage organizational hierarchy, roles, and
                        system integrity.</p>
</div>
<div className="flex gap-2">
<button className="flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-slate-gray rounded-lg font-label-md text-label-md hover:bg-surface-container transition-all">
<span className="material-symbols-outlined text-[18px]">download</span> Export Data
                    </button>
{currentUser.role === 'SYSADM' && (
<button className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg font-label-md text-label-md hover:bg-opacity-90 transition-all shadow-sm" onClick={() => setIsSuspendModalOpen(true)}>
<span className="material-symbols-outlined text-[18px]">person_off</span> Suspend User
                    </button>
)}
</div>
</header>
{/*  Tabs  */}

<div className="flex border-b border-border-subtle mb-stack-lg overflow-x-auto whitespace-nowrap scrollbar-hide">
{currentUser.role === 'SYSADM' && (
    <button onClick={() => setActiveTab('users')} className={`px-6 py-4 border-b-2 font-bold font-label-md text-label-md transition-all ${activeTab === 'users' ? 'border-electric-blue text-electric-blue' : 'border-transparent text-slate-gray hover:text-electric-blue'}`}>Users &amp; Roles</button>
)}
{currentUser.role === 'SYSADM' && (
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
<input className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg text-body-md focus:ring-2 focus:ring-electric-blue focus:border-transparent outline-none" placeholder="Search employees..." type="text"/>
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
<tr className="hover:bg-slate-50 transition-colors">
<td className="px-6 py-4 flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs">
                                                AJ</div>
<div>
<div className="font-semibold text-primary-container">Loveneesh Sharma</div>
<div className="text-xs text-slate-gray">loveneesh.s@knome.com</div>
</div>
</td>
<td className="px-6 py-4 text-slate-gray">Engineering</td>
<td className="px-6 py-4">
<span className="px-2 py-1 bg-surface-container rounded text-xs font-semibold">Employee</span>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 text-teal-accent">
<span className="w-2 h-2 rounded-full bg-teal-accent"></span> Active
                                            </span>
</td>
<td className="px-6 py-4 text-right space-x-2">
<button className="text-electric-blue hover:underline font-label-md">Edit</button>
<button className="text-error hover:underline font-label-md">Suspend</button>
</td>
</tr>
<tr className="hover:bg-slate-50 transition-colors">
<td className="px-6 py-4 flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold text-xs">
                                                SM</div>
<div>
<div className="font-semibold text-primary-container">Sourabh Sahu</div>
<div className="text-xs text-slate-gray">s.miller@knome.com</div>
</div>
</td>
<td className="px-6 py-4 text-slate-gray">Human Resources</td>
<td className="px-6 py-4">
<span className="px-2 py-1 bg-primary-container text-white rounded text-xs font-semibold">HR
                                                Admin</span>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 text-teal-accent">
<span className="w-2 h-2 rounded-full bg-teal-accent"></span> Active
                                            </span>
</td>
<td className="px-6 py-4 text-right space-x-2">
<button className="text-electric-blue hover:underline font-label-md">Edit</button>
<button className="text-error hover:underline font-label-md">Suspend</button>
</td>
</tr>
<tr className="hover:bg-slate-50 transition-colors">
<td className="px-6 py-4 flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold text-xs">
                                                RK</div>
<div>
<div className="font-semibold text-primary-container">Robert King</div>
<div className="text-xs text-slate-gray">r.king@knome.com</div>
</div>
</td>
<td className="px-6 py-4 text-slate-gray">Product</td>
<td className="px-6 py-4">
<span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded text-xs font-semibold">Comm.
                                                Admin</span>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 text-slate-gray">
<span className="w-2 h-2 rounded-full bg-slate-gray"></span> Suspended
                                            </span>
</td>
<td className="px-6 py-4 text-right space-x-2">
<button className="text-electric-blue hover:underline font-label-md">Edit</button>
<button className="text-teal-accent hover:underline font-label-md">Reactivate</button>
</td>
</tr>
</tbody>
</table>
</div>
<div className="p-4 border-t border-border-subtle bg-surface-container-lowest flex justify-between items-center text-xs text-slate-gray">
<span>Showing 3 of 1,248 users</span>
<div className="flex gap-2">
<button className="px-3 py-1 border border-border-subtle rounded hover:bg-surface-container transition-colors">Previous</button>
<button className="px-3 py-1 border border-border-subtle bg-electric-blue text-white rounded transition-colors">1</button>
<button className="px-3 py-1 border border-border-subtle rounded hover:bg-surface-container transition-colors">2</button>
<button className="px-3 py-1 border border-border-subtle rounded hover:bg-surface-container transition-colors">Next</button>
</div>
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
    
<section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
<div className="p-stack-md border-b border-border-subtle flex items-center justify-between">
<h3 className="font-headline-sm text-headline-sm text-primary-container">Audit Trail</h3>
<button className="text-electric-blue text-xs font-bold hover:underline">View All</button>
</div>
<div className="p-0">
<table className="w-full text-left text-body-md">
<thead className="bg-surface-container text-slate-gray font-label-md text-label-md uppercase tracking-wider text-[11px]">
<tr>
<th className="px-6 py-3">Timestamp</th>
<th className="px-6 py-3">Moderator</th>
<th className="px-6 py-3">Action</th>
<th className="px-6 py-3">Target</th>
</tr>
</thead>
<tbody className="divide-y divide-border-subtle">
{auditTrail.map(audit => (
    <tr key={audit.id} className="text-sm">
        <td className="px-6 py-3 text-slate-gray">{audit.time}</td>
        <td className="px-6 py-3 font-medium">{audit.moderator}</td>
        <td className={`px-6 py-3 font-bold ${audit.color}`}>{audit.action}</td>
        <td className="px-6 py-3 italic">{audit.target}</td>
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
<div className="text-2xl font-bold text-primary-container">12,482</div>
</div>
<div className="text-teal-accent text-xs font-bold mb-1">↑ 12%</div>
</div>
<div className="flex justify-between items-end border-b border-border-subtle pb-2">
<div>
<div className="text-xs text-slate-gray">Flagged Posts</div>
<div className="text-2xl font-bold text-error">14</div>
</div>
<div className="text-error text-xs font-bold mb-1">↓ 3%</div>
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
<section className="bg-white border border-border-subtle rounded-xl p-stack-md shadow-sm">
<h4 className="font-label-md text-label-md text-slate-gray uppercase mb-4">Pending Requests</h4>
<div className="space-y-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-gray">
<span className="material-symbols-outlined">forum</span>
</div>
<div className="flex-grow">
<div className="text-sm font-semibold">New Community</div>
<div className="text-xs text-slate-gray">#rust-experts</div>
</div>
<button className="material-symbols-outlined text-teal-accent text-xl">check_circle</button>
<button className="material-symbols-outlined text-error text-xl">cancel</button>
</div>
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-gray">
<span className="material-symbols-outlined">account_balance_wallet</span>
</div>
<div className="flex-grow">
<div className="text-sm font-semibold">Budget Approval</div>
<div className="text-xs text-slate-gray">DevRel Q4 Events</div>
</div>
<button className="material-symbols-outlined text-teal-accent text-xl">check_circle</button>
<button className="material-symbols-outlined text-error text-xl">cancel</button>
</div>
</div>
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
                    <label className="text-[12px] font-bold text-slate-500 uppercase mb-1 block">User to Suspend</label>
                    <input type="text" placeholder="e.g. @rahul.kumar" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px]" />
                </div>
                <div>
                    <label className="text-[12px] font-bold text-slate-500 uppercase mb-1 block">Suspension Type</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px]">
                        <option>Temporary (24 Hours)</option>
                        <option>Temporary (7 Days)</option>
                        <option>Permanent Ban</option>
                    </select>
                </div>
                <div>
                    <label className="text-[12px] font-bold text-slate-500 uppercase mb-1 block">Reason (Sent to user)</label>
                    <textarea placeholder="Reason for suspension..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] h-20 resize-none"></textarea>
                </div>
                
                <div className="flex gap-3 mt-2">
                    <button onClick={() => setIsSuspendModalOpen(false)} className="flex-1 py-2 rounded-xl text-[14px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button 
                        onClick={() => {
                            setAuditTrail([{
                                id: Date.now(),
                                time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                moderator: currentUser.name,
                                action: 'Suspended User',
                                target: '@user',
                                color: 'text-error'
                            }, ...auditTrail]);
                            setIsSuspendModalOpen(false);
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
