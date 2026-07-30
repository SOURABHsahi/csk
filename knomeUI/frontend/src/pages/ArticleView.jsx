import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { getArticles, deleteArticle } from '../utils/articleService';
import { resolveMediaUrl, interactionsApi } from '../utils/apiService';
import ReportModal from '../components/modals/ReportModal';

export default function ArticleView() {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser } = useUser();

    const [isReportOpen, setIsReportOpen] = useState(false);
    
    // Read ?id=X query parameter
    const searchParams = new URLSearchParams(location.search);
    const articleId = searchParams.get('id');
    
    // Local state for fetched articles
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchArticles = async () => {
            const data = await getArticles();
            setArticles(data || []);
            setIsLoading(false);
        };
        fetchArticles();
    }, []);
    
    // Find current article or fallback
    const article = articles.find(art => art.id === articleId) || articles.find(art => art.id === '1') || articles[0];

    const isSystemAdminOrAuthor = currentUser?.role === 'System Administrator' || 
                                  currentUser?.role === 'SYSADM' || 
                                  currentUser?.role === 'HR Administrator' || 
                                  currentUser?.role === 'HRADM' || 
                                  article?.author?.name === currentUser?.fullName;

    const handleDeleteArticle = async () => {
        if (!article?.id) return;
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        try {
            await deleteArticle(article.id);
            alert('Article deleted successfully.');
            navigate('/articles');
        } catch (err) {
            alert('Failed to delete article.');
        }
    };
    
    // Local interactive states for the selected article
    const [likes, setLikes] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    const loadArticleComments = async (artId) => {
        if (!artId) return;
        try {
            const localKey = `knome_article_comments_${artId}`;
            const storedLocal = JSON.parse(localStorage.getItem(localKey) || '[]');

            const apiRes = await interactionsApi.getComments('Article', artId).catch(() => null);
            const apiComments = Array.isArray(apiRes) ? apiRes : (apiRes?.data || []);

            const mappedApi = apiComments.map(c => ({
                id: c.commentId || c.id,
                author: c.authorFullName || c.author?.name || c.author || 'User',
                avatar: c.authorProfilePhotoUrl ? resolveMediaUrl(c.authorProfilePhotoUrl) : (c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorFullName || 'User')}&background=6366f1&color=fff`),
                time: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (c.time || 'Recently'),
                text: c.commentText || c.text || '',
                replies: (c.replies || []).map(r => ({
                    id: r.commentId || r.id,
                    author: r.authorFullName || r.author?.name || r.author || 'User',
                    avatar: r.authorProfilePhotoUrl ? resolveMediaUrl(r.authorProfilePhotoUrl) : (r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.authorFullName || 'User')}&background=6366f1&color=fff`),
                    time: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (r.time || 'Recently'),
                    text: r.commentText || r.text || ''
                }))
            }));

            // Merge API and local comments by ID
            const mergedMap = new Map();
            [...mappedApi, ...storedLocal].forEach(c => {
                if (c && c.id) mergedMap.set(c.id, c);
            });

            const finalComments = Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);
            setComments(finalComments);
        } catch (err) {
            console.error('Failed to load article comments:', err);
        }
    };
    
    // Update state when articleId changes or article loads
    useEffect(() => {
        if (article) {
            setLikes(article.likes);
            setUserLiked(false);
            setNewComment('');
            
            // Scroll to top of page when changing articles
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Load persistent comments from API & LocalStorage
            loadArticleComments(article.id);
        }
    }, [article?.id]);

    const handleLike = () => {
        if (userLiked) {
            setLikes(prev => prev - 1);
            setUserLiked(false);
        } else {
            setLikes(prev => prev + 1);
            setUserLiked(true);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !article?.id) return;
        
        const commentText = newComment.trim();
        const authorName = currentUser?.fullName || currentUser?.name || 'You';
        const authorAvatar = currentUser?.profilePhotoUrl ? resolveMediaUrl(currentUser.profilePhotoUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff`;

        const newC = {
            id: Date.now(),
            author: authorName,
            avatar: authorAvatar,
            time: 'Just now',
            text: commentText,
            replies: []
        };
        
        // Optimistic UI update
        setComments(prev => [newC, ...prev]);
        setNewComment('');

        // Save to localStorage for instant local multi-session persistence
        try {
            const localKey = `knome_article_comments_${article.id}`;
            const storedLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
            localStorage.setItem(localKey, JSON.stringify([newC, ...storedLocal]));
        } catch (err) {}

        // Save to backend database API so other users/devices see it!
        try {
            await interactionsApi.addComment('Article', article.id, commentText);
        } catch (err) {
            console.warn('Backend comment push failed (local comment preserved):', err);
        }
    };

    const handleReplyComment = async (parentCommentId, replyText) => {
        if (!replyText || !replyText.trim() || !article?.id) return;

        const authorName = currentUser?.fullName || currentUser?.name || 'You';
        const authorAvatar = currentUser?.profilePhotoUrl ? resolveMediaUrl(currentUser.profilePhotoUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff`;

        const newReply = {
            id: Date.now(),
            author: authorName,
            avatar: authorAvatar,
            time: 'Just now',
            text: replyText.trim()
        };

        setComments(prev => prev.map(c => {
            if (c.id === parentCommentId) {
                return { ...c, replies: [...(c.replies || []), newReply] };
            }
            return c;
        }));

        try {
            const localKey = `knome_article_comments_${article.id}`;
            const storedLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
            const updatedLocal = storedLocal.map(c => {
                if (c.id === parentCommentId) {
                    return { ...c, replies: [...(c.replies || []), newReply] };
                }
                return c;
            });
            localStorage.setItem(localKey, JSON.stringify(updatedLocal));
        } catch (err) {}

        try {
            await interactionsApi.addComment('Article', article.id, replyText.trim(), parentCommentId);
        } catch (err) {}
    };

    if (isLoading) {
        return (
            <main className="flex-1 bg-white dark:bg-slate-900 min-h-full px-4 md:px-12 py-12 max-w-[800px] mx-auto border-x border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-4xl animate-spin">refresh</span>
                    <p className="text-slate-500 font-bold">Loading article...</p>
                </div>
            </main>
        );
    }

    if (!article) {
        return (
            <main className="flex-1 bg-white dark:bg-slate-900 min-h-full px-4 md:px-12 py-12 max-w-[800px] mx-auto border-x border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <p className="text-slate-500 font-bold">Article not found.</p>
            </main>
        );
    }

    // Related content excludes the current article
    const relatedArticles = articles.filter(art => art.id !== article.id).slice(0, 3);
    
    // Calculate total comments
    const totalComments = comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);

    return (
        <>
            <main className="flex-1 bg-white dark:bg-slate-900 min-h-full px-4 md:px-12 py-12 max-w-[800px] mx-auto border-x border-slate-200 dark:border-slate-800 overflow-hidden">
                {/*  Metadata Header  */}
                <header className="mb-10">
                    <nav className="flex items-center justify-between mb-6 text-slate-500">
                        <div className="flex items-center gap-2">
                            <Link className="hover:text-blue-500 font-semibold text-xs" to="/articles">Articles</Link>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-600 truncate">{article.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isSystemAdminOrAuthor && (
                                <button 
                                    onClick={handleDeleteArticle}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Delete Article"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    Delete Article
                                </button>
                            )}
                            <button
                                onClick={() => setIsReportOpen(true)}
                                className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Report Article"
                            >
                                <span className="material-symbols-outlined text-sm">report</span>
                                Report
                            </button>
                        </div>
                    </nav>
                    <h1 className="font-bold text-2xl md:text-3xl text-slate-900 dark:text-white mb-6 leading-tight">
                        {article.title}
                    </h1>
                    <div className="flex items-center justify-between border-y border-slate-200 dark:border-slate-800 py-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                                <img 
                                    className="w-full h-full object-cover" 
                                    alt={article.author.name} 
                                    src={resolveMediaUrl(article.author.avatar)} 
                                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author?.name || 'User')}&background=6366f1&color=fff&size=256`; }}
                                />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{article.author.name}</p>
                                <p className="text-xs text-slate-500">{article.author.role} {article.author.department ? `• ${article.author.department}` : ''}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">{article.date}</p>
                            <p className="text-xs text-blue-500 flex items-center justify-end gap-1 font-bold mt-1">
                                <span className="material-symbols-outlined text-sm">schedule</span> {article.readTime}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Hero Image */}
                {article.image && (
                    <figure className="mb-12 rounded-xl overflow-hidden shadow-md">
                        <img 
                            className="w-full h-[320px] md:h-[400px] object-cover" 
                            alt={article.title} 
                            src={resolveMediaUrl(article.image)} 
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200'; }}
                        />
                        {article.subtitle && (
                            <figcaption className="p-3 text-center bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
                                {article.subtitle}
                            </figcaption>
                        )}
                    </figure>
                )}

                {/*  Article Body  */}
                <article className="article-body text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed selection:bg-blue-500/10">
                    {article.content && article.content.map((block, idx) => {
                        if (block.type === 'heading') {
                            return (
                                <h2 key={idx} className="font-bold text-lg md:text-xl text-slate-900 dark:text-white mt-8 mb-4">
                                    {block.text}
                                </h2>
                            );
                        } else if (block.type === 'blockquote') {
                            return (
                                <blockquote key={idx} className="border-l-4 border-blue-500 pl-4 italic text-slate-500 my-6 bg-slate-50 dark:bg-slate-800/30 py-2 pr-4 rounded-r-lg">
                                    "{block.text}"
                                </blockquote>
                            );
                        } else {
                            return (
                                <p key={idx} className="mb-4">
                                    {block.text}
                                </p>
                            );
                        }
                    })}
                    
                    {/* Attached Documents & Media */}
                    {article.attachments && article.attachments.length > 0 && (
                        <div className="mt-8 mb-8 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-[20px]">attachment</span>
                                Attached Documents & Media ({article.attachments.length})
                            </h3>
                            <div className="space-y-4">
                                {article.attachments.map((file, idx) => {
                                    const isVideo = file.isVideo || 
                                                    file.fileType === 'Video' || 
                                                    (file.name && file.name.toLowerCase().includes('media_')) || 
                                                    (file.url && file.url.toLowerCase().match(/\.(mp4|webm|ogg|mov|m4v|mkv)$/i));

                                    if (isVideo) {
                                        const mediaUrl = resolveMediaUrl(file.url || file.rawUrl);
                                        return (
                                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white min-w-0">
                                                        <span className="material-symbols-outlined text-rose-500 text-[20px] shrink-0">play_circle</span>
                                                        <span className="truncate">{file.name || 'Uploaded Video Media'}</span>
                                                    </div>
                                                    <a
                                                        href={mediaUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                        Open Full Video
                                                    </a>
                                                </div>

                                                {/* Native HTML5 Video Player */}
                                                <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-200 dark:border-slate-800 shadow-inner">
                                                    <video
                                                        controls
                                                        controlsList="nodownload"
                                                        disablePictureInPicture
                                                        onContextMenu={(e) => e.preventDefault()}
                                                        preload="metadata"
                                                        src={mediaUrl}
                                                        className="w-full h-full object-contain"
                                                    >
                                                        Your browser does not support HTML5 video playback.
                                                    </video>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-2xl">
                                                        {file.isImage ? 'image' : 'description'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                        {file.name}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                                                        <span className="uppercase font-semibold text-slate-400">
                                                            {file.isImage ? 'Image' : 'Document'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-0.5 text-slate-500">
                                                            <span className="material-symbols-outlined text-[11px]">schedule</span>
                                                            {file.publishedDate ? new Date(file.publishedDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (article.date || 'Just now')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <a 
                                                href={resolveMediaUrl(file.url)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                View
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-12 mb-8">
                        {article.tags && article.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </article>

                {/*  Reaction Bar  */}
                <section className="border-y border-slate-200 dark:border-slate-800 py-4 my-12 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleLike} 
                            className={`flex items-center gap-2 group transition-all px-3 py-1.5 rounded-lg ${userLiked ? 'bg-blue-500/15 text-blue-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: userLiked ? "'FILL' 1" : "'FILL' 0"}}>thumb_up</span>
                            <span className="text-xs font-bold">Like</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">{likes.toLocaleString()} views • {likes} reactions</span>
                        <button className="p-2 text-slate-500 hover:text-blue-500 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">share</span>
                        </button>
                    </div>
                </section>

                {/*  Comments Section  */}
                <section>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Comments ({totalComments})</h3>
                    {/*  Comment Input  */}
                    <div className="flex gap-4 mb-10">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 border border-slate-350 overflow-hidden">
                            <img 
                                className="w-full h-full object-cover" 
                                alt="User avatar" 
                                src={currentUser?.profilePhotoUrl ? resolveMediaUrl(currentUser.profilePhotoUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullName || 'User')}&background=6366f1&color=fff`} 
                            />
                        </div>
                        <div className="flex-1">
                            <textarea 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-24 mb-3" 
                                placeholder="Add a thoughtful comment..."
                            ></textarea>
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleAddComment}
                                    className="bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-blue-600 transition-all shadow-sm"
                                >
                                    Post Comment
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-6">
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <ArticleCommentThread key={comment.id} comment={comment} onReply={handleReplyComment} currentUser={currentUser} />
                            ))
                        ) : (
                            <p className="text-center text-xs text-slate-500 py-6">No comments yet. Be the first to start the discussion!</p>
                        )}
                    </div>
                </section>
            </main>

            <aside className="hidden xl:block w-[300px] p-6 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-[calc(100vh-72px)] sticky top-[72px] overflow-y-auto">
                <div className="space-y-6">
                    {/*  Community Widget  */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">About the Community</h4>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>architecture</span>
                            </div>
                            <div>
                                <p className="font-bold text-xs text-slate-900 dark:text-white">{article.community}</p>
                                <p className="text-[10px] text-slate-500">{article.members}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            {article.communityDesc}
                        </p>
                        <button className="w-full py-2 border border-blue-500 text-blue-500 font-bold text-xs rounded-lg hover:bg-blue-500/5 transition-all">Joined</button>
                    </div>

                    {/*  Related Content  */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Related Content</h4>
                        <ul className="space-y-4">
                            {relatedArticles.length > 0 ? (
                                relatedArticles.map(art => (
                                    <li key={art.id} className="group">
                                        <Link to={`/article-view?id=${art.id}`}>
                                            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors mb-1 line-clamp-2 leading-snug">
                                                {art.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{art.readTime} • By {art.author.name}</p>
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500">No other articles available.</p>
                            )}
                        </ul>
                    </div>

                    {/*  Trending Topics  */}
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-650 uppercase tracking-widest mb-3">Trending Topics</h4>
                        <div className="flex flex-wrap gap-2">
                            {['strategy2024', 'knome_hq', 'product_ops', 'design_trends'].map(topic => (
                                <span key={topic} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    #{topic}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Report Article Modal */}
            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                targetType="Article"
                targetId={article?.id || 1}
                targetName={article?.author?.name || 'Author'}
            />
        </>
    );
}

// Thread sub-component
function ArticleCommentThread({ comment, depth = 0, onReply, currentUser }) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const replies = comment.replies || [];

    const submitReply = (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        if (onReply) {
            onReply(comment.id, replyText.trim());
        }
        setReplyText('');
        setIsReplying(false);
    };

    return (
        <div className="flex gap-4">
            <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <img className="w-full h-full object-cover" src={comment.avatar} alt={comment.author} />
            </div>
            <div className="flex-1">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 inline-block max-w-full">
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{comment.author}</span>
                        <span className="text-[10px] text-slate-500">{comment.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                        {comment.text}
                    </p>
                </div>
                
                <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-black text-slate-400">
                    <button className="hover:text-blue-500 transition-colors">Like</button>
                    {depth < 3 && (
                        <button onClick={() => setIsReplying(!isReplying)} className="hover:text-blue-500 transition-colors">Reply</button>
                    )}
                </div>

                {isReplying && (
                    <form onSubmit={submitReply} className="mt-3 relative max-w-sm">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder={`Reply to ${comment.author}...`} 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-4 pr-10 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        />
                    </form>
                )}

                {/* Replies */}
                {replies && replies.length > 0 && (
                    <div className="mt-4 space-y-4 border-l border-slate-100 dark:border-slate-800 pl-4">
                        {replies.map(reply => (
                            <ArticleCommentThread key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} currentUser={currentUser} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
