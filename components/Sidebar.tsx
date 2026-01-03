
import React from 'react';
import { BookOpen, Briefcase, Award, TrendingUp, Mic, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: 'interviews' | 'jobs' | 'coaching';
  onChangeTab: (tab: 'interviews' | 'jobs' | 'coaching') => void;
  onParticipate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onChangeTab, onParticipate }) => {
  const { user } = useAuth();

  return (
    <div className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-8">
        
        {/* Main Navigation */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">发现</h3>
          
          <button
            onClick={() => onChangeTab('interviews')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              activeTab === 'interviews' 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-100 font-semibold' 
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'interviews' ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-white'}`}>
              <BookOpen size={18} className={activeTab === 'interviews' ? 'text-blue-600' : 'text-gray-500'} />
            </div>
            <span>面经广场</span>
          </button>

          <button
            onClick={() => onChangeTab('jobs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              activeTab === 'jobs' 
                ? 'bg-white text-indigo-600 shadow-sm border border-gray-100 font-semibold' 
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'jobs' ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-white'}`}>
              <Briefcase size={18} className={activeTab === 'jobs' ? 'text-indigo-600' : 'text-gray-500'} />
            </div>
            <span>求职招聘</span>
          </button>

          <button
            onClick={() => onChangeTab('coaching')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              activeTab === 'coaching' 
                ? 'bg-white text-teal-600 shadow-sm border border-gray-100 font-semibold' 
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'coaching' ? 'bg-teal-100' : 'bg-gray-100 group-hover:bg-white'}`}>
              <Mic size={18} className={activeTab === 'coaching' ? 'text-teal-600' : 'text-gray-500'} />
            </div>
            <span>面试辅导</span>
          </button>
        </div>

        {/* Pro / Reward Banner */}
        <div 
          onClick={onParticipate}
          className={`rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group cursor-pointer transition-all ${user?.isPro ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-violet-600 to-indigo-600'}`}
        >
            <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2 opacity-90">
                  <Award size={16} />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {user?.isPro ? 'OfferMagnet PRO' : '解锁 PRO 权益'}
                  </span>
               </div>
               
               {user?.isPro ? (
                 <>
                   <h4 className="font-bold text-lg leading-tight mb-2">欢迎回来, Pro 用户</h4>
                   <p className="text-xs text-amber-50 opacity-90 mb-3">你已解锁全站 10k+ 深度面经与高级 AI 助手。</p>
                   <div className="flex items-center gap-2 text-[10px] font-bold bg-white/20 py-1 px-2 rounded-lg backdrop-blur-sm">
                      <CheckCircle2 size={12} /> 会员有效期: 永久 (贡献解锁)
                   </div>
                 </>
               ) : (
                 <>
                   <h4 className="font-bold text-lg leading-tight mb-2">分享面经获好礼</h4>
                   <p className="text-xs text-indigo-100 opacity-80 mb-3">发布 1 篇获得 10 个认可的面经，即可永久解锁 Pro 权益！</p>
                   <button className="flex items-center gap-2 text-xs bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold shadow-sm group-hover:scale-105 transition-transform">
                      <Zap size={14} className="fill-indigo-600" /> 去完成任务
                   </button>
                 </>
               )}
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
        </div>

        {/* Recommended Topics */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">热门话题</h3>
          <div className="space-y-1">
             <div className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
               <TrendingUp size={16} className="text-gray-400" /> 2024 春招补录
             </div>
             <div className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
               <TrendingUp size={16} className="text-gray-400" /> 字节跳动内推
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;
