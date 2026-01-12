
import React, { useState } from 'react';
import { User, InterviewPost, Comment } from '../types';
import { 
  X, LogOut, Heart, FileText, Building, Calendar, Star, 
  ArrowRight, ArrowUpDown, ThumbsUp, MessageSquare, 
  ChevronRight, Award, Zap
} from 'lucide-react';

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  posts: InterviewPost[];
  onViewPost: (postId: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onLogout, posts, onViewPost }) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'myposts'>('favorites');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  if (!isOpen) return null;

  const favoritedPosts = posts.filter(p => p.isFavorited);
  const myPosts = posts.filter(p => p.authorId === user.id);

  // Helper to count total comments including nested replies
  const getTotalComments = (comments: Comment[]): number => {
    return comments.reduce((acc, comment) => {
      return acc + 1 + (comment.replies ? getTotalComments(comment.replies) : 0);
    }, 0);
  };

  // Determine which posts to display based on active tab
  let displayPosts: InterviewPost[] = [];

  if (activeTab === 'favorites') {
    displayPosts = [...favoritedPosts].sort((a, b) => {
      const timeA = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
      const timeB = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  } else {
    displayPosts = [...myPosts].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const toggleSort = () => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header / User Info */}
        <div className="bg-slate-900 p-8 text-white relative flex-shrink-0 overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -right-10 -top-10 w-40 h-40 border-4 border-white rounded-full"></div>
            <div className="absolute right-20 bottom-0 w-20 h-20 border-2 border-white rounded-full"></div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all z-10"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-2xl border-2 border-white/20 transform -rotate-3 transition-transform hover:rotate-0 duration-300 ${user.isPro ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' : 'bg-white text-slate-900'}`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">{user.name}</h2>
                {user.isPro && (
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter">
                    <Award size={10} className="fill-amber-950" /> Pro
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1 font-medium">{user.email}</p>
              
              <div className="flex gap-3 mt-4">
                 <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 backdrop-blur-sm">
                    <Heart size={14} className="text-pink-400 fill-pink-400/20" />
                    <span>{favoritedPosts.length} 收藏</span>
                 </div>
                 <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 backdrop-blur-sm">
                    <FileText size={14} className="text-blue-400" />
                    <span>{myPosts.length} 发布</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest text-center transition-all relative ${
              activeTab === 'favorites' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            我的收藏
            {activeTab === 'favorites' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-900 rounded-full"></div>}
          </button>
          <button
            onClick={() => setActiveTab('myposts')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest text-center transition-all relative ${
              activeTab === 'myposts' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            我的发布
            {activeTab === 'myposts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-900 rounded-full"></div>}
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar">
           {displayPosts.length > 0 && (
              <div className="flex justify-between items-center mb-5 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeTab === 'favorites' ? 'Saved Collections' : 'Your Contributions'} ({displayPosts.length})
                </span>
                <button 
                  onClick={toggleSort}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                >
                  <ArrowUpDown size={12}/>
                  {sortOrder === 'newest' ? '最新优先' : '最早优先'}
                </button>
              </div>
           )}

           {displayPosts.length > 0 ? (
             <div className="space-y-4">
               {displayPosts.map(post => {
                 const commentCount = getTotalComments(post.comments);
                 return (
                   <div 
                     key={post.id} 
                     onClick={() => onViewPost(post.id)}
                     className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 hover:-translate-y-1 transition-all cursor-pointer group flex items-start gap-4"
                   >
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-2">
                            <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              <Building size={14} />
                            </div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-tighter truncate">{post.company} · {post.role}</span>
                         </div>
                         
                         <h3 className="font-extrabold text-slate-800 text-lg mb-3 line-clamp-1 group-hover:text-slate-950 transition-colors">
                           {post.title}
                         </h3>
                         
                         <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 group-hover:bg-white transition-colors">
                               <Star size={12} className="text-amber-400 fill-amber-400" />
                               <span>{post.difficulty}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-green-600 transition-colors">
                                  <ThumbsUp size={14} />
                                  <span>{post.usefulVotes}</span>
                               </div>
                               <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                                  <MessageSquare size={14} />
                                  <span>{commentCount}</span>
                               </div>
                            </div>

                            <div className="ml-auto text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md">
                              {activeTab === 'favorites' && post.favoritedAt 
                                 ? new Date(post.favoritedAt).toLocaleDateString() 
                                 : new Date(post.createdAt).toLocaleDateString()}
                            </div>
                         </div>
                      </div>
                      <div className="self-center p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:translate-x-1">
                         <ChevronRight size={18} />
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-10">
               <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                 {activeTab === 'favorites' ? <Heart size={32} strokeWidth={1.5} /> : <FileText size={32} strokeWidth={1.5} />}
               </div>
               <p className="text-lg font-black text-slate-900 mb-1">
                 {activeTab === 'favorites' ? '暂无收藏' : '暂无发布'}
               </p>
               <p className="text-sm text-slate-400 font-medium max-w-[200px] text-center">
                 {activeTab === 'favorites' ? '遇到有用的面试经验，记得点一下收藏哦' : '分享你的面试心得，帮助他人的同时也提升自己的影响力'}
               </p>
               {activeTab === 'myposts' && (
                  <button className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-slate-200 hover:-translate-y-1 transition-all flex items-center gap-2">
                     <Zap size={16} className="fill-amber-400 text-amber-400" /> 开始第一次分享
                  </button>
               )}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-3.5 rounded-2xl font-black text-sm transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={18} />
            退出账号
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
