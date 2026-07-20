import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { postsApi, mediaApi } from '../../utils/apiService';

export default function CreatePostModal({ isOpen, onClose, onPostCreated }) {
    const { currentUser, users } = useUser();
    const { addToast } = useToast();
    
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [audience, setAudience] = useState('Everyone');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    
    // Mention state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const textareaRef = useRef(null);

    // Security Scan State
    const [isScanning, setIsScanning] = useState(false);
    const [securityWarning, setSecurityWarning] = useState(null);
    const [scanComplete, setScanComplete] = useState(false);

    const MAX_CHARS = 400;

    // Handle Text Change & Features
    const handleTextChange = (e) => {
        const val = e.target.value;
        if (val.length <= MAX_CHARS) {
            setText(val);
        }

        // Mention Logic Trigger (@)
        const lastWord = val.split(' ').pop();
        if (lastWord.startsWith('@')) {
            setShowMentionDropdown(true);
            setMentionFilter(lastWord.slice(1).toLowerCase());
        } else {
            setShowMentionDropdown(false);
        }

        // Real-time Validation (FR-SM-01, FR-SM-06, FR-SM-07)
        if (val.length > 5) {
            if (!scanComplete && !isScanning) {
                runSecurityScan(val);
            }
        } else {
            setSecurityWarning(null);
            setScanComplete(false);
        }
    };

    const runSecurityScan = (content) => {
        setIsScanning(true);
        setSecurityWarning(null);
        
        // Simulate network delay for scan
        setTimeout(() => {
            setIsScanning(false);
            setScanComplete(true);
            
            const lowerContent = content.toLowerCase();
            
            // Restricted URLs (FR-SM-01)
            if (lowerContent.includes('malicious.com') || lowerContent.includes('scam-link.net')) {
                setSecurityWarning('Security Alert: This URL is flagged as potentially malicious and cannot be published.');
                return;
            }
            
            // Restricted Keywords (Marketing/Illegal/Sensitive) (FR-SM-06, FR-SM-07)
            import('../../utils/restrictedWords.js').then(({ checkRestrictedContent }) => {
                const foundKeyword = checkRestrictedContent(content);
                if (foundKeyword) {
                    setSecurityWarning(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted.`);
                }
            });
            
        }, 800);
    };

    const insertMention = (user) => {
        const words = text.split(' ');
        words.pop(); // remove the partial @mention
        const newText = [...words, `@${user.name} `].join(' ');
        if (newText.length <= MAX_CHARS) {
            setText(newText);
        }
        setShowMentionDropdown(false);
        textareaRef.current?.focus();
    };

    const fileInputRef = useRef(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [currentUploadType, setCurrentUploadType] = useState(null);

    const triggerFileInput = (type) => {
        if (attachments.length >= 4) return;
        setCurrentUploadType(type);
        if (fileInputRef.current) {
            // Set accept attribute dynamically
            const acceptMap = {
                image: 'image/jpeg,image/png,image/gif',
                video: 'video/mp4,video/quicktime,video/x-msvideo',
                audio: 'audio/mpeg,audio/wav,audio/aac',
                doc: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            fileInputRef.current.accept = acceptMap[type] || '*/*';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Create a local preview URL immediately so the user sees it right away
        const localPreviewUrl = URL.createObjectURL(file);
        const tempId = Date.now();

        // Add attachment with local preview URL immediately
        const newAttachment = {
            id: tempId,
            type: currentUploadType,
            name: file.name,
            url: localPreviewUrl,      // local blob for instant preview
            backendUrl: null,           // will be filled after upload
            isUploading: true
        };
        setAttachments(prev => [...prev, newAttachment]);
        setUploadingMedia(true);

        try {
            const result = await mediaApi.uploadFile(file, currentUploadType);

            // 2. Update the attachment with the real backend URL once uploaded
            setAttachments(prev => prev.map(att =>
                att.id === tempId
                    ? { ...att, backendUrl: result.url, isUploading: false }
                    : att
            ));
        } catch (error) {
            console.error('File upload failed', error);
            // Remove the attachment if upload failed
            setAttachments(prev => prev.filter(att => att.id !== tempId));
        } finally {
            setUploadingMedia(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = (id) => {
        setAttachments(prev => {
            const att = prev.find(a => a.id === id);
            // Release blob URL memory
            if (att?.url?.startsWith('blob:')) URL.revokeObjectURL(att.url);
            return prev.filter(a => a.id !== id);
        });
    };

    const handleSubmit = async (status = 'Published') => {
        if (securityWarning || uploadingMedia) return;

        // Use backendUrl if available, else fallback to local url (shouldn't happen in production)
        const resolvedAttachments = attachments.map(a => ({
            url: a.backendUrl || a.url,
            type: a.type === 'doc' ? 'Document' : a.type === 'image' ? 'Image' : a.type === 'video' ? 'Video' : 'Audio'
        }));

        const payload = {
            contentText: text,
            audienceType: audience === 'Specific Communities...' ? 'Community' : (audience === 'Specific Connections...' ? 'Connections' : 'Everyone'),
            status: status,
            scheduledDate: status === 'Scheduled' && scheduledTime ? new Date(scheduledTime).toISOString() : null,
            attachmentUrls: resolvedAttachments.map(a => a.url),
            attachmentTypes: resolvedAttachments.map(a => a.type),
            mentionedUserIds: [], // Extendable: match @mentions with users
            audienceUserIds: [],
            audienceCommunityIds: []
        };

        try {
            await postsApi.create(payload);
            addToast(`Post ${status.toLowerCase()} successfully!`, 'success');
            
            if (onPostCreated) {
                onPostCreated();
            }
            // Clean up blob URLs
            attachments.forEach(a => { if (a.url?.startsWith('blob:')) URL.revokeObjectURL(a.url); });
            onClose();
            // Reset state
            setText('');
            setAttachments([]);
            setScheduledTime('');
            setIsScheduling(false);
        } catch (error) {
            console.error('Failed to create post', error);
            addToast('Failed to create post. Please try again.', 'error');
        }
    };

    if (!isOpen) return null;

    const charsLeft = MAX_CHARS - text.length;
    const isNearLimit = charsLeft <= 20;

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(mentionFilter) && u.id !== currentUser.id);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">edit_square</span>
                        Create Post
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    {/* User & Audience */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">{currentUser.name}</p>
                            <div className="mt-1 flex items-center">
                                <select 
                                    value={audience} 
                                    onChange={(e) => setAudience(e.target.value)}
                                    className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border-none py-0.5 px-2 focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                                    <option>Everyone</option>
                                    <option>Specific Communities...</option>
                                    <option>Specific Connections...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Text Area relative container for Mentions */}
                    <div className="relative mt-2">
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            placeholder="What's on your mind? (Use @ to mention people)"
                            className="w-full min-h-[120px] bg-transparent border-none text-[15px] text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:ring-0 p-0 leading-relaxed custom-scrollbar"
                        ></textarea>

                        {/* Mention Dropdown */}
                        {showMentionDropdown && filteredUsers.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    Mention People
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredUsers.map((u, i) => (
                                        <div 
                                            key={u.id} 
                                            onClick={() => insertMention(u)}
                                            className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${i === mentionIndex ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                                        >
                                            <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-500 text-[10px] font-bold">{u.name.charAt(0)}</div>
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">{u.name}</p>
                                                <p className="text-[10px] text-slate-500">{u.designation || u.roleName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Character Limit & Security Warnings */}
                    <div className="flex items-center justify-between">
                        {/* Security Warnings */}
                        {securityWarning && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                <span className="material-symbols-outlined text-red-500 text-[18px]">gpp_bad</span>
                                <p className="text-[12px] font-bold text-red-600 dark:text-red-400">{securityWarning}</p>
                            </div>
                        )}
                        {uploadingMedia && (
                            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                                Uploading media...
                            </div>
                        )}
                        <span className={`text-[12px] font-bold transition-colors ${isNearLimit ? 'text-red-500' : 'text-slate-400'}`}>
                            {charsLeft}
                        </span>
                    </div>

                    {/* Attachments Display */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                            {attachments.map(att => {
                                if (att.type === 'image') {
                                    return (
                                        <div key={att.id} className="relative group w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                            {att.isUploading && (
                                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-[20px] animate-spin">refresh</span>
                                                    <span className="text-white text-[9px] font-bold mt-1">Uploading...</span>
                                                </div>
                                            )}
                                            {!att.isUploading && (
                                                <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                                if (att.type === 'video') {
                                    return (
                                        <div key={att.id} className="relative group w-48 h-32 rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700">
                                            <video src={att.url} className="w-full h-full object-cover opacity-80" />
                                            <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">play_circle</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={att.id} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 group h-fit">
                                        <span className="material-symbols-outlined text-[16px] text-indigo-500">
                                            {att.type === 'doc' ? 'description' : 'mic'}
                                        </span>
                                        <span className="text-[12px] font-semibold max-w-[150px] truncate">{att.name}</span>
                                        <button onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500 ml-1">
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Tools & Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
                    <div className="flex items-center gap-1">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button onClick={() => triggerFileInput('image')} className="p-2 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors group relative">
                            <span className="material-symbols-outlined text-[22px]">image</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Image (JPG/PNG)</span>
                        </button>
                        <button onClick={() => triggerFileInput('doc')} className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors group relative">
                            <span className="material-symbols-outlined text-[22px]">description</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Document (PDF/DOC)</span>
                        </button>
                        <button onClick={() => triggerFileInput('video')} className="p-2 text-cyan-500 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg transition-colors group relative">
                            <span className="material-symbols-outlined text-[22px]">videocam</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Video (MP4/MOV)</span>
                        </button>
                        <button onClick={() => triggerFileInput('audio')} className="p-2 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors group relative">
                            <span className="material-symbols-outlined text-[22px]">mic</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Audio (MP3/WAV)</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleSubmit('Draft')}
                            disabled={!text.trim() || securityWarning || uploadingMedia}
                            className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            Save Draft
                        </button>
                        <button 
                            onClick={() => setIsScheduling(!isScheduling)}
                            className={`p-2 rounded-xl border transition-colors ${isScheduling ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 text-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                        </button>
                        <button
                            onClick={() => handleSubmit(isScheduling && scheduledTime ? 'Scheduled' : 'Published')}
                            disabled={!text.trim() || securityWarning || uploadingMedia || (isScheduling && !scheduledTime)}
                            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm flex items-center gap-2
                                ${(!text.trim() || securityWarning || uploadingMedia || (isScheduling && !scheduledTime)) ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md hover:scale-105'}
                            `}
                        >
                            {isScheduling && scheduledTime ? 'Schedule' : 'Publish'}
                        </button>
                    </div>
                </div>

                {/* Scheduling Mock Popover */}
                {isScheduling && (
                    <div className="absolute bottom-20 right-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 w-64">
                        <h4 className="text-[12px] font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Schedule Post</h4>
                        <input 
                            type="datetime-local" 
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
