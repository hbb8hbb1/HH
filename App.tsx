import React, { useState, useEffect } from 'react';
import { PenTool, Search, Filter, LayoutGrid, Github, ArrowUpDown, ChevronDown, LogIn, LogOut, User as UserIcon, Crown, Zap, Briefcase, Plus, Menu } from 'lucide-react';
import PostCard from './components/PostCard';
import JobCard from './components/JobCard';
import EditorModal from './components/EditorModal';
import JobEditorModal from './components/JobEditorModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import SubscriptionModal from './components/SubscriptionModal';
import Sidebar from './components/Sidebar';
import { InterviewPost, ProcessedResponse, Comment, JobPost, JobType } from './types';
import { useAuth } from './context/AuthContext';

// Initial Mock Data for Interviews
const INITIAL_POSTS: InterviewPost[] = [
  {
    id: '1',
    title: 'Google 谷歌前端 L4 现场面试复盘',
    originalContent: 'Original raw text...',
    processedContent: `## 电话面试
HR在LinkedIn上联系的我。初步沟通主要是一些标准的行为问题（Behavioral Questions），了解我的过去经历。

## 技术一轮
重点考察 JavaScript 基础（闭包、事件循环）以及一道中等难度的 LeetCode 题目，关于二叉树的遍历。

## 现场面试 (Onsite)
1. **系统设计**: 设计一个类似 News Feed 的系统。
2. **代码题**: 动态规划问题，类似于 "Word Break"。
3. **行为面试**: 使用 STAR 法则详细讨论了过去的一个项目挑战。`,
    company: 'Google',
    role: '前端工程师',
    difficulty: 4,
    tags: ['系统设计', 'JavaScript', '动态规划'],
    comments: [
      {
        id: 'c1',
        author: '路人甲',
        content: '楼主，请问系统设计那轮具体的 QPS 假设是多少？',
        createdAt: new Date(Date.now() - 10000000).toISOString(),
        replies: [
           {
             id: 'c1-r1',
             author: '匿名用户', // Author replying
             authorIsPro: true, // Mock pro user
             content: '当时面试官给的假设是 100M DAU，读写比 100:1。',
             createdAt: new Date(Date.now() - 9000000).toISOString(),
             replies: []
           }
        ]
      }
    ],
    createdAt: new Date().toISOString(),
    usefulVotes: 32,
    uselessVotes: 1,
    userVote: 'useful',
    isFavorited: true,
    favoritedAt: new Date().toISOString(), // Initial favorite timestamp
    authorName: '匿名用户',
    authorIsPro: true
  },
  {
    id: '2',
    title: '字节跳动后端开发 - 飞书部门',
    originalContent: '...',
    processedContent: `## 笔试
两道题目，一道是简单的数组操作，另一道是较难的图论题目。

## 面试流程
一共经历了4轮面试。非常注重基础，特别是计算机网络和操作系统。
每一轮都会手写代码，要求 Bug Free。

## 建议
刷题要扎实。Bar Raiser 环节会深挖你的项目细节，特别是遇到分歧时如何处理。`,
    company: 'ByteDance',
    role: '后端开发工程师',
    difficulty: 5,
    tags: ['计算机网络', '图论', '操作系统'],
    comments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    usefulVotes: 15,
    uselessVotes: 0,
    isFavorited: false,
    authorName: 'Offer收割机',
    authorIsPro: false
  },
  {
    id: '3',
    title: '美团外卖 Java 工程师一面',
    originalContent: '...',
    processedContent: `## 基础知识
聊了很多 JVM 内存模型，垃圾回收算法（CMS vs G1）。
HashMap 的源码细节，扩容机制，红黑树转化的阈值等。

## 框架
Spring Boot 的启动流程，Bean 的生命周期。

## 算法
手写 LRU Cache。`,
    company: 'Meituan',
    role: 'Java 工程师',
    difficulty: 3,
    tags: ['Java', 'JVM', 'Spring'],
    comments: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    usefulVotes: 8,
    uselessVotes: 0,
    isFavorited: false,
    authorName: 'JavaBoy',
    authorIsPro: false
  }
];

// Initial Mock Data for Jobs
const INITIAL_JOBS: JobPost[] = [
  {
    id: 'j1',
    title: '资深前端工程师 (React/Vue)',
    company: '字节跳动',
    role: '前端开发',
    location: '北京 / 上海',
    salaryRange: '30k-60k',
    type: 'social',
    description: `### 职位描述
1. 负责字节跳动核心产品的前端研发工作；
2. 参与高性能、高可用性的前端架构设计与实现；
3. 探索前端前沿技术，提升团队技术影响力。

### 职位要求
1. 5年以上前端开发经验，精通 React/Vue 等主流框架；
2. 对前端工程化、性能优化有深入理解；
3. 有大型复杂项目架构设计经验者优先。`,
    tags: ['React', 'TypeScript', '架构设计'],
    applyLink: 'https://jobs.bytedance.com',
    createdAt: new Date().toISOString(),
    authorName: 'ByteHR',
    authorIsPro: true
  },
   {
    id: 'j2',
    title: '2025届秋招 - 后端开发管培生',
    company: '美团',
    role: '后端开发',
    location: '北京',
    salaryRange: '22k-35k',
    type: 'campus',
    description: `### 岗位职责
参与美团外卖、优选等核心业务的后台系统建设，负责高并发场景下的系统设计与开发。

### 岗位要求
1. 2025届毕业生，计算机相关专业本科及以上学历；
2. 扎实的计算机基础，熟悉 Java/C++/Go 任一语言；
3. 热爱技术，有良好的学习能力和沟通协作能力。`,
    tags: ['Java', '高并发', '校招'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    authorName: '美团校招',
    authorIsPro: true
  },
  {
    id: 'j3',
    title: 'AI 算法实习生 (LLM方向)',
    company: 'Minimax',
    role: '算法工程师',
    location: '上海',
    salaryRange: '400-600/天',
    type: 'intern',
    description: `### 工作内容
1. 参与大语言模型的预训练、微调及强化学习算法研究；
2. 跟踪 NLP 领域最新论文，复现并改进算法。

### 要求
1. 计算机、数学等相关专业硕士/博士在读；
2. 熟悉 PyTorch，有 NLP 相关项目经验；
3. 至少实习 3 个月以上。`,
    tags: ['LLM', 'NLP', 'PyTorch'],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    authorName: 'Minimax Tech',
    authorIsPro: false
  }
];

function App() {
  const [posts, setPosts] = useState<InterviewPost[]>(INITIAL_POSTS);
  const [jobs, setJobs] = useState<JobPost[]>(INITIAL_JOBS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'interviews' | 'jobs'>('interviews');
  
  // Filters
  const [activeFilter, setActiveFilter] = useState('all'); // for interviews
  const [activeJobFilter, setActiveJobFilter] = useState<'all' | 'social' | 'campus' | 'intern'>('all'); // for jobs

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  const { user, logout } = useAuth();

  // --- Handlers for Interviews ---

  const handleSavePost = (processedData: ProcessedResponse, original: string) => {
    const newPost: InterviewPost = {
      id: Date.now().toString(),
      ...processedData,
      originalContent: original,
      comments: [],
      createdAt: new Date().toISOString(),
      usefulVotes: 0,
      uselessVotes: 0,
      authorId: user?.id || 'anonymous',
      authorName: user?.name || '匿名用户',
      authorIsPro: user?.isPro
    };
    setPosts([newPost, ...posts]);
    setIsModalOpen(false);
  };

  const handleAddComment = (postId: string, content: string, parentId?: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const newComment: Comment = {
      id: Date.now().toString(),
      author: user.name,
      authorIsPro: user.isPro,
      content,
      createdAt: new Date().toISOString(),
      replies: []
    };

    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      
      if (parentId) {
        // Helper to find and update nested comments
        const updateReplies = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), newComment] };
            }
            if (c.replies) {
              return { ...c, replies: updateReplies(c.replies) };
            }
            return c;
          });
        };
        return { ...post, comments: updateReplies(post.comments) };
      }
      
      return { ...post, comments: [...post.comments, newComment] };
    }));
  };

  const handleVote = (postId: string, type: 'useful' | 'useless') => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      
      // Toggle logic
      if (post.userVote === type) {
        // Cancel vote
        return {
          ...post,
          userVote: undefined,
          usefulVotes: type === 'useful' ? post.usefulVotes - 1 : post.usefulVotes,
          uselessVotes: type === 'useless' ? post.uselessVotes - 1 : post.uselessVotes
        };
      } else {
        // Change vote
        const oldVote = post.userVote;
        return {
          ...post,
          userVote: type,
          usefulVotes: type === 'useful' ? post.usefulVotes + 1 : (oldVote === 'useful' ? post.usefulVotes - 1 : post.usefulVotes),
          uselessVotes: type === 'useless' ? post.uselessVotes + 1 : (oldVote === 'useless' ? post.uselessVotes - 1 : post.uselessVotes)
        };
      }
    }));
  };

  const handleToggleFavorite = (postId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        isFavorited: !post.isFavorited,
        favoritedAt: !post.isFavorited ? new Date().toISOString() : undefined
      };
    }));
  };

  // --- Handlers for Jobs ---

  const handleSaveJob = (newJobData: Omit<JobPost, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorIsPro'>) => {
    const newJob: JobPost = {
      ...newJobData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      authorId: user?.id || 'anonymous',
      authorName: user?.name || '匿名用户',
      authorIsPro: user?.isPro
    };
    setJobs([newJob, ...jobs]);
    setIsJobModalOpen(false);
  };

  // --- Filtering Logic ---

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilter === 'latest') return matchesSearch; // Already sorted by date naturally in this mock
    if (activeFilter === 'popular') return matchesSearch; // In real app, sort by votes
    return matchesSearch;
  });

  // Sort logic for display
  const displayPosts = [...filteredPosts].sort((a, b) => {
     if (activeFilter === 'popular') return b.usefulVotes - a.usefulVotes;
     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredJobs = jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            job.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = activeJobFilter === 'all' || job.type === activeJobFilter;
      return matchesSearch && matchesType;
  });


  return (
    <div className="min-h-screen bg-[#f8fafc]">
      
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md transform rotate-3">
                 <Briefcase size={18} className="transform -rotate-3" />
              </div>
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight hidden sm:block">
                OfferMagnet
              </h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-4 hidden md:block relative group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <Search size={18} />
               </div>
               <input
                 type="text"
                 placeholder={activeTab === 'interviews' ? "搜索面经、公司或职位..." : "搜索职位、公司..."}
                 className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent text-gray-900 placeholder-gray-400 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Create Button */}
              <button 
                onClick={() => {
                   if (!user) {
                      setIsAuthModalOpen(true);
                   } else {
                      if (activeTab === 'interviews') {
                        setIsModalOpen(true);
                      } else {
                        setIsJobModalOpen(true);
                      }
                   }
                }}
                className="hidden sm:flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105"
              >
                <Plus size={16} />
                {activeTab === 'interviews' ? '分享面经' : '发布职位'}
              </button>
              
              {/* Mobile Plus Button */}
              <button 
                onClick={() => {
                   if (!user) {
                      setIsAuthModalOpen(true);
                   } else {
                      if (activeTab === 'interviews') {
                        setIsModalOpen(true);
                      } else {
                        setIsJobModalOpen(true);
                      }
                   }
                }}
                className="sm:hidden w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-md"
              >
                 <Plus size={18} />
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                   {/* Pro Badge */}
                   {!user.isPro && (
                      <button 
                        onClick={() => setIsSubscriptionModalOpen(true)}
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                      >
                         <Crown size={14} className="fill-amber-500" />
                         <span>升级 Pro</span>
                      </button>
                   )}

                   <div 
                     className="relative cursor-pointer group"
                     onClick={() => setIsProfileModalOpen(true)}
                   >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white transition-transform group-hover:scale-105 ${user.isPro ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                         {user.name.charAt(0).toUpperCase()}
                         {user.isPro && (
                           <div className="absolute -top-1 -right-1 bg-white rounded-full p-[2px] shadow-sm">
                              <Zap size={10} className="text-yellow-500 fill-yellow-500" />
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-gray-600 hover:text-gray-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                >
                  <LogIn size={18} />
                  <span className="hidden sm:inline">登录 / 注册</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar (Desktop) */}
          <Sidebar activeTab={activeTab} onChangeTab={setActiveTab} />
          
          {/* Main Content */}
          <main className="flex-1 min-w-0">
             
             {/* Mobile Tab Switcher */}
             <div className="lg:hidden grid grid-cols-2 gap-2 mb-6 p-1 bg-white rounded-xl border border-gray-200 shadow-sm">
                <button 
                  onClick={() => setActiveTab('interviews')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'interviews' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                   <LayoutGrid size={16} /> 面经广场
                </button>
                <button 
                  onClick={() => setActiveTab('jobs')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'jobs' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                   <Briefcase size={16} /> 求职招聘
                </button>
             </div>

             {/* Dynamic Content based on Tab */}
             {activeTab === 'interviews' ? (
                <>
                  {/* Filter Bar for Interviews */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                      <button 
                        onClick={() => setActiveFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                      >
                        全部推荐
                      </button>
                      <button 
                        onClick={() => setActiveFilter('latest')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'latest' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                      >
                        最新发布
                      </button>
                      <button 
                        onClick={() => setActiveFilter('popular')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'popular' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                      >
                        热门精选
                      </button>
                    </div>
                  </div>

                  {/* Interview Posts Grid */}
                  <div className="grid gap-6 grid-cols-1">
                    {displayPosts.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        onAddComment={handleAddComment}
                        onVote={handleVote}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                    {displayPosts.length === 0 && (
                      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                          <Search size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">未找到相关内容</p>
                        <p className="text-gray-400 text-sm mt-1">换个关键词试试？</p>
                      </div>
                    )}
                  </div>
                </>
             ) : (
                <>
                   {/* Job Filter Bar */}
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                         {(['all', 'social', 'campus', 'intern'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => setActiveJobFilter(type)}
                              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeJobFilter === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200'}`}
                            >
                               {type === 'all' && '全部职位'}
                               {type === 'social' && '社招'}
                               {type === 'campus' && '校招'}
                               {type === 'intern' && '实习'}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* Jobs Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {filteredJobs.map(job => (
                         <JobCard key={job.id} job={job} />
                      ))}
                      {filteredJobs.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                          <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                            <Briefcase size={24} className="text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">暂时没有该类别的职位</p>
                        </div>
                      )}
                   </div>
                </>
             )}

          </main>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <EditorModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSavePost}
        />
      )}

      {isJobModalOpen && (
        <JobEditorModal
          onClose={() => setIsJobModalOpen(false)}
          onSave={handleSaveJob}
        />
      )}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {user && (
        <ProfileModal 
          user={user}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onLogout={logout}
          posts={posts}
          onViewPost={() => {}} // Placeholder for now
        />
      )}

      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />

    </div>
  );
}

export default App;