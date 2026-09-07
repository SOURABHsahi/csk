import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { saveArticle, getArticleCategories, createArticleCategory } from '../../utils/articleService';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { checkRestrictedContent } from '../../utils/restrictedWords';

export default function CreateArticleModal({ isOpen, onClose, onArticleCreated }) {
    const { currentUser, awardRuleKarma } = useUser();
    const { addToast } = useToast();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('7');
    const [tags, setTags] = useState('');
    
    // Rich text state mock
    const [content, setContent] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    const isSysAdmin = currentUser?.role === 'SYSADM' || 
                       currentUser?.roleName === 'System Administrator' || 
                       (Array.isArray(currentUser?.roles) && currentUser.roles.some(r => ['SYSADM', 'System Administrator', 'SystemAdmin'].includes(r)));

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
        if (isOpen) {
            getArticleCategories().then(cats => {
                if (Array.isArray(cats) && cats.length > 0) {
                    setAvailableCategories(cats);
                }
            }).catch(() => {});
        } else {
            setTitle('');
            setCategory('7');
            setTags('');
            setContent('');
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    }, [isOpen]);

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
                setAvailableCategories(prev => [...prev, created]);
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

    const handlePublish = async () => {
        if (!title.trim()) {
            addToast('Please enter an article title.', 'warning');
            return;
        }

        if (!content.trim()) {
            addToast('Please enter article content.', 'warning');
            return;
        }

        const textToScan = `${title} ${tags} ${content}`;
        const foundKeyword = checkRestrictedContent(textToScan);
        if (foundKeyword) {
            addToast(`Article cannot be published. It contains the restricted term: "${foundKeyword}".`, 'warning');
            return;
        }
        
        setIsPublishing(true);
        try {
            const dto = {
                title: title.trim(),
                description: 'No summary provided',
                contentHtml: `<p>${content.trim().replace(/\n/g, '<br/>')}</p>`,
                categoryId: parseInt(category) || 7,
                status: "Published",
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                attachmentUrls: []
            };
            
            await saveArticle(dto);

            try {
                sessionStorage.removeItem('knome_cached_articles');
            } catch {}

            if (awardRuleKarma && (currentUser?.userId || currentUser?.id)) {
                awardRuleKarma(currentUser?.userId || currentUser?.id, 'ARTICLE');
            }
            window.dispatchEvent(new CustomEvent('article-created'));
            addToast('Article published successfully!', 'success');
            if (onArticleCreated) onArticleCreated();
            onClose();
        } catch (error) {
            console.error('Failed to publish article:', error);
            const errorMsg = error.data?.errors 
                ? Object.values(error.data.errors).flat().join(' ') 
                : (error.data?.message || error.message || 'Failed to publish article.');
            addToast('Failed to publish article: ' + errorMsg, 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Article" maxWidth="max-w-4xl">
            <div className="flex flex-col gap-4">
                
                {/* Meta details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-label-md font-bold text-slate-gray">Article Title</label>
                        <input 
                            className="bg-surface-container border border-border-subtle rounded-lg px-3 py-2 focus:ring-2 focus:ring-electric-blue outline-none" 
                            type="text" 
                            placeholder="Enter a descriptive title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-label-md font-bold text-slate-gray">Category</label>
                            {isSysAdmin && !isAddingCategory && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(true)}
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                                    <span>+ Add Category</span>
                                </button>
                            )}
                        </div>

                        {isSysAdmin && isAddingCategory && (
                            <div className="mb-2 p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg flex flex-col gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Category name..."
                                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded px-2 py-1 text-xs outline-none"
                                />
                                <div className="flex justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                                        className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSavingCategory || !newCategoryName.trim()}
                                        onClick={handleCreateCategory}
                                        className="px-2.5 py-0.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}

                        <select 
                            className="bg-surface-container border border-border-subtle rounded-lg px-3 py-2 focus:ring-2 focus:ring-electric-blue outline-none text-sm"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {availableCategories.map(cat => (
                                <option key={cat.categoryId} value={String(cat.categoryId)}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-label-md font-bold text-slate-gray">Tags (comma separated)</label>
                    <input 
                        className="bg-surface-container border border-border-subtle rounded-lg px-3 py-2 focus:ring-2 focus:ring-electric-blue outline-none" 
                        type="text" 
                        placeholder="e.g. React, Frontend, Best Practices"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </div>

                {/* Mock Rich Text Toolbar */}
                <div className="border border-border-subtle rounded-lg overflow-hidden flex flex-col mt-2">
                    <div className="bg-surface-container flex items-center gap-1 p-2 border-b border-border-subtle">
                        <button className="p-1 hover:bg-surface-container-high rounded text-slate-gray"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
                        <button className="p-1 hover:bg-surface-container-high rounded text-slate-gray"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
                        <button className="p-1 hover:bg-surface-container-high rounded text-slate-gray"><span className="material-symbols-outlined text-[18px]">format_underlined</span></button>
                        <div className="w-px h-5 bg-border-subtle mx-1"></div>
                        <button className="p-1 hover:bg-surface-container-high rounded text-slate-gray"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
                        <button className="p-1 hover:bg-surface-container-high rounded text-slate-gray"><span className="material-symbols-outlined text-[18px]">format_list_numbered</span></button>
                    </div>
                    <textarea 
                        className="w-full h-64 p-4 bg-surface-container-lowest focus:outline-none resize-none font-body-md text-primary"
                        placeholder="Write your article here... (Markdown supported)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    ></textarea>
                </div>

                <div className="bg-surface-container-low text-slate-gray p-3 rounded-lg text-xs flex items-start gap-2 mt-2">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <p>Articles are subject to Knome's community guidelines and moderation (FR-SM-06). They will be indexed for search within 5 minutes of publication.</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center gap-3 mt-4 border-t border-border-subtle pt-4">
                    <button onClick={onClose} className="px-4 py-2 text-slate-gray font-label-md hover:bg-surface-container rounded-lg transition-all">Cancel</button>
                    {(() => {
                        const textToScan = `${title} ${tags} ${content}`;
                        const restrictedWord = checkRestrictedContent(textToScan);
                        if (restrictedWord) {
                            return (
                                <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
                                    <span className="material-symbols-outlined text-[16px]">warning</span>
                                    <span>Restricted word ("{restrictedWord}") detected! Remove it to publish.</span>
                                </div>
                            );
                        }
                        return (
                            <>
                                <button className="px-4 py-2 border border-border-subtle text-primary font-label-md hover:bg-surface-container rounded-lg transition-all">Save Draft</button>
                                <button className="px-4 py-2 border border-border-subtle text-primary font-label-md hover:bg-surface-container rounded-lg transition-all flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">schedule</span> Schedule
                                </button>
                                <button 
                                    type="button"
                                    onClick={handlePublish} 
                                    disabled={isPublishing}
                                    className="px-4 py-2 bg-electric-blue text-white font-label-md rounded-lg hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {isPublishing ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        'Publish Article'
                                    )}
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
        </Modal>
    );
}
