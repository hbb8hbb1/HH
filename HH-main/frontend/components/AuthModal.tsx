import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2, ArrowRight, UserCheck, Briefcase, GraduationCap, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'login' }) => {
  const [view, setView] = useState<'login' | 'register'>(initialView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('job_seeker');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register, loginAsGuest } = useAuth();
  
  const roleOptions: Array<{ value: UserRole; label: string; icon: React.ReactNode; description: string }> = [
    { 
      value: 'job_seeker', 
      label: '求职者', 
      icon: <Briefcase size={20} />,
      description: '发布面经、查看职位'
    },
    { 
      value: 'recruiter', 
      label: '招聘者', 
      icon: <GraduationCap size={20} />,
      description: '发布职位、招聘人才'
    },
    { 
      value: 'coach', 
      label: '辅导者', 
      icon: <MessageSquare size={20} />,
      description: '提供面试辅导、分享经验'
    }
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (view === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center">
           <button 
             onClick={onClose} 
             className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
           >
             <X size={20} />
           </button>
           
           <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-full mb-4">
              <UserCheck size={24} />
           </div>

           <h2 className="text-2xl font-bold text-gray-900 mb-2">
             {view === 'login' ? '欢迎回来' : '加入 OfferMagnet'}
           </h2>
           <p className="text-sm text-gray-500">
             {view === 'login' 
               ? '登录以保存面经、评论和收藏' 
               : '创建账户，开启你的求职进阶之路'}
           </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-4 space-y-4">
          {view === 'register' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 ml-1">昵称</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="给自己起个好名字"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 ml-1">选择身份</label>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        role === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={role === option.value ? 'text-blue-600' : 'text-gray-400'}>
                          {option.icon}
                        </div>
                        <span className="text-xs font-semibold">{option.label}</span>
                        <span className="text-[10px] text-gray-500 leading-tight">{option.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 ml-1">邮箱</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 ml-1">密码</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="至少6个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs text-center bg-red-50 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {view === 'login' ? '登 录' : '注册账号'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="px-8 pb-6">
           <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">或者</span>
              <div className="flex-grow border-t border-gray-100"></div>
           </div>
           
           <button
             onClick={handleGuestLogin}
             className="w-full py-2.5 border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
           >
             <UserIcon size={16} />
             以游客身份体验
           </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-sm text-gray-600">
            {view === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              onClick={() => {
                setView(view === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="ml-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              {view === 'login' ? '立即注册' : '直接登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;