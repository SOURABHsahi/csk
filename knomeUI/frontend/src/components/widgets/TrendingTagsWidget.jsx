import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PROJECT_TAGS = [
    { tag: 'MPOnline', color: '#6366f1' },
    { tag: 'Knome', color: '#0ea5e9' },
    { tag: 'EGovernance', color: '#10b981' },
    { tag: 'HigherEducation', color: '#8b5cf6' },
    { tag: 'DotNetCore', color: '#f59e0b' },
    { tag: 'TechSymposium', color: '#ec4899' },
    { tag: 'CyberSecurity', color: '#ef4444' },
    { tag: 'DigitalMP', color: '#06b6d4' },
];

export default function TrendingTagsWidget() {
    const navigate = useNavigate();
    const [tags, setTags] = useState(DEFAULT_PROJECT_TAGS);

    useEffect(() => {
        try {
            // Check if any posts or saved content have custom hashtags
            const savedPosts = JSON.parse(localStorage.getItem('knome_saved_posts_full') || '[]');
            const recentSearches = JSON.parse(localStorage.getItem('knome_recent_searches') || '[]');
            const foundTags = new Set();

            savedPosts.forEach(p => {
                (p.tags || []).forEach(t => {
                    const clean = String(t).replace('#', '').trim();
                    if (clean && clean.length >= 3) foundTags.add(clean);
                });
            });

            recentSearches.forEach(s => {
                const term = typeof s === 'string' ? s : s.searchTerm;
                if (term && term.startsWith('#')) {
                    const clean = term.replace('#', '').trim();
                    if (clean && clean.length >= 3) foundTags.add(clean);
                }
            });

            if (foundTags.size > 0) {
                const palette = ['#6366f1', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4'];
                let idx = 0;
                const dynamicList = [...DEFAULT_PROJECT_TAGS];
                foundTags.forEach(t => {
                    if (!dynamicList.some(item => item.tag.toLowerCase() === t.toLowerCase())) {
                        dynamicList.push({ tag: t, color: palette[idx % palette.length] });
                        idx++;
                    }
                });
                setTags(dynamicList.slice(0, 10));
            }
        } catch (e) {
            // Fallback gracefully to DEFAULT_PROJECT_TAGS
        }
    }, []);

    const handleTagClick = (tag) => {
        navigate(`/search?q=${encodeURIComponent('#' + tag)}`);
    };

    return (
        <div className="rounded-2xl p-5"
            style={{background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
            <h3 className="text-[14px] font-black mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                <span className="material-symbols-outlined text-[18px] text-indigo-500" style={{fontVariationSettings:"'FILL' 1"}}>trending_up</span>
                Trending Tags
            </h3>
            <div className="flex flex-wrap gap-2">
                {tags.map(({ tag, color }) => (
                    <span key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                        style={{background: `${color}15`, color, border: `1px solid ${color}25`}}>
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
