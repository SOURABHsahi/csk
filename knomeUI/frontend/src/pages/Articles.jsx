import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { getArticles, saveArticle, deleteArticle } from '../utils/articleService';
import { savedContentApi, getPersonalizedRecommendations, resolveMediaUrl } from '../utils/apiService';
import { apiClient } from '../utils/apiClient';
import { checkRestrictedContent } from '../utils/restrictedWords';
import ReportModal from '../components/modals/ReportModal';
import SaveToCategoryModal from '../components/modals/SaveToCategoryModal';
import ArticleShareModal from '../components/modals/ArticleShareModal';

export default function Articles() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    
    // Page view mode: 'list' or 'create'
    const [viewMode, setViewMode] = useState('list');
    
    const [allArticles, setAllArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savedMap, setSavedMap] = useState({});
    const [reportingArticle, setReportingArticle] = useState(null);
    const [savingArticleModal, setSavingArticleModal] = useState(null);
    const [sharingArticleModal, setSharingArticleModal] = useState(null);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getArticles();
        setAllArticles(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);
    
    // List Filtering States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // Editor State (FR-AB-01)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('7'); // Default to Engineering ID
    
    // Tags State
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Attachments State (FR-AB-03)
    const [attachments, setAttachments] = useState([]);
    
    // Actions State (FR-AB-04, FR-AB-05)
    const [isPublishing, setIsPublishing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    
    // Formatting state (FR-AB-02)
    const [activeFormats, setActiveFormats] = useState({
        bold: false, italic: false, underline: false, list: false, heading: false
    });
    
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
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
            alert('Maximum 4 attachments allowed.');
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
                alert('File upload failed. Please try again.');
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
            if (att?.url?.startsWith('blob:')) URL.revokeObjectURL(att.url);
            return prev.filter(a => a.id !== id);
        });
    };

    const toggleFormat = (format) => {
        editorRef.current?.focus();
        
        let command = format;
        let value = null;
        
        if (format === 'list') command = 'insertUnorderedList';
        else if (format === 'numlist') command = 'insertOrderedList';
        else if (format === 'heading') {
            command = 'formatBlock';
            value = 'H2';
        } else if (format === 'quote') {
            command = 'formatBlock';
            value = 'BLOCKQUOTE';
        }
        
        document.execCommand(command, false, value);
        setActiveFormats({ ...activeFormats, [format]: !activeFormats[format] });
    };

    const handlePublish = async () => {
        if (isUploadingMedia) {
            alert('Please wait for media to finish uploading.');
            return;
        }

        const editorText = editorRef.current ? editorRef.current.innerText : '';
        const editorHtml = editorRef.current ? editorRef.current.innerHTML : '';
        const fullContent = `${title} ${description} ${editorText}`;
        
        const foundKeyword = checkRestrictedContent(fullContent);
        if (foundKeyword) {
            alert(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted and your article cannot be published.`);
            return;
        }
        
        setIsPublishing(true);
        
        let finalTags = [...tags];
        if (tagInput.trim()) {
            finalTags = [...finalTags, ...tagInput.split(',').map(t => t.trim()).filter(Boolean)];
            finalTags = [...new Set(finalTags)];
        }

        const resolvedAttachments = attachments.map(a => a.backendUrl || a.url).filter(url => !url.startsWith('blob:'));
        
        let cleanHtml = (editorHtml || '')
            .replace(/<p class="opacity-50">Start writing your long-form article here\.{0,3}<\/p>/gi, '')
            .replace(/Start writing your long-form article here\.{0,3}/gi, '')
            .replace(/Start writi(?:ng)?/gi, '')
            .replace(/class="[^"]*opacity-50[^"]*"/gi, '');

        const dto = {
            title: title.trim(),
            description: description.trim() || null,
            contentHtml: cleanHtml.trim(),
            categoryId: parseInt(category) || 7,
            status: "Published",
            tags: finalTags,
            attachmentUrls: resolvedAttachments
        };
        
        try {
            await saveArticle(dto);
            await loadData();
            
            setShowToast(true);
            
            // Reset fields
            setTitle('');
            setDescription('');
            setCategory('7');
            setTags([]);
            setTagInput('');
            setAttachments([]);
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
            
            setTimeout(() => setShowToast(false), 5000); // hide toast after 5s
            setViewMode('list'); // Switch back to listing
        } catch (e) {
            alert('Failed to publish article: ' + (e.message || 'Please try again.'));
        } finally {
            setIsPublishing(false);
        }
    };




    
    // Filter articles
    const rawFiltered = allArticles.filter(art => {
        const matchesCategory = selectedCategory === 'All' || selectedCategory === '✨ Recommended' || art.category.toLowerCase() === selectedCategory.toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query || art.title.toLowerCase().includes(query) || 
                              art.subtitle.toLowerCase().includes(query) ||
                              art.author.name.toLowerCase().includes(query) ||
                              art.tags.some(tag => tag.toLowerCase().includes(query));
        return matchesCategory && matchesSearch;
    });

    const filteredArticles = selectedCategory === '✨ Recommended' 
        ? getPersonalizedRecommendations(rawFiltered, currentUser)
        : rawFiltered;

    const categories = ['All', '✨ Recommended', 'Design', 'Product Management', 'Engineering', 'Company Culture'];

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
                            {filteredArticles.map(art => (
                                <div 
                                    key={art.id}
                                    onClick={() => navigate(`/article-view?id=${art.id}`)}
                                    className="group cursor-pointer rounded-2xl overflow-hidden border border-theme-30 bg-theme-60-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
                                    style={{
                                        boxShadow: 'var(--shadow-premium)'
                                    }}
                                >
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
                                                            if (!window.confirm('Are you sure you want to delete this article?')) return;
                                                            try {
                                                                await deleteArticle(art.id);
                                                                setAllArticles(prev => prev.filter(a => a.id !== art.id));
                                                            } catch (err) {
                                                                alert('Failed to delete article.');
                                                            }
                                                        }}
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete Article"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-1 text-[10px] font-black text-blue-500">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    {art.readTime}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className="px-5 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button className="px-5 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                                    Schedule
                                </button>
                                <button 
                                    onClick={handlePublish}
                                    disabled={isPublishing || !title.trim()}
                                    className="px-8 py-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                                    {isPublishing ? 'Publishing...' : 'Publish'}
                                </button>
                            </div>
                        </div>

                        {/* Meta Data Inputs */}
                        <div className="flex flex-col gap-4">
                            <input 
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
                            
                            {/* Toolbar */}
                            <div className="bg-theme-subtle p-2 border-b border-theme-30 flex flex-wrap gap-1 items-center sticky top-0 z-10">
                                {[
                                    { id: 'bold', icon: 'format_bold' },
                                    { id: 'italic', icon: 'format_italic' },
                                    { id: 'underline', icon: 'format_underlined' }
                                ].map(btn => (
                                    <button key={btn.id} onClick={() => toggleFormat(btn.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeFormats[btn.id] ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{btn.icon}</span>
                                    </button>
                                ))}
                                
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                
                                {[
                                    { id: 'heading', icon: 'title' },
                                    { id: 'list', icon: 'format_list_bulleted' },
                                    { id: 'numlist', icon: 'format_list_numbered' },
                                    { id: 'quote', icon: 'format_quote' }
                                ].map(btn => (
                                    <button key={btn.id} onClick={() => toggleFormat(btn.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeFormats[btn.id] ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{btn.icon}</span>
                                    </button>
                                ))}
                                
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                
                                {[
                                    { id: 'link', icon: 'link' },
                                    { id: 'image', icon: 'image' },
                                    { id: 'table', icon: 'table_chart' },
                                    { id: 'code', icon: 'code' }
                                ].map(btn => (
                                    <button key={btn.id} type="button" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">{btn.icon}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Editable Area */}
                            <div 
                                ref={editorRef}
                                contentEditable="true"
                                className="flex-1 p-8 focus:outline-none prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 min-h-[400px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
                                suppressContentEditableWarning={true}
                                data-placeholder="Start writing your long-form article here..."
                                onFocus={(e) => {
                                    if (e.currentTarget.innerHTML.includes('Start writing your long-form article here')) {
                                        e.currentTarget.innerHTML = '<p><br></p>';
                                    }
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
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                                    <select 
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                                        <option value="1">Technology</option>
                                        <option value="7">Engineering</option>
                                        <option value="8">Design</option>
                                        <option value="9">Product Management</option>
                                        <option value="10">Company Culture</option>
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

                        {/* Article Settings & Post-Publication Mock (FR-AB-06, FR-AB-07) */}
                        <div className="rounded-2xl border shadow-sm p-5 glass card-lift bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">settings</span>
                                Post-Publication Settings
                            </h3>
                            <p className="text-[11px] font-medium text-slate-500 mb-4 leading-relaxed">
                                Once published, you will be able to track analytics and manage version history here.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Views</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">--</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Read Time</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">--</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg opacity-50 cursor-not-allowed">Edit Post</button>
                                <button className="flex-1 py-2 text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg opacity-50 cursor-not-allowed">Delete Post</button>
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
