import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { postsApi, mediaApi, communitiesApi, formatToDDMMYYYY } from '../../utils/apiService';
import { checkRestrictedContent } from '../../utils/restrictedWords';

const PREDEFINED_HASHTAGS = ['Announcement', 'Development', 'Design', 'Marketing', 'Help', 'Kudos', 'Team', 'Project'];

const DEFAULT_COMMUNITIES = [
    { id: 177, name: 'dotnet' },
    { id: 176, name: 'DevOps & AI Innovation Hub' },
    { id: 165, name: 'tech' }
];

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
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [selectedConnections, setSelectedConnections] = useState([]);
    const [isAudienceMenuOpen, setIsAudienceMenuOpen] = useState(false);
    const [audienceSubView, setAudienceSubView] = useState(null); // null | 'communities' | 'connections'
    const [audienceSearch, setAudienceSearch] = useState('');
    const [availableCommunities, setAvailableCommunities] = useState(DEFAULT_COMMUNITIES);
    const audienceMenuRef = useRef(null);

    const toggleConnection = (userObj) => {
        setSelectedConnections(prev => {
            const exists = prev.some(c => String(c.id) === String(userObj.id));
            if (exists) {
                const next = prev.filter(c => String(c.id) !== String(userObj.id));
                if (next.length === 0) setAudience('Everyone');
                return next;
            } else {
                setSelectedCommunity(null);
                setAudience('Connections');
                return [...prev, userObj];
            }
        });
    };

    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const schedulePopoverRef = useRef(null);

    // Calculate relative schedule text (e.g., "in 1 min", "in 15 mins", "Tomorrow at 09:00 AM")
    const getRelativeScheduleText = (dateInput) => {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        const diffMs = d.getTime() - Date.now();
        if (diffMs <= 0) return 'Immediate';
        const diffMins = Math.round(diffMs / 60000);
        if (diffMins < 60) {
            return `in ${diffMins} ${diffMins === 1 ? 'min' : 'mins'}`;
        }
        const diffHours = Math.round(diffMs / 3600000);
        if (diffHours < 24) {
            return `in ~${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'}`;
        }
        const days = Math.round(diffMs / 86400000);
        return `in ~${days} ${days === 1 ? 'day' : 'days'}`;
    };

    // Format local system time for datetime-local input (offset in minutes, defaults to 1 minute ahead)
    const getLocalDatetimeInputValue = (offsetMinutes = 1) => {
        const d = new Date(Date.now() + offsetMinutes * 60000);
        const pad = (n) => String(n).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const getTomorrowTime = (hour = 9) => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(hour, 0, 0, 0);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`;
    };

    // Click outside popover to close cleanly without losing state
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isScheduling && schedulePopoverRef.current && !schedulePopoverRef.current.contains(e.target)) {
                if (e.target.closest('[data-schedule-trigger]')) return;
                setIsScheduling(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isScheduling]);
    
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

    // Load available communities
    useEffect(() => {
        const loadCommunities = async () => {
            try {
                const res = await communitiesApi.getAll();
                if (res && Array.isArray(res) && res.length > 0) {
                    const mapped = res.map(c => ({
                        id: c.communityId || c.id,
                        name: c.name,
                        type: c.communityType || c.type,
                        category: c.categoryName || c.category
                    }));
                    // Display all available communities in audience selector
                    setAvailableCommunities(mapped);
                } else {
                    setAvailableCommunities(DEFAULT_COMMUNITIES);
                }
            } catch (e) {
                setAvailableCommunities(DEFAULT_COMMUNITIES);
            }
        };
        if (isOpen) {
            loadCommunities();
        }
    }, [isOpen]);

    // Close audience menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (audienceMenuRef.current && !audienceMenuRef.current.contains(e.target)) {
                setIsAudienceMenuOpen(false);
                setAudienceSubView(null);
                setAudienceSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const resetForm = () => {
        setText('');
        attachments.forEach(a => {
            if (a.url?.startsWith('blob:')) {
                setTimeout(() => {
                    try { URL.revokeObjectURL(a.url); } catch (e) {}
                }, 3000);
            }
        });
        setAttachments([]);
        setAudience('Everyone');
        setSelectedCommunity(null);
        setSelectedConnections([]);
        setIsAudienceMenuOpen(false);
        setAudienceSubView(null);
        setAudienceSearch('');
        setIsScheduling(false);
        setScheduledTime('');
        setShowMentionDropdown(false);
        setShowHashtagDropdown(false);
        setSecurityWarning(null);
        setScanComplete(false);
        try {
            localStorage.removeItem('create_post_draft');
        } catch (e) {}
    };

    // Reset all form state whenever modal is closed or active user changes, ensuring fresh blank state on new post
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen, currentUser?.userId, currentUser?.id]);

    const handleClose = () => {
        if (isPublishing) return;
        resetForm();
        onClose();
    };

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

        // Real-time Immediate Validation for Restricted Keywords
        const immediateRestricted = checkRestrictedContent(val);
        if (immediateRestricted) {
            setSecurityWarning(`Security Alert: Please don't use this word - "${immediateRestricted}". It is restricted and cannot be published.`);
        } else if (val.toLowerCase().includes('malicious.com') || val.toLowerCase().includes('scam-link.net')) {
            setSecurityWarning('Security Alert: This URL is flagged as potentially malicious and cannot be published.');
        } else {
            setSecurityWarning(null);
        }
    };

    const runSecurityScan = (content) => {
        const foundKeyword = checkRestrictedContent(content);
        if (foundKeyword) {
            setSecurityWarning(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted and cannot be published.`);
        }
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
            if (att?.url?.startsWith('blob:')) {
                setTimeout(() => {
                    try { URL.revokeObjectURL(att.url); } catch (e) {}
                }, 3000);
            }
            return prev.filter(a => a.id !== id);
        });
    };

    const handleSubmit = async (status = 'Published') => {
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

            let isoScheduledDate = null;
            if (status === 'Scheduled') {
                if (!scheduledTime) {
                    addToast('Please select a scheduled date and time.', 'error');
                    setIsPublishing(false);
                    return;
                }
                const parsed = new Date(scheduledTime);
                if (isNaN(parsed.getTime())) {
                    addToast('Invalid scheduled date/time selected.', 'error');
                    setIsPublishing(false);
                    return;
                }
                if (parsed.getTime() <= Date.now() + 20000) {
                    addToast('Scheduled time must be at least 1 minute in the future.', 'error');
                    setIsPublishing(false);
                    return;
                }
                isoScheduledDate = parsed.toISOString();
            }

            const payload = {
                contentText: text,
                audienceType: selectedCommunity ? 'Community' : (selectedConnections.length > 0 ? 'Connections' : 'Everyone'),
                status: status,
                scheduledDate: isoScheduledDate,
                attachmentUrls: updatedAttachments.map(a => a.backendUrl || a.url),
                attachmentTypes: updatedAttachments.map(a => a.type === 'doc' ? 'Document' : a.type === 'image' ? 'Image' : a.type === 'video' ? 'Video' : 'Audio'),
                mentionedUserIds: [], // Extension point
                audienceUserIds: selectedConnections.map(c => c.id),
                audienceCommunityIds: selectedCommunity ? [selectedCommunity.id] : [],
                sharedCommunity: selectedCommunity,
                sharedCommunityName: selectedCommunity?.name,
                sharedUsers: selectedConnections,
                sharedWithNames: selectedConnections.map(c => c.name),
                sharedWithName: selectedConnections.length === 1 
                    ? selectedConnections[0].name 
                    : (selectedConnections.length === 2 
                    ? `${selectedConnections[0].name}, ${selectedConnections[1].name}` 
                    : (selectedConnections.length > 2 ? `${selectedConnections[0].name} +${selectedConnections.length - 1} others` : null))
            };

            try {
                await postsApi.create(payload);
            } catch (err) {
                console.warn('API post creation notice, using local post fallback:', err);
                const localPost = {
                    id: `post_local_${Date.now()}`,
                    userId: currentUser?.userId || currentUser?.id || 1,
                    authorName: currentUser?.name || currentUser?.fullName || 'Employee',
                    authorAvatar: currentUser?.avatar || currentUser?.profilePhotoUrl || null,
                    authorRole: currentUser?.roleName || 'Employee',
                    content: text,
                    status: status,
                    scheduledDate: isoScheduledDate,
                    publishedDate: status === 'Published' ? new Date().toISOString() : null,
                    createdDate: new Date().toISOString(),
                    likesCount: 0,
                    commentsCount: 0,
                    attachments: attachments,
                    audienceType: payload.audienceType,
                    sharedCommunity: selectedCommunity,
                    sharedCommunityName: selectedCommunity?.name,
                    sharedUsers: selectedConnections,
                    sharedWithNames: selectedConnections.map(c => c.name),
                    sharedWithName: payload.sharedWithName
                };
                try {
                    const existing = JSON.parse(localStorage.getItem('knome_local_posts') || '[]');
                    localStorage.setItem('knome_local_posts', JSON.stringify([localPost, ...existing]));
                } catch (e) {}
            }

            // Also persist directly to community feed so it is immediately visible and stays visible on refresh
            if (selectedCommunity?.id) {
                try {
                    const commPostKey = `knome_community_posts_${selectedCommunity.id}`;
                    const existingCommPosts = JSON.parse(localStorage.getItem(commPostKey) || '[]');
                    const commPostItem = {
                        id: Date.now(),
                        author: currentUser?.name || currentUser?.fullName || 'Employee',
                        role: currentUser?.roleName || 'Member',
                        avatar: currentUser?.avatar || currentUser?.profilePhotoUrl || null,
                        time: 'Just now',
                        content: text,
                        attachments: attachments || [],
                        images: (attachments || []).filter(a => a.type === 'image' || a.attachmentType === 'image'),
                        likes: 0,
                        comments: 0,
                        isPinned: false
                    };
                    localStorage.setItem(commPostKey, JSON.stringify([commPostItem, ...existingCommPosts]));
                } catch (e) {}
            }

            if (awardRuleKarma && (currentUser?.userId || currentUser?.id)) {
                const pts = awardRuleKarma(currentUser?.userId || currentUser?.id, 'POST');
                if (pts) addToast(`🎉 Earned +${pts} Karma Points for publishing a Post!`, 'info');
            }
            
            // Success
            resetForm();
            if (status === 'Scheduled' && scheduledTime) {
                const formattedTimeStr = formatToDDMMYYYY(scheduledTime);
                addToast(`Post scheduled for publication on ${formattedTimeStr}!`, 'success');
            } else {
                addToast('Post published successfully!', 'success');
            }
            window.dispatchEvent(new CustomEvent('post-created'));
            if (onPostCreated) onPostCreated();
            onClose();
        } catch (error) {
            console.error('Failed to publish post', error);
            addToast(error.message || 'Failed to publish post', 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    if (!isOpen) return null;

    const charsLeft = MAX_CHARS - text.length;
    const isNearLimit = charsLeft <= 20;

    const filteredUsers = (users || []).filter(u => (u.name || u.fullName || '').toLowerCase().includes(mentionFilter) && (u.id || u.userId) !== (currentUser?.userId || currentUser?.id));
    const filteredHashtags = PREDEFINED_HASHTAGS.filter(h => h.toLowerCase().includes(hashtagFilter));

    return (
        <div 
            onClick={handleClose}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto animate-in fade-in zoom-in-95 duration-150"
            >
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">edit_square</span>
                        Create Post
                    </h2>
                    <button onClick={handleClose} disabled={isPublishing} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
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
                            <div className="mt-1 relative" ref={audienceMenuRef}>
                                <div className="inline-flex items-center gap-1">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (isPublishing) return;
                                            setIsAudienceMenuOpen(!isAudienceMenuOpen);
                                            setAudienceSubView(null);
                                            setAudienceSearch('');
                                        }}
                                        disabled={isPublishing}
                                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 ${
                                            selectedCommunity 
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                                                : selectedConnections.length > 0
                                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}>
                                        {selectedCommunity ? (
                                            <>
                                                <span className="material-symbols-outlined text-[14px] text-blue-500">groups</span>
                                                <span className="max-w-[160px] truncate">{selectedCommunity.name}</span>
                                            </>
                                        ) : selectedConnections.length > 0 ? (
                                            <>
                                                <span className="material-symbols-outlined text-[14px] text-purple-500">group</span>
                                                <span className="max-w-[180px] truncate">
                                                    {selectedConnections.length === 1 
                                                        ? `To: ${selectedConnections[0].name}`
                                                        : selectedConnections.length === 2
                                                        ? `To: ${selectedConnections[0].name}, ${selectedConnections[1].name}`
                                                        : `To: ${selectedConnections[0].name} +${selectedConnections.length - 1} others`}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[14px] text-slate-500">public</span>
                                                <span>Everyone</span>
                                            </>
                                        )}
                                        <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: isAudienceMenuOpen ? 'rotate(180deg)' : 'none' }}>
                                            expand_more
                                        </span>
                                    </button>

                                    {(selectedCommunity || selectedConnections.length > 0) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAudience('Everyone');
                                                setSelectedCommunity(null);
                                                setSelectedConnections([]);
                                            }}
                                            className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors text-[10px]"
                                            title="Reset back to Everyone"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Audience Selection Popover */}
                                {isAudienceMenuOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        {/* Main Options View */}
                                        {!audienceSubView && (
                                            <div className="py-1">
                                                <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                                    Who can see this post?
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAudience('Everyone');
                                                        setSelectedCommunity(null);
                                                        setSelectedConnections([]);
                                                        setIsAudienceMenuOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                                        !selectedCommunity && selectedConnections.length === 0 ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base text-slate-500">public</span>
                                                        <div>
                                                            <p className="font-bold">Everyone</p>
                                                            <p className="text-[10px] text-slate-400 font-normal">All employees in the organization</p>
                                                        </div>
                                                    </div>
                                                    {!selectedCommunity && selectedConnections.length === 0 && (
                                                        <span className="material-symbols-outlined text-sm text-blue-500">check</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAudienceSubView('communities');
                                                        setAudienceSearch('');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                                        selectedCommunity ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="material-symbols-outlined text-base text-blue-500">groups</span>
                                                        <div className="min-w-0">
                                                            <p className="font-bold truncate">
                                                                {selectedCommunity ? selectedCommunity.name : 'Specific Communities...'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-normal">Share to a specific community</p>
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAudienceSubView('connections');
                                                        setAudienceSearch('');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                                        selectedConnections.length > 0 ? 'bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="material-symbols-outlined text-base text-purple-500">person</span>
                                                        <div className="min-w-0">
                                                            <p className="font-bold truncate">
                                                                {selectedConnections.length > 0 
                                                                    ? (selectedConnections.length === 1 ? `To: ${selectedConnections[0].name}` : `To: ${selectedConnections.length} People Selected`)
                                                                    : 'Specific Connections...'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-normal">Share with specific people</p>
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Specific Communities List Sub-View */}
                                        {audienceSubView === 'communities' && (
                                            <div>
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAudienceSubView(null)}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                                    </button>
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Select Community</span>
                                                </div>
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="text"
                                                        value={audienceSearch}
                                                        onChange={(e) => setAudienceSearch(e.target.value)}
                                                        placeholder="Search communities..."
                                                        className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-52 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                                                    {availableCommunities
                                                        .filter(c => !audienceSearch || (c.name || '').toLowerCase().includes(audienceSearch.toLowerCase()))
                                                        .map((comm) => (
                                                            <button
                                                                key={comm.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCommunity(comm);
                                                                    setSelectedConnections([]);
                                                                    setAudience('Community');
                                                                    setIsAudienceMenuOpen(false);
                                                                    setAudienceSubView(null);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                                                    selectedCommunity?.id === comm.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs shrink-0">
                                                                        <span className="material-symbols-outlined text-[14px]">groups</span>
                                                                    </div>
                                                                    <span className="truncate font-semibold">{comm.name}</span>
                                                                </div>
                                                                {selectedCommunity?.id === comm.id && (
                                                                    <span className="material-symbols-outlined text-sm text-blue-500 shrink-0">check</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Specific Connections / Users List Sub-View (MULTI-SELECT) */}
                                        {audienceSubView === 'connections' && (
                                            <div>
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAudienceSubView(null)}
                                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                                                        </button>
                                                        <div>
                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Select People</span>
                                                            <span className="ml-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-100 dark:bg-purple-950/50 px-1.5 py-0.5 rounded-full">
                                                                {selectedConnections.length} selected
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {selectedConnections.length > 0 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setSelectedConnections([])} 
                                                            className="text-[10px] text-rose-500 hover:underline font-bold"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="text"
                                                        value={audienceSearch}
                                                        onChange={(e) => setAudienceSearch(e.target.value)}
                                                        placeholder="Search colleagues..."
                                                        className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-purple-500 placeholder-slate-400"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-52 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                                                    {(users || [])
                                                        .filter(u => String(u.id || u.userId) !== String(currentUser?.userId || currentUser?.id))
                                                        .filter(u => !audienceSearch || (u.name || u.fullName || '').toLowerCase().includes(audienceSearch.toLowerCase()))
                                                        .map((u) => {
                                                            const uName = u.name || u.fullName || 'Colleague';
                                                            const isSel = selectedConnections.some(c => String(c.id) === String(u.id || u.userId));
                                                            return (
                                                                <div
                                                                    key={u.id || u.userId}
                                                                    onClick={() => toggleConnection({ id: u.id || u.userId, name: uName, avatar: u.avatar || u.profilePhotoUrl })}
                                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                                                        isSel ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        {u.avatar || u.profilePhotoUrl ? (
                                                                            <img src={u.avatar || u.profilePhotoUrl} alt={uName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                                                        ) : (
                                                                            <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center text-xs font-bold shrink-0">
                                                                                {uName.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                        <div className="truncate">
                                                                            <p className="font-semibold truncate leading-none">{uName}</p>
                                                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{u.roleName || u.designation || 'Employee'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                                                        isSel ? 'bg-purple-600 border-purple-600 text-white shadow-sm' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                                    }`}>
                                                                        {isSel && <span className="material-symbols-outlined text-[14px]">check</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                                                    <span className="text-[11px] text-slate-500">
                                                        {selectedConnections.length === 0 ? 'No person selected' : `${selectedConnections.length} selected`}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (selectedConnections.length > 0) {
                                                                setAudience('Connections');
                                                                setSelectedCommunity(null);
                                                            }
                                                            setIsAudienceMenuOpen(false);
                                                            setAudienceSubView(null);
                                                        }}
                                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 rounded-b-2xl">
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
                        {(() => {
                            const restrictedInPost = checkRestrictedContent(text);
                            if (restrictedInPost) {
                                return (
                                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-xs font-bold">
                                        <span className="material-symbols-outlined text-[18px]">warning</span>
                                        <span>Restricted word ("{restrictedInPost}") detected! Remove it to publish.</span>
                                    </div>
                                );
                            }
                            return (
                                <>
                                    {/* Active Scheduled Pill Chip */}
                                    {scheduledTime && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-semibold shadow-xs">
                                            <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 animate-pulse">schedule</span>
                                            <button
                                                type="button"
                                                onClick={() => setIsScheduling(true)}
                                                className="hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                                                title="Click to edit schedule"
                                            >
                                                <span className="font-mono font-bold">{formatToDDMMYYYY(scheduledTime)}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 font-extrabold">
                                                    {getRelativeScheduleText(scheduledTime)}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setScheduledTime(''); setIsScheduling(false); }}
                                                className="ml-0.5 text-amber-600 hover:text-amber-950 dark:hover:text-amber-100 hover:bg-amber-200/60 dark:hover:bg-amber-800/60 p-0.5 rounded-full cursor-pointer transition-colors"
                                                title="Remove schedule (publish immediately)"
                                            >
                                                <span className="material-symbols-outlined text-[15px]">close</span>
                                            </button>
                                        </div>
                                    )}

                                    <button 
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isPublishing}
                                        className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                        Cancel
                                    </button>
                                    <button 
                                        data-schedule-trigger="true"
                                        type="button"
                                        onClick={() => {
                                            if (!isScheduling) {
                                                setIsScheduling(true);
                                                if (!scheduledTime) setScheduledTime(getLocalDatetimeInputValue(1));
                                            } else {
                                                setIsScheduling(false);
                                            }
                                        }}
                                        disabled={isPublishing}
                                        className={`p-2 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative ${
                                            scheduledTime 
                                                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold' 
                                                : (isScheduling 
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 text-indigo-600' 
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                  )
                                        }`}
                                        title={scheduledTime ? "Schedule active - click to edit" : (isScheduling ? "Close scheduler" : "Schedule publication")}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {scheduledTime ? 'alarm_on' : 'schedule'}
                                        </span>
                                        {scheduledTime && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleSubmit(scheduledTime ? 'Scheduled' : 'Published')}
                                        disabled={!text.trim() || securityWarning || isPublishing}
                                        className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer
                                            ${(!text.trim() || securityWarning || isPublishing)
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' 
                                                : (scheduledTime 
                                                    ? 'bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-md hover:scale-105' 
                                                    : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md hover:scale-105'
                                                  )
                                            }
                                        `}
                                    >
                                        {isPublishing ? (
                                            <>
                                                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                                                {scheduledTime ? 'Scheduling...' : 'Publishing...'}
                                            </>
                                        ) : (
                                            scheduledTime ? (
                                                <>
                                                    <span className="material-symbols-outlined text-[17px]">event_available</span>
                                                    Schedule Post
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                                    Publish
                                                </>
                                            )
                                        )}
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Scheduling Rich Popover */}
                {isScheduling && (
                    <div 
                        ref={schedulePopoverRef}
                        className="absolute bottom-20 right-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-30 w-88 max-w-[92vw] animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700/60">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                        Schedule Publication
                                    </h4>
                                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                        Automated Knome platform delivery
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsScheduling(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                title="Close"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {/* Timezone / Enterprise Notice Banner */}
                        <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[10.5px] text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-[14px] text-indigo-500">public</span>
                                IST (UTC+05:30)
                            </span>
                            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                Format: DD/MM/YYYY
                            </span>
                        </div>

                        {/* Date & Time Picker */}
                        <div className="mb-3">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Select Date & Time (DD/MM/YYYY):
                            </label>
                            <div className="relative">
                                <input 
                                    type="datetime-local" 
                                    value={scheduledTime}
                                    min={getLocalDatetimeInputValue(1)}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    disabled={isPublishing}
                                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer" 
                                />
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="mb-3">
                            <span className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                                Quick Options:
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime(getLocalDatetimeInputValue(1))}
                                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 text-center"
                                    title="Schedule 1 minute from now"
                                >
                                    +1 Min
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime(getLocalDatetimeInputValue(5))}
                                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 text-center"
                                    title="Schedule 5 minutes from now"
                                >
                                    +5 Mins
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime(getLocalDatetimeInputValue(15))}
                                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 text-center"
                                    title="Schedule 15 minutes from now"
                                >
                                    +15 Mins
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime(getLocalDatetimeInputValue(30))}
                                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 text-center"
                                    title="Schedule 30 minutes from now"
                                >
                                    +30 Mins
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime(getLocalDatetimeInputValue(60))}
                                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 text-center"
                                    title="Schedule 1 hour from now"
                                >
                                    +1 Hour
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime(getTomorrowTime(9))}
                                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 text-center"
                                    title="Schedule for Tomorrow at 9:00 AM"
                                >
                                    Tomorrow 9 AM
                                </button>
                            </div>
                        </div>

                        {/* Live Preview Card with DD/MM/YYYY Format */}
                        {scheduledTime && (
                            <div className="p-2.5 mb-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border border-amber-500/20 text-[11.5px] text-slate-800 dark:text-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[15px]">event</span>
                                        Scheduled Date (DD/MM/YYYY):
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold">
                                        {getRelativeScheduleText(scheduledTime)}
                                    </span>
                                </div>
                                <div className="text-xs font-extrabold text-slate-900 dark:text-white font-mono pl-5">
                                    {formatToDDMMYYYY(scheduledTime)}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                                    Post will remain private in your Scheduled queue until this time, then automatically broadcast to {selectedCommunity?.name ? `community "${selectedCommunity.name}"` : 'your audience'}.
                                </div>
                            </div>
                        )}

                        {/* Action Controls */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            {scheduledTime ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScheduledTime('');
                                        setIsScheduling(false);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                    Clear Schedule
                                </button>
                            ) : (
                                <div />
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsScheduling(false)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                    {scheduledTime ? 'Apply Schedule' : 'Done'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
