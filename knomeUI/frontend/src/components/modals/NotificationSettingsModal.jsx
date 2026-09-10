import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

export const DEFAULT_NOTIF_PREFERENCES = {
    comments: true,
    reactions: true,
    followers: true,
    communityInvites: true,
    mentions: true,
    communityPosts: true,
    jobPostings: true,
};

export default function NotificationSettingsModal({ isOpen, onClose }) {
    const { currentUser } = useUser();
    const { addToast } = useToast();
    
    const storageKey = `knome_notif_prefs_${currentUser?.userId || currentUser?.id || 'default'}`;

    const [preferences, setPreferences] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return { ...DEFAULT_NOTIF_PREFERENCES, ...JSON.parse(saved) };
        } catch (_) {}
        return DEFAULT_NOTIF_PREFERENCES;
    });

    useEffect(() => {
        if (isOpen) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    setPreferences({ ...DEFAULT_NOTIF_PREFERENCES, ...JSON.parse(saved) });
                }
            } catch (_) {}
        }
    }, [isOpen, storageKey]);

    if (!isOpen) return null;

    const togglePref = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleEnableAll = () => {
        setPreferences({
            comments: true,
            reactions: true,
            followers: true,
            communityInvites: true,
            mentions: true,
            communityPosts: true,
            jobPostings: true,
        });
    };

    const handleDisableAll = () => {
        setPreferences({
            comments: false,
            reactions: false,
            followers: false,
            communityInvites: false,
            mentions: false,
            communityPosts: false,
            jobPostings: false,
        });
    };

    const handleSave = () => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(preferences));
            window.dispatchEvent(new CustomEvent('notification-preferences-updated', { detail: preferences }));
            addToast && addToast('Notification preferences saved successfully!', 'success');
        } catch (e) {
            console.error('Failed to save notification preferences', e);
        }
        onClose();
    };

    const eventTypes = [
        { 
            key: 'comments', 
            label: 'Comments & Replies', 
            description: 'Alerts when colleagues comment on your posts, articles, or reply to discussions.',
            icon: 'chat_bubble',
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-500/10'
        },
        { 
            key: 'reactions', 
            label: 'Reactions & Likes', 
            description: 'Alerts when colleagues like, react to, or celebrate your published content.',
            icon: 'favorite',
            iconColor: 'text-rose-500',
            iconBg: 'bg-rose-500/10'
        },
        { 
            key: 'followers', 
            label: 'Followers & Connections', 
            description: 'Alerts when an employee sends you a connection request or starts following you.',
            icon: 'person_add',
            iconColor: 'text-indigo-500',
            iconBg: 'bg-indigo-500/10'
        },
        { 
            key: 'communityInvites', 
            label: 'Community Invitations', 
            description: 'Alerts when you are invited to join an enterprise community space.',
            icon: 'groups',
            iconColor: 'text-cyan-500',
            iconBg: 'bg-cyan-500/10'
        },
        { 
            key: 'mentions', 
            label: '@Mentions in Discussions', 
            description: 'Alerts when someone mentions your name in a post, article, or comment.',
            icon: 'alternate_email',
            iconColor: 'text-purple-500',
            iconBg: 'bg-purple-500/10'
        },
        { 
            key: 'communityPosts', 
            label: 'New Community Posts', 
            description: 'Alerts when new updates or articles are posted in communities you belong to.',
            icon: 'campaign',
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-500/10'
        },
        { 
            key: 'jobPostings', 
            label: 'Internal Job Postings', 
            description: 'Alerts when new job vacancies and openings are announced across MPOnline Limited.',
            icon: 'work',
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-500/10'
        },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-xl glass bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[22px]">notifications_active</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Notification Preferences</h2>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Manage which in-app alerts and popups you receive.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Sub-header Controls */}
                <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[16px] text-blue-500">notifications</span>
                        <span>In-App Alert Controls</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleEnableAll}
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                            Enable All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                        <button
                            type="button"
                            onClick={handleDisableAll}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                        >
                            Mute All
                        </button>
                    </div>
                </div>

                {/* Content List */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                    {eventTypes.map(({ key, label, description, icon, iconColor, iconBg }) => {
                        const isEnabled = preferences[key] !== false;
                        return (
                            <div 
                                key={key} 
                                onClick={() => togglePref(key)}
                                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {label}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                                <Toggle checked={isEnabled} onChange={() => togglePref(key)} />
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Changes apply in real-time across your account
                    </span>
                    <div className="flex items-center gap-2.5 ml-auto">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={handleSave} 
                            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-105 cursor-pointer"
                        >
                            Save Preferences
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Simple toggle switch component
function Toggle({ checked, onChange }) {
    return (
        <button 
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onChange();
            }}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${checked ? 'left-6' : 'left-1'}`}></div>
        </button>
    );
}
