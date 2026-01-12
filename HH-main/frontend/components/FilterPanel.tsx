import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Building2, MapPin, Layers, Briefcase, User, DollarSign, ChevronDown, Check, X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  labelEn?: string;
}

interface FilterDimension {
  label: string;
  labelEn?: string;
  type: 'fixed' | 'dynamic';
  values: FilterOption[];
}

interface FilterOptions {
  [key: string]: FilterDimension;
}

export interface Filters {
  company: string;
  location: string;
  category: string;
  recruitType: string;
  experience: string;
  salary: string;
}

interface Props {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  isLoading?: boolean;
}

export const initialFilters: Filters = {
  company: '',
  location: '',
  category: '',
  recruitType: '',
  experience: '',
  salary: '',
};

// 筛选维度顺序和图标映射
const DIMENSION_CONFIG: Array<{
  key: keyof Filters;
  icon: React.ReactNode;
  order: number;
}> = [
  { key: 'recruitType', icon: <Briefcase size={16} />, order: 1 },
  { key: 'category', icon: <Layers size={16} />, order: 2 },
  { key: 'company', icon: <Building2 size={16} />, order: 3 },
  { key: 'location', icon: <MapPin size={16} />, order: 4 },
  { key: 'experience', icon: <User size={16} />, order: 5 },
  { key: 'salary', icon: <DollarSign size={16} />, order: 6 },
];

// 虚拟滚动功能暂时移除，确保页面正常显示
// 待功能稳定后再添加虚拟滚动优化（>50项时）

// 自定义下拉组件 - 优化UI设计，添加动画过渡，性能优化
interface CustomDropdownProps {
  icon: React.ReactNode;
  label: string;
  options: FilterOption[];
  value: string;
  onSelect: (value: string) => void;
  isActive: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ icon, label, options, value, onSelect, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200); // 减少动画时间从 300ms 到 200ms，提升响应速度
  }, []);

  const handleSelect = useCallback((selectedValue: string) => {
    // 立即应用选中状态，快速关闭下拉菜单（减少延迟）
    onSelect(selectedValue);
    // 减少延迟：从 100ms + 300ms 减少到 50ms + 200ms
    setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 200); // 减少动画时间从 300ms 到 200ms
    }, 50); // 减少确认延迟从 100ms 到 50ms
  }, [onSelect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen && !isClosing) {
          handleClose();
        }
      }
    };
    if (isOpen && !isClosing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isClosing, handleClose]);

  // 使用 useMemo 缓存选中标签，避免重复计算
  const selectedLabel = useMemo(() => {
    return options.find(opt => opt.value === value)?.label || label;
  }, [options, value, label]);

  // 使用 useMemo 缓存筛选后的选项（如果未来需要过滤）
  const displayOptions = useMemo(() => options, [options]);

  return (
    <div className="relative z-[60]" ref={dropdownRef}>
      {/* 按钮 */}
      <button
        onClick={() => {
          if (isClosing) return; // 关闭动画期间不响应点击
          if (isOpen) {
            handleClose();
          } else {
            setIsOpen(true);
            setIsClosing(false);
          }
        }}
        disabled={isClosing}
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-200 ease-out
          ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}
          ${isActive
            ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-white/95 text-slate-700 border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md hover:bg-white hover:scale-[1.01] active:scale-[0.98]'
          }
          min-w-[140px] justify-between group backdrop-blur-sm gpu-accelerated
        `}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={`transition-colors duration-150 ${isActive ? 'text-white' : 'text-indigo-500 group-hover:text-indigo-600'}`}>
            {icon}
          </span>
          <span className="truncate font-medium">
            {value ? selectedLabel : label}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-indigo-500'}`} 
        />
      </button>

      {/* 下拉菜单 - 添加 fade-in + slide-down 动画 */}
      {isOpen && (
        <>
          {/* 背景遮罩层（用于点击外部关闭） */}
          <div 
            className={`fixed inset-0 z-[55] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
            style={{ backgroundColor: 'transparent' }}
          />
          
          <div 
            className={`absolute top-full left-0 mt-2 w-full min-w-[260px] 
                       bg-white/99 backdrop-blur-xl 
                       border border-slate-200/90 
                       rounded-2xl
                       z-[60] overflow-hidden overflow-x-hidden
                       transition-all duration-200 ease-out
                       ${isClosing 
                         ? 'opacity-0 -translate-y-2 scale-95 pointer-events-none' 
                         : 'opacity-100 translate-y-0 scale-100 dropdown-enter'
                       }`}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(148, 163, 184, 0.1), 0 10px 40px -10px rgba(99, 102, 241, 0.1)',
              transformOrigin: 'top center'
            }}
          >
            {/* 选项容器 */}
            <div className="py-2">
              {/* 全部选项 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect('');
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5 mx-1.5 mb-1 rounded-lg
                  text-sm font-medium transition-all duration-150 ease-out
                  ${!value 
                    ? 'bg-gradient-to-r from-indigo-50 via-indigo-50/90 to-indigo-100/70 text-indigo-700 font-semibold' 
                    : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-indigo-50/30 hover:text-indigo-600'
                  }
                  group/item
                `}
              >
                <span className="flex items-center gap-3">
                  {!value ? (
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm checkmark-enter">
                      <Check size={14} className="text-white" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover/item:border-indigo-400 group-hover/item:bg-indigo-50 transition-all duration-150"></div>
                  )}
                  <span className="font-medium">全部</span>
                </span>
              </button>
              
              {/* 选项列表 - 暂时禁用虚拟滚动，确保功能正常 */}
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                {displayOptions.map((opt, index) => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt.value);
                    }}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 mx-1.5 ${index === 0 ? 'mt-0' : 'my-0.5'} rounded-lg
                      text-sm font-medium transition-all duration-150 ease-out
                      ${value === opt.value 
                        ? 'bg-gradient-to-r from-indigo-50 via-indigo-50/90 to-indigo-100/70 text-indigo-700 font-semibold' 
                        : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-indigo-50/30 hover:text-indigo-600'
                      }
                      group/item
                    `}
                  >
                    <span className="flex items-center gap-3 truncate flex-1 min-w-0">
                      {value === opt.value ? (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm flex-shrink-0 checkmark-enter">
                          <Check size={14} className="text-white" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover/item:border-indigo-400 group-hover/item:bg-indigo-50 transition-all duration-150 flex-shrink-0"></div>
                      )}
                      <span className="truncate font-medium">{opt.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 使用 React.memo 优化性能，避免不必要的重新渲染
const MemoizedCustomDropdown = React.memo(CustomDropdown, (prevProps, nextProps) => {
  // 自定义比较函数：只在关键属性改变时重新渲染
  return (
    prevProps.value === nextProps.value &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.options === nextProps.options &&
    prevProps.label === nextProps.label
  );
});

export const FilterPanel: React.FC<Props> = ({ filters, onFilterChange, isLoading = false }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 使用 useRef 缓存筛选选项，避免重复请求
  const filterOptionsCacheRef = useRef<FilterOptions | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // 清除旧的缓存（修复公司名称规范化问题后，需要清除旧缓存）
    const CACHE_KEY = 'offermagnet_filter_options';
    const CACHE_VERSION = '2.0'; // 版本号，用于强制清除旧缓存
    const CACHE_VERSION_KEY = 'offermagnet_filter_options_version';
    
    try {
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      if (cachedVersion !== CACHE_VERSION) {
        // 版本不匹配，清除旧缓存
        localStorage.removeItem(CACHE_KEY);
        localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
        filterOptionsCacheRef.current = null; // 清除内存缓存
        console.log('[FilterPanel] 检测到缓存版本更新，已清除旧缓存');
      }
    } catch (e) {
      console.warn('[FilterPanel] 缓存版本检查失败:', e);
    }

    // 优先从内存缓存读取
    if (filterOptionsCacheRef.current) {
      setFilterOptions(filterOptionsCacheRef.current);
      setLoading(false);
      return;
    }

    // 从 localStorage 读取缓存（避免每次刷新都请求）
    const CACHE_TTL = 30 * 60 * 1000; // 30分钟缓存
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        if (now - timestamp < CACHE_TTL) {
          // 缓存有效，直接使用
          filterOptionsCacheRef.current = data;
          setFilterOptions(data);
          setLoading(false);
          console.log('[FilterPanel] 使用 localStorage 缓存');
          return;
        } else {
          // 缓存过期，清除
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
      console.warn('[FilterPanel] localStorage 读取失败:', e);
    }

    // 如果正在加载，不重复请求
    if (isLoadingRef.current) {
      return;
    }

    const fetchFilterOptions = async () => {
      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);
        // 添加 refresh 参数强制刷新后端缓存
        const response = await fetch('/api/filter-options?refresh=true');
        const data = await response.json();
        
        if (data.success) {
          filterOptionsCacheRef.current = data.data; // 内存缓存
          setFilterOptions(data.data);
          
          // 保存到 localStorage
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data: data.data,
              timestamp: Date.now()
            }));
            console.log('[FilterPanel] 已保存到 localStorage 缓存');
          } catch (e) {
            console.warn('[FilterPanel] localStorage 保存失败:', e);
          }
        } else {
          setError(data.error || '加载筛选选项失败');
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
        setError('网络错误，无法加载筛选选项');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    fetchFilterOptions();
  }, []);

  const handleReset = useCallback(() => {
    DIMENSION_CONFIG.forEach(({ key }) => {
      onFilterChange(key, '');
    });
  }, [onFilterChange]);

  // ✅ 所有 hooks 必须在早期返回之前调用，遵循 React Hooks 规则
  // 按顺序排序维度 - 使用 useMemo 缓存
  const sortedDimensions = useMemo(() => {
    return [...DIMENSION_CONFIG].sort((a, b) => a.order - b.order);
  }, []);

  // 使用 useMemo 缓存活跃筛选状态
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v && v !== '');
  }, [filters]);

  // 早期返回必须在所有 hooks 之后
  // 优化：只在首次加载时显示加载状态，后续使用缓存不显示加载
  if ((loading || isLoading) && !filterOptionsCacheRef.current) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>加载筛选器...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-red-500">⚠️ {error}</div>
      </div>
    );
  }

  if (!filterOptions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">筛选器数据不可用</div>
      </div>
    );
  }

  return (
    <div className="filter-panel">
      <div className="flex flex-wrap items-center gap-3">
        {sortedDimensions.map(({ key, icon }) => {
          const dim = filterOptions[key];
          if (!dim) return null;

          const currentValue = filters[key];
          const hasSelection = currentValue && currentValue !== '';

          return (
            <MemoizedCustomDropdown
              key={key}
              icon={icon}
              label={dim.label}
              options={dim.values}
              value={currentValue || ''}
              onSelect={(value) => onFilterChange(key, value)}
              isActive={hasSelection}
            />
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium 
                     text-slate-600 bg-white border-2 border-slate-200 
                     hover:border-red-300 hover:text-red-600 hover:bg-red-50
                     transition-all duration-200 shadow-sm whitespace-nowrap"
          >
            <X size={16} />
            重置
          </button>
        )}
      </div>
    </div>
  );
};

