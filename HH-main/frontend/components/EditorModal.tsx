
import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { processInterviewContent } from '../services/geminiService';
import { ProcessedResponse } from '../types';
import { 
  X, Sparkles, Loader2, Save, Eye, Edit3, Tag as TagIcon, 
  Building, Briefcase, Star, Bold, Italic, List, Code, 
  Link as LinkIcon, Lock, Globe, FileText, Info
} from 'lucide-react';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProcessedResponse, original: string) => void;
}

const TEMPLATES = {
  technical: `## 个人背景\n(在这里介绍你的学校、专业、当前职级等)\n\n## 笔试题目\n(分享你遇到的编程题、算法题)\n\n## 技术面试环节\n### 一面\n- 问题1\n- 问题2\n\n### 二面\n- 问题1\n\n## 总结与建议\n(面试过程中的避坑点)`,
  behavioral: `## 面试形式\n(电话面试/视频面试/现场面试)\n\n## 核心问题\n1. 为什么选择我们公司？\n2. 讲一个你遇到的最有挑战性的项目。\n\n## STAR法则复盘\n(Situation, Task, Action, Result)`,
  system_design: `## 设计题目\n(例如：设计一个短链接生成器)\n\n## 需求分析\n- QPS 估算\n- 数据一致性要求\n\n## 架构设计\n(核心逻辑描述)`
};

const EditorModal: React.FC<EditorModalProps> = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  
  const [originalRaw, setOriginalRaw] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    const beforeText = text.substring(0, start);
    const selectedText = text.substring(start, end);
    const afterText = text.substring(end);

    const newContent = `${beforeText}${before}${selectedText}${after}${afterText}`;
    setContent(newContent);
    
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleApplyTemplate = (type: keyof typeof TEMPLATES) => {
    if (content.trim() && !confirm("应用模板将覆盖当前内容，确定吗？")) return;
    setContent(TEMPLATES[type]);
    setActiveTab('edit');
  };

  const handleSmartFill = async () => {
    if (!content.trim()) return;
    setIsProcessing(true);
    setOriginalRaw(content); 

    try {
      const data = await processInterviewContent(content);
      setTitle(data.title);
      setCompany(data.company);
      setRole(data.role);
      setDifficulty(data.difficulty);
      setTags(data.tags);
      setContent(data.processedContent);
      setActiveTab('preview');
    } catch (err) {
      console.error("AI processing failed", err);
      alert("AI 处理失败，请检查网络或稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert("请至少填写标题和正文");
      return;
    }

    const postData: ProcessedResponse & { isAnonymous: boolean } = {
      title,
      company: company || '未知公司',
      role: role || '未知职位',
      difficulty,
      tags,
      processedContent: content,
      isAnonymous
    };

    onSave(postData, originalRaw || content);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <Edit3 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 leading-none">发布新面经</h2>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Share your interview experience</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
          <div className="flex flex-col lg:flex-row h-full">
            
            <div className="flex-1 p-6 border-r border-gray-100 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setIsAnonymous(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAnonymous ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                       <Lock size={12} /> 匿名发布
                    </button>
                    <button 
                      onClick={() => setIsAnonymous(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isAnonymous ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                       <Globe size={12} /> 实名分享
                    </button>
                 </div>

                 <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium mr-1">选用模板:</span>
                    <button onClick={() => handleApplyTemplate('technical')} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-bold text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-all">技术面</button>
                    <button onClick={() => handleApplyTemplate('behavioral')} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-bold text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-all">行为面</button>
                    <button onClick={() => handleApplyTemplate('system_design')} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-bold text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-all">系统设计</button>
                 </div>
              </div>

              <div>
                 <input 
                   type="text" 
                   value={title}
                   onChange={e => setTitle(e.target.value)}
                   className="w-full text-2xl font-black bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-300 text-gray-900"
                   placeholder="给你的面经起一个响亮的标题..."
                 />
                 <div className="h-px bg-gray-100 w-full mt-2"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">公司</label>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:outline-none" placeholder="如: Google" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">职位</label>
                    <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:outline-none" placeholder="如: 前端工程师" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">难度</label>
                    <div className="flex items-center gap-1 h-9">
                       {[1,2,3,4,5].map(s => (
                          <Star key={s} size={16} onClick={() => setDifficulty(s)} className={`cursor-pointer transition-all ${s <= difficulty ? 'text-amber-400 fill-amber-400 scale-110' : 'text-gray-200'}`} />
                       ))}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">标签</label>
                    <input type="text" value={tagInput} onKeyDown={addTag} onChange={e => setTagInput(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:outline-none" placeholder="回车添加" />
                 </div>
              </div>

              <div className="flex flex-col h-[400px] border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                 <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                    <button onClick={() => insertText('**', '**')} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition-all" title="加粗"><Bold size={16}/></button>
                    <button onClick={() => insertText('*', '*')} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition-all" title="斜体"><Italic size={16}/></button>
                    <button onClick={() => insertText('\n- ')} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition-all" title="列表"><List size={16}/></button>
                    <button onClick={() => insertText('```\n', '\n```')} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition-all" title="代码块"><Code size={16}/></button>
                    <button onClick={() => insertText('[', '](url)')} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition-all" title="链接"><LinkIcon size={16}/></button>
                    <div className="w-px h-4 bg-gray-200 mx-2"></div>
                    <button 
                      onClick={handleSmartFill} 
                      disabled={isProcessing || !content.trim()}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI 智能排版
                    </button>
                 </div>
                 
                 <textarea
                   ref={textareaRef}
                   value={content}
                   onChange={e => setContent(e.target.value)}
                   className="flex-1 p-5 focus:outline-none text-sm leading-relaxed text-gray-700 font-mono scrollbar-hide"
                   placeholder="写下你的面试心得，或者直接粘贴原始网页源码..."
                 />
                 
                 <div className="px-4 py-2 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-bold text-gray-400 uppercase">字数: {content.length}</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase">行数: {content.split('\n').length}</span>
                    </div>
                    {content.length > 500 && (
                       <div className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                          <Info size={10} /> 内容丰富，质量上乘！
                       </div>
                    )}
                 </div>
              </div>
            </div>

            <div className="hidden lg:flex w-[400px] bg-gray-50 border-l border-gray-100 flex-col">
               <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Eye size={14} /> 实时预览
                  </span>
                  <div className="flex gap-1">
                     <div className="w-2 h-2 rounded-full bg-red-400"></div>
                     <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                     <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
               </div>
               <div className="flex-1 p-6 overflow-y-auto prose prose-sm prose-slate max-w-none">
                  {content ? (
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-800 mt-6 mb-3 flex items-center gap-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-2 text-gray-600" {...props} />,
                        code: ({node, ...props}: any) => <code className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                        pre: ({node, ...props}: any) => <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto my-4 font-mono shadow-inner" {...props} />
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                       <FileText size={48} className="text-gray-200 mb-4" />
                       <p className="text-gray-400 font-medium">还没有内容可以预览</p>
                       <p className="text-[10px] text-gray-300 mt-1 uppercase">Preview your story here</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
              {tags.map(t => (
                 <span key={t} className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    #{t}
                 </span>
              ))}
           </div>
           <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                舍弃草稿
              </button>
              <button 
                onClick={handleSave}
                disabled={isProcessing}
                className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Save size={18} />
                确认并发布
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default EditorModal;
