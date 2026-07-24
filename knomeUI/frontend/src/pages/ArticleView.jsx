import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getArticles } from '../utils/articleService';

export default function ArticleView() {
    const location = useLocation();
    
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
    
    // Local interactive states for the selected article
    const [likes, setLikes] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    
    // Update state when articleId changes or article loads
    useEffect(() => {
        if (article) {
            setLikes(article.likes);
            setUserLiked(false);
            setComments(article.comments || []);
            setNewComment('');
            
            // Scroll to top of page when changing articles
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        const newC = {
            id: Date.now(),
            author: 'You',
            avatar: 'https://ui-avatars.com/api/?name=You&background=6366f1&color=fff',
            time: 'Just now',
            text: newComment.trim(),
            replies: []
        };
        
        setComments([newC, ...comments]);
        setNewComment('');
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
                    <nav className="flex items-center gap-2 mb-6 text-slate-500">
                        <Link className="hover:text-blue-500 font-semibold text-xs" to="/articles">Articles</Link>
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-600 truncate">{article.category}</span>
                    </nav>
                    <h1 className="font-bold text-2xl md:text-3xl text-slate-900 dark:text-white mb-6 leading-tight">
                        {article.title}
                    </h1>
                    <div className="flex items-center justify-between border-y border-slate-200 dark:border-slate-800 py-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                                <img className="w-full h-full object-cover" alt={article.author.name} src={article.author.avatar} />
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

                {/*  Hero Image  */}
                <figure className="mb-12 rounded-xl overflow-hidden shadow-md">
                    <img className="w-full h-[320px] md:h-[400px] object-cover" alt={article.title} src={article.image} />
                    <figcaption className="p-3 text-center bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
                        {article.subtitle}
                    </figcaption>
                </figure>

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
                    
                    <div className="flex flex-wrap gap-2 mt-12 mb-8">
                        {article.tags && article.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                                {tag}
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
                        <button className="flex items-center gap-2 group hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg">
                            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 duration-200" style={{fontVariationSettings: "'FILL' 1", color: '#14B8A6'}}>celebration</span>
                            <span className="text-xs font-bold">Celebrate</span>
                        </button>
                        <button className="flex items-center gap-2 group hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg">
                            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1", color: '#6366F1'}}>psychology</span>
                            <span className="text-xs font-bold">Insight</span>
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
                            <img className="w-full h-full object-cover" alt="User avatar" src="https://ui-avatars.com/api/?name=You&background=6366f1&color=fff" />
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
                                <ArticleCommentThread key={comment.id} comment={comment} />
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
        </>
    );
}

// Thread sub-component
function ArticleCommentThread({ comment, depth = 0 }) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replies, setReplies] = useState(comment.replies || []);

    const submitReply = (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        const newReply = {
            id: Date.now(),
            author: 'You',
            avatar: 'https://ui-avatars.com/api/?name=You&background=6366f1&color=fff',
            time: 'Just now',
            text: replyText.trim()
        };

        setReplies([...replies, newReply]);
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
                            <ArticleCommentThread key={reply.id} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
