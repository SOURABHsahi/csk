import React, { useState } from 'react';

export default function NotificationSettingsModal({ isOpen, onClose }) {
    
    // FR-NT-02, FR-NT-03: Configuration state
    const [preferences, setPreferences] = useState({
        // Event types (FR-NT-01)
        comments: { bell: true, email: true },
        reactions: { bell: true, email: false },
        followers: { bell: true, email: true },
        communityInvites: { bell: true, email: true },
        mentions: { bell: true, email: true },
        communityPosts: { bell: false, email: false },
        jobPostings: { bell: true, email: false },
        // Digests (FR-NT-02)
        dailyDigest: true,
        weeklyDigest: true
    });

    const togglePref = (key, type) => {
        setPreferences(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [type]: !prev[key][type]
            }
        }));
    };

    const toggleDigest = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (!isOpen) return null;

    const eventTypes = [
        { key: 'comments', label: 'New Comment on my content' },
        { key: 'reactions', label: 'New Reaction on my content' },
        { key: 'followers', label: 'New Follower' },
        { key: 'communityInvites', label: 'Community Invitation' },
        { key: 'mentions', label: '@Mentions' },
        { key: 'communityPosts', label: 'New Community Post' },
        { key: 'jobPostings', label: 'New Job Posting' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl glass bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Notification Preferences</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Control how and when you receive alerts.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* Event Types Table */}
                    <div className="mb-8">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Event Types</h3>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                <div className="col-span-8">Activity</div>
                                <div className="col-span-2 text-center flex justify-center items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">notifications</span>
                                    In-App
                                </div>
                                <div className="col-span-2 text-center flex justify-center items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                                    Email
                                </div>
                            </div>
                            
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                                {eventTypes.map(({key, label}) => (
                                    <div key={key} className="grid grid-cols-12 gap-4 p-4 items-center">
                                        <div className="col-span-8 text-[13px] font-bold text-slate-700 dark:text-slate-300">
                                            {label}
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <Toggle checked={preferences[key].bell} onChange={() => togglePref(key, 'bell')} />
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <Toggle checked={preferences[key].email} onChange={() => togglePref(key, 'email')} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Email Digests */}
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Email Digests</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div>
                                    <div className="text-[14px] font-bold text-slate-900 dark:text-white">Daily Digest</div>
                                    <div className="text-[12px] font-medium text-slate-500 mt-1">Receive a daily summary of missed activity.</div>
                                </div>
                                <Toggle checked={preferences.dailyDigest} onChange={() => toggleDigest('dailyDigest')} />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div>
                                    <div className="text-[14px] font-bold text-slate-900 dark:text-white">Weekly Digest</div>
                                    <div className="text-[12px] font-medium text-slate-500 mt-1">Receive a weekly highlight reel of top platform content.</div>
                                </div>
                                <Toggle checked={preferences.weeklyDigest} onChange={() => toggleDigest('weeklyDigest')} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105">
                        Save Preferences
                    </button>
                </div>

            </div>
        </div>
    );
}

// Simple toggle switch component
function Toggle({ checked, onChange }) {
    return (
        <button 
            onClick={onChange}
            className={`w-10 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${checked ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${checked ? 'left-5' : 'left-1'}`}></div>
        </button>
    );
}
