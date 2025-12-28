import React, { useState } from 'react';
import { JobPost } from '../types';
import { Building, MapPin, Clock, Briefcase, Crown, ExternalLink, ChevronDown, ChevronUp, Mail, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface JobCardProps {
  job: JobPost;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const [expanded, setExpanded] = useState(false);

  // Helper for type styles
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'campus': 
        return { label: '校招', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100', barClass: 'bg-emerald-500' };
      case 'intern': 
        return { label: '实习', colorClass: 'text-amber-700 bg-amber-50 border-amber-100', barClass: 'bg-amber-500' };
      default: 
        return { label: '社招', colorClass: 'text-blue-700 bg-blue-50 border-blue-100', barClass: 'bg-blue-600' };
    }
  };

  const typeConfig = getTypeConfig(job.type);

  // Format date helper (simple days ago)
  const getDaysAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days === 0 ? '今天' : `${days}天前`;
  };

  // One-Click Apply Logic
  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion
    
    const link = job.applyLink || '';
    // Simple heuristic: if it starts with http, it's a URL, otherwise treat as email/empty
    const isUrl = link.match(/^https?:\/\//i);

    if (isUrl) {
      window.open(link, '_blank');
    } else {
      // Construct Mailto with pre-filled content
      const subject = `应聘：${job.title} - ${job.company}`;
      const body = `你好，\n\n我在 OfferMagnet 上看到了贵公司发布的【${job.title}】职位，对该岗位非常感兴趣。\n\n附上我的简历与作品集，希望能有机会进一步沟通。\n\n谢谢！`;
      
      const mailtoUrl = `mailto:${link}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    }
  };

  // Determine button appearance
  const getApplyButtonConfig = () => {
    const link = job.applyLink || '';
    const isUrl = link.match(/^https?:\/\//i);
    
    if (isUrl) {
        return { text: '立即投递', icon: <ExternalLink size={12} />, className: 'bg-gray-900 hover:bg-black text-white' };
    } else {
        return { text: '一键邮件', icon: <Mail size={12} />, className: 'bg-indigo-600 hover:bg-indigo-700 text-white' };
    }
  };

  const btnConfig = getApplyButtonConfig();

  return (
    <div className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${expanded ? 'shadow-lg border-indigo-200' : 'shadow-sm border-gray-100 hover:shadow-md hover:border-indigo-100'}`}>
      
      {/* Colored Top Bar */}
      <div className={`absolute top-0 inset-x-0 h-1 ${typeConfig.barClass}`} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        
        {/* Header Row */}
        <div className="flex justify-between items-start gap-4">
           <div className="flex gap-4">
              {/* Company Logo / Placeholder */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                 <Building size={22} strokeWidth={1.5} />
              </div>
              
              <div>
                 <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">
                    {job.title}
                 </h3>
                 <div className="text-sm font-medium text-gray-500 mt-0.5">{job.company}</div>
              </div>
           </div>

           {job.salaryRange && (
             <div className="shrink-0 text-right">
                <span className="block text-lg font-extrabold text-indigo-600 leading-tight">
                  {job.salaryRange}
                </span>
                <span className="text-[10px] font-medium text-gray-400">/ 月</span>
             </div>
           )}
        </div>

        {/* Meta Info Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
           <span className={`px-2.5 py-1 rounded-lg border ${typeConfig.colorClass}`}>
              {typeConfig.label}
           </span>
           
           <div className="w-px h-3 bg-gray-200 mx-1"></div>

           <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600">
              <MapPin size={12} className="text-gray-400" />
              {job.location}
           </div>

           <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600">
              <Briefcase size={12} className="text-gray-400" />
              {job.role}
           </div>

           <div className="ml-auto flex items-center gap-1 text-gray-400">
              <Clock size={12} />
              <span>{getDaysAgo(job.createdAt)}</span>
           </div>
        </div>

        {/* Tags Row */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
             {job.tags.map((tag, i) => (
                <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-600 group-hover:border-gray-300 transition-colors cursor-default">
                   {tag}
                </span>
             ))}
          </div>
        )}

        {/* Description Section */}
        <div className="relative border-t border-gray-50 pt-3 mt-1">
             <div className={`prose prose-sm prose-slate max-w-none text-gray-600 text-sm leading-relaxed transition-all duration-300 ${expanded ? '' : 'max-h-20 overflow-hidden'}`}>
                <ReactMarkdown components={{
                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({children}) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                  li: ({children}) => <li className="pl-1">{children}</li>
                }}>
                  {job.description}
                </ReactMarkdown>
             </div>
             
             {/* Fade Overlay */}
             {!expanded && (
               <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
             )}
        </div>

      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
             {job.authorName && (
               <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                    {job.authorName[0]}
                  </div>
                  <span className={job.authorIsPro ? 'text-amber-600 font-medium' : ''}>
                    {job.authorName}
                  </span>
                  {job.authorIsPro && <Crown size={10} className="fill-amber-500 text-amber-500" />}
               </div>
             )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
             <button
               onClick={() => setExpanded(!expanded)}
               className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 px-2 py-1.5"
             >
                {expanded ? '收起详情' : '查看详情'}
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
             </button>

             <button
               onClick={handleApply}
               className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${btnConfig.className}`}
               title={job.applyLink ? '点击前往投递' : '生成邮件模板'}
             >
               {btnConfig.text} {btnConfig.icon}
             </button>
          </div>
      </div>
    </div>
  );
};

export default JobCard;