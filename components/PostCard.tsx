
import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { InterviewPost, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, Building, Star, ChevronDown, ChevronUp, Tag, 
  MessageSquare, Send, ThumbsUp, ThumbsDown, Share2, Check, 
  User, Bookmark, Copy, Crown, UserX, Lock, Zap, Heart
} from 'lucide-react';

const MAX_COMMENT_LENGTH = 300;

const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-indigo-100 text-indigo-700 px-0.5 rounded-sm no-underline font-inherit">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

interface PostCardProps {
  post: InterviewPost;
  onAddComment?: (postId: string, content: string, parentId?: string) => void;
  onVote?: (postId: string, type: 'useful' | 'useless') => void;
  onToggleFavorite?: (postId: string) => void;
  onShare?: (postId: string) => void;
  searchQuery?: string;
}

const getAvatarColor = (name: string, isPro?: boolean) => {
  if (isPro) {
    return 'bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-700 ring-2 ring-amber-100 border border-amber-300';
  }
  const colors = [
    'bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-amber-100 text-amber-600',
    'bg-green-100 text-green-600', 'bg-emerald-100 text-emerald-600', 'bg-teal-100 text-teal-600',
    'bg-cyan-100 text-cyan-600', 'bg-sky-100 text-sky-600', 'bg-blue-100 text-blue-600',
    'bg-indigo-100 text-indigo-600', 'bg-violet-100 text-violet-600', 'bg-purple-100 text-purple-600',
    'bg-fuchsia-100 text-fuchsia-600', 'bg-pink-100 text-pink-600', 'bg-rose-100 text-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const CodeBlock = ({ children, className, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const textInput = String(children).replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy code', err); }
  };

  return (
    <div className="group my-4 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <span className="text-xs font-mono text-slate-400 lowercase">{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors">
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? <span className="text-green-400">已复制</span> : <span>复制</span>}
        </button>
      </div>
      <div className="relative p-4 overflow-x-auto custom-scrollbar">
        <code className="font-mono text-slate-100 leading-relaxed" {...props}>{children}</code>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply: (postId: string, content: string, parentId?: string) => void;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, onReply, depth = 0 }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(postId, replyText, comment.id);
    setIsReplying(false);
    setReplyText('');
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length <= MAX_COMMENT_LENGTH) {
      setReplyText(e.target.value);
    }
  };

  const isRoot = depth === 0;

  return (
    <div className={`relative ${!isRoot ? 'mt-3' : 'mt-6 first:mt-0'}`}>
      <div className="flex gap-3 items-start relative z-10">
        <div className={`flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(comment.author, comment.authorIsPro)} ring-2 ring-white shadow-sm transition-all ${isRoot ? 'w-8 h-8' : 'w-6 h-6 mt-1'} relative`}>
          {comment.author.slice(0, 1).toUpperCase()}
          {comment.authorIsPro && (
             <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-[1px] shadow-sm border border-white">
                <Crown size={isRoot ? 8 : 6} className="fill-white" />
             </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border hover:border-blue-100 transition-colors ${comment.authorIsPro ? 'border-amber-100/80 bg-gradient-to-br from-white to-amber-50/30' : 'border-gray-100/80'}`}>
            <div className="flex items-baseline justify-between mb-1">
              <span className={`font-bold flex items-center gap-1 ${isRoot ? 'text-xs' : 'text-[11px]'} ${comment.authorIsPro ? 'text-amber-800' : 'text-gray-800'}`}>
                {comment.author}
                {comment.authorIsPro && <Crown size={10} className="text-yellow-500 fill-yellow-500" />}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            <div className={`text-gray-700 leading-relaxed break-words ${isRoot ? 'text-sm' : 'text-[13px]'}`}>{comment.content}</div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 ml-1">
             <button onClick={() => setIsReplying(!isReplying)} className="text-[11px] font-medium text-gray-400 hover:text-blue-600 transition-colors px-2 py-0.5 rounded-md">回复</button>
          </div>
        </div>
      </div>
      {isReplying && (
        <form onSubmit={handleReplySubmit} className={`mt-3 mb-2 flex gap-2 animate-in slide-in-from-top-1 duration-200 ${isRoot ? 'pl-11' : 'pl-9'}`}>
          <div className="flex-1 relative">
             <input 
               autoFocus 
               type="text" 
               placeholder={`回复 @${comment.author}...`} 
               className="w-full px-4 py-2 pr-16 text-xs bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-sm" 
               value={replyText} 
               onChange={handleReplyChange} 
             />
             <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold transition-colors ${replyText.length >= MAX_COMMENT_LENGTH ? 'text-red-500' : replyText.length >= MAX_COMMENT_LENGTH * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
               {replyText.length}/{MAX_COMMENT_LENGTH}
             </span>
          </div>
          <button type="submit" disabled={!replyText.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full disabled:opacity-50 transition-all shadow-sm">发送</button>
        </form>
      )}
      {comment.replies && comment.replies.length > 0 && (
         <div className={`relative mt-2 ${isRoot ? 'ml-4 pl-4' : 'ml-3 pl-3'} border-l-2 border-gray-100`}>
            {comment.replies.map(reply => ( <CommentItem key={reply.id} comment={reply} postId={postId} onReply={onReply} depth={depth + 1} /> ))}
         </div>
      )}
    </div>
  );
};

const PostCard: React.FC<PostCardProps> = ({ post, onAddComment, onVote, onToggleFavorite, onShare, searchQuery = '' }) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPremium = post.difficulty >= 3 && post.processedContent.length > 200;
  const isLocked = isPremium && !user?.isPro && post.authorId !== user?.id;

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={14} className={i < count ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
    ));
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(post.id, commentText);
    setCommentText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_COMMENT_LENGTH) {
      setCommentText(value);
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
  };

  const handleShare = async () => {
    onShare?.(post.id);
    const shareData = {
      title: post.title,
      text: `【OfferMagnet】${post.company} ${post.role} 面经分享：${post.title}`,
      url: window.location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) { console.error('Share failed:', err); }
  };

  const countComments = (comments: Comment[]): number => {
    return comments.reduce((acc, comment) => acc + 1 + (comment.replies ? countComments(comment.replies) : 0), 0);
  };
  const totalComments = countComments(post.comments);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative group/card">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.(post.id);
        }}
        className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${post.isFavorited ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-slate-50/80 text-slate-400 hover:bg-white hover:text-indigo-500 hover:shadow-sm opacity-0 group-hover/card:opacity-100'}`}
        title={post.isFavorited ? "取消收藏" : "加入收藏"}
      >
        <Bookmark size={18} className={post.isFavorited ? 'fill-white' : ''} />
      </button>

      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-10">
            <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-1">
              <Building size={14} /> <span><HighlightText text={post.company} query={searchQuery} /></span>
              <span className="text-gray-300">|</span>
              <Briefcase size={14} /> <span><HighlightText text={post.role} query={searchQuery} /></span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 leading-tight group-hover/card:text-blue-600 transition-colors">
              <HighlightText text={post.title} query={searchQuery} />
            </h3>
          </div>
          
          <div className="flex flex-col items-end shrink-0 gap-1.5">
             <div className="flex gap-1.5 mb-0.5">
                {post.isAnonymous && (
                  <div className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-gray-200">
                    <UserX size={10} /> 匿名
                  </div>
                )}
                {post.authorIsPro && (
                  <div className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-200 shadow-sm">
                    <Crown size={10} className="fill-amber-700" /> PRO
                  </div>
                )}
             </div>
             <div className="flex items-center gap-0.5">{renderStars(post.difficulty)}</div>
             <span className="text-xs text-gray-400 font-medium">{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-50 text-gray-400 border border-gray-100 uppercase">
                   <Tag size={10} className="mr-1" /> {tag}
                </span>
            ))}
        </div>

        <div className={`prose prose-sm prose-slate max-w-none text-gray-600 relative ${expanded ? '' : 'max-h-40 overflow-hidden'}`}>
             {isLocked ? (
               <div className="space-y-4">
                  <p className="blur-[4px] select-none">{post.processedContent.substring(0, 150)}...</p>
                  <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                     <Lock size={20} className="text-indigo-600 mb-4" />
                     <h4 className="text-sm font-bold text-gray-900 mb-1 text-center">内容已锁定</h4>
                     <p className="text-xs text-gray-500 mb-4 max-w-[240px]">升级 Pro 或发布高质量面经即可永久解锁。</p>
                  </div>
               </div>
             ) : (
               <>
                 <ReactMarkdown components={{
                     h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-800 mt-6 mb-3 flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:bg-blue-500 before:rounded-full" {...props} />,
                     code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isBlock = !inline && (match || (String(children).includes('\n')));
                        return isBlock ? <CodeBlock className={className} children={children} {...props} /> : <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                     }
                 }}>
                     {post.processedContent}
                 </ReactMarkdown>
                 {!expanded && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>}
               </>
             )}
        </div>

        {!isLocked && (
          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-gray-50 pt-4 gap-2">
              <button onClick={() => setExpanded(!expanded)} className="flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                {expanded ? <>收起 <ChevronUp size={16} className="ml-1" /></> : <>阅读全文 <ChevronDown size={16} className="ml-1" /></>}
              </button>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={() => onVote?.(post.id, 'useful')} className={`flex items-center gap-1 transition-colors ${post.userVote === 'useful' ? 'text-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'}`}>
                    <ThumbsUp size={16} className={post.userVote === 'useful' ? 'fill-green-100' : ''} />
                    <span>{post.usefulVotes}</span>
                  </button>
                  <div className="w-px h-3 bg-gray-200"></div>
                  <button onClick={() => onVote?.(post.id, 'useless')} className={`flex items-center gap-1 transition-colors ${post.userVote === 'useless' ? 'text-red-500 font-bold' : 'text-gray-400 hover:text-gray-600'}`}>
                    <ThumbsDown size={16} className={post.userVote === 'useless' ? 'fill-red-50' : ''} />
                    <span>{post.uselessVotes}</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowComments(!showComments)} className={`flex items-center text-sm font-bold transition-colors ${showComments ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                     <MessageSquare size={16} className="mr-1.5" /> {totalComments}
                  </button>
                  <button onClick={handleShare} className="text-gray-500 hover:text-gray-700"><Share2 size={16} /></button>
                </div>
              </div>
          </div>
        )}
      </div>
      
      {showComments && (
        <div className="bg-slate-50/80 border-t border-gray-100">
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmitComment} className="flex gap-3 items-end">
              <div className="flex-1 relative">
                  <textarea 
                    ref={textareaRef} 
                    placeholder="写下你的看法..." 
                    className="w-full min-h-[46px] max-h-32 py-3 px-4 pr-16 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-300 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 transition-all resize-none" 
                    rows={1} 
                    value={commentText} 
                    onChange={handleInput} 
                  />
                  <div className="absolute right-12 bottom-3.5 pointer-events-none">
                    <span className={`text-[10px] font-bold transition-colors ${commentText.length >= MAX_COMMENT_LENGTH ? 'text-red-500' : 'text-gray-300'}`}>
                      {commentText.length}/{MAX_COMMENT_LENGTH}
                    </span>
                  </div>
                  <button type="submit" className="absolute right-2 bottom-2 p-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all" disabled={!commentText.trim()}>
                    <Send size={15} />
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
