import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PenTool, Search, Filter, LayoutGrid, Github, ArrowUpDown, ChevronDown, LogIn, LogOut, User as UserIcon, Crown, Zap, Briefcase, Plus, Menu, Loader2, RotateCcw, WifiOff } from 'lucide-react';
import PostCard from './components/PostCard';
import JobCard from './components/JobCard';
import EditorModal from './components/EditorModal';
import JobEditorModal from './components/JobEditorModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import SubscriptionModal from './components/SubscriptionModal';
import Sidebar from './components/Sidebar';
import { InterviewPost, ProcessedResponse, Comment, JobPost, JobType, User } from './types';
import { useAuth } from './context/AuthContext';

const API_URL = 'http://localhost:5000/api';

// --- Mock Data Fallback ---
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
    comments: [],
    createdAt: new Date().toISOString(),
    usefulVotes: 32,
    uselessVotes: 1,
    shareCount: 15,
    isFavorited: true,
    authorName: '匿名用户',
    authorIsPro: true
  }
];

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
    authorIsPro: true,
    isFavorited: false
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
    authorIsPro: true,
    isFavorited: true
  }
];

function App() {
  const [posts, setPosts] = useState<InterviewPost[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'interviews' | 'jobs'>('interviews');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  
  // Filters
  const [activeFilter, setActiveFilter] = useState('all'); // for interviews
  const [activeJobFilter, setActiveJobFilter] = useState<'all' | 'social' | 'campus' | 'intern'>('all'); // for jobs

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  const { user, logout, grantFreePro } = useAuth();

  // --- Data Normalization Helpers ---
  
  // Recursively maps _id to id for Comments
  const normalizeComments = (comments: any[]): Comment[] => {
    if (!comments) return [];
    return comments.map((c: any) => ({
      ...c,
      id: c._id || c.id,
      replies: c.replies ? normalizeComments(c.replies) : []
    }));
  };

  // Maps backend Post to frontend InterviewPost
  const normalizePost = (p: any, currentUser: User | null): InterviewPost => {
    return {
      ...p,
      id: p._id || p.id,
      comments: normalizeComments(p.comments),
      // User-specific states
      userVote: currentUser && p.upvoters?.includes(currentUser.id) ? 'useful' : (currentUser && p.downvoters?.includes(currentUser.id) ? 'useless' : undefined),
      isFavorited: currentUser && p.favoritedBy?.includes(currentUser.id),
      favoritedAt: currentUser && p.favoritedBy?.includes(currentUser.id) ? new Date().toISOString() : undefined // Mock time if backend doesn't store per-user time yet
    };
  };

  // Maps backend Job to frontend JobPost
  const normalizeJob = (j: any, currentUser: User | null): JobPost => {
    return {
      ...j,
      id: j._id || j.id,
      isFavorited: currentUser && j.favoritedBy?.includes(currentUser.id)
    };
  };

  // --- Infinite Scroll Logic ---
  const lastPostRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore]);


  // Fetch Data on Mount
  const fetchPosts = async (pageNum = 1, reset = false) => {
      if(reset) setIsLoading(true);
      else setIsFetchingMore(true);
      
      try {
          const res = await fetch(`${API_URL}/posts?page=${pageNum}&limit=10`);
          if (!res.ok) throw new Error("Network response was not ok");
          
          const newPostsData = await res.json();
          const normalizedNewPosts = newPostsData.map((p: any) => normalizePost(p, user));
          
          if (reset) {
              setPosts(normalizedNewPosts);
              setPage(1);
              setHasMore(newPostsData.length === 10);
          } else {
              if (newPostsData.length === 0) {
                  setHasMore(false);
              } else {
                  setPosts(prev => {
                      const existingIds = new Set(prev.map(p => p.id));
                      const uniquePosts = normalizedNewPosts.filter((p: InterviewPost) => !existingIds.has(p.id));
                      return [...prev, ...uniquePosts];
                  });
                  if (newPostsData.length < 10) setHasMore(false);
              }
          }
          setIsOffline(false);
      } catch (e) {
          // Use warn instead of error to avoid cluttering console during development without backend
          console.warn("Backend unavailable, entering offline mode."); 
          setIsOffline(true);
          if(reset) setPosts(INITIAL_POSTS);
      } finally {
          setIsLoading(false);
          setIsFetchingMore(false);
      }
  };

  useEffect(() => {
    const initData = async () => {
       setIsLoading(true);
       await fetchPosts(1, true);

       try {
        const jobsRes = await fetch(`${API_URL}/jobs`);
        if(!jobsRes.ok) throw new Error("Failed to fetch jobs");
        const jobsData = await jobsRes.json();
        setJobs(jobsData.map((j: any) => normalizeJob(j, user)));
       } catch (e) {
          console.warn("Failed to load jobs, using mock data");
          setJobs(INITIAL_JOBS);
       }
    };
    
    initData();
  }, [user]); 

  // Load More Posts Effect
  useEffect(() => {
    if (page === 1) return;
    fetchPosts(page, false);
  }, [page]);

  // --- Handlers for Interviews ---

  const handleSavePost = async (processedData: ProcessedResponse, original: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}`
        },
        body: JSON.stringify({
           ...processedData,
           originalContent: original
        })
      });

      if (res.ok) {
        const newPostData = await res.json();
        const newPost = normalizePost(newPostData, user);
        setPosts([newPost, ...posts]);
        setIsModalOpen(false);
      } else {
         throw new Error('Failed to save');
      }
    } catch (e) {
      console.error(e);
      // Mock success for demo if backend is down
      const newPost: InterviewPost = {
         id: Date.now().toString(),
         ...processedData,
         originalContent: original,
         comments: [],
         createdAt: new Date().toISOString(),
         usefulVotes: 0,
         uselessVotes: 0,
         shareCount: 0,
         authorId: user.id,
         authorName: user.name,
         authorIsPro: user.isPro
      };
      setPosts([newPost, ...posts]);
      setIsModalOpen(false);
      alert('注意：后端未连接，数据仅保存在本地临时展示。');
    }
  };

  const handleAddComment = async (postId: string, content: string, parentId?: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}`
        },
        body: JSON.stringify({ content, parentId })
      });

      if (res.ok) {
        const updatedPostData = await res.json();
        const updatedPost = normalizePost(updatedPostData, user);
        setPosts(posts.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (e) {
      console.error(e);
      // Fallback: Optimistic update without backend
      const newComment: Comment = {
          id: Date.now().toString(),
          author: user.name,
          authorIsPro: user.isPro,
          content,
          createdAt: new Date().toISOString(),
          replies: []
      };
      
      const updateComments = (comments: Comment[]): Comment[] => {
          if (!parentId) return [...comments, newComment];
          return comments.map(c => {
             if (c.id === parentId) return { ...c, replies: [...(c.replies || []), newComment] };
             if (c.replies) return { ...c, replies: updateComments(c.replies) };
             return c;
          });
      };
      
      setPosts(posts.map(p => p.id === postId ? { ...p, comments: updateComments(p.comments) } : p));
    }
  };

  // Contributor Logic Check
  const checkContributorStatus = (post: InterviewPost) => {
    if (!user) return;
    if (post.authorId === user.id && !user.isPro) {
      if (post.usefulVotes >= 10 || post.shareCount >= 3) {
        grantFreePro();
        alert(`恭喜！您的面经《${post.title}》受到了社区的欢迎。\n\n您已解锁永久 Pro 会员权益！`);
      }
    }
  };

  const handleVote = async (postId: string, type: 'useful' | 'useless') => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // Optimistic UI Update
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id !== postId) return post;
      
      let updatedPost = { ...post };
      // Logic for optimistic update (simplified)
      if (post.userVote === type) {
         updatedPost.userVote = undefined;
         updatedPost.usefulVotes = type === 'useful' ? post.usefulVotes - 1 : post.usefulVotes;
         updatedPost.uselessVotes = type === 'useless' ? post.uselessVotes - 1 : post.uselessVotes;
      } else {
         const oldVote = post.userVote;
         updatedPost.userVote = type;
         updatedPost.usefulVotes = type === 'useful' ? post.usefulVotes + 1 : (oldVote === 'useful' ? post.usefulVotes - 1 : post.usefulVotes);
         updatedPost.uselessVotes = type === 'useless' ? post.uselessVotes + 1 : (oldVote === 'useless' ? post.uselessVotes - 1 : post.uselessVotes);
      }
      return updatedPost;
    }));

    try {
      await fetch(`${API_URL}/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}`
        },
        body: JSON.stringify({ type })
      });
    } catch (e) { console.error(e); }
  };

  const handleShare = (postId: string) => {
    // In real backend, wed hit an API to increment share count
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id !== postId) return post;
      const updatedPost = { ...post, shareCount: post.shareCount + 1 };
      if (updatedPost.authorId === user?.id) {
         setTimeout(() => checkContributorStatus(updatedPost), 0);
      }
      return updatedPost;
    }));
  };

  const handleToggleFavorite = async (postId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // Optimistic
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        isFavorited: !post.isFavorited,
        favoritedAt: !post.isFavorited ? new Date().toISOString() : undefined
      };
    }));

    try {
      await fetch(`${API_URL}/posts/${postId}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}` }
      });
    } catch (e) { console.error(e); }
  };

  // --- Handlers for Jobs ---

  const handleSaveJob = async (newJobData: Omit<JobPost, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorIsPro'>) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}`
        },
        body: JSON.stringify(newJobData)
      });

      if (res.ok) {
        const savedJobData = await res.json();
        const savedJob = normalizeJob(savedJobData, user);
        setJobs([savedJob, ...jobs]);
        setIsJobModalOpen(false);
      } else {
        throw new Error("Failed to save job");
      }
    } catch (e) {
      console.error(e);
      // Fallback
      const newJob: JobPost = {
         id: Date.now().toString(),
         ...newJobData,
         createdAt: new Date().toISOString(),
         authorId: user.id,
         authorName: user.name,
         authorIsPro: user.isPro,
         isFavorited: false
      };
      setJobs([newJob, ...jobs]);
      setIsJobModalOpen(false);
      alert('注意：后端连接失败，职位已本地发布。');
    }
  };

  const handleToggleJobFavorite = async (jobId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // Optimistic
    setJobs(jobs.map(job => {
      if (job.id !== jobId) return job;
      return {
        ...job,
        isFavorited: !job.isFavorited,
        favoritedAt: !job.isFavorited ? new Date().toISOString() : undefined
      };
    }));

    try {
      await fetch(`${API_URL}/jobs/${jobId}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}` }
      });
    } catch (e) { console.error(e); }
  };

  // --- Filtering Logic ---

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilter === 'latest') return matchesSearch; 
    if (activeFilter === 'popular') return matchesSearch; 
    return matchesSearch;
  });

  const displayPosts = [...filteredPosts].sort((a, b) => {
     if (activeFilter === 'popular') return b.usefulVotes - a.usefulVotes;
     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredJobs = jobs.filter(job => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = job.title.toLowerCase().includes(query) || 
                            job.company.toLowerCase().includes(query) ||
                            job.tags.some(t => t.toLowerCase().includes(query)) ||
                            job.description.toLowerCase().includes(query); 
      
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
                 placeholder={activeTab === 'interviews' ? "搜索面经、公司或职位..." : "搜索职位、公司、详情..."}
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
        
        {/* Offline Banner */}
        {isOffline && (
           <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-center text-sm font-medium text-amber-800 animate-in fade-in slide-in-from-top-2">
              <WifiOff size={16} className="mr-2" />
              无法连接到服务器，目前显示为本地演示数据 (离线模式)
           </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar (Desktop) */}
          <Sidebar 
            activeTab={activeTab} 
            onChangeTab={setActiveTab} 
            onParticipate={() => {
               if (!user) {
                 setIsAuthModalOpen(true);
               } else {
                 setActiveTab('interviews');
                 setIsModalOpen(true);
               }
            }}
          />
          
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

                    <button 
                        onClick={() => fetchPosts(1, true)} 
                        className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-500 transition-colors"
                        title="刷新列表"
                    >
                        <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {/* Interview Posts Grid */}
                  <div className="grid gap-6 grid-cols-1">
                    {displayPosts.map((post, index) => {
                      // Attach ref to the last post for infinite scrolling
                      if (displayPosts.length === index + 1) {
                         return (
                            <div ref={lastPostRef} key={post.id}>
                              <PostCard 
                                post={post} 
                                onAddComment={handleAddComment}
                                onVote={handleVote}
                                onToggleFavorite={handleToggleFavorite}
                                onShare={handleShare}
                              />
                            </div>
                         );
                      }
                      return (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onAddComment={handleAddComment}
                          onVote={handleVote}
                          onToggleFavorite={handleToggleFavorite}
                          onShare={handleShare}
                        />
                      );
                    })}
                    
                    {isFetchingMore && (
                        <div className="flex justify-center items-center py-4">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                            <span className="ml-2 text-gray-500 text-sm">加载更多...</span>
                        </div>
                    )}

                    {!hasMore && displayPosts.length > 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            没有更多内容了
                        </div>
                    )}

                    {displayPosts.length === 0 && (
                      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                          <Search size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">
                          {isLoading ? '加载中...' : '未找到相关内容'}
                        </p>
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
                         <JobCard 
                           key={job.id} 
                           job={job} 
                           onToggleFavorite={handleToggleJobFavorite}
                         />
                      ))}
                      {filteredJobs.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                          <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                            <Briefcase size={24} className="text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">
                            {isLoading ? '加载中...' : '暂时没有该类别的职位'}
                          </p>
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