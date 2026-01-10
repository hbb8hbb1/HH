
import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Plus, ChevronDown, Compass, Building2, Cpu, Banknote, ShoppingBag, Layers, Filter as FilterIcon, Check, MapPin, Award, PartyPopper, Trash2, Briefcase, Tag as TagIcon, X, Zap, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import PostCard from './components/PostCard';
import JobCard from './components/JobCard';
import EditorModal from './components/EditorModal';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import { InterviewPost, ProcessedResponse, JobPost } from './types';
import { useAuth } from './context/AuthContext';

const INDUSTRY_CONFIGS: Record<string, any> = {
  '互联网': {
    icon: <Cpu size={16} />,
    companies: ['全部', '字节跳动', 'Google', 'Meta', '腾讯', '阿里巴巴', '美团', '百度', '小红书'],
    locations: ['全部', '北京', '上海', '深圳', '杭州', '广州', '成都', '新加坡', '硅谷'],
    categories: ['研发', '算法', '产品', '设计', '运营', '市场', 'HR'],
    subRoles: {
      '研发': ['全部', '前端', '后端', '移动端', '全栈', '测试', '运维', '大数据', '架构', '系统设计', '嵌入式'],
      '算法': ['全部', '机器学习', 'CV', 'NLP', '推荐系统', '强化学习', '大模型/LLM'],
      '产品': ['全部', 'C端产品', 'B端产品', '数据产品', 'AI产品', '游戏策划', '商业化产品']
    }
  },
  '金融': {
    icon: <Banknote size={16} />,
    companies: ['全部', '中金公司', '中信证券', '高盛', '大摩', '招商银行', '蚂蚁金服'],
    locations: ['全部', '北京', '上海', '香港', '纽约', '伦敦'],
    categories: ['投行', '行研', '量化', '风控', '科技'],
    subRoles: {
      '投行': ['全部', '股权承销', '债券承销', '并购', '行业组', 'ECM', 'DCM'],
      '行研': ['全部', '策略', 'TMT', '消费', '医药', '周期', '宏观']
    }
  },
  '快消/零售': {
    icon: <ShoppingBag size={16} />,
    companies: ['全部', '宝洁', '联合利华', '欧莱雅', '玛氏', '可口可乐', '元气森林'],
    locations: ['全部', '上海', '广州', '杭州'],
    categories: ['市场', '销售', '供应链', '财务'],
    subRoles: {
      '市场': ['全部', '品牌管理', '数字营销', '媒介', 'PR', '电商运营'],
      '供应链': ['全部', '采购', '物流', '计划', '质量控制', '精益制造']
    }
  }
};

const RECRUIT_TYPES = ['全部', '社招', '校招', '暑期实习', '日常实习'];

const MOCK_POSTS: InterviewPost[] = [
  {
    id: '1',
    title: '字节跳动 2025 届校园招聘前端一面面经 (抖音事业部)',
    originalContent: '...',
    processedContent: '## 背景\n双非本，一段中厂实习经历。投递的是抖音架构组。\n\n## 一面 (60min)\n1. **自我介绍**\n2. **基础知识**：谈谈 CSS 盒模型，BFC 是什么？\n3. **浏览器**：从输入 URL 到页面显示的整个过程。\n4. **框架**：React Fiber 架构解决了什么问题？\n5. **手写代码**：实现一个深拷贝 (Deep Clone).\n\n## 总结\n面试官很准时，侧重基础和广度。',
    company: '字节跳动',
    role: '前端工程师',
    difficulty: 3,
    tags: ['字节跳动', '校招', 'React', '手写代码'],
    comments: [],
    createdAt: new Date().toISOString(),
    usefulVotes: 42,
    uselessVotes: 1,
    shareCount: 12,
    authorName: '抖音面霸',
    authorIsPro: true
  },
  {
    id: '2',
    title: 'Google L4 Frontend Engineer Interview Experience (US)',
    originalContent: '...',
    processedContent: '## Process\nTotal 5 rounds of interviews, including System Design and Behavioral.\n\n## System Design Round\nDesign a scalable infinite scroll component like Google Photos. Focused on virtualization, memory management, and network throttling.\n\n## Coding Round\nLeetCode Hard variant: Find the longest path in a DAG with constraints.',
    company: 'Google',
    role: 'Frontend Engineer',
    difficulty: 5,
    tags: ['Google', 'System Design', 'Algorithms', 'L4'],
    comments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    usefulVotes: 156,
    uselessVotes: 3,
    shareCount: 89,
    authorName: 'ValleyCoder',
    authorIsPro: true
  }
];

const MOCK_JOBS: JobPost[] = [
  {
    id: 'j1',
    title: '前端开发工程师',
    company: '字节跳动',
    role: '研发',
    location: '北京',
    salaryRange: '25k-50k',
    type: 'social',
    description: '负责抖音前端架构开发...',
    tags: ['React', 'TypeScript', 'Node.js'],
    createdAt: new Date().toISOString(),
    authorName: 'HR专员',
    authorIsPro: true
  },
  {
    id: 'j2',
    title: '算法实习生 (大模型方向)',
    company: '腾讯',
    role: '算法',
    location: '深圳',
    salaryRange: '400-600/天',
    type: 'intern',
    description: '参与 LLM 基础模型预训练与微调...',
    tags: ['Python', 'PyTorch', 'LLM'],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    authorName: '鹅厂招聘',
    authorIsPro: false
  }
];

function App() {
  const { user, grantFreePro } = useAuth();
  const [posts, setPosts] = useState<InterviewPost[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const POSTS_PER_PAGE = 20;
  
  // 添加调试信息
  console.log('🎨 App 组件渲染，当前 posts 数量:', posts.length);
  console.log('🎨 当前 jobs 数量:', jobs.length);
  const [activeTab, setActiveTab] = useState<'interviews' | 'jobs' | 'coaching'>('interviews');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [showMilestoneToast, setShowMilestoneToast] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  const [filters, setFilters] = useState({
    industry: '互联网',
    company: '全部',
    location: '全部',
    recruitType: '全部',
    category: '研发',
    subRole: '全部'
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const currentConfig = INDUSTRY_CONFIGS[filters.industry];
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (filterRef.current) {
        setIsSticky(window.scrollY > 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 获取帖子数据（支持分页和筛选）
  const fetchPosts = async (page: number = 1) => {
    setIsLoading(true);
    console.log('🔄 开始获取 posts 数据，页码:', page);
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: page.toString(),
        limit: POSTS_PER_PAGE.toString()
      });
      
      // 添加筛选参数
      if (filters.company && filters.company !== '全部') {
        params.append('company', filters.company);
      }
      if (filters.location && filters.location !== '全部') {
        params.append('location', filters.location);
      }
      if (filters.recruitType && filters.recruitType !== '全部') {
        params.append('recruitType', filters.recruitType);
      }
      if (filters.category && filters.category !== '全部') {
        params.append('category', filters.category);
      }
      if (filters.subRole && filters.subRole !== '全部') {
        params.append('subRole', filters.subRole);
      }
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const apiUrl = `/api/posts?${params.toString()}`;
      console.log('📡 请求 URL:', apiUrl);
      const response = await fetch(apiUrl);
      console.log('📥 响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 获取到数据:', result);
        
        // 处理新的 API 响应格式（包含 pagination）
        const data = result.posts || result; // 兼容新旧格式
        const pagination = result.pagination || { page, limit: POSTS_PER_PAGE, total: data.length, totalPages: 1 };
        
        // 转换后端数据格式为前端格式
        const formattedPosts: InterviewPost[] = (Array.isArray(data) ? data : []).map((post: any) => ({
          id: post._id || post.id,
          title: post.title || '',
          originalContent: post.originalContent || '',
          processedContent: post.processedContent || '',
          company: post.company || '',
          role: post.role || '',
          difficulty: post.difficulty || 3,
          tags: post.tags || [],  // 保留向后兼容
          tagDimensions: post.tagDimensions || {  // 新增结构化标签
            technologies: [],
            recruitType: '其他',
            location: '',
            category: '',
            subRole: '',
            custom: []
          },
          comments: post.comments || [],
          createdAt: post.createdAt || new Date().toISOString(),
          usefulVotes: post.usefulVotes || 0,
          uselessVotes: post.uselessVotes || 0,
          shareCount: post.shareCount || 0,
          authorName: post.authorName || '匿名用户',
          authorIsPro: post.authorIsPro || false
        }));
        
        console.log('📝 格式化后的 posts:', formattedPosts.length, '条');
        console.log('📄 分页信息:', pagination);
        
        setPosts(formattedPosts.length > 0 ? formattedPosts : (page === 1 ? MOCK_POSTS : []));
        setCurrentPage(pagination.page || page);
        setTotalPages(pagination.totalPages || 1);
        setTotalPosts(pagination.total || formattedPosts.length);
      } else {
        console.error('❌ 获取 posts 失败:', response.status, response.statusText);
        if (page === 1) {
          setPosts(MOCK_POSTS);
          // 设置分页信息，即使使用 MOCK 数据也显示分页
          const mockTotalPages = Math.ceil(MOCK_POSTS.length / POSTS_PER_PAGE);
          setTotalPages(mockTotalPages > 0 ? mockTotalPages : 1);
          setTotalPosts(MOCK_POSTS.length);
        } else {
          setPosts([]);
          setTotalPages(1);
          setTotalPosts(0);
        }
      }
    } catch (error) {
      console.error('❌ 获取 posts 出错:', error);
      if (page === 1) {
        // 如果API失败，尝试从localStorage恢复
        const savedPosts = localStorage.getItem('offermagnet_posts');
        if (savedPosts) {
          try { 
            console.log('📦 从 localStorage 恢复数据');
            const parsed = JSON.parse(savedPosts);
            setPosts(parsed);
            setTotalPages(Math.ceil(parsed.length / POSTS_PER_PAGE));
            setTotalPosts(parsed.length);
          } catch (e) { 
            console.log('⚠️ localStorage 数据解析失败，使用 MOCK 数据');
            setPosts(MOCK_POSTS);
            setTotalPages(1);
            setTotalPosts(MOCK_POSTS.length);
          }
        } else { 
          console.log('⚠️ 没有 localStorage 数据，使用 MOCK 数据');
          setPosts(MOCK_POSTS);
          setTotalPages(1);
          setTotalPosts(MOCK_POSTS.length);
        }
      } else {
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 保持jobs从localStorage读取（如果有）
    const savedJobs = localStorage.getItem('offermagnet_jobs');
    if (savedJobs) {
      try { setJobs(JSON.parse(savedJobs)); } catch (e) { setJobs(MOCK_JOBS); }
    } else { setJobs(MOCK_JOBS); }

    // 初始加载第一页
    fetchPosts(1);
  }, []);

  // 当筛选条件改变时，重置到第一页（这会触发页码改变时的useEffect重新获取数据）
  useEffect(() => {
    if (activeTab === 'interviews') {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [filters.company, filters.location, filters.recruitType, filters.category, filters.subRole, searchQuery, activeTab]);

  // 当页码改变或筛选条件改变时重新获取数据
  useEffect(() => {
    if (activeTab === 'interviews') {
      fetchPosts(currentPage);
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, filters.company, filters.location, filters.recruitType, filters.category, filters.subRole, searchQuery, activeTab]);

  // 模拟搜索和过滤的加载效果
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 300);
    return () => clearTimeout(timer);
  }, [filters, searchQuery, activeTab]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'industry') {
        next.company = '全部';
        next.location = '全部';
        next.category = INDUSTRY_CONFIGS[value].categories[0];
        next.subRole = '全部';
      }
      if (key === 'category') next.subRole = '全部';
      return next;
    });
    setOpenDropdown(null);
  };

  const clearAllFilters = () => {
    setFilters({
      industry: '互联网',
      company: '全部',
      location: '全部',
      recruitType: '全部',
      category: '研发',
      subRole: '全部'
    });
    setSearchQuery('');
  };

  const handleSavePost = (data: ProcessedResponse, original: string) => {
    const newPost: InterviewPost = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      originalContent: original,
      createdAt: new Date().toISOString(),
      comments: [],
      usefulVotes: 0,
      uselessVotes: 0,
      shareCount: 0,
      authorId: user?.id,
      authorName: user?.name || '匿名用户',
      authorIsPro: user?.isPro || false,
      isAnonymous: !!data.isAnonymous
    };
    setPosts([newPost, ...posts]);
    setIsModalOpen(false);
  };

  const handleVote = (postId: string, type: 'useful' | 'useless') => {
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      const isCurrentlyType = post.userVote === type;
      return {
        ...post,
        userVote: isCurrentlyType ? undefined : type,
        usefulVotes: type === 'useful' ? (isCurrentlyType ? post.usefulVotes - 1 : post.usefulVotes + 1) : post.usefulVotes,
        uselessVotes: type === 'useless' ? (isCurrentlyType ? post.uselessVotes - 1 : post.uselessVotes + 1) : post.uselessVotes
      };
    }));
  };

  // 注意：由于筛选已由后端API完成，前端只需要做基本的内容过滤
  // 保留此函数用于向后兼容和额外的客户端过滤（如果需要）
  const filteredPosts = posts.filter(post => {
    // 只显示有内容的帖子（过滤掉只有标题没有内容的）
    const hasContent = (post.originalContent && post.originalContent.trim().length > 50) || 
                       (post.processedContent && post.processedContent.trim().length > 50);
    if (!hasContent) {
      return false; // 跳过没有内容的帖子
    }
    
    // 由于筛选已由后端完成，这里只做基本的内容检查
    // 如果需要额外的客户端过滤，可以在这里添加
    return true;
  });

  const filteredJobs = jobs.filter(job => {
    const matchesCompany = filters.company === '全部' || job.company === filters.company;
    const matchesLocation = filters.location === '全部' || job.location === filters.location;
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCompany && matchesLocation && matchesSearch;
  });

  const isFilterActive = filters.company !== '全部' || filters.location !== '全部' || filters.recruitType !== '全部' || filters.subRole !== '全部' || searchQuery !== '';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl transition-all group-hover:rotate-12 group-hover:scale-110">
                <Compass size={22} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">OfferMagnet</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">AI Powered Career Hub</p>
              </div>
            </div>

            <div className="flex-1 max-w-xl mx-8">
              <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索面经、职位、公司关键词..." 
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 transition-all outline-none" 
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all"
              >
                <Plus size={18} /> 发布
              </button>
              {user ? (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border-2 border-white shadow-lg transition-all cursor-pointer hover:rotate-6 ${user.isPro ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {user.name[0]}
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 text-sm font-black text-slate-600 hover:text-slate-900 transition-colors">登录</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <Sidebar activeTab={activeTab} onChangeTab={setActiveTab} />
          
          <main className="flex-1 min-w-0">
             
             {/* --- Advanced Filter Bar --- */}
             <div 
               ref={filterRef}
               className={`transition-all duration-300 ${isSticky ? 'sticky top-[64px] z-50 -mx-4 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-xl' : 'bg-white rounded-3xl p-6 mb-8 border border-slate-200 shadow-sm'}`}
             >
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                        <FilterIcon size={20} className={isFilterActive ? 'fill-indigo-600 animate-pulse' : ''} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 leading-none">多维度筛选</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {filters.industry} / {filters.category} {filters.subRole !== '全部' ? `/ ${filters.subRole}` : ''}
                        </p>
                      </div>
                    </div>
                    
                    {isFilterActive && (
                      <button 
                        onClick={clearAllFilters}
                        className="group flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-500 transition-all bg-slate-50 hover:bg-red-50 px-4 py-2 rounded-xl border border-slate-100"
                      >
                        <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
                        清除全部重置
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <FilterDropdownLarge icon={<Cpu size={18}/>} label="行业" options={Object.keys(INDUSTRY_CONFIGS)} value={filters.industry} isOpen={openDropdown === 'industry'} onToggle={() => setOpenDropdown(openDropdown === 'industry' ? null : 'industry')} onSelect={(val: string) => updateFilter('industry', val)} />
                    <FilterDropdownLarge icon={<Layers size={18}/>} label="部门" options={currentConfig.categories} value={filters.category} isOpen={openDropdown === 'category'} onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} onSelect={(val: string) => updateFilter('category', val)} />
                    <FilterDropdownLarge icon={<Building2 size={18}/>} label="公司" options={currentConfig.companies} value={filters.company} isOpen={openDropdown === 'company'} onToggle={() => setOpenDropdown(openDropdown === 'company' ? null : 'company')} onSelect={(val: string) => updateFilter('company', val)} />
                    <FilterDropdownLarge icon={<MapPin size={18}/>} label="地点" options={currentConfig.locations} value={filters.location} isOpen={openDropdown === 'location'} onToggle={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')} onSelect={(val: string) => updateFilter('location', val)} />
                    <FilterDropdownLarge icon={<Briefcase size={18}/>} label="招聘类型" options={RECRUIT_TYPES} value={filters.recruitType} isOpen={openDropdown === 'recruitType'} onToggle={() => setOpenDropdown(openDropdown === 'recruitType' ? null : 'recruitType')} onSelect={(val: string) => updateFilter('recruitType', val)} />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(currentConfig.subRoles[filters.category] || ['全部']).map((chip: string) => (
                      <button
                        key={chip}
                        onClick={() => updateFilter('subRole', chip)}
                        className={`
                          whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-black transition-all border shrink-0
                          ${filters.subRole === chip ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50'}
                        `}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
             </div>

             {/* --- Content List with Loading Overlay --- */}
             <div className="relative min-h-[400px]">
                {isFiltering && (
                   <div className="absolute inset-0 z-40 bg-slate-50/50 backdrop-blur-[1px] flex items-center justify-center rounded-3xl animate-in fade-in duration-200">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                         <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Searching...</span>
                      </div>
                   </div>
                )}

                <div className={`space-y-6 transition-all duration-300 ${isFiltering || isLoading ? 'opacity-30 blur-sm scale-[0.98]' : 'opacity-100 scale-100'}`}>
                  {activeTab === 'interviews' && (
                    <>
                      {isLoading && posts.length === 0 ? (
                        <div className="py-32 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                          <p className="text-sm text-slate-500">加载中...</p>
                        </div>
                      ) : filteredPosts.length > 0 ? (
                        <>
                          {filteredPosts.map(post => <PostCard key={post.id} post={post} onVote={handleVote} searchQuery={searchQuery} />)}
                          
                          {/* 分页控件 - 始终显示分页信息 */}
                          {totalPosts > 0 && (
                            <Pagination 
                              currentPage={currentPage}
                              totalPages={totalPages}
                              totalPosts={totalPosts}
                              onPageChange={(page) => setCurrentPage(page)}
                            />
                          )}
                        </>
                      ) : (
                        <div className="py-8">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-yellow-800">
                              <strong>调试信息：</strong> posts总数={posts.length}, filteredPosts={filteredPosts.length}
                            </p>
                          </div>
                          <EmptyState />
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'jobs' && (
                    filteredJobs.length > 0 ? (
                      filteredJobs.map(job => <JobCard key={job.id} job={job} searchQuery={searchQuery} />)
                    ) : <EmptyState />
                  )}
                </div>
             </div>
          </main>
        </div>
      </div>

      <EditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePost} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-32 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-200">
       <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-6">
          <Search size={36} />
       </div>
       <h3 className="text-xl font-black text-slate-900">空空如也</h3>
       <p className="text-sm text-slate-500 mt-2">换个关键词或者筛选条件试试吧</p>
    </div>
  );
}

function Pagination({ currentPage, totalPages, totalPosts, onPageChange }: { 
  currentPage: number; 
  totalPages: number; 
  totalPosts: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // 如果总页数少于等于5，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // 显示当前页附近的页码
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // 总是显示最后一页
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 mt-8 py-6 bg-white rounded-3xl border border-slate-200">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-black transition-all ${
            currentPage === 1
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-black hover:-translate-y-0.5 shadow-lg'
          }`}
        >
          <ChevronLeft size={18} />
          上一页
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                  ...
                </span>
              );
            }
            
            const pageNum = page as number;
            const isActive = pageNum === currentPage;
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[40px] px-3 py-2 rounded-xl text-sm font-black transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-black transition-all ${
            currentPage === totalPages
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-black hover:-translate-y-0.5 shadow-lg'
          }`}
        >
          下一页
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="text-xs text-slate-500 font-bold">
        第 {currentPage} 页，共 {totalPages} 页 · 总计 {totalPosts} 条帖子
      </div>
    </div>
  );
}

function FilterDropdownLarge({ icon, label, options, value, isOpen, onToggle, onSelect }: any) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && isOpen) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-4 py-2.5 rounded-2xl text-[13px] font-black transition-all border bg-white ${isOpen ? 'border-indigo-500 text-indigo-600 ring-4 ring-indigo-50 shadow-sm' : 'border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={isOpen ? 'text-indigo-500' : 'text-slate-300'}>{icon}</span>
          <span className="truncate">{value === '全部' ? `选择${label}` : value}</span>
        </div>
        <ChevronDown size={14} className={`shrink-0 transition-all ${isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-200'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[160px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] py-2 animate-in fade-in zoom-in-95 duration-150 overflow-y-auto max-h-64 no-scrollbar">
          {options.map((opt: string) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold transition-all ${value === opt ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt}
              {value === opt && <Check size={14} className="text-indigo-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
