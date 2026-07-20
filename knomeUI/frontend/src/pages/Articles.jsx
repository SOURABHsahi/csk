import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../components/contexts/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { getArticles, saveArticle } from '../utils/mockArticles';

export default function Articles() {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    
    // Page view mode: 'list' or 'create'
    const [viewMode, setViewMode] = useState('list');
    
    const [allArticles, setAllArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
    const [category, setCategory] = useState('');
    
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

        const tempId = Date.now();
        const localPreviewUrl = URL.createObjectURL(file);
        
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
            const { apiClient } = await import('../utils/apiClient.js');
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
        
        const { checkRestrictedContent } = await import('../utils/restrictedWords.js');
        const foundKeyword = checkRestrictedContent(fullContent);
        if (foundKeyword) {
            alert(`Security Alert: Please don't use this word - "${foundKeyword}". It is restricted and your article cannot be published.`);
            return;
        }
        
        setIsPublishing(true);
        
        const resolvedAttachments = attachments.map(a => a.backendUrl || a.url);
        const resolvedTypes = attachments.map(a => a.type);
        const imageAttachment = attachments.find(a => a.type === 'image');
        const coverImage = imageAttachment ? (imageAttachment.backendUrl || imageAttachment.url) : 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=1200&h=400';
        
        const newArt = {
            id: 'custom_' + Date.now(),
            title: title.trim(),
            subtitle: description.trim() || 'No summary provided',
            author: {
                name: currentUser.name,
                role: currentUser.roleName || 'Contributor',
                avatar: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=6366f1&color=fff`
            },
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            readTime: Math.max(1, Math.round((editorText.length + title.length) / 500)) + ' min read',
            category: category || 'Engineering',
            tags: tags,
            image: coverImage,
            attachmentsUrls: resolvedAttachments,
            attachmentsTypes: resolvedTypes,
            likes: 0,
            reactions: 0,
            views: 1,
            shares: 0,
            community: 'Product Strategy',
            members: '4,250 members',
            communityDesc: 'Discussing the future of product development, design systems, and corporate strategy.',
            communityIcon: 'architecture',
            content: [
                { type: 'paragraph', text: editorHtml || 'No content provided.' }
            ],
            comments: []
        };
        
        try {
            await saveArticle(newArt);
            await loadData();
            
            setShowToast(true);
            
            // Reset fields
            setTitle('');
            setDescription('');
            setCategory('');
            setTags([]);
            setAttachments([]);
            if (editorRef.current) {
                editorRef.current.innerHTML = '<p class="opacity-50">Start writing your long-form article here...</p>';
            }
            
            setTimeout(() => setShowToast(false), 5000); // hide toast after 5s
            setViewMode('list'); // Switch back to listing
        } catch (e) {
            alert('Failed to publish article');
        } finally {
            setIsPublishing(false);
        }
    };

    // Role-based access check
    if (currentUser.role === 'SYSADM') {
        return (
            <main className="flex-1 px-8 py-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-6 border-2 border-red-500">
                    <span className="material-symbols-outlined text-[40px] text-red-500">lock</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Access Denied</h1>
                <p className="text-slate-500 font-medium">System Administrators do not have content publishing privileges.</p>
            </main>
        );
    }


    
    // Filter articles
    const filteredArticles = allArticles.filter(art => {
        const matchesCategory = selectedCategory === 'All' || art.category.toLowerCase() === selectedCategory.toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchesSearch = art.title.toLowerCase().includes(query) || 
                              art.subtitle.toLowerCase().includes(query) ||
                              art.author.name.toLowerCase().includes(query) ||
                              art.tags.some(tag => tag.toLowerCase().includes(query));
        return matchesCategory && matchesSearch;
    });

    const categories = ['All', 'Design', 'Product Management', 'Engineering', 'Company Culture'];

    return (
        <>
            {viewMode === 'list' ? (
                /* LIST MODE UI */
                <main className="flex-1 min-w-0 flex flex-col gap-6 pb-20">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Articles Hub</h1>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                Discover and read deep dives and insights from our engineering and design leads.
                            </p>
                        </div>
                        <button 
                            onClick={() => setViewMode('create')}
                            className="px-6 py-2.5 text-xs font-black text-white rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                                boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
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
                                    className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
                                    style={{
                                        boxShadow: 'var(--shadow-premium)'
                                    }}
                                >
                                    {/* Cover Image */}
                                    <div className="h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-950">
                                        <img 
                                            src={art.image} 
                                            alt={art.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                            {art.category}
                                        </div>
                                    </div>

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
                                            <div className="flex items-center gap-1 text-[10px] font-black text-blue-500">
                                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                {art.readTime}
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
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            
                            {/* Toolbar */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1 items-center sticky top-0 z-10">
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
                                className="flex-1 p-8 focus:outline-none prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 min-h-[400px]"
                                suppressContentEditableWarning={true}
                                data-placeholder="Start writing your article here..."
                            >
                                <p className="opacity-50">Start writing your long-form article here...</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar: Settings & Meta */}
                    <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6">
                        
                        {/* Categorization & Tags (FR-AB-01) */}
                        <div className="rounded-2xl border shadow-sm p-5 glass card-lift bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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
                                        <option value="" disabled>Select Category</option>
                                        <option>Engineering</option>
                                        <option>Design</option>
                                        <option>Product Management</option>
                                        <option>Company Culture</option>
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
                        <div className="rounded-2xl border shadow-sm p-5 glass card-lift bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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
                                                    <img src={att.backendUrl || att.url} alt="preview" className="w-8 h-8 rounded object-cover shrink-0" />
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
        </>
    );
}
