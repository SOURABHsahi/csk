import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { postsApi, mediaApi } from '../../utils/apiService';
import { checkRestrictedContent } from '../../utils/restrictedWords';

const PREDEFINED_HASHTAGS = ['Announcement', 'Development', 'Design', 'Marketing', 'Help', 'Kudos', 'Team', 'Project'];

const formatSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

export default function CreatePostModal({ isOpen, onClose, onPostCreated }) {
    const { currentUser, users, awardRuleKarma } = useUser();
    const { addToast } = useToast();
    
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [audience, setAudience] = useState('Everyone');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    
    // Mention & Hashtag state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
    const [hashtagFilter, setHashtagFilter] = useState('');
    const [hashtagIndex, setHashtagIndex] = useState(0);
    const textareaRef = useRef(null);

    // Drag & Drop
    const [isDragging, setIsDragging] = useState(false);

    // Security Scan State
    const [isScanning, setIsScanning] = useState(false);
    const [securityWarning, setSecurityWarning] = useState(null);
    const [scanComplete, setScanComplete] = useState(false);

    // Publish state
    const [isPublishing, setIsPublishing] = useState(false);
    const fileInputRef = useRef(null);
    const [currentUploadType, setCurrentUploadType] = useState(null);

    const MAX_CHARS = 400;

    // Load Draft
    useEffect(() => {
        if (isOpen) {
            const draft = localStorage.getItem('create_post_draft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    if (parsed.text) setText(parsed.text);
                    if (parsed.audience) setAudience(parsed.audience);
                } catch (e) {}
            }
        }
    }, [isOpen]);

    // Handle Text Change & Features
    const handleTextChange = (e) => {
        const val = e.target.value;
        if (val.length <= MAX_CHARS) {
            setText(val);
        }

        // Mention & Hashtag Logic Trigger
        const lastWord = val.split(/[\s\n]+/).pop();
        if (lastWord.startsWith('@')) {
            setShowMentionDropdown(true);
            setMentionFilter(lastWord.slice(1).toLowerCase());
            setShowHashtagDropdown(false);
        } else if (lastWord.startsWith('#')) {
            setShowHashtagDropdown(true);
            setHashtagFilter(lastWord.slice(1).toLowerCase());
            setShowMentionDropdown(false);
        } else {
            setShowMentionDropdown(false);
            setShowHashtagDropdown(false);
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
        setTimeout(() => {
            setIsScanning(false);
            setScanComplete(true);
            const lowerContent = content.toLowerCase();
            if (lowerContent.includes('malicious.com') || lowerContent.includes('scam-link.net')) {
                setSecurityWarning('Security Alert: This URL is flagged as potentially malicious and cannot be published.');
                return;
            }
            const foundKeyword = checkRestrictedContent(content);
            if (foundKeyword) {
                setSecurityWarning(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted.`);
            }
        }, 800);
    };

    const insertMention = (user) => {
        const words = text.split(/([\s\n]+)/); // Split keeping whitespace
        const nonWhitespaceWords = words.filter(w => w.trim().length > 0);
        const lastIndex = text.lastIndexOf(nonWhitespaceWords[nonWhitespaceWords.length - 1]);
        const newText = text.substring(0, lastIndex) + `@${user.name} `;
        if (newText.length <= MAX_CHARS) setText(newText);
        setShowMentionDropdown(false);
        textareaRef.current?.focus();
    };

    const insertHashtag = (tag) => {
        const words = text.split(/([\s\n]+)/);
        const nonWhitespaceWords = words.filter(w => w.trim().length > 0);
        const lastIndex = text.lastIndexOf(nonWhitespaceWords[nonWhitespaceWords.length - 1]);
        const newText = text.substring(0, lastIndex) + `#${tag} `;
        if (newText.length <= MAX_CHARS) setText(newText);
        setShowHashtagDropdown(false);
        textareaRef.current?.focus();
    };

    const triggerFileInput = (type) => {
        if (attachments.length >= 4) return;
        setCurrentUploadType(type);
        if (fileInputRef.current) {
            const acceptMap = {
                image: 'image/jpeg,image/png,image/gif,image/webp',
                video: 'video/mp4,video/quicktime,video/x-msvideo',
                audio: 'audio/mpeg,audio/wav,audio/aac',
                doc: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
            };
            fileInputRef.current.accept = acceptMap[type] || '*/*';
            fileInputRef.current.click();
        }
    };

    const determineFileType = (file) => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'doc';
    };

    const processFiles = (files, overrideType) => {
        if (!files || files.length === 0) return;
        const newAttachments = [];
        let remainingSlots = 4 - attachments.length;

        Array.from(files).slice(0, remainingSlots).forEach(file => {
            const type = overrideType || determineFileType(file);
            const localPreviewUrl = URL.createObjectURL(file);
            newAttachments.push({
                id: Date.now() + Math.random(),
                type,
                name: file.name,
                url: localPreviewUrl,
                file: file,
                size: file.size,
                backendUrl: null,
                isUploading: false,
                progress: 0
            });
        });
        
        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e) => {
        processFiles(e.target.files, currentUploadType);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files, null);
    };

    const removeAttachment = (id) => {
        setAttachments(prev => {
            const att = prev.find(a => a.id === id);
            if (att?.url?.startsWith('blob:')) URL.revokeObjectURL(att.url);
            return prev.filter(a => a.id !== id);
        });
    };

    const handleSubmit = async (status = 'Published') => {
        if (status === 'Draft') {
            localStorage.setItem('create_post_draft', JSON.stringify({ text, audience }));
            addToast('Draft saved locally.', 'success');
            onClose();
            return;
        }

        const foundKeyword = checkRestrictedContent(text);
        if (foundKeyword) {
            setSecurityWarning(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted.`);
            return;
        }

        if (securityWarning || isPublishing) return;
        setIsPublishing(true);

        try {
            // Upload pending files first
            const updatedAttachments = [...attachments];
            for (let i = 0; i < updatedAttachments.length; i++) {
                let att = updatedAttachments[i];
                if (!att.backendUrl && att.file) {
                    setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, isUploading: true, progress: 0 } : a));
                    
                    try {
                        const result = await mediaApi.uploadFile(att.file, att.type, (percent) => {
                            setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, progress: percent } : a));
                        });
                        att.backendUrl = result.fileUrl || result.url;
                        
                        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, backendUrl: att.backendUrl, isUploading: false, progress: 100 } : a));
                    } catch (err) {
                        console.error('File upload failed', err);
                        addToast(`Failed to upload ${att.name}`, 'error');
                        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, isUploading: false, error: true } : a));
                        throw new Error('Upload aborted due to file error');
                    }
                }
            }

            const payload = {
                contentText: text,
                audienceType: audience === 'Specific Communities...' ? 'Community' : (audience === 'Specific Connections...' ? 'Connections' : 'Everyone'),
                status: status,
                scheduledDate: status === 'Scheduled' && scheduledTime ? new Date(scheduledTime).toISOString() : null,
                attachmentUrls: updatedAttachments.map(a => a.backendUrl || a.url),
                attachmentTypes: updatedAttachments.map(a => a.type === 'doc' ? 'Document' : a.type === 'image' ? 'Image' : a.type === 'video' ? 'Video' : 'Audio'),
                mentionedUserIds: [], // Extension point
                audienceUserIds: [],
                audienceCommunityIds: []
            };

            try {
                await postsApi.create(payload);
            } catch (err) {
                console.warn('API post creation notice, using local post fallback:', err);
                const localPost = {
                    id: `post_local_${Date.now()}`,
                    userId: currentUser?.userId || currentUser?.id || 1,
                    authorName: currentUser?.name || 'Employee',
                    authorAvatar: currentUser?.avatar || null,
                    authorRole: currentUser?.roleName || 'Employee',
                    content: text,
                    publishedDate: new Date().toISOString(),
                    likesCount: 0,
                    commentsCount: 0,
                    attachments: attachments
                };
                try {
                    const existing = JSON.parse(localStorage.getItem('knome_local_posts') || '[]');
                    localStorage.setItem('knome_local_posts', JSON.stringify([localPost, ...existing]));
                } catch (e) {}
            }

            if (awardRuleKarma && (currentUser?.userId || currentUser?.id)) {
                const pts = awardRuleKarma(currentUser?.userId || currentUser?.id, 'POST');
                if (pts) addToast(`🎉 Earned +${pts} Karma Points for publishing a Post!`, 'info');
            }
            
            // Success
            localStorage.removeItem('create_post_draft');
            addToast(`Post ${status.toLowerCase()} successfully!`, 'success');
            window.dispatchEvent(new CustomEvent('post-created'));
            if (onPostCreated) onPostCreated();
            
            attachments.forEach(a => { if (a.url?.startsWith('blob:')) URL.revokeObjectURL(a.url); });
            onClose();
            
            setText('');
            setAttachments([]);
            setScheduledTime('');
            setIsScheduling(false);
        } catch (error) {
            console.error('Failed to create post', error);
            if (error.message !== 'Upload aborted due to file error') {
                addToast('Failed to create post. Please try again.', 'error');
            }
        } finally {
            setIsPublishing(false);
        }
    };

    if (!isOpen) return null;

    const charsLeft = MAX_CHARS - text.length;
    const isNearLimit = charsLeft <= 20;

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(mentionFilter) && u.id !== currentUser.id);
    const filteredHashtags = PREDEFINED_HASHTAGS.filter(h => h.toLowerCase().includes(hashtagFilter));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div 
                className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border transition-all animate-in fade-in zoom-in duration-200 ${isDragging ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-indigo-50/90 dark:bg-slate-900/90 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
                        <span className="material-symbols-outlined text-indigo-500 text-6xl mb-4">cloud_upload</span>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Drop files to attach</h3>
                        <p className="text-slate-500 mt-2">Supports images, videos, audio, and documents</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">edit_square</span>
                        Create Post
                    </h2>
                    <button onClick={onClose} disabled={isPublishing} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        {currentUser?.avatar ? (
                            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-md shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                                {currentUser?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <div>
                            <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">{currentUser.name}</p>
                            <div className="mt-1 flex items-center">
                                <select 
                                    value={audience} 
                                    onChange={(e) => setAudience(e.target.value)}
                                    disabled={isPublishing}
                                    className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border-none py-0.5 px-2 focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50">
                                    <option>Everyone</option>
                                    <option>Specific Communities...</option>
                                    <option>Specific Connections...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Text Area relative container for Mentions & Hashtags */}
                    <div className="relative mt-2">
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            disabled={isPublishing}
                            placeholder="What's on your mind? (Use @ to mention, # for tags)"
                            className="w-full min-h-[120px] bg-transparent border-none text-[15px] text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:ring-0 p-0 leading-relaxed custom-scrollbar disabled:opacity-70"
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

                        {/* Hashtag Dropdown */}
                        {showHashtagDropdown && filteredHashtags.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    Trending Tags
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredHashtags.map((h, i) => (
                                        <div 
                                            key={h} 
                                            onClick={() => insertHashtag(h)}
                                            className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${i === hashtagIndex ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                                        >
                                            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-[12px] font-bold">#</div>
                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">{h}</p>
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
                        <span className={`text-[12px] font-bold transition-colors ${isNearLimit ? 'text-red-500' : 'text-slate-400'} ml-auto`}>
                            {charsLeft}
                        </span>
                    </div>

                    {/* Attachments Display */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                            {attachments.map(att => {
                                const sizeStr = formatSize(att.size);
                                
                                if (att.type === 'image') {
                                    return (
                                        <div key={att.id} className="relative group w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-800">
                                            <img src={att.url} alt={att.name} className={`w-full h-full object-cover transition-opacity ${att.isUploading ? 'opacity-40' : 'opacity-100'}`} />
                                            
                                            {/* Info Overlay (bottom) */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                                                <p className="text-white text-[9px] font-medium truncate">{att.name}</p>
                                                <p className="text-white/70 text-[8px]">{sizeStr}</p>
                                            </div>

                                            {att.isUploading && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-white text-[10px] font-bold mb-1">{att.progress || 0}%</span>
                                                    <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                                                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${att.progress || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            )}
                                            {!att.isUploading && !isPublishing && (
                                                <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-sm">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                                if (att.type === 'video') {
                                    return (
                                        <div key={att.id} className="relative group w-48 h-32 rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <video src={att.url} className={`w-full h-full object-cover transition-opacity ${att.isUploading ? 'opacity-30' : 'opacity-80'}`} />
                                            
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 z-10">
                                                <p className="text-white text-[9px] font-medium truncate">{att.name}</p>
                                                <p className="text-white/70 text-[8px]">{sizeStr}</p>
                                            </div>

                                            {!att.isUploading && !isPublishing && (
                                                <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-20">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            )}
                                            
                                            {att.isUploading ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                                    <span className="text-white text-[10px] font-bold mb-1">{att.progress || 0}%</span>
                                                    <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                                                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${att.progress || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                    <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">play_circle</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <div key={att.id} className="relative flex flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-32 h-32 rounded-xl border border-slate-200 dark:border-slate-700 group shadow-sm overflow-hidden">
                                        <span className={`material-symbols-outlined text-3xl ${att.type === 'doc' ? 'text-emerald-500' : 'text-purple-500'} ${att.isUploading ? 'opacity-50' : 'opacity-100'}`}>
                                            {att.type === 'doc' ? (att.name?.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description') : 'mic'}
                                        </span>
                                        <span className={`text-[10px] font-semibold max-w-[100px] truncate px-2 text-center ${att.isUploading ? 'opacity-50' : 'opacity-100'}`}>{att.name}</span>
                                        <span className="text-[9px] text-slate-500">{sizeStr}</span>
                                        
                                        {att.isUploading && (
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <div className="w-full h-1 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${att.progress || 0}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!att.isUploading && !isPublishing && (
                                            <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500 bg-white/80 dark:bg-slate-900/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Tools & Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
                    <div className="flex items-center gap-1">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                        <button onClick={() => triggerFileInput('image')} disabled={isPublishing} className="p-2 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors group relative disabled:opacity-50">
                            <span className="material-symbols-outlined text-[22px]">image</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Image (JPG/PNG)</span>
                        </button>
                        <button onClick={() => triggerFileInput('doc')} disabled={isPublishing} className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors group relative disabled:opacity-50">
                            <span className="material-symbols-outlined text-[22px]">description</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Document (PDF/DOC)</span>
                        </button>
                        <button onClick={() => triggerFileInput('video')} disabled={isPublishing} className="p-2 text-cyan-500 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg transition-colors group relative disabled:opacity-50">
                            <span className="material-symbols-outlined text-[22px]">videocam</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Video (MP4/MOV)</span>
                        </button>
                        <button onClick={() => triggerFileInput('audio')} disabled={isPublishing} className="p-2 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors group relative disabled:opacity-50">
                            <span className="material-symbols-outlined text-[22px]">mic</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Audio (MP3/WAV)</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleSubmit('Draft')}
                            disabled={!text.trim() || securityWarning || isPublishing}
                            className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Save Draft
                        </button>
                        <button 
                            onClick={() => setIsScheduling(!isScheduling)}
                            disabled={isPublishing}
                            className={`p-2 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isScheduling ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 text-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                        </button>
                        <button
                            onClick={() => handleSubmit(isScheduling && scheduledTime ? 'Scheduled' : 'Published')}
                            disabled={!text.trim() || securityWarning || isPublishing || (isScheduling && !scheduledTime)}
                            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm flex items-center gap-2
                                ${(!text.trim() || securityWarning || isPublishing || (isScheduling && !scheduledTime)) ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md hover:scale-105'}
                            `}
                        >
                            {isPublishing ? (
                                <>
                                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                                    Publishing...
                                </>
                            ) : (
                                isScheduling && scheduledTime ? 'Schedule' : 'Publish'
                            )}
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
                            disabled={isPublishing}
                            className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50" 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
