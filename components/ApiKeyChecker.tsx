
import React, { useEffect, useState } from 'react';

interface ApiKeyCheckerProps {
  onReady: () => void;
}

export const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onReady }) => {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manualKey, setManualKey] = useState('');

  const checkKey = async () => {
    try {
      // 1. Check local storage
      const stored = localStorage.getItem('gemini_api_key');
      if (stored && stored.trim().length > 0) {
        setHasKey(true);
        onReady();
        return;
      }

      // 2. Check AI Studio Context
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
        const selected = await aistudio.hasSelectedApiKey();
        if (selected) {
          setHasKey(true);
          onReady();
          return;
        }
      } 
      
      // 3. Fallback check for process.env (in case it was injected)
      // Note: We can't see the value, but we assume if app is built with it, we might skip.
      // However, usually we can't detect it easily if hidden. 
      // We'll rely on the user or the aistudio check.
      setHasKey(false);
    } catch (e) {
      console.error("Error checking API key", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkKey();
  }, [onReady]);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      await aistudio.openSelectKey();
      // Assume success after dialog interaction per instructions (race condition mitigation)
      setHasKey(true);
      onReady();
    } else {
      alert("Môi trường không hỗ trợ chọn API Key trực tiếp. Vui lòng nhập Key thủ công bên dưới.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualKey.trim().length > 10) {
      localStorage.setItem('gemini_api_key', manualKey.trim());
      setHasKey(true);
      onReady();
    } else {
      alert("API Key không hợp lệ (quá ngắn).");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-gray-500">Đang kiểm tra cấu hình...</div>
      </div>
    );
  }

  if (hasKey) {
    return null; // Don't render anything if key is ready
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-yellow-100 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800">Yêu cầu API Key</h2>
        <p className="mb-6 text-gray-600 text-sm">
          Để sử dụng model <strong>Nano Banana Pro</strong> (Gemini 3 Pro Image), bạn cần có API Key từ Google AI Studio.
        </p>
        
        <button
          onClick={handleSelectKey}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 shadow-lg shadow-brand-500/30"
        >
          Chọn API Key (Google Account)
        </button>

        <div className="relative my-6">
           <div className="absolute inset-0 flex items-center">
             <div className="w-full border-t border-gray-200"></div>
           </div>
           <div className="relative flex justify-center text-sm">
             <span className="px-2 bg-white text-gray-500">Hoặc nhập thủ công</span>
           </div>
        </div>

        <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
           <input 
             type="password" 
             placeholder="Dán mã API Key của bạn vào đây..." 
             value={manualKey}
             onChange={(e) => setManualKey(e.target.value.replace(/[^\x00-\x7F]/g, "").trim())}
             className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
           />
           <button 
             type="submit"
             disabled={!manualKey}
             className="w-full rounded-lg bg-gray-800 px-4 py-3 font-semibold text-white transition hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             Xác nhận
           </button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          Chưa có key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-brand-600">Lấy key tại đây</a>.
          <br/>
          Tham khảo <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-brand-600">tài liệu thanh toán</a>.
        </p>
      </div>
    </div>
  );
};
