import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { processInterviewContent } from '../services/geminiService';
import { ProcessedResponse } from '../types';
import { X, Sparkles, Loader2, Save, Eye, Edit3, Tag as TagIcon, Building, Briefcase, Star } from 'lucide-react';

interface EditorModalProps {
  onClose: () => void;
  onSave: (data: ProcessedResponse, original: string) => void;
}

const EditorModal: React.FC<EditorModalProps> = ({ onClose, onSave }) => {
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
  
  const [originalRaw, setOriginalRaw] = useState(''); // Keep track of raw input if AI was used

  const handleSmartFill = async () => {
    if (!content.trim()) return;
    setIsProcessing(true);
    // Keep a copy of what the user originally pasted
    setOriginalRaw(content); 

    try {
      const data = await processInterviewContent(content);
      
      // Auto-fill form
      setTitle(data.title);
      setCompany(data.company);
      setRole(data.role);
      setDifficulty(data.difficulty);
      setTags(data.tags);
      setContent(data.processedContent);
      
      // Switch to preview to show off the result
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

    const postData: ProcessedResponse = {
      title,
      company: company || '未知公司',
      role: role || '未知职位',
      difficulty,
      tags,
      processedContent: content
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

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <Edit3 size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">发布新内容</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50">
          <div className="p-6 max-w-3xl mx-auto space-y-6">
            
            {/* AI Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 p-4 rounded-xl flex items-start sm:items-center justify-between gap-4">
               <div>
                 <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                   <Sparkles size={14} className="text-indigo-600" />
                   AI 智能助手
                 </h3>
                 <p className="text-xs text-indigo-700 mt-1">
                   在正文中粘贴杂乱的面试笔记，点击右侧按钮，AI 将自动提取标题、公司、职位并润色正文。
                 </p>
               </div>
               <button
                 onClick={handleSmartFill}
                 disabled={isProcessing || !content.trim()}
                 className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm
                   ${isProcessing || !content.trim() 
                     ? 'bg-indigo-300 cursor-not-allowed' 
                     : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'}`}
               >
                 {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                 {isProcessing ? '分析中...' : '一键智能填充'}
               </button>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="col-span-full">
                 <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">标题 <span className="text-red-500">*</span></label>
                 <input 
                   type="text" 
                   value={title}
                   onChange={e => setTitle(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-gray-800 placeholder:font-normal"
                   placeholder="例如：字节跳动前端一面面经 - 2024"
                 />
               </div>

               <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><Building size={12}/> 公司</label>
                 <input 
                   type="text" 
                   value={company}
                   onChange={e => setCompany(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                   placeholder="例如：Google"
                 />
               </div>

               <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><Briefcase size={12}/> 职位</label>
                 <input 
                   type="text" 
                   value={role}
                   onChange={e => setRole(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                   placeholder="例如：高级软件工程师"
                 />
               </div>
            </div>

            {/* Difficulty & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><Star size={12}/> 面试难度 (1-5)</label>
                 <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl">
                   {[1, 2, 3, 4, 5].map((star) => (
                     <button
                       key={star}
                       type="button"
                       onClick={() => setDifficulty(star)}
                       className="focus:outline-none transition-transform hover:scale-110"
                     >
                       <Star 
                         size={20} 
                         className={`${star <= difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                       />
                     </button>
                   ))}
                   <span className="text-xs text-gray-400 ml-auto">{difficulty} 分</span>
                 </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><TagIcon size={12}/> 标签 (回车添加)</label>
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-blue-900"><X size={12}/></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    className="flex-1 bg-transparent focus:outline-none text-sm min-w-[60px]"
                    placeholder={tags.length === 0 ? "例如: 动态规划..." : ""}
                  />
                </div>
              </div>
            </div>

            {/* Editor / Preview Tabs */}
            <div className="flex flex-col h-[400px]">
               <div className="flex border-b border-gray-200 mb-0">
                 <button
                   onClick={() => setActiveTab('edit')}
                   className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'edit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                   正文编辑
                 </button>
                 <button
                   onClick={() => setActiveTab('preview')}
                   className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1 ${activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                 >
                   <Eye size={14}/> 预览效果
                 </button>
               </div>

               <div className="flex-1 bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden shadow-sm relative">
                  {activeTab === 'edit' ? (
                    <textarea
                      className="w-full h-full p-4 resize-none focus:outline-none text-sm leading-relaxed text-gray-700"
                      placeholder="在这里输入面试经过、题目细节和心得体会...&#10;&#10;💡 小贴士：你可以直接粘贴杂乱的笔记，然后点击上方的“一键智能填充”来整理内容。"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                    />
                  ) : (
                    <div className="w-full h-full p-4 overflow-y-auto prose prose-sm prose-slate max-w-none">
                      {content ? (
                        <ReactMarkdown
                           components={{
                             h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-800 mt-4 mb-2" {...props} />,
                             h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-800 mt-3 mb-2" {...props} />,
                             li: ({node, ...props}) => <li className="marker:text-blue-500" {...props} />,
                             code: ({node, ...props}) => {
                                const { className, children } = props as any;
                                const isBlock = /language-/.test(className || '') || (typeof children === 'string' && children.includes('\n'));
                                return isBlock 
                                    ? <code className="block bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs my-3 font-mono" {...props} />
                                    : <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                             },
                           }}
                        >
                          {content}
                        </ReactMarkdown>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无内容</div>
                      )}
                    </div>
                  )}
               </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
          >
            <Save size={18} />
            发布帖子
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorModal;