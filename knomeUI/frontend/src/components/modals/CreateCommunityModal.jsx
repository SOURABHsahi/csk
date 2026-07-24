import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

export default function CreateCommunityModal({ isOpen, onClose, onCommunityCreated }) {
    const { currentUser, users } = useUser();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdCommunityLink, setCreatedCommunityLink] = useState(null);
    const [copied, setCopied] = useState(false);

    // Form State
    const [type, setType] = useState('public');
    const [defaultOrg, setDefaultOrg] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Technology');
    const [banner, setBanner] = useState('');
    const [avatar, setAvatar] = useState('');
    const [rules, setRules] = useState('');
    const [faq, setFaq] = useState('');
    const [invitedUserIds, setInvitedUserIds] = useState([]);

    const bannerInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    if (!isOpen) return null;

    const toggleInviteUser = (userId) => {
        setInvitedUserIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter a Community Name');
            setStep(1);
            return;
        }
        setIsSubmitting(true);

        setTimeout(() => {
            const communityId = Date.now();
            const newCommunity = {
                id: communityId,
                name: name.trim(),
                type: type === 'default' ? 'Default (Org)' : type.charAt(0).toUpperCase() + type.slice(1),
                members: `1 (You)`,
                activity: 'New',
                description: description.trim() || 'A new community created for MPOnline teams.',
                banner: banner || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300',
                avatar: avatar || null,
                createdBy: currentUser?.name || 'Employee'
            };
            
            // Save Community Notifications for invited members
            const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const newInviteNotifs = invitedUserIds.map(targetId => {
                const targetUser = users.find(u => u.id === targetId);
                return {
                    id: Date.now() + Math.random(),
                    targetUserId: targetId,
                    type: 'invite',
                    text: `${currentUser?.name || 'An employee'} invited you to join the community "${newCommunity.name}".`,
                    time: 'Just now',
                    unread: true,
                    icon: 'group_add',
                    color: 'text-indigo-400',
                    bg: 'bg-indigo-500/10',
                    communityName: newCommunity.name,
                    communityId: newCommunity.id,
                    actionLink: '/community'
                };
            });

            localStorage.setItem('knome_notifications', JSON.stringify([...newInviteNotifs, ...existingNotifs]));

            // Save newly created community globally in custom communities & user joined list
            const customCommunities = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            localStorage.setItem('knome_custom_communities', JSON.stringify([newCommunity, ...customCommunities]));

            const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
            const userJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
            localStorage.setItem(userKey, JSON.stringify([newCommunity, ...userJoined]));

            // Dispatch global events for instant update across widgets
            window.dispatchEvent(new CustomEvent('community-joined-change'));
            window.dispatchEvent(new CustomEvent('community-invite-sent', {
                detail: { invitedUserIds, communityName: newCommunity.name, senderName: currentUser?.name }
            }));

            if (onCommunityCreated) onCommunityCreated(newCommunity);
            
            setIsSubmitting(false);

            // Generate direct link
            const generatedLink = `${window.location.origin}/community?id=${communityId}`;
            setCreatedCommunityLink(generatedLink);
        }, 1000);
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
        setStep(1); setName(''); setDescription(''); setType('public');
        setBanner(''); setAvatar(''); setRules(''); setFaq(''); setInvitedUserIds([]);
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
                            <span className="material-symbols-outlined text-indigo-500">group_add</span>
                            {createdCommunityLink ? 'Community Created Successfully!' : 'Create New Community'}
                        </h2>
                        {!createdCommunityLink && (
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                Step {step} of 2: {step === 1 ? 'Basic Details & Media' : 'Members & Governance'}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    
                    {createdCommunityLink ? (
                        /* SUCCESS SCREEN WITH LINK SHARE & NOTIFICATION CONFIRMATION */
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
                                    : 'Your community has been created. You can share the link below with your team members.'}
                            </p>

                            {/* Direct Share Link Box */}
                            <div className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm mb-6">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">
                                    🔗 Shareable Invite Link
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={createdCommunityLink} 
                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none" 
                                    />
                                    <button 
                                        onClick={handleCopyLink}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{copied ? 'done' : 'content_copy'}</span>
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={handleFinish}
                                className="px-8 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30"
                            >
                                Done & Go to Communities
                            </button>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Left: Text Inputs */}
                                    <div className="flex-1 space-y-5">
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Community Name</label>
                                            <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="e.g. Engineering Excellence" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is the purpose of this community?" rows="4" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none"></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Category</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium">
                                                <option>Technology</option>
                                                <option>Product & Design</option>
                                                <option>Culture & HR</option>
                                                <option>Operations</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Privacy & Governance Type</label>
                                            
                                            <label className={`block p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all ${type === 'public' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name="type" checked={type === 'public'} onChange={() => setType('public')} className="text-indigo-500 focus:ring-indigo-500" />
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-emerald-500">public</span> Public</h4>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Anyone can find and join. Admins get notified when members request/join.</p>
                                                    </div>
                                                </div>
                                            </label>

                                            <label className={`block p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all ${type === 'private' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name="type" checked={type === 'private'} onChange={() => setType('private')} className="text-indigo-500 focus:ring-indigo-500" />
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-amber-500">lock</span> Private</h4>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Requires Admin approval to join. Join requests are sent to Admin notifications.</p>
                                                    </div>
                                                </div>
                                            </label>

                                            {['SYSADM', 'HRADM'].includes(currentUser?.role) && (
                                                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${type === 'default' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input type="radio" name="type" checked={type === 'default'} onChange={() => setType('default')} className="text-indigo-500 focus:ring-indigo-500" />
                                                        <div>
                                                            <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-purple-500">corporate_fare</span> Organization Default</h4>
                                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Employees are automatically subscribed.</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            )}

                                            {type === 'default' && ['SYSADM', 'HRADM'].includes(currentUser?.role) && (
                                                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Default Org</label>
                                                    <select 
                                                        value={defaultOrg}
                                                        onChange={(e) => setDefaultOrg(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium">
                                                        <option value="" disabled>Select Department...</option>
                                                        <option>All Employees</option>
                                                        <option>HR</option>
                                                        <option>Finance</option>
                                                        <option>Technology</option>
                                                        <option>CTO</option>
                                                        <option>Marketing</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Right: Media Uploads */}
                                    <div className="w-full md:w-80 flex flex-col gap-5">
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Banner Image</label>
                                            <div onClick={() => bannerInputRef.current?.click()} className="relative w-full h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors cursor-pointer group overflow-hidden">
                                                {banner ? (
                                                    <img src={banner} alt="Banner Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[32px] mb-2 group-hover:scale-110 transition-transform">wallpaper</span>
                                                        <span className="text-[11px] font-bold">1200 x 400px minimum</span>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setBanner(ev.target.result);
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Thumbnail Avatar</label>
                                            <div onClick={() => avatarInputRef.current?.click()} className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors cursor-pointer group overflow-hidden">
                                                {avatar ? (
                                                    <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">add_photo_alternate</span>
                                                )}
                                            </div>
                                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setAvatar(ev.target.result);
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    {/* Invite Employees Section */}
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-indigo-500">person_add</span>
                                            <h3 className="font-bold text-[15px] text-slate-900 dark:text-white">
                                                Invite Employees (Send Direct Notification Link)
                                            </h3>
                                        </div>
                                        <p className="text-[12px] text-slate-500 mb-4">
                                            Selected employees will automatically receive a notification with a direct link to join this community.
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {users.filter(u => u.id !== currentUser?.id).map(user => {
                                                const isSelected = invitedUserIds.includes(user.id);
                                                return (
                                                    <div 
                                                        key={user.id} 
                                                        onClick={() => toggleInviteUser(user.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                                    >
                                                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt={user.name} />
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

                                    {/* Rules & FAQ */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Community Rules (Markdown)</label>
                                            <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="- Be respectful&#10;- Stay on topic&#10;- No spam" rows="4" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none font-mono"></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Frequently Asked Questions (FAQ)</label>
                                            <textarea value={faq} onChange={(e) => setFaq(e.target.value)} placeholder="Q: Who should join?&#10;A: Anyone interested in..." rows="4" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none font-mono"></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                {!createdCommunityLink && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-b-2xl">
                        <button onClick={onClose} className="px-6 py-2.5 text-[13px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            Cancel
                        </button>
                        
                        <div className="flex gap-3">
                            {step === 2 && (
                                <button 
                                    onClick={() => setStep(1)}
                                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    Back
                                </button>
                            )}
                            {step === 1 ? (
                                <button 
                                    onClick={() => setStep(2)}
                                    className="px-8 py-2.5 bg-indigo-500 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20">
                                    Next Step
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-8 py-2.5 bg-indigo-500 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    {isSubmitting ? 'Creating...' : 'Create & Invite Members'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
