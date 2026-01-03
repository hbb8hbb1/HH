
import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Plus, ChevronDown, Compass, Building2, Cpu, Banknote, ShoppingBag, Layers, Filter as FilterIcon, Check, MapPin, Award, PartyPopper, Trash2, Briefcase, Tag as TagIcon, X, Zap, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    const savedPosts = localStorage.getItem('offermagnet_posts');
    const savedJobs = localStorage.getItem('offermagnet_jobs');
    
    if (savedPosts) {
      try { setPosts(JSON.parse(savedPosts)); } catch (e) { setPosts(MOCK_POSTS); }
    } else { setPosts(MOCK_POSTS); }

    if (savedJobs) {
      try { setJobs(JSON.parse(savedJobs)); } catch (e) { setJobs(MOCK_JOBS); }
    } else { setJobs(MOCK_JOBS); }
  }, []);

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

  const filteredPosts = posts.filter(post => {
    const matchesCompany = filters.company === '全部' || post.company === filters.company;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubRole = filters.subRole === '全部' || post.tags.includes(filters.subRole);
    return matchesCompany && matchesSearch && matchesSubRole;
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
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 transition-all outline-none" 
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
                    <FilterDropdownLarge icon={<Cpu size={18}/>} label={filters.industry} options={Object.keys(INDUSTRY_CONFIGS)} value={filters.industry} isOpen={openDropdown === 'industry'} onToggle={() => setOpenDropdown(openDropdown === 'industry' ? null : 'industry')} onSelect={(val: string) => updateFilter('industry', val)} />
                    <FilterDropdownLarge icon={<Layers size={18}/>} label={filters.category} options={currentConfig.categories} value={filters.category} isOpen={openDropdown === 'category'} onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} onSelect={(val: string) => updateFilter('category', val)} />
                    <FilterDropdownLarge icon={<Building2 size={18}/>} label={filters.company} options={currentConfig.companies} value={filters.company} isOpen={openDropdown === 'company'} onToggle={() => setOpenDropdown(openDropdown === 'company' ? null : 'company')} onSelect={(val: string) => updateFilter('company', val)} />
                    <FilterDropdownLarge icon={<MapPin size={18}/>} label={filters.location} options={currentConfig.locations} value={filters.location} isOpen={openDropdown === 'location'} onToggle={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')} onSelect={(val: string) => updateFilter('location', val)} />
                    <FilterDropdownLarge icon={<Briefcase size={18}/>} label={filters.recruitType} options={RECRUIT_TYPES} value={filters.recruitType} isOpen={openDropdown === 'recruitType'} onToggle={() => setOpenDropdown(openDropdown === 'recruitType' ? null : 'recruitType')} onSelect={(val: string) => updateFilter('recruitType', val)} />
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

                <div className={`space-y-6 transition-all duration-300 ${isFiltering ? 'opacity-30 blur-sm scale-[0.98]' : 'opacity-100 scale-100'}`}>
                  {activeTab === 'interviews' && (
                    filteredPosts.length > 0 ? (
                      filteredPosts.map(post => <PostCard key={post.id} post={post} onVote={handleVote} searchQuery={searchQuery} />)
                    ) : <EmptyState />
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
