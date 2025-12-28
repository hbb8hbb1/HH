import React, { useState } from 'react';
import { X, Check, Crown, Zap, Shield, Star, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { upgradeToPro, user } = useAuth();

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await upgradeToPro();
      // Optional: Add a success animation or confetti here
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800"></div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="relative pt-12 px-8 pb-8 text-center">
           <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg mb-6 border-4 border-white/10 ring-4 ring-white">
              <Crown size={40} className="text-white" />
           </div>

           <h2 className="text-2xl font-bold text-gray-900 mb-2">升级 OfferMagnet <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-purple-600">Pro</span></h2>
           <p className="text-gray-500 mb-8">解锁 AI 写作全部潜力，助力求职之路。</p>

           {/* Features List */}
           <div className="space-y-4 mb-8 text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex items-start gap-3">
                 <div className="bg-green-100 p-1 rounded-full text-green-600 mt-0.5"><Check size={14} /></div>
                 <div>
                    <h4 className="font-bold text-gray-800 text-sm">无限次 AI 智能润色</h4>
                    <p className="text-xs text-gray-500">不再受每日次数限制，随时整理面经。</p>
                 </div>
              </div>
              <div className="flex items-start gap-3">
                 <div className="bg-green-100 p-1 rounded-full text-green-600 mt-0.5"><Check size={14} /></div>
                 <div>
                    <h4 className="font-bold text-gray-800 text-sm">尊贵会员标识</h4>
                    <p className="text-xs text-gray-500">独有的金色皇冠头像框与 Pro 徽章。</p>
                 </div>
              </div>
              <div className="flex items-start gap-3">
                 <div className="bg-green-100 p-1 rounded-full text-green-600 mt-0.5"><Check size={14} /></div>
                 <div>
                    <h4 className="font-bold text-gray-800 text-sm">优先展示与推荐</h4>
                    <p className="text-xs text-gray-500">你的面经和评论将获得更多曝光。</p>
                 </div>
              </div>
           </div>

           {/* Pricing Action */}
           <div className="flex items-center justify-between mb-6 px-2">
              <div className="text-left">
                 <span className="block text-xs text-gray-400 line-through">¥ 29.00 / 月</span>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-gray-900">¥ 9.9</span>
                    <span className="text-sm font-medium text-gray-500">/ 首月特惠</span>
                 </div>
              </div>
              <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                 限时 3 折
              </div>
           </div>

           <button
             onClick={handleUpgrade}
             disabled={isProcessing}
             className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
           >
             {isProcessing ? (
               <Loader2 className="animate-spin" />
             ) : (
               <>
                 <span>立即升级</span>
                 <Zap size={20} className="text-yellow-400 fill-yellow-400 group-hover:animate-pulse" />
               </>
             )}
             {/* Shine effect */}
             <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
           </button>
           
           <p className="text-[10px] text-gray-400 mt-4">
             订阅可随时取消。通过点击上面的按钮，您同意我们的服务条款和隐私政策。
           </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;