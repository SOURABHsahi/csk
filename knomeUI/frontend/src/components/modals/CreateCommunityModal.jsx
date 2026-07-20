import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

export default function CreateCommunityModal({ isOpen, onClose, onCommunityCreated }) {
    const { currentUser } = useUser();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [type, setType] = useState('public');
    const [defaultOrg, setDefaultOrg] = useState(''); // HR, Finance, Technology, CTO, Marketing
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Technology');
    const [banner, setBanner] = useState('');
    const [avatar, setAvatar] = useState('');
    const [rules, setRules] = useState('');
    const [faq, setFaq] = useState('');

    const bannerInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter a Community Name');
            setStep(1);
            return;
        }
        setIsSubmitting(true);
        setTimeout(() => {
            const newCommunity = {
                id: Date.now(),
                name: name.trim(),
                type: type === 'default' ? 'Default (Org)' : type.charAt(0).toUpperCase() + type.slice(1),
                members: '1 (You)',
                activity: 'New',
                description: description.trim() || 'A new community',
                banner: banner || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600&h=300',
                avatar: avatar || null
            };
            
            if (onCommunityCreated) onCommunityCreated(newCommunity);
            
            setIsSubmitting(false);
            
            // Reset state
            setStep(1); setName(''); setDescription(''); setType('public');
            setBanner(''); setAvatar(''); setRules(''); setFaq('');
            
            onClose();
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">group_add</span>
                            Create New Community
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Step {step} of 2: {step === 1 ? 'Basic Details & Media' : 'Governance & Content'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    
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
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Anyone can find and join automatically.</p>
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`block p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all ${type === 'private' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="radio" name="type" checked={type === 'private'} onChange={() => setType('private')} className="text-indigo-500 focus:ring-indigo-500" />
                                            <div>
                                                <h4 className="font-bold text-[14px] text-slate-900 dark:text-white flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-amber-500">lock</span> Private</h4>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Requires admin approval to join. Content is hidden.</p>
                                            </div>
                                        </div>
                                    </label>

                                    {['SYSADM', 'HRADM'].includes(currentUser.role) && (
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

                                    {type === 'default' && ['SYSADM', 'HRADM'].includes(currentUser.role) && (
                                        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Default Org (FR-CM-05)</label>
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
                                        if (e.target.files[0]) setBanner(URL.createObjectURL(e.target.files[0]));
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
                                        if (e.target.files[0]) setAvatar(URL.createObjectURL(e.target.files[0]));
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Left: Content (Rules & FAQ) */}
                            <div className="flex-1 space-y-5">
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Community Rules (Markdown)</label>
                                    <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="- Be respectful&#10;- Stay on topic&#10;- No spam" rows="5" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none font-mono"></textarea>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Frequently Asked Questions (FAQ)</label>
                                    <textarea value={faq} onChange={(e) => setFaq(e.target.value)} placeholder="Q: Who should join?&#10;A: Anyone interested in..." rows="5" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white resize-none font-mono"></textarea>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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
                                className="px-8 py-2.5 bg-indigo-500 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50">
                                {isSubmitting ? 'Creating...' : 'Create Community'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
