import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, RotateCcw, Loader2, Briefcase, Plus, FileText, Info, Crown, Zap, ChevronDown, LogIn } from 'lucide-react';
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
  }
];

function App() {
  const [posts, setPosts] = useState<InterviewPost[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'interviews' | 'jobs'>('interviews');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  // Modals & Menu States
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  const publishMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const isGuest = user?.id === 'guest_temp';

  // Handle outside clicks for the publish menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (publishMenuRef.current && !publishMenuRef.current.contains(event.target as Node)) {
        setIsPublishMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizeComments = (comments: any[]): Comment[] => {
    if (!comments) return [];
    return comments.map((c: any) => ({
      ...c,
      id: c._id || c.id,
      replies: c.replies ? normalizeComments(c.replies) : []
    }));
  };

  const normalizePost = (p: any, currentUser: User | null): InterviewPost => {
    return {
      ...p,
      id: p._id || p.id,
      comments: normalizeComments(p.comments),
      userVote: currentUser && p.upvoters?.includes(currentUser.id) ? 'useful' : (currentUser && p.downvoters?.includes(currentUser.id) ? 'useless' : undefined),
      isFavorited: currentUser && p.favoritedBy?.includes(currentUser.id),
      favoritedAt: currentUser && p.favoritedBy?.includes(currentUser.id) ? new Date().toISOString() : undefined
    };
  };

  const normalizeJob = (j: any, currentUser: User | null): JobPost => {
    return {
      ...j,
      id: j._id || j.id,
      isFavorited: currentUser && j.favoritedBy?.includes(currentUser.id)
    };
  };

  const fetchPosts = async (pageNum = 1, reset = false) => {
    if(reset) setIsLoading(true);
    try {
        const res = await fetch(`${API_URL}/posts?page=${pageNum}&limit=10`);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setPosts(data.map((p: any) => normalizePost(p, user)));
        setIsOffline(false);
    } catch (e) {
        setIsOffline(true);
        if(reset) setPosts(INITIAL_POSTS);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`);
      if(!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data.map((j: any) => normalizeJob(j, user)));
    } catch (e) {
      setJobs(INITIAL_JOBS);
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
    fetchJobs();
  }, [user]);

  const handleSavePost = async (processedData: ProcessedResponse, original: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    if (isGuest) {
      const newPost: InterviewPost = { id: Date.now().toString(), ...processedData, originalContent: original, comments: [], createdAt: new Date().toISOString(), usefulVotes: 0, uselessVotes: 0, shareCount: 0, authorId: user.id, authorName: user.name, authorIsPro: user.isPro };
      setPosts([newPost, ...posts]);
      setIsModalOpen(false);
      alert('您正处于游客模式：内容已发布在本地。注册账号可永久保存。');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}` },
        body: JSON.stringify({ ...processedData, originalContent: original })
      });
      if (res.ok) {
        const newPost = normalizePost(await res.json(), user);
        setPosts([newPost, ...posts]);
        setIsModalOpen(false);
      }
    } catch (e) { alert('发布失败'); }
  };

  const handleSaveJob = async (jobData: any) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    if (isGuest) {
      const newJob: JobPost = { id: Date.now().toString(), ...jobData, createdAt: new Date().toISOString(), authorId: user.id, authorName: user.name, authorIsPro: user.isPro };
      setJobs([newJob, ...jobs]);
      setIsJobModalOpen(false);
      alert('您正处于游客模式：职位已发布在本地。注册账号可永久保存。');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('offerMagnet_token')}` },
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        const newJob = normalizeJob(await res.json(), user);
        setJobs([newJob, ...jobs]);
        setIsJobModalOpen(false);
      }
    } catch (e) { alert('发布失败'); }
  };

  const filteredPosts = posts.filter(post => post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.company.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredJobs = jobs.filter(job => job.title.toLowerCase().includes(searchQuery.toLowerCase()) || job.company.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md transform rotate-3">
                 <Briefcase size={18} className="transform -rotate-3" />
              </div>
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight hidden sm:block">OfferMagnet</h1>
            </div>

            <div className="flex-1 max-w-lg mx-4 hidden md:block relative">
               <input type="text" placeholder="搜索内容..." className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent text-gray-900 placeholder-gray-400 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Unified Publish Button with Dropdown */}
              <div className="relative" ref={publishMenuRef}>
                <button 
                  onClick={() => setIsPublishMenuOpen(!isPublishMenuOpen)}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105"
                >
                  <Plus size={16} />
                  发布
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isPublishMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPublishMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <button 
                      onClick={() => { setIsModalOpen(true); setIsPublishMenuOpen(false); }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">面经分享</div>
                        <div className="text-[10px] text-gray-400">分享面试心得，AI润色排版</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setIsJobModalOpen(true); setIsPublishMenuOpen(false); }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group border-t border-gray-50"
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">求职招聘</div>
                        <div className="text-[10px] text-gray-400">发布职位信息，精准寻找人才</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              
              {user ? (
                <div className="flex items-center gap-3">
                   {isGuest && <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold border border-gray-200"><Info size={12} /> 游客</div>}
                   <div className="relative cursor-pointer group" onClick={() => setIsProfileModalOpen(true)}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white transition-transform group-hover:scale-105 ${user.isPro ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : (isGuest ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600')}`}>
                         {user.name.charAt(0).toUpperCase()}
                      </div>
                   </div>
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="text-gray-600 hover:text-gray-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                  <LogIn size={18} />
                  <span className="hidden sm:inline">登录 / 注册</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {isGuest && (
           <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs font-medium text-blue-800">
              <div className="flex items-center"><Info size={16} className="mr-2" /> 您当前正以“游客身份”访问。数据仅保存在本地。</div>
              <button onClick={() => setIsAuthModalOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">注册保存数据</button>
           </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <Sidebar activeTab={activeTab} onChangeTab={setActiveTab} onParticipate={() => setIsPublishMenuOpen(true)} />
          <main className="flex-1 min-w-0">
             {activeTab === 'interviews' ? (
                <div className="grid gap-6 grid-cols-1">
                  {filteredPosts.map(post => <PostCard key={post.id} post={post} onAddComment={() => {}} onVote={() => {}} onToggleFavorite={() => {}} />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   {filteredJobs.map(job => <JobCard key={job.id} job={job} />)}
                </div>
             )}
          </main>
        </div>
      </div>

      <EditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePost} />
      <JobEditorModal isOpen={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} onSave={handleSaveJob} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {user && <ProfileModal user={user} isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onLogout={logout} posts={posts} onViewPost={() => {}} />}
      <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} />
    </div>
  );
}

export default App;