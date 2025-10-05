import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { App, TFolder } from 'obsidian';

export function FolderTreeSelector({
  value,
  onSelect,
  className,
  app,
  placeholder
}: {
  value?: string;
  onSelect: (path: string) => void;
  className?: string;
  app: App;
  placeholder?: string;
}) {
  const root: TFolder | null = (app.vault as any).getRoot?.() ?? null;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | undefined>(value);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const matches = useCallback(
    (folder: TFolder) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const name = (folder.name || '').toLowerCase();
      const path = (folder.path === '/' ? '/' : folder.path).toLowerCase();
      return name.includes(q) || path.includes(q);
    },
    [query]
  );

  const filterHasMatch = useCallback(
    (folder: TFolder): boolean => {
      if (matches(folder)) return true;
      const kids = (folder.children ?? []) as any[];
      for (const child of kids) {
        if ((child as any).children && filterHasMatch(child as TFolder)) return true;
      }
      return false;
    },
    [matches]
  );

  const toggleExpand = useCallback((path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const renderFolder = (folder: TFolder, depth: number): React.ReactNode => {
    const visible = query ? filterHasMatch(folder) : true;
    if (!visible) return null;
    const normalized = folder.path === '/' ? '' : folder.path;
    const isSelected = (selectedPath ?? value) === normalized;
    const children = (folder.children ?? []) as any[];
    const hasChildren = children.some((c) => c && (c as any).children);
    const isExpanded = query ? true : expanded.has(normalized);
    return (
      <div className="folder-node" style={{ marginLeft: depth * 12 }}>
        <div
          className={`folder-item${isSelected ? ' selected' : ''}`}
          onMouseDown={(e) => {
            // Prevent input blur before we handle selection
            e.preventDefault();
            setSelectedPath(normalized);
            setQuery(normalized || '/');
            onSelect(normalized);
            setOpen(false);
          }}
        >
          {hasChildren ? (
            <span
              className="folder-toggle"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpand(normalized);
              }}
              title={isExpanded ? '折叠' : '展开'}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="folder-toggle placeholder" />
          )}
          <span className="folder-name">{folder.name || '根目录'}</span>
        </div>
        {isExpanded && (
          <div className="folder-children">
            {children.map((child: any) => {
              if (child && (child as any).children) {
                return renderFolder(child as TFolder, depth + 1);
              }
              return null;
            })}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    // Initialize input display from provided value
    if (value && value !== selectedPath) {
      setSelectedPath(value);
      setQuery(value || '/');
    }
  }, [value]);

  // 初始化展开：根目录 + 选中路径的祖先路径
  useEffect(() => {
    const init = new Set<string>(['']);
    const current = selectedPath ?? value ?? '';
    if (current) {
      const parts = current.split('/').filter(Boolean);
      let acc = '';
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        init.add(acc);
      }
    }
    setExpanded(init);
  }, []);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!root) {
    return <div>未能获取 vault 根目录。</div>;
  }

  return (
    <div ref={wrapperRef} className={`folder-combobox ${className ?? ''}`}>
      <input
        className="folder-search"
        placeholder={placeholder ?? '搜索或选择文件夹...'}
        value={query}
        onFocus={() => setOpen(true)}
        onClick={() => {
          setOpen(true);
          // 如果当前查询等于选中路径或是根路径，点击时展开完整树
          const current = selectedPath ?? value ?? '';
          if (query === current || query === '/' ) {
            setQuery('');
          }
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // 输入搜索时，自动让所有节点视图处于展开状态以便浏览匹配
          // 展开逻辑在渲染时基于 query 已处理（query 时强制展开）
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
          } else if (e.key === 'ArrowDown') {
            // 保证键盘操作也能展开选择框
            setOpen(true);
          }
        }}
      />
      {open && (
        <div className="folder-dropdown">
          {renderFolder(root, 0)}
        </div>
      )}
    </div>
  );
}
