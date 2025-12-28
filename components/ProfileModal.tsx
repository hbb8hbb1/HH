import React, { useState } from 'react';
import { User, InterviewPost } from '../types';
import { X, LogOut, Heart, FileText, Building, Calendar, Star, ArrowRight, ArrowUpDown } from 'lucide-react';

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

  // Determine which posts to display based on active tab
  let displayPosts: InterviewPost[] = [];

  if (activeTab === 'favorites') {
    // Sort favorites by favoritedAt time
    displayPosts = [...favoritedPosts].sort((a, b) => {
      // Handle missing dates by treating them as old
      const timeA = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
      const timeB = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
      
      if (sortOrder === 'newest') {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });
  } else {
    // For "My Posts", typically user wants to see newest created first
    displayPosts = [...myPosts].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const toggleSort = () => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header / User Info */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white text-blue-600 flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-white/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-blue-100 opacity-90 text-sm mt-1">{user.email}</p>
              <div className="flex gap-4 mt-4">
                 <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10">
                    <Heart size={12} className="fill-white" />
                    <span>{favoritedPosts.length} 收藏</span>
                 </div>
                 <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10">
                    <FileText size={12} />
                    <span>{myPosts.length} 发布</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-4 text-sm font-semibold text-center transition-colors relative ${
              activeTab === 'favorites' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            我的收藏
            {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
          <button
            onClick={() => setActiveTab('myposts')}
            className={`flex-1 py-4 text-sm font-semibold text-center transition-colors relative ${
              activeTab === 'myposts' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            我的发布
            {activeTab === 'myposts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 custom-scrollbar">
           {/* Sorting Control (Only for favorites tab) */}
           {activeTab === 'favorites' && displayPosts.length > 0 && (
              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-xs font-medium text-gray-400">共 {displayPosts.length} 条收藏</span>
                <button 
                  onClick={toggleSort}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors bg-white px-2 py-1 rounded-md border border-gray-200 hover:border-blue-200"
                >
                  <ArrowUpDown size={12}/>
                  {sortOrder === 'newest' ? '最近收藏' : '最早收藏'}
                </button>
              </div>
           )}

           {displayPosts.length > 0 ? (
             <div className="space-y-3">
               {displayPosts.map(post => (
                 <div 
                   key={post.id} 
                   onClick={() => onViewPost(post.id)}
                   title="点击查看详情"
                   className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                 >
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{post.title}</h3>
                       <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                       <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                         <Building size={12} />
                         {post.company}
                       </div>
                       <span className="text-gray-400">|</span>
                       <span>{post.role}</span>
                       <span className="text-gray-400">|</span>
                       <div className="flex items-center text-yellow-500 gap-0.5">
                         <Star size={10} className="fill-yellow-500" />
                         <span className="text-gray-500">{post.difficulty}</span>
                       </div>
                       
                       {/* Show favorited time for Favorites tab, created time for My Posts */}
                       <div className="ml-auto text-gray-400 font-medium">
                         {activeTab === 'favorites' && post.favoritedAt 
                            ? `收藏于 ${new Date(post.favoritedAt).toLocaleDateString()}` 
                            : new Date(post.createdAt).toLocaleDateString()}
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-10">
               <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                 {activeTab === 'favorites' ? <Heart size={24} className="text-gray-400" /> : <FileText size={24} className="text-gray-400" />}
               </div>
               <p className="text-sm font-medium text-gray-500">
                 {activeTab === 'favorites' ? '还没有收藏任何面经' : '还没有发布过面经'}
               </p>
               <p className="text-xs text-gray-400 mt-1">
                 {activeTab === 'favorites' ? '去首页逛逛，发现好内容' : '分享你的第一次面试经历吧'}
               </p>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-2.5 rounded-xl font-medium transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;