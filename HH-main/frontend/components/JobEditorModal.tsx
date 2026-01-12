
import React, { useState } from 'react';
import { X, Building, MapPin, Briefcase, Banknote, Tag as TagIcon, Save, Loader2 } from 'lucide-react';
import { JobPost, JobType } from '../types';

interface JobEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Omit<JobPost, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorIsPro'>) => void;
}

const JobEditorModal: React.FC<JobEditorModalProps> = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [type, setType] = useState<JobType>('social');
  const [description, setDescription] = useState('');
  const [applyLink, setApplyLink] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = () => {
    if (!title || !company || !description) {
       alert("请填写必要信息 (标题、公司、描述)");
       return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
        onSave({
            title,
            company,
            role,
            location,
            salaryRange,
            type,
            description,
            tags,
            applyLink
        });
        setIsSubmitting(false);
    }, 500);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
               <Briefcase size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">发布招聘信息</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-6">
           <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex gap-4">
                 {(['social', 'campus', 'intern'] as const).map((t) => (
                    <label key={t} className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${type === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-100'}`}>
                        <input type="radio" name="jobType" className="hidden" checked={type === t} onChange={() => setType(t)} />
                        <span className="font-bold text-sm">
                            {t === 'social' && '社招'}
                            {t === 'campus' && '校招'}
                            {t === 'intern' && '实习'}
                        </span>
                    </label>
                 ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-full">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">职位名称 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-gray-800"
                      placeholder="例如：高级前端工程师"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><Building size={12}/> 公司名称 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      placeholder="例如：字节跳动"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><MapPin size={12}/> 工作地点</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      placeholder="例如：北京 / 上海"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><Banknote size={12}/> 薪资范围</label>
                    <input 
                      type="text" 
                      value={salaryRange}
                      onChange={e => setSalaryRange(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      placeholder="例如：25k-40k"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><Briefcase size={12}/> 职能分类</label>
                    <input 
                      type="text" 
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      placeholder="例如：研发 / 产品 / 运营"
                    />
                 </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase flex items-center gap-1"><TagIcon size={12}/> 技能标签 (回车添加)</label>
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-indigo-900"><X size={12}/></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    className="flex-1 bg-transparent focus:outline-none text-sm min-w-[60px]"
                    placeholder="React, Java, 沟通能力..."
                  />
                </div>
              </div>
              
              <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">职位描述 & 要求 <span className="text-red-500">*</span></label>
                 <textarea
                   className="w-full h-40 p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm leading-relaxed resize-none"
                   placeholder="支持 Markdown 格式..."
                   value={description}
                   onChange={e => setDescription(e.target.value)}
                 />
              </div>

              <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">投递链接 / 邮箱</label>
                 <input 
                   type="text" 
                   value={applyLink}
                   onChange={e => setApplyLink(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                   placeholder="https://... 或 hr@company.com"
                 />
              </div>
           </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
            发布职位
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobEditorModal;
