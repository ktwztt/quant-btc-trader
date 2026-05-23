import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

const SIGNALS_DOCS = `signals 对象可用属性:

  signals.price      — 当前价格 (number)
  signals.rsi        — RSI 值 (number)
  signals.macd       — { histogram, line, signal }
  signals.ma         — { 7: value, 25: value, 99: value }
  signals.ema        — { 9: value, 21: value, 55: value }
  signals.bb         — { upper, middle, lower, pctB }
  signals.adx        — { adx, plusDI, minusDI }
  signals.atr        — ATR 值 (number)
  signals.stoch      — { k, d }
  signals.mfi        — MFI 值 (number)
  signals.cci        — CCI 值 (number)
  signals.williamsR  — Williams %R 值 (number)
  signals.obv        — OBV 值 (number)
  signals.vwap       — VWAP 值 (number)
  signals.regime     — { regime: 'UPTREND'|'DOWNTREND'|'RANGING', score, components }
  signals.fundingRate — 资金费率 (number)
  signals.polymarket — { outcomes: [{price, name}] }
  signals.klines     — 最近 500 根 K 线数组

返回值: 'BUY' | 'SELL' | 'HOLD'`;

export default function StrategyEditor({ isOpen, onClose, strategies, activeStrategyId, onSave, onDelete, onRename, onCreate, onSelect }) {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  const activeStrategy = strategies.find((s) => s.id === activeStrategyId);

  useEffect(() => {
    if (activeStrategy) {
      setCode(activeStrategy.code);
      setError(null);
    }
  }, [activeStrategyId, activeStrategy?.code]);

  useEffect(() => {
    if (!isOpen || !editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setCode(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        javascript(),
        oneDark,
        updateListener,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          indentWithTab,
        ]),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          '.cm-content': { padding: '8px 0' },
          '.cm-gutters': { backgroundColor: '#1a1a2e', borderRight: '1px solid #2a2a3e' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isOpen]);

  const validateCode = useCallback((codeStr) => {
    try {
      const wrapped = `(${codeStr})`;
      new Function('signals', `return (${wrapped}).evaluate ? (${wrapped}).evaluate(signals) : (${wrapped})(signals)`);
      return null;
    } catch (e) {
      return e.message;
    }
  }, []);

  const handleSave = () => {
    const err = validateCode(code);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSave({ ...activeStrategy, code });
  };

  const handleCreate = () => {
    onCreate();
  };

  const handleDelete = (id) => {
    if (confirm('确定删除此策略？')) {
      onDelete(id);
    }
  };

  const startRename = (id, name) => {
    setEditingId(id);
    setEditingName(name);
  };

  const finishRename = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  if (!isOpen) return null;

  const customStrategies = strategies.filter((s) => !s.builtin);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl mx-4 h-[80vh] bg-dark-surface border border-dark-border
                      rounded-vercel-lg shadow-vercel-5 fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold tracking-tight-display">策略编辑器</h2>
            <p className="text-xs font-mono text-dark-text-secondary mt-0.5">编写自定义交易策略</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-dark-text-secondary hover:text-dark-text hover:bg-dark-card transition-colors">
            ✕
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-56 border-r border-dark-border flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-dark-border">
              <button onClick={handleCreate}
                className="w-full py-2 text-xs font-mono rounded-vercel-sm border border-dark-border
                           text-dark-text-secondary hover:text-dark-text hover:border-hairline-strong transition-colors">
                + 新建策略
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Builtin */}
              <div
                onClick={() => onSelect('__builtin__')}
                className={`px-3 py-2.5 cursor-pointer border-b border-dark-border/50 transition-colors ${
                  activeStrategyId === '__builtin__'
                    ? 'bg-dark-card text-dark-text'
                    : 'text-dark-text-secondary hover:bg-dark-card/50'
                }`}
              >
                <span className="text-xs font-mono">内置策略</span>
                <span className="block text-[10px] font-mono text-dark-text-secondary/60 mt-0.5">
                  默认复合评分策略
                </span>
              </div>

              {/* Custom strategies */}
              {customStrategies.length > 0 && (
                <div className="px-2 pt-2 pb-1">
                  <span className="text-[10px] font-mono text-dark-text-secondary/60 uppercase tracking-wider">
                    自定义策略
                  </span>
                </div>
              )}
              {customStrategies.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`px-3 py-2 cursor-pointer border-b border-dark-border/50 transition-colors group ${
                    activeStrategyId === s.id
                      ? 'bg-dark-card text-dark-text'
                      : 'text-dark-text-secondary hover:bg-dark-card/50'
                  }`}
                >
                  {editingId === s.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={finishRename}
                      onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                      className="w-full h-6 px-1 bg-dark-bg border border-link rounded text-xs font-mono
                                 text-dark-text focus:outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono truncate">{s.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(s.id, s.name); }}
                          className="text-[10px] text-dark-text-secondary hover:text-dark-text"
                          title="重命名"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                          className="text-[10px] text-dark-text-secondary hover:text-down-red"
                          title="删除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-dark-text-secondary">
                  {activeStrategy?.name || '未选择'}
                </span>
                {activeStrategy?.builtin && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-dark-card text-dark-text-secondary">
                    只读
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDocs(!showDocs)}
                  className={`text-xs font-mono px-3 py-1 rounded-vercel-sm border transition-colors ${
                    showDocs
                      ? 'border-link text-link'
                      : 'border-dark-border text-dark-text-secondary hover:text-dark-text'
                  }`}>
                  API 文档
                </button>
                {!activeStrategy?.builtin && (
                  <button onClick={handleSave}
                    className="text-xs font-mono px-4 py-1.5 rounded-vercel-sm bg-white text-ink
                               hover:bg-white/90 transition-colors">
                    保存
                  </button>
                )}
              </div>
            </div>

            {/* Error bar */}
            {error && (
              <div className="px-4 py-2 bg-error/10 border-b border-error/20 flex-shrink-0">
                <p className="text-xs font-mono text-error">{error}</p>
              </div>
            )}

            {/* Editor + Docs */}
            <div className="flex-1 flex min-h-0">
              <div ref={editorRef} className={`flex-1 min-w-0 ${showDocs ? 'w-2/3' : 'w-full'}`} />
              {showDocs && (
                <div className="w-1/3 border-l border-dark-border overflow-y-auto p-4 bg-dark-bg/50 flex-shrink-0">
                  <h3 className="text-xs font-mono font-semibold text-dark-text mb-2">Signals API</h3>
                  <pre className="text-[11px] font-mono text-dark-text-secondary whitespace-pre-wrap leading-relaxed">
                    {SIGNALS_DOCS}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
