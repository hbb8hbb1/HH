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
    }, 300); // 等待动画完成
  }, []);

  const handleSelect = useCallback((selectedValue: string) => {
    // 立即应用选中状态，但延迟 100ms 后关闭，增强确认感
    onSelect(selectedValue);
    setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 300);
    }, 100);
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
    <div className="relative" ref={dropdownRef}>
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
            ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/50 hover:scale-[1.02]'
            : 'bg-white/95 text-slate-700 border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md hover:bg-white hover:scale-[1.01]'
          }
          min-w-[140px] justify-between group backdrop-blur-sm
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
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
            style={{ backgroundColor: 'transparent' }}
          />
          
          <div 
            className={`absolute top-full left-0 mt-2 w-full min-w-[260px] 
                       bg-white/99 backdrop-blur-xl 
                       border border-slate-200/90 
                       rounded-2xl
                       z-50 overflow-hidden overflow-x-hidden
                       transition-all duration-300 ease-out
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

// 暂时不使用 React.memo，确保功能正常
const MemoizedCustomDropdown = CustomDropdown;

export const FilterPanel: React.FC<Props> = ({ filters, onFilterChange, isLoading = false }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        setError(null);

        // 设置超时，避免无限加载
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch('/api/filter-options', {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // 适配API响应格式：直接返回数据对象，不需要success包装
        // 将API返回的选项数组转换为FilterOptions格式
        const formattedOptions: FilterOptions = {
          company: {
            label: '公司',
            type: 'dynamic',
            values: (data.companies || ['全部']).map((c: string) => ({ value: c, label: c }))
          },
          location: {
            label: '地点',
            type: 'dynamic',
            values: (data.locations || ['全部']).map((l: string) => ({ value: l, label: l }))
          },
          category: {
            label: '类别',
            type: 'dynamic',
            values: (data.categories || ['全部']).map((c: string) => ({ value: c, label: c }))
          },
          recruitType: {
            label: '招聘类型',
            type: 'dynamic',
            values: (data.recruitTypes || ['全部']).map((r: string) => ({ value: r, label: r }))
          },
          experience: {
            label: '经验',
            type: 'dynamic',
            values: (data.experiences || ['全部']).map((e: string) => ({ value: e, label: e }))
          },
          salary: {
            label: '薪资',
            type: 'dynamic',
            values: (data.salaries || ['全部']).map((s: string) => ({ value: s, label: s }))
          }
        };

        setFilterOptions(formattedOptions);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch filter options:', err);

        // 使用默认的筛选选项作为降级方案
        const defaultOptions: FilterOptions = {
          company: {
            label: '公司',
            type: 'fixed',
            values: [
              { value: '', label: '全部' },
              { value: '字节跳动', label: '字节跳动' },
              { value: 'Google', label: 'Google' },
              { value: 'Meta', label: 'Meta' },
              { value: '腾讯', label: '腾讯' },
              { value: '阿里巴巴', label: '阿里巴巴' }
            ]
          },
          location: {
            label: '地点',
            type: 'fixed',
            values: [
              { value: '', label: '全部' },
              { value: '北京', label: '北京' },
              { value: '上海', label: '上海' },
              { value: '深圳', label: '深圳' },
              { value: '杭州', label: '杭州' }
            ]
          },
          category: {
            label: '类别',
            type: 'fixed',
            values: [
              { value: '', label: '全部' },
              { value: '研发', label: '研发' },
              { value: '算法', label: '算法' },
              { value: '产品', label: '产品' },
              { value: '设计', label: '设计' }
            ]
          },
          recruitType: {
            label: '招聘类型',
            type: 'fixed',
            values: [
              { value: '', label: '全部' },
              { value: '社招', label: '社招' },
              { value: '校招', label: '校招' },
              { value: '实习', label: '实习' }
            ]
          },
          experience: {
            label: '经验',
            type: 'fixed',
            values: [
              { value: '', label: '全部' },
              { value: '0-2年', label: '0-2年' },
              { value: '2-5年', label: '2-5年' },
              { value: '5年以上', label: '5年以上' }
            ]
          },
          salary: {
            label: '薪资',
            type: 'fixed',
            values: [
              { value: '', label: '全部' },
              { value: '10k以下', label: '10k以下' },
              { value: '10k-20k', label: '10k-20k' },
              { value: '20k-30k', label: '20k-30k' },
              { value: '30k以上', label: '30k以上' }
            ]
          }
        };

        setFilterOptions(defaultOptions);
        setError(null); // 不显示错误，直接使用默认选项
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleReset = useCallback(() => {
    DIMENSION_CONFIG.forEach(({ key }) => {
      onFilterChange(key, '');
    });
  }, [onFilterChange]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">加载筛选器...</div>
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

  // 按顺序排序维度 - 使用 useMemo 缓存
  const sortedDimensions = useMemo(() => {
    return [...DIMENSION_CONFIG].sort((a, b) => a.order - b.order);
  }, []);

  // 使用 useMemo 缓存活跃筛选状态
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v && v !== '');
  }, [filters]);

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

