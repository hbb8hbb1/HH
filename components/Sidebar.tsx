import React from 'react';
import { BookOpen, Briefcase, LayoutGrid, Award, TrendingUp } from 'lucide-react';

interface SidebarProps {
  activeTab: 'interviews' | 'jobs';
  onChangeTab: (tab: 'interviews' | 'jobs') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onChangeTab }) => {
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
        </div>

        {/* Recommended Topics (Static for now) */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">热门话题</h3>
          <div className="space-y-1">
             <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-colors flex items-center gap-2">
               <TrendingUp size={16} className="text-gray-400" /> 2024 春招补录
             </a>
             <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-colors flex items-center gap-2">
               <TrendingUp size={16} className="text-gray-400" /> 字节跳动内推
             </a>
             <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-colors flex items-center gap-2">
               <TrendingUp size={16} className="text-gray-400" /> 前端高频面试题
             </a>
          </div>
        </div>

        {/* Banner/Ad */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group cursor-pointer">
            <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2 opacity-90">
                  <Award size={16} />
                  <span className="text-xs font-bold uppercase tracking-wide">OfferMagnet Pro</span>
               </div>
               <h4 className="font-bold text-lg leading-tight mb-2">解锁无限 AI 润色次数</h4>
               <p className="text-xs text-indigo-100 opacity-80 mb-3">让你的面经脱颖而出，获取更多内推机会。</p>
               <button className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-bold shadow-sm group-hover:scale-105 transition-transform">立即查看</button>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;