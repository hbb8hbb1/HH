
import React, { useState } from 'react';
import { JobPost } from '../types';
import { Building, MapPin, Clock, Briefcase, Crown, ExternalLink, ChevronDown, ChevronUp, Mail, Bookmark, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-indigo-100 text-indigo-700 px-0.5 rounded-sm no-underline font-inherit">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

interface JobCardProps {
  job: JobPost;
  onToggleFavorite?: (id: string) => void;
  searchQuery?: string;
}

const JobCard: React.FC<JobCardProps> = ({ job, onToggleFavorite, searchQuery = '' }) => {
  const [expanded, setExpanded] = useState(false);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'campus': 
        return { 
          label: '校招', 
          colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100/50', 
          barClass: 'bg-emerald-400'
        };
      case 'intern': 
        return { 
          label: '实习', 
          colorClass: 'text-amber-700 bg-amber-50 border-amber-100/50', 
          barClass: 'bg-amber-400'
        };
      default: 
        return { 
          label: '社招', 
          colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-100/50', 
          barClass: 'bg-indigo-600'
        };
    }
  };

  const typeConfig = getTypeConfig(job.type);

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = job.applyLink || '';
    if (link.match(/^https?:\/\//i)) {
      window.open(link, '_blank');
    } else {
      window.location.href = `mailto:${link}`;
    }
  };

  return (
    <div className={`group relative bg-white rounded-2xl border transition-all duration-300 ${expanded ? 'shadow-xl border-indigo-200' : 'shadow-sm border-slate-100 hover:shadow-md'}`}>
      <div className={`absolute top-0 inset-x-0 h-1 z-10 ${typeConfig.barClass}`} />

      <div className="p-6">
        <div className="flex justify-between items-start gap-4 mb-4">
           <div className="flex gap-4 flex-1">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                 <Building size={24} />
              </div>
              <div className="min-w-0 flex-1">
                 <h3 className="text-lg font-bold text-slate-800 leading-tight truncate">
                    <HighlightText text={job.title} query={searchQuery} />
                 </h3>
                 <div className="text-sm font-semibold text-slate-500 truncate">
                    <HighlightText text={job.company} query={searchQuery} />
                 </div>
              </div>
           </div>
           {job.salaryRange && (
             <div className="shrink-0 text-right">
                <span className="block text-lg font-black text-indigo-600 leading-tight">{job.salaryRange}</span>
             </div>
           )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold mb-4">
           <span className={`px-2.5 py-1 rounded-full border ${typeConfig.colorClass}`}>{typeConfig.label}</span>
           <div className="flex items-center gap-1 text-slate-500"><MapPin size={12}/> {job.location}</div>
           <div className="flex items-center gap-1 text-slate-500"><Briefcase size={12}/> {job.role}</div>
        </div>

        <div className={`relative border-t border-slate-50 pt-4 overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[1000px]' : 'max-h-20'}`}>
             <div className="prose prose-sm prose-slate max-w-none text-slate-600">
                <ReactMarkdown>{job.description}</ReactMarkdown>
             </div>
             {!expanded && <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                {expanded ? '收起详情' : '展开详情'} {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
             </button>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => onToggleFavorite?.(job.id)} className={`p-2 rounded-full transition-all ${job.isFavorited ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500'}`}>
                <Bookmark size={18} className={job.isFavorited ? 'fill-indigo-600' : ''} />
             </button>
             <button onClick={handleApply} className="bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-black transition-all">立即投递</button>
          </div>
      </div>
    </div>
  );
};

export default JobCard;
