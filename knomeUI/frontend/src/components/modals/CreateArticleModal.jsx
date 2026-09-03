import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { saveArticle } from '../../utils/articleService';
import { useUser } from '../contexts/UserContext';

import { checkRestrictedContent } from '../../utils/restrictedWords';

export default function CreateArticleModal({ isOpen, onClose, onArticleCreated }) {
    const { currentUser, awardRuleKarma } = useUser();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('7');
    const [tags, setTags] = useState('');
    
    // Rich text state mock
    const [content, setContent] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setCategory('7');
            setTags('');
            setContent('');
        }
    }, [isOpen]);

    const handlePublish = async () => {
        if (!title.trim() || !content.trim()) {
            alert('Title and content are required.');
            return;
        }

        const textToScan = `${title} ${tags} ${content}`;
        const foundKeyword = checkRestrictedContent(textToScan);
        if (foundKeyword) {
            alert(`Article cannot be published. It contains the restricted term: "${foundKeyword}".`);
            return;
        }
        
        setIsPublishing(true);
        try {
            const dto = {
                title: title.trim(),
                description: 'No summary provided',
                contentHtml: content,
                categoryId: parseInt(category) || 7,
                status: "Published",
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                attachmentUrls: []
            };
            
            await saveArticle(dto);
            if (awardRuleKarma && (currentUser?.userId || currentUser?.id)) {
                awardRuleKarma(currentUser?.userId || currentUser?.id, 'ARTICLE');
            }
            if (onArticleCreated) onArticleCreated();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to publish article.');
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
                        <label className="text-label-md font-bold text-slate-gray">Category</label>
                        <select 
                            className="bg-surface-container border border-border-subtle rounded-lg px-3 py-2 focus:ring-2 focus:ring-electric-blue outline-none"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="">Select Category</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Design">Design</option>
                            <option value="Product Management">Product Management</option>
                            <option value="Company Culture">Company Culture</option>
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
                                <button onClick={handlePublish} className="px-4 py-2 bg-electric-blue text-white font-label-md rounded-lg hover:opacity-90 transition-all shadow-sm">
                                    Publish Article
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
        </Modal>
    );
}
