import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrendingTagsWidget() {
    const navigate = useNavigate();
    
    // In a real app, this would be fetched from an API
    const tags = [
        { tag: 'tech-symposium', color: '#6366f1' },
        { tag: 'engineering', color: '#0ea5e9' },
        { tag: 'design-system', color: '#8b5cf6' },
        { tag: 'product', color: '#10b981' },
        { tag: 'culture', color: '#f59e0b' },
        { tag: 'Q4-planning', color: '#ef4444' },
    ];

    const handleTagClick = (tag) => {
        // Navigate to search page with the tag query
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-105"
                        style={{background: `${color}15`, color, border: `1px solid ${color}25`}}>
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
