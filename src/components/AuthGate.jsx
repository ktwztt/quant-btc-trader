import { useState, useEffect } from 'react';

const AUTH_KEY = 'quant_auth_ok';

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(AUTH_KEY, '1');
        setAuthed(true);
      } else {
        setError('密码错误');
      }
    } catch {
      setError('验证失败，请重试');
    }
  };

  if (checking) return null;

  if (authed) return children;

  return (
    <div className="h-screen flex items-center justify-center bg-dark-bg">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full gradient-develop flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">₿</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight-display">QuantBTC</h1>
          <p className="text-xs font-mono text-dark-text-secondary mt-1">量化分析终端</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="输入访问密码"
              autoFocus
              className="w-full h-11 px-4 bg-dark-surface border border-dark-border rounded-vercel-sm
                         text-sm font-mono text-dark-text placeholder:text-dark-text-secondary/50
                         focus:outline-none focus:border-link transition-colors"
            />
            {error && (
              <p className="text-xs font-mono text-error mt-2">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-white text-ink rounded-vercel-pill text-sm font-medium
                       hover:bg-white/90 transition-colors"
          >
            进入
          </button>
        </form>

        <p className="text-[10px] font-mono text-dark-text-secondary/40 text-center mt-6">
          数据来源: Binance · Polymarket
        </p>
      </div>
    </div>
  );
}
