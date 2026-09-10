import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { getArticles, saveArticle, deleteArticle, getArticleCategories, createArticleCategory, publishScheduledArticleNow } from '../utils/articleService';
import { savedContentApi, getPersonalizedRecommendations, resolveMediaUrl, formatToDDMMYYYY } from '../utils/apiService';
import { apiClient } from '../utils/apiClient';
import { checkRestrictedContent } from '../utils/restrictedWords';
import ReportModal from '../components/modals/ReportModal';
import SaveToCategoryModal from '../components/modals/SaveToCategoryModal';
import ArticleShareModal from '../components/modals/ArticleShareModal';
import { useToast } from '../components/contexts/ToastContext';
import { useConfirm } from '../components/contexts/ConfirmDialogContext';
import { useScrollLoading } from '../hooks/useScrollLoading';
import ScrollLoadingIndicator from '../components/ui/ScrollLoadingIndicator';

export default function Articles() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const confirm = useConfirm();
    
    // Page view mode: 'list' or 'create'
    const [viewMode, setViewMode] = useState('list');
    
    const [allArticles, setAllArticles] = useState(() => {
        try {
            const cached = sessionStorage.getItem('knome_cached_articles');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(() => {
        try {
            const cached = sessionStorage.getItem('knome_cached_articles');
            return !(cached && JSON.parse(cached).length > 0);
        } catch {
            return true;
        }
    });
    const [savedMap, setSavedMap] = useState({});
    const [reportingArticle, setReportingArticle] = useState(null);
    const [savingArticleModal, setSavingArticleModal] = useState(null);
    const [sharingArticleModal, setSharingArticleModal] = useState(null);

    const loadData = async (forceFresh = false) => {
        // Only trigger visible spinner if no articles are in cache
        if (allArticles.length === 0) {
            setIsLoading(true);
        }
        try {
            const data = await getArticles(null, null, null, 1, 50, forceFresh);
            if (Array.isArray(data) && data.length > 0) {
                setAllArticles(data);
                try {
                    sessionStorage.setItem('knome_cached_articles', JSON.stringify(data));
                } catch {}
            }
        } catch (err) {
            console.error('Failed to load articles:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);
    
    // List Filtering States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    const isSysAdmin = currentUser?.role === 'SYSADM' || 
                       currentUser?.roleName === 'System Administrator' || 
                       (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'System Administrator', 'SystemAdmin'].includes(r)));

    // Dynamic Categories State
    const [availableCategories, setAvailableCategories] = useState([
        { categoryId: 1, name: 'Technology' },
        { categoryId: 7, name: 'Engineering' },
        { categoryId: 8, name: 'Design' },
        { categoryId: 9, name: 'Product Management' },
        { categoryId: 10, name: 'Company Culture' }
    ]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSavingCategory, setIsSavingCategory] = useState(false);

    useEffect(() => {
        getArticleCategories().then(cats => {
            if (Array.isArray(cats) && cats.length > 0) {
                setAvailableCategories(cats);
            }
        }).catch(err => {
            console.warn("Failed to fetch article categories:", err);
        });
    }, []);

    const handleCreateCategory = async (e) => {
        e?.preventDefault();
        if (!newCategoryName.trim()) {
            addToast('Please enter a category name.', 'warning');
            return;
        }
        setIsSavingCategory(true);
        try {
            const res = await createArticleCategory(newCategoryName.trim());
            const created = res?.data || res;
            if (created && created.categoryId) {
                setAvailableCategories(prev => {
                    if (prev.some(c => c.categoryId === created.categoryId)) return prev;
                    return [...prev, created];
                });
                setCategory(String(created.categoryId));
                setNewCategoryName('');
                setIsAddingCategory(false);
                addToast(`Category "${created.name}" created successfully! 🎉`, 'success');
            }
        } catch (err) {
            console.error("Failed to add category:", err);
            const msg = err.data?.message || err.message || 'Failed to add category.';
            addToast(msg, 'error');
        } finally {
            setIsSavingCategory(false);
        }
    };

    // Editor State (FR-AB-01)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [editorBodyText, setEditorBodyText] = useState('');
    const [category, setCategory] = useState('7'); // Default to Engineering ID
    
    // Tags State
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Attachments State (FR-AB-03)
    const [attachments, setAttachments] = useState([]);
    
    // Actions State (FR-AB-04, FR-AB-05)
    const [isPublishing, setIsPublishing] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Scheduling State & Helpers for Editor
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const schedulePopoverRef = useRef(null);

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

    const handlePublishNow = async (e, art) => {
        e.stopPropagation();
        try {
            await publishScheduledArticleNow(art);
            addToast('Article published immediately! 🎉', 'success');
            await loadData(true);
        } catch (err) {
            addToast('Failed to publish article now: ' + (err.data?.message || err.message || 'Error'), 'error');
        }
    };
    
    // Formatting state (FR-AB-02)
    const [activeFormats, setActiveFormats] = useState({
        bold: false, italic: false, underline: false, list: false, heading: false
    });
    
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const editorImageInputRef = useRef(null);
    const [currentUploadType, setCurrentUploadType] = useState(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
            e.preventDefault();
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const addAttachment = (type) => {
        if (attachments.length >= 4) {
            addToast('Maximum 4 attachments allowed.', 'warning');
            return;
        }
        setCurrentUploadType(type);
        if (fileInputRef.current) {
            const acceptMap = {
                image: 'image/jpeg,image/png,image/gif',
                video: 'video/mp4,video/quicktime,video/x-msvideo',
                podcast: 'audio/mpeg,audio/wav,audio/aac',
                doc: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            fileInputRef.current.accept = acceptMap[type] || '*/*';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const tempId = Date.now();
            const localPreviewUrl = ev.target.result;
            
            const newAttachment = {
                id: tempId,
                type: currentUploadType === 'podcast' ? 'audio' : currentUploadType,
                name: file.name,
                url: localPreviewUrl,
                backendUrl: null,
                isUploading: true
            };
            
            setAttachments(prev => [...prev, newAttachment]);
            setIsUploadingMedia(true);
        
            try {
                const result = await apiClient.uploadFile('/Media/upload', file, currentUploadType);

                setAttachments(prev => prev.map(att =>
                    att.id === tempId
                        ? { ...att, backendUrl: result.url, isUploading: false }
                        : att
                ));
            } catch (error) {
                console.error('File upload failed', error);
                setAttachments(prev => prev.filter(att => att.id !== tempId));
                addToast('File upload failed. Please try again.', 'error');
            } finally {
                setIsUploadingMedia(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsDataURL(file);
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

    const updateActiveFormats = () => {
        try {
            const block = (document.queryCommandValue('formatBlock') || '').toLowerCase();
            setActiveFormats({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                list: document.queryCommandState('insertUnorderedList'),
                numlist: document.queryCommandState('insertOrderedList'),
                heading: block === 'h2' || block === 'h1' || block === 'h3',
                quote: block === 'blockquote'
            });
        } catch (e) {}
    };

    const toggleFormat = (format) => {
        editorRef.current?.focus();
        
        // Ensure a valid block exists if editor is empty or pristine
        if (!editorRef.current?.innerHTML?.trim() || editorRef.current?.innerHTML?.includes('Start writing your long-form article here')) {
            editorRef.current.innerHTML = '<p><br></p>';
            const range = document.createRange();
            const sel = window.getSelection();
            if (editorRef.current.firstChild) {
                range.setStart(editorRef.current.firstChild, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        
        if (format === 'bold') {
            document.execCommand('bold', false, null);
        } else if (format === 'italic') {
            document.execCommand('italic', false, null);
        } else if (format === 'underline') {
            document.execCommand('underline', false, null);
        } else if (format === 'heading') {
            const block = (document.queryCommandValue('formatBlock') || '').toLowerCase();
            const isH2 = block.includes('h2');
            try {
                document.execCommand('formatBlock', false, isH2 ? '<p>' : '<h2>');
            } catch (e) {
                document.execCommand('formatBlock', false, isH2 ? 'p' : 'h2');
            }
        } else if (format === 'list') {
            document.execCommand('insertUnorderedList', false, null);
        } else if (format === 'numlist') {
            document.execCommand('insertOrderedList', false, null);
        } else if (format === 'quote') {
            const block = (document.queryCommandValue('formatBlock') || '').toLowerCase();
            const isQuote = block.includes('blockquote');
            if (isQuote) {
                try {
                    document.execCommand('formatBlock', false, '<p>');
                } catch (e) {
                    document.execCommand('formatBlock', false, 'p');
                }
            } else {
                try {
                    document.execCommand('formatBlock', false, '<blockquote>');
                } catch (e) {
                    document.execCommand('formatBlock', false, 'blockquote');
                }
            }
        } else if (format === 'link') {
            const selection = window.getSelection();
            const selectedText = selection ? selection.toString() : '';
            const url = window.prompt('Enter website or reference URL (e.g. https://example.com):', 'https://');
            if (url && url.trim() && url.trim() !== 'https://') {
                if (selectedText) {
                    document.execCommand('createLink', false, url.trim());
                } else {
                    const linkText = window.prompt('Enter link text to display:', url.trim()) || url.trim();
                    const linkHtml = `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline font-semibold hover:text-blue-700">${linkText}</a>&nbsp;`;
                    document.execCommand('insertHTML', false, linkHtml);
                }
            }
        } else if (format === 'image') {
            const imgUrl = window.prompt('Enter Image URL (or leave blank to select an image from your computer):');
            if (imgUrl && imgUrl.trim()) {
                const imgHtml = `<figure class="my-4"><img src="${imgUrl.trim()}" alt="Article illustration" class="rounded-2xl max-w-full h-auto shadow-md border border-slate-200 dark:border-slate-800" /><figcaption class="text-xs text-slate-400 mt-1.5 text-center italic">Image caption</figcaption></figure><p><br></p>`;
                document.execCommand('insertHTML', false, imgHtml);
            } else if (imgUrl === '') {
                editorImageInputRef.current?.click();
            }
        } else if (format === 'table') {
            const rowsInput = window.prompt('Enter number of table rows:', '3');
            if (rowsInput === null) return;
            const colsInput = window.prompt('Enter number of table columns:', '3');
            if (colsInput === null) return;
            const rows = Math.min(Math.max(parseInt(rowsInput) || 3, 1), 12);
            const cols = Math.min(Math.max(parseInt(colsInput) || 3, 1), 8);

            let tableHtml = '<div class="overflow-x-auto my-6"><table class="w-full border-collapse border border-slate-300 dark:border-slate-700 rounded-xl text-sm overflow-hidden shadow-sm"><thead><tr class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">';
            for (let c = 1; c <= cols; c++) {
                tableHtml += `<th class="border border-slate-300 dark:border-slate-700 p-2.5 text-left">Header ${c}</th>`;
            }
            tableHtml += '</tr></thead><tbody>';
            for (let r = 1; r <= rows; r++) {
                tableHtml += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">';
                for (let c = 1; c <= cols; c++) {
                    tableHtml += `<td class="border border-slate-300 dark:border-slate-700 p-2.5 text-slate-700 dark:text-slate-300">Data ${r}.${c}</td>`;
                }
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table></div><p><br></p>';
            document.execCommand('insertHTML', false, tableHtml);
        } else if (format === 'code') {
            const selection = window.getSelection();
            const selectedText = selection ? selection.toString() : '';
            if (selectedText && !selectedText.includes('\n')) {
                const isCode = selection.anchorNode?.parentElement?.tagName === 'CODE';
                if (isCode) {
                    document.execCommand('removeFormat', false, null);
                } else {
                    document.execCommand('insertHTML', false, `<code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-rose-500 font-mono text-xs rounded border border-slate-200 dark:border-slate-700 font-medium">${selectedText}</code>`);
                }
            } else {
                const codeSnippet = selectedText || '// Enter your code snippet here\nfunction calculateMetrics() {\n  return { uptime: "99.99%", latencyMs: 14 };\n}';
                const escapedCode = codeSnippet.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const blockHtml = `<pre class="my-4 p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner"><code>${escapedCode}</code></pre><p><br></p>`;
                document.execCommand('insertHTML', false, blockHtml);
            }
        }
        
        updateActiveFormats();
    };

    const handleEditorImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        editorRef.current?.focus();
        try {
            const result = await apiClient.uploadFile('/Media/upload', file, 'image');
            const resolvedUrl = resolveMediaUrl(result.url || result.data?.url);
            const imgHtml = `<figure class="my-4"><img src="${resolvedUrl}" alt="${file.name}" class="rounded-2xl max-w-full h-auto shadow-md border border-slate-200 dark:border-slate-800" /><figcaption class="text-xs text-slate-400 mt-1.5 text-center italic">${file.name}</figcaption></figure><p><br></p>`;
            document.execCommand('insertHTML', false, imgHtml);
        } catch (err) {
            console.error('Editor image upload failed', err);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const imgHtml = `<figure class="my-4"><img src="${ev.target.result}" alt="${file.name}" class="rounded-2xl max-w-full h-auto shadow-md border border-slate-200 dark:border-slate-800" /><figcaption class="text-xs text-slate-400 mt-1.5 text-center italic">${file.name}</figcaption></figure><p><br></p>`;
                document.execCommand('insertHTML', false, imgHtml);
            };
            reader.readAsDataURL(file);
        } finally {
            if (editorImageInputRef.current) editorImageInputRef.current.value = '';
        }
    };

    const handlePublish = async () => {
        if (isUploadingMedia) {
            addToast('Please wait for media to finish uploading.', 'warning');
            return;
        }

        if (!title.trim()) {
            addToast('Please enter an article title before publishing.', 'warning');
            const titleInput = document.getElementById('article-title-input');
            if (titleInput) titleInput.focus();
            return;
        }

        const editorText = editorRef.current ? (editorRef.current.innerText || '').trim() : '';
        const editorHtml = editorRef.current ? (editorRef.current.innerHTML || '').trim() : '';

        let cleanHtml = (editorHtml || '')
            .replace(/<p class="opacity-50">Start writing your long-form article here\.{0,3}<\/p>/gi, '')
            .replace(/Start writing your long-form article here\.{0,3}/gi, '')
            .replace(/class="[^"]*opacity-50[^"]*"/gi, '');

        // Check if there is actual content
        const hasContent = editorText.length > 0 || cleanHtml.includes('<img') || cleanHtml.includes('<table');
        if (!hasContent) {
            addToast('Please write some content for your article before publishing.', 'warning');
            editorRef.current?.focus();
            return;
        }

        const fullContent = `${title} ${description} ${editorText}`;
        const foundKeyword = checkRestrictedContent(fullContent);
        if (foundKeyword) {
            addToast(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted and your article cannot be published.`, 'warning');
            return;
        }
        
        let finalStatus = (typeof actionStatus === 'string') ? actionStatus : (scheduledTime ? 'Scheduled' : 'Published');
        let isoScheduledDate = null;

        if (finalStatus === 'Scheduled') {
            if (!scheduledTime) {
                addToast('Please select a scheduled date and time.', 'error');
                return;
            }
            const parsed = new Date(scheduledTime);
            if (isNaN(parsed.getTime())) {
                addToast('Invalid scheduled date/time selected.', 'error');
                return;
            }
            if (parsed.getTime() <= Date.now() + 20000) {
                addToast('Scheduled time must be at least 1 minute in the future.', 'warning');
                return;
            }
            isoScheduledDate = parsed.toISOString();
        }

        setIsPublishing(true);
        
        let finalTags = [...tags];
        if (tagInput.trim()) {
            finalTags = [...finalTags, ...tagInput.split(',').map(t => t.trim()).filter(Boolean)];
            finalTags = [...new Set(finalTags)];
        }

        const resolvedAttachments = attachments.map(a => a.backendUrl || a.url).filter(url => !url.startsWith('blob:'));

        const finalContentHtml = cleanHtml.trim() || `<p>${editorText}</p>`;

        const dto = {
            title: title.trim(),
            description: description.trim() || null,
            contentHtml: finalContentHtml,
            categoryId: parseInt(category) || 7,
            status: finalStatus,
            scheduledDate: isoScheduledDate,
            tags: finalTags,
            attachmentUrls: resolvedAttachments
        };
        
        try {
            await saveArticle(dto);

            // Invalidate cached articles so fresh list is displayed
            try {
                sessionStorage.removeItem('knome_cached_articles');
            } catch {}

            await loadData(true);
            
            if (finalStatus === 'Scheduled') {
                addToast(`Article scheduled for publication on ${formatToDDMMYYYY(scheduledTime)}! ⏰`, 'success');
            } else {
                setShowToast(true);
                addToast('Article published successfully! 🎉', 'success');
            }
            
            // Reset fields
            setTitle('');
            setDescription('');
            setCategory('7');
            setTags([]);
            setTagInput('');
            setAttachments([]);
            setScheduledTime('');
            setIsScheduling(false);
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
            
            setTimeout(() => setShowToast(false), 5000); // hide toast after 5s
            setViewMode('list'); // Switch back to listing
        } catch (e) {
            console.error('Failed to publish article:', e);
            const errorMsg = e.data?.errors 
                ? Object.values(e.data.errors).flat().join(' ') 
                : (e.data?.message || e.message || 'Failed to publish article. Please try again.');
            addToast('Failed to publish article: ' + errorMsg, 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    const currentUserIdStr = String(currentUser?.userId || currentUser?.id || '');

    // Calculate scheduled articles authored by current user
    const myScheduledArticles = allArticles.filter(art => 
        (art.status === 'Scheduled' || art.isScheduledFuture) && 
        String(art.authorUserId || art.author?.id || '') === currentUserIdStr
    );

    // Filter articles
    const rawFiltered = allArticles.filter(art => {
        const isArticleScheduled = art.status === 'Scheduled' || art.isScheduledFuture;
        if (isArticleScheduled) {
            const authorIdStr = String(art.authorUserId || art.author?.id || '');
            if (authorIdStr !== currentUserIdStr) {
                return false;
            }
        }

        if (selectedCategory.startsWith('⏰ Scheduled')) {
            return isArticleScheduled;
        }

        const matchesCategory = selectedCategory === 'All' || selectedCategory === '✨ Recommended' || (art.category && art.category.toLowerCase() === selectedCategory.toLowerCase());
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query || (art.title && art.title.toLowerCase().includes(query)) || 
                              (art.subtitle && art.subtitle.toLowerCase().includes(query)) ||
                              (art.author?.name && art.author.name.toLowerCase().includes(query)) ||
                              (art.tags && art.tags.some(tag => tag.toLowerCase().includes(query)));
        return matchesCategory && matchesSearch;
    });

    const filteredArticles = selectedCategory === '✨ Recommended' 
        ? getPersonalizedRecommendations(rawFiltered, currentUser)
        : rawFiltered;

    const { visibleCount, reset: resetScrollLoading } = useScrollLoading(filteredArticles.length, 6, 6);

    useEffect(() => {
        resetScrollLoading();
    }, [selectedCategory, searchQuery, resetScrollLoading]);

    const categories = [
        'All', 
        '✨ Recommended', 
        ...(myScheduledArticles.length > 0 ? [`⏰ Scheduled (${myScheduledArticles.length})`] : []),
        ...availableCategories.map(c => c.name).filter(n => n && !['All', '✨ Recommended'].includes(n))
    ];


    return (
        <>
            {viewMode === 'list' ? (
                /* LIST MODE UI */
                <main className="flex-1 min-w-0 flex flex-col gap-6 pb-20">
                    
                    {/* Header - Custom Hero Typography Design */}
                    <div className="relative flex flex-col items-center text-center pb-8 pt-6">
                        
                        {/* Background Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-300/30 dark:bg-slate-700/20 rounded-full blur-[80px] pointer-events-none -z-10"></div>

                        {/* Top Right Action Button */}
                        <div className="absolute right-0 top-0 hidden sm:block">
                            <button 
                                onClick={() => setViewMode('create')}
                                className="px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                                }}
                            >
                                <span className="material-symbols-outlined text-[16px]">edit_document</span>
                                Write Article
                            </button>
                        </div>

                        {/* Refined Category Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase tracking-wider mb-3 shadow-xs">
                            <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                            Knowledge Hub & Publications
                        </div>

                        {/* Title: Formal & Catchy (No Underline) */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 mb-3 leading-tight">
                            <span className="text-slate-800 dark:text-slate-200 font-extrabold">Share</span>
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-xs">
                                Knowledge
                            </span>
                        </h1>

                        {/* Subtitle with Integrated Text Flow */}
                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl leading-relaxed mb-1">
                            Experience collaborative learning with our <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">expert community platform</span>
                        </p>

                        {/* Small Description */}
                        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-normal max-w-xl">
                            Discover deep insights, track trending topics, and scale your expertise across the organization with unprecedented reliability.
                        </p>

                        {/* Mobile Write Button */}
                        <button 
                            onClick={() => setViewMode('create')}
                            className="mt-6 sm:hidden px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all flex items-center gap-2 w-full justify-center"
                            style={{
                                background: 'linear-gradient(135deg, var(--theme-10), #1D4ED8)',
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_document</span>
                            Write Article
                        </button>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Categories List */}
                        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all border shrink-0"
                                    style={selectedCategory === cat ? {
                                        background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(14,165,233,0.1))',
                                        border: '1px solid var(--border-mid)',
                                        color: '#2563EB',
                                        boxShadow: '0 2px 8px rgba(37,99,235,0.1)'
                                    } : {
                                        background: 'var(--bg-card)',
                                        borderColor: 'var(--border-subtle)',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input 
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-[13.5px] font-medium rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 dark:border-slate-800"
                                style={{
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Articles Grid */}
                    {isLoading ? (
                        <div className="flex-1 py-20 flex flex-col items-center justify-center text-center opacity-60">
                            <span className="material-symbols-outlined text-[48px] animate-spin text-slate-400 mb-4">progress_activity</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Loading Articles...</h3>
                        </div>
                    ) : filteredArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {filteredArticles.slice(0, visibleCount).map(art => {
                                const isScheduled = art.status === 'Scheduled' || art.isScheduledFuture;
                                return (
                                <div 
                                    key={art.id}
                                    onClick={() => navigate(`/article-view?id=${art.id}`)}
                                    className={`group cursor-pointer rounded-2xl overflow-hidden border ${isScheduled ? 'border-amber-400/80 dark:border-amber-600/80 bg-amber-50/20 dark:bg-amber-950/10' : 'border-theme-30 bg-theme-60-surface'} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col`}
                                    style={{
                                        boxShadow: 'var(--shadow-premium)'
                                    }}
                                >
                                    {/* Scheduled Banner */}
                                    {isScheduled && (
                                        <div className="bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-blue-500/10 border-b border-amber-300/40 dark:border-amber-700/40 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 animate-pulse">schedule</span>
                                                <span>Scheduled: {formatToDDMMYYYY(art.scheduledDate)}</span>
                                            </div>
                                            {String(art.authorUserId || art.author?.id) === currentUserIdStr && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handlePublishNow(e, art)}
                                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10.5px] rounded-lg transition-transform active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
                                                    title="Publish immediately without waiting for schedule"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">send</span>
                                                    Publish Now
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Cover Image or Header Bar */}
                                    {art.image ? (
                                        <div className="h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-950">
                                            <img 
                                                src={art.image} 
                                                alt={art.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {art.category}
                                            </div>
                                            {/* Save & Share Action Buttons */}
                                            <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSharingArticleModal(art);
                                                    }}
                                                    className="p-2 rounded-xl bg-slate-900/60 text-white hover:bg-blue-600 transition-all active:scale-95 shadow-md"
                                                    title="Share Article"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">share</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSavingArticleModal({
                                                            ...art,
                                                            contentType: 'Article',
                                                            text: art.subtitle || art.description || art.title,
                                                        });
                                                    }}
                                                    className={`p-2 rounded-xl backdrop-blur-md transition-all active:scale-95 shadow-md ${
                                                        savedMap[art.id]
                                                            ? 'bg-amber-500 text-slate-950 font-bold'
                                                            : 'bg-slate-900/60 text-white hover:bg-amber-500 hover:text-slate-950'
                                                    }`}
                                                    title={savedMap[art.id] ? "Saved in Personal Library" : "Save Article to Category"}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: savedMap[art.id] ? "'FILL' 1" : "'FILL' 0" }}>
                                                        bookmark
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-5 pt-5 flex items-center justify-between">
                                            <div className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {art.category}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSavingArticleModal({
                                                        ...art,
                                                        contentType: 'Article',
                                                        text: art.subtitle || art.description || art.title,
                                                    });
                                                }}
                                                className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-800 ${
                                                    savedMap[art.id]
                                                        ? 'bg-amber-500 text-slate-950 font-bold'
                                                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                                title={savedMap[art.id] ? "Saved in Personal Library" : "Save Article to Category"}
                                            >
                                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: savedMap[art.id] ? "'FILL' 1" : "'FILL' 0" }}>
                                                    bookmark
                                                </span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Info Body */}
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug mb-2">
                                                {art.title}
                                            </h3>
                                            <p className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                                {art.subtitle}
                                            </p>
                                        </div>

                                        {/* Author & Footer */}
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2.5">
                                                <img 
                                                    src={art.author.avatar} 
                                                    alt={art.author.name}
                                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{art.author.name}</p>
                                                    <p className="text-[9px] text-slate-400 truncate">{art.date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <button
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         setReportingArticle(art);
                                                     }}
                                                     className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                                     title="Report Article"
                                                 >
                                                     <span className="material-symbols-outlined text-[16px]">report</span>
                                                 </button>
                                                {(currentUser?.role === 'System Administrator' || currentUser?.role === 'SYSADM' || currentUser?.role === 'HRADM' || art.author?.name === currentUser?.fullName) && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!await confirm({ title: 'Delete Article', message: 'Are you sure you want to delete this article? This action cannot be undone.', confirmText: 'Delete', variant: 'danger' })) return;
                                                            try {
                                                                await deleteArticle(art.id);
                                                                setAllArticles(prev => prev.filter(a => a.id !== art.id));
                                                            } catch (err) {
                                                                addToast('Failed to delete article.', 'error');
                                                            }
                                                        }}
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete Article"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400" title="Total Views">
                                                    <span className="material-symbols-outlined text-[13px] text-cyan-600 dark:text-cyan-400">visibility</span>
                                                    <span>{art.views || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-black text-blue-500">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    {art.readTime}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                            <ScrollLoadingIndicator isVisible={visibleCount < filteredArticles.length} text="Loading more articles on scroll..." />
                        </div>
                    ) : (
                        <div className="flex-1 py-20 flex flex-col items-center justify-center text-center opacity-60">
                            <span className="material-symbols-outlined text-[64px] text-slate-300 mb-4">search_off</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Articles Found</h3>
                            <p className="text-[13px] text-slate-500 max-w-sm">
                                We couldn't find any articles matching your filters. Try selecting another category or refining your search.
                            </p>
                        </div>
                    )}
                </main>
            ) : (
                /* EDITOR MODE UI (Original Create Form) */
                <main className="flex-1 min-w-0 flex flex-col xl:flex-row gap-8 pb-12">
                    
                    {/* Left Column: Editor Area */}
                    <div className="flex-1 flex flex-col gap-6">
                        
                        {/* Header Actions */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    Back to Articles
                                </button>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Article</h1>
                                <p className="text-sm font-bold text-emerald-500 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">cloud_done</span> Draft saved just now
                                </p>
                            </div>
                            <div className="flex items-center gap-3 relative">
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
                                    onClick={() => setViewMode('list')}
                                    disabled={isPublishing}
                                    className="px-5 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer"
                                >
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
                                    className={`px-4 py-2 text-[13px] font-bold rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                        scheduledTime 
                                            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold' 
                                            : (isScheduling 
                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 text-indigo-600' 
                                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                              )
                                    }`}
                                    title={scheduledTime ? "Schedule active - click to edit" : (isScheduling ? "Close scheduler" : "Schedule publication")}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {scheduledTime ? 'alarm_on' : 'schedule'}
                                    </span>
                                    <span>{scheduledTime ? 'Scheduled' : 'Schedule'}</span>
                                    {scheduledTime && (
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping ml-0.5" />
                                    )}
                                </button>
                                {(() => {
                                    const restrictedInArticle = checkRestrictedContent(`${title} ${description} ${editorBodyText}`);
                                    if (restrictedInArticle) {
                                        return (
                                            <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-sm">
                                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                                <span>Restricted word ("{restrictedInArticle}") detected! Remove it to publish.</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <button 
                                            type="button"
                                            onClick={() => handlePublish(scheduledTime ? 'Scheduled' : 'Published')}
                                            disabled={isPublishing}
                                            className={`px-8 py-2 text-[13px] font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2 ${
                                                scheduledTime
                                                    ? 'bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-amber-500/30'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 active:scale-95'
                                            }`}
                                        >
                                            {isPublishing ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    <span>{scheduledTime ? 'Scheduling...' : 'Publishing...'}</span>
                                                </>
                                            ) : (
                                                scheduledTime ? (
                                                    <>
                                                        <span className="material-symbols-outlined text-[17px]">event_available</span>
                                                        <span>Schedule Article</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px]">publish</span>
                                                        <span>Publish</span>
                                                    </>
                                                )
                                            )}
                                        </button>
                                    );
                                })()}

                                {/* Scheduling Popover */}
                                {isScheduling && (
                                    <div 
                                        ref={schedulePopoverRef}
                                        className="absolute top-14 right-0 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 w-88 max-w-[92vw] animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100"
                                    >
                                        {/* Popover Header */}
                                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700/60">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                                        Schedule Article Publication
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
                                                    Article will remain private in your Scheduled queue until this time, then automatically publish across the Knome knowledge hub.
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

                        {/* Meta Data Inputs */}
                        <div className="flex flex-col gap-4">
                            <input 
                                id="article-title-input"
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a descriptive title..."
                                className="w-full bg-transparent border-none text-4xl font-extrabold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:ring-0 px-0 tracking-tight"
                            />
                            <input 
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a brief description or summary (optional)..."
                                className="w-full bg-transparent border-none text-lg font-medium text-slate-600 dark:text-slate-400 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-0 px-0"
                            />
                        </div>

                        {/* Rich Text Editor Container (FR-AB-02) */}
                        <div className="rounded-2xl border border-theme-30 bg-theme-60-surface shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            
                            {/* Hidden file input for inline editor image upload */}
                            <input 
                                type="file" 
                                ref={editorImageInputRef} 
                                accept="image/jpeg,image/png,image/gif,image/webp" 
                                className="hidden" 
                                onChange={handleEditorImageUpload} 
                            />

                            {/* Toolbar */}
                            <div className="bg-theme-subtle p-2 border-b border-theme-30 flex flex-wrap gap-1 items-center sticky top-0 z-10 select-none">
                                {[
                                    { id: 'bold', icon: 'format_bold', label: 'Bold (Ctrl+B)' },
                                    { id: 'italic', icon: 'format_italic', label: 'Italic (Ctrl+I)' },
                                    { id: 'underline', icon: 'format_underlined', label: 'Underline (Ctrl+U)' }
                                ].map(btn => (
                                    <button 
                                        key={btn.id} 
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => toggleFormat(btn.id)} 
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${activeFormats[btn.id] ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title={btn.label}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{btn.icon}</span>
                                    </button>
                                ))}
                                
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                
                                {[
                                    { id: 'heading', icon: 'title', label: 'Heading (H2)' },
                                    { id: 'list', icon: 'format_list_bulleted', label: 'Bulleted List' },
                                    { id: 'numlist', icon: 'format_list_numbered', label: 'Numbered List' },
                                    { id: 'quote', icon: 'format_quote', label: 'Quote / Blockquote' }
                                ].map(btn => (
                                    <button 
                                        key={btn.id} 
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => toggleFormat(btn.id)} 
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${activeFormats[btn.id] ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title={btn.label}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{btn.icon}</span>
                                    </button>
                                ))}
                                

                            </div>

                            {/* Editable Area */}
                            <div 
                                ref={editorRef}
                                contentEditable="true"
                                className="rich-editor-content flex-1 p-8 focus:outline-none max-w-none text-slate-800 dark:text-slate-200 min-h-[400px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
                                suppressContentEditableWarning={true}
                                data-placeholder="Start writing your long-form article here..."
                                onFocus={(e) => {
                                    if (e.currentTarget.innerHTML.includes('Start writing your long-form article here')) {
                                        e.currentTarget.innerHTML = '<p><br></p>';
                                    }
                                    updateActiveFormats();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        e.preventDefault();
                                        if (e.shiftKey) {
                                            document.execCommand('outdent', false, null);
                                        } else {
                                            document.execCommand('indent', false, null);
                                        }
                                        updateActiveFormats();
                                    }
                                }}
                                onKeyUp={updateActiveFormats}
                                onMouseUp={updateActiveFormats}
                                onSelect={updateActiveFormats}
                                onInput={(e) => {
                                    setEditorBodyText(e.currentTarget.innerText || '');
                                    updateActiveFormats();
                                }}
                            >
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar: Settings & Meta */}
                    <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6">
                        
                        {/* Categorization & Tags (FR-AB-01) */}
                        <div className="rounded-2xl border shadow-sm p-5 glass card-lift bg-theme-60-surface border-theme-30">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">category</span>
                                Categorization
                            </h3>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                                        {isSysAdmin && !isAddingCategory && (
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCategory(true)}
                                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                                                title="Add a new category (System Admin only)"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                                                <span>Add Category</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Inline Add Category Form for System Admin */}
                                    {isSysAdmin && isAddingCategory && (
                                        <div className="mb-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl animate-in fade-in duration-200">
                                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                                                New Category Name
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleCreateCategory();
                                                        } else if (e.key === 'Escape') {
                                                            setIsAddingCategory(false);
                                                        }
                                                    }}
                                                    placeholder="e.g. Artificial Intelligence"
                                                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                                                        className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSavingCategory || !newCategoryName.trim()}
                                                        onClick={handleCreateCategory}
                                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {isSavingCategory && <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>}
                                                        <span>Save Category</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <select 
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                                        {availableCategories.map(cat => (
                                            <option key={cat.categoryId} value={String(cat.categoryId)}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</label>
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-indigo-500">
                                        {tags.map(tag => (
                                            <span key={tag} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md text-[11px] font-bold">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="hover:text-red-500"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                            </span>
                                        ))}
                                        <input 
                                            type="text" 
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder="Add tag and press Enter..."
                                            className="flex-1 min-w-[100px] bg-transparent border-none p-0 text-sm text-slate-900 dark:text-white focus:ring-0 placeholder-slate-500 dark:placeholder-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Media Attachments (FR-AB-03) */}
                        <div className="rounded-2xl border shadow-sm p-5 glass card-lift bg-theme-60-surface border-theme-30">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-500">attachment</span>
                                Attachments
                            </h3>
                            
                            {attachments.length > 0 && (
                                <div className="flex flex-col gap-2 mb-4">
                                    {attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {att.type === 'image' && (att.backendUrl || att.url) ? (
                                                    <img src={resolveMediaUrl(att.backendUrl) || att.url} alt="preview" className="w-8 h-8 rounded object-cover shrink-0" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px] text-purple-500 shrink-0">
                                                        {att.type === 'doc' ? 'description' : att.type === 'image' ? 'image' : att.type === 'video' ? 'videocam' : 'mic'}
                                                    </span>
                                                )}
                                                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{att.name}</span>
                                                {att.isUploading && (
                                                    <span className="material-symbols-outlined text-[14px] text-blue-500 animate-spin ml-2">refresh</span>
                                                )}
                                            </div>
                                            {!att.isUploading && (
                                                <button onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => addAttachment('doc')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
                                    <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-indigo-500 mb-1">description</span>
                                    <span className="text-[10px] font-bold text-slate-500">Document</span>
                                </button>
                                <button onClick={() => addAttachment('image')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group">
                                    <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-emerald-500 mb-1">image</span>
                                    <span className="text-[10px] font-bold text-slate-500">Image</span>
                                </button>
                                <button onClick={() => addAttachment('video')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors group">
                                    <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-cyan-500 mb-1">videocam</span>
                                    <span className="text-[10px] font-bold text-slate-500">Video</span>
                                </button>
                                <button onClick={() => addAttachment('podcast')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors group">
                                    <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-pink-500 mb-1">mic</span>
                                    <span className="text-[10px] font-bold text-slate-500">Podcast</span>
                                </button>
                            </div>
                        </div>

                        {/* Article Publication Actions */}
                        <div className="rounded-2xl border shadow-sm p-5 glass card-lift bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">send</span>
                                Ready to Publish?
                            </h3>
                            <p className="text-[11px] font-medium text-slate-500 mb-4 leading-relaxed">
                                Your article will be immediately published to the Knowledge Hub, visible to all colleagues, and indexed for global search.
                            </p>
                            <div className="flex flex-col gap-2.5">
                                <button 
                                    type="button"
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="w-full py-2.5 text-[13px] font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 disabled:opacity-50"
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)'
                                    }}
                                >
                                    {isPublishing ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            <span>Publishing Article...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[18px]">publish</span>
                                            <span>Publish Article Now</span>
                                        </>
                                    )}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className="w-full py-2 text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel & Return
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            )}

            {/* Publishing Success Toast (FR-AB-05) */}
            {showToast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-start gap-4 max-w-md border border-slate-700 dark:border-slate-200">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-emerald-400 dark:text-emerald-600">task_alt</span>
                        </div>
                        <div>
                            <h4 className="text-[14px] font-bold mb-1">Article Published!</h4>
                            <p className="text-[12px] opacity-80 leading-relaxed">
                                Your article is now live. It will be indexed by the search engine and available globally within 5 minutes.
                            </p>
                        </div>
                        <button onClick={() => setShowToast(false)} className="opacity-50 hover:opacity-100 transition-opacity ml-2">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Report Article Modal */}
            <ReportModal
                isOpen={!!reportingArticle}
                onClose={() => setReportingArticle(null)}
                targetType="Article"
                targetId={reportingArticle?.id || 1}
                targetName={reportingArticle?.author?.name || 'Author'}
            />

            {/* Save to Category Modal */}
            <SaveToCategoryModal
                isOpen={!!savingArticleModal}
                onClose={() => setSavingArticleModal(null)}
                item={savingArticleModal}
                onSaved={(savedItem) => {
                    setSavedMap(prev => ({ ...prev, [savedItem.contentId || savedItem.id]: true }));
                }}
            />

            {/* Share Article Modal */}
            <ArticleShareModal
                isOpen={!!sharingArticleModal}
                onClose={() => setSharingArticleModal(null)}
                article={sharingArticleModal}
            />
        </>
    );
}
