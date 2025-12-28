import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { InterviewPost, Comment } from '../types';
import { Briefcase, Building, Star, ChevronDown, ChevronUp, Tag, MessageSquare, Send, ThumbsUp, ThumbsDown, Share2, Check, User, Bookmark, CornerDownRight, Copy, Crown } from 'lucide-react';

interface PostCardProps {
  post: InterviewPost;
  onAddComment?: (postId: string, content: string, parentId?: string) => void;
  onVote?: (postId: string, type: 'useful' | 'useless') => void;
  onToggleFavorite?: (postId: string) => void;
}

const getAvatarColor = (name: string, isPro?: boolean) => {
  if (isPro) {
    return 'bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-700 ring-2 ring-amber-100 border border-amber-300';
  }
  const colors = [
    'bg-red-100 text-red-600',
    'bg-orange-100 text-orange-600',
    'bg-amber-100 text-amber-600',
    'bg-green-100 text-green-600',
    'bg-emerald-100 text-emerald-600',
    'bg-teal-100 text-teal-600',
    'bg-cyan-100 text-cyan-600',
    'bg-sky-100 text-sky-600',
    'bg-blue-100 text-blue-600',
    'bg-indigo-100 text-indigo-600',
    'bg-violet-100 text-violet-600',
    'bg-purple-100 text-purple-600',
    'bg-fuchsia-100 text-fuchsia-600',
    'bg-pink-100 text-pink-600',
    'bg-rose-100 text-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// --- Sub-components ---

// Enhanced Code Block Component with Copy Button
const CodeBlock = ({ children, className, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const textInput = String(children).replace(/\n$/, '');
  
  // Extract language from class name (e.g. "language-javascript" -> "javascript")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  return (
    <div className="group my-4 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <span className="text-xs font-mono text-slate-400 lowercase">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
          title="复制"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? <span className="text-green-400">已复制</span> : <span>复制</span>}
        </button>
      </div>
      <div className="relative p-4 overflow-x-auto custom-scrollbar">
        <code className="font-mono text-slate-100 leading-relaxed" {...props}>
          {children}
        </code>
      </div>
    </div>
  );
};

// Recursive Comment Component with Optimized UI
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

  const isRoot = depth === 0;

  return (
    <div className={`relative ${!isRoot ? 'mt-3' : 'mt-6 first:mt-0'}`}>
      
      <div className="flex gap-3 items-start relative z-10">
        {/* Avatar */}
        <div className={`flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(comment.author, comment.authorIsPro)} ring-2 ring-white shadow-sm transition-all ${isRoot ? 'w-8 h-8' : 'w-6 h-6 mt-1'} relative`}>
          {comment.author.slice(0, 1).toUpperCase()}
          {comment.authorIsPro && (
             <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-[1px] shadow-sm border border-white">
                <Crown size={isRoot ? 8 : 6} className="fill-white" />
             </div>
          )}
        </div>
        
        {/* Content Wrapper */}
        <div className="flex-1 min-w-0">
          <div className={`bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border hover:border-blue-100 transition-colors ${comment.authorIsPro ? 'border-amber-100/80 bg-gradient-to-br from-white to-amber-50/30' : 'border-gray-100/80'}`}>
            <div className="flex items-baseline justify-between mb-1">
              <span className={`font-bold flex items-center gap-1 ${isRoot ? 'text-xs' : 'text-[11px]'} ${comment.authorIsPro ? 'text-amber-800' : 'text-gray-800'}`}>
                {comment.author}
                {comment.authorIsPro && <Crown size={10} className="text-yellow-500 fill-yellow-500" />}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className={`text-gray-700 leading-relaxed break-words ${isRoot ? 'text-sm' : 'text-[13px]'}`}>
              {comment.content}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 ml-1">
             <button 
               onClick={() => setIsReplying(!isReplying)}
               className="text-[11px] font-medium text-gray-400 hover:text-blue-600 transition-colors cursor-pointer hover:bg-blue-50 px-2 py-0.5 rounded-md"
             >
               回复
             </button>
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {isReplying && (
        <form onSubmit={handleReplySubmit} className={`mt-3 mb-2 flex gap-2 animate-in slide-in-from-top-1 duration-200 ${isRoot ? 'pl-11' : 'pl-9'}`}>
          <div className="flex-1 relative">
             <input 
               autoFocus
               type="text"
               placeholder={`回复 @${comment.author}...`}
               className="w-full px-4 py-2 text-xs bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-sm"
               value={replyText}
               onChange={(e) => setReplyText(e.target.value)}
             />
          </div>
          <button 
             type="submit"
             disabled={!replyText.trim()}
             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full disabled:opacity-50 transition-all shadow-sm active:scale-95"
          >
             发送
          </button>
        </form>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
         <div className={`relative mt-2 ${isRoot ? 'ml-4 pl-4' : 'ml-3 pl-3'} border-l-2 border-gray-100`}>
            {comment.replies.map(reply => (
               <CommentItem 
                 key={reply.id} 
                 comment={reply} 
                 postId={postId} 
                 onReply={onReply} 
                 depth={depth + 1} 
               />
            ))}
         </div>
      )}
    </div>
  );
};


const PostCard: React.FC<PostCardProps> = ({ post, onAddComment, onVote, onToggleFavorite }) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        className={i < count ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
      />
    ));
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(post.id, commentText);
    setCommentText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment(e as unknown as React.FormEvent);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: `【OfferMagnet】${post.company} ${post.role} 面经分享：${post.title}`,
      url: window.location.href // In a real app, this would be a permalink like `/post/${post.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Helper function to count all comments recursively
  const countComments = (comments: Comment[]): number => {
    return comments.reduce((acc, comment) => {
      return acc + 1 + (comment.replies ? countComments(comment.replies) : 0);
    }, 0);
  };

  const totalComments = countComments(post.comments);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative">
      {/* Pro Badge for Post */}
      {post.authorIsPro && (
         <div className="absolute top-0 right-0 p-6 z-10 pointer-events-none">
            <div className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg border border-amber-200 shadow-sm flex items-center gap-1">
               <Crown size={10} className="fill-amber-700" /> PRO
            </div>
         </div>
      )}

      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-1">
              <Building size={14} />
              <span>{post.company}</span>
              <span className="text-gray-300">|</span>
              <Briefcase size={14} />
              <span>{post.role}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 leading-tight pr-10">{post.title}</h3>
          </div>
          <div className="flex flex-col items-end pt-1">
             <div className="flex items-center gap-1 mb-1" title={`难度系数: ${post.difficulty}/5`}>
                {renderStars(post.difficulty)}
             </div>
             <span className="text-xs text-gray-400 font-medium">
               {new Date(post.createdAt).toLocaleDateString('zh-CN')}
             </span>
             {/* Author Name */}
             <span className={`text-[10px] mt-1 font-medium flex items-center gap-1 ${post.authorIsPro ? 'text-amber-600' : 'text-gray-400'}`}>
                {post.authorIsPro && <Crown size={10} className="fill-amber-500" />}
                @{post.authorName || '匿名'}
             </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                   <Tag size={10} className="mr-1" /> {tag}
                </span>
            ))}
        </div>

        {/* Markdown Content Area */}
        <div className={`prose prose-sm prose-slate max-w-none text-gray-600 relative ${expanded ? '' : 'max-h-40 overflow-hidden'}`}>
             <ReactMarkdown
               components={{
                 // Custom styling for specific markdown elements
                 h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-800 mt-4 mb-2" {...props} />,
                 h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-800 mt-3 mb-2" {...props} />,
                 h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-800 mt-2 mb-1" {...props} />,
                 ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                 li: ({node, ...props}) => <li className="marker:text-blue-500" {...props} />,
                 p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                 code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    // Determine if it is a block code based on 'inline' prop, className presence or newlines
                    const isBlock = !inline && (match || (String(children).includes('\n')));
                    
                    if (isBlock) {
                       return <CodeBlock className={className} children={children} {...props} />;
                    }
                    return <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200" {...props}>{children}</code>;
                 },
                 pre: ({node, ...props}) => <pre className="bg-transparent p-0 m-0" {...props} />, // Remove default pre styling
                 blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-500 my-4 bg-blue-50/50 py-2 rounded-r-lg" {...props} />,
               }}
             >
                 {post.processedContent}
             </ReactMarkdown>

             {!expanded && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
             )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-gray-50 pt-4 gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors z-10"
            >
              {expanded ? (
                <>收起 <ChevronUp size={16} className="ml-1" /></>
              ) : (
                <>阅读全文 <ChevronDown size={16} className="ml-1" /></>
              )}
            </button>
            
            <div className="flex items-center gap-4">
              {/* Voting Section */}
              <div className="flex items-center gap-2 text-sm">
                <button 
                  onClick={() => onVote?.(post.id, 'useful')}
                  className={`flex items-center gap-1 transition-colors ${post.userVote === 'useful' ? 'text-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                  title="有用"
                >
                  <ThumbsUp size={16} className={post.userVote === 'useful' ? 'fill-green-100' : ''} />
                  <span>{post.usefulVotes}</span>
                </button>
                <div className="w-px h-3 bg-gray-200"></div>
                <button 
                  onClick={() => onVote?.(post.id, 'useless')}
                  className={`flex items-center gap-1 transition-colors ${post.userVote === 'useless' ? 'text-red-500 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                  title="无用"
                >
                  <ThumbsDown size={16} className={post.userVote === 'useless' ? 'fill-red-50' : ''} />
                  <span>{post.uselessVotes}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowComments(!showComments)}
                  className={`flex items-center text-sm font-medium transition-colors ${showComments ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="评论"
                >
                   <MessageSquare size={16} className="mr-1.5" />
                   {totalComments}
                </button>

                <button 
                  onClick={handleShare}
                  className={`flex items-center text-sm font-medium transition-colors ${copied ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="分享"
                >
                   {copied ? <Check size={16} className="mr-1.5" /> : <Share2 size={16} className="mr-1.5" />}
                   {copied ? '已复制' : '分享'}
                </button>

                <button 
                  onClick={() => onToggleFavorite?.(post.id)}
                  className={`flex items-center text-sm font-medium transition-colors ${post.isFavorited ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title={post.isFavorited ? "取消收藏" : "收藏"}
                >
                   <Bookmark size={16} className={`mr-1.5 ${post.isFavorited ? 'fill-indigo-600' : ''}`} />
                   {post.isFavorited ? '已收藏' : '收藏'}
                </button>
              </div>
            </div>
        </div>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="bg-slate-50/80 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
          <div className="p-5 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            {post.comments.length > 0 ? (
              post.comments.map(comment => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  postId={post.id} 
                  onReply={(pid, content, parentId) => onAddComment && onAddComment(pid, content, parentId)} 
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                      <MessageSquare size={24} />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">暂无评论</p>
                  <p className="text-xs text-gray-400 mt-1">成为第一个分享看法的人吧！</p>
              </div>
            )}
          </div>
          
          {/* Main Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmitComment} className="flex gap-3 items-end">
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mb-1.5">
                 <User size={18} />
              </div>
              <div className="flex-1 relative group">
                  <textarea 
                    ref={textareaRef}
                    placeholder="写下你的看法..."
                    className="w-full min-h-[46px] max-h-32 py-3 pl-4 pr-12 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-300 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 transition-all resize-none overflow-hidden placeholder:text-gray-400"
                    rows={1}
                    value={commentText}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                  />
                  <button 
                    type="submit"
                    disabled={!commentText.trim()}
                    className="absolute right-2 bottom-2 p-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-0 disabled:scale-75 transition-all duration-200 shadow-sm"
                  >
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