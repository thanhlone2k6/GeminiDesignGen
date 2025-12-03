
import React, { useState, useRef, useEffect } from 'react';
import { UploadedImage } from '../types';
import { chatWithAssistant, ChatMessage } from '../services/geminiService';

interface PromptAssistantProps {
  onApplyPrompt: (prompt: string) => void;
  onClose: () => void;
}

export const PromptAssistant: React.FC<PromptAssistantProps> = ({ onApplyPrompt, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Xin chào! Hãy dán (Ctrl+V) hoặc kéo thả ảnh vào đây. Tôi sẽ giúp bạn phân tích và viết Prompt tiếng Việt chi tiết.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Pending Image State (Draft)
  const [pendingImage, setPendingImage] = useState<UploadedImage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Global Paste (Only when this component is active/focused, handled via wrapper)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await processImageToDraft(file);
        return;
      }
    }
  };

  const processImageToDraft = async (file: File) => {
    const uploadedImage = await new Promise<UploadedImage>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.includes('base64,') ? base64String.split('base64,')[1] : base64String;
        resolve({
          id: Date.now().toString(),
          base64: base64Data,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    });
    setPendingImage(uploadedImage);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            await processImageToDraft(file);
        }
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !pendingImage) return;

    // Capture current state for the message
    const msgText = inputText;
    const msgImage = pendingImage;

    // Reset input state immediately
    setInputText('');
    setPendingImage(null);
    setIsLoading(true);

    const newUserMsg: ChatMessage = { role: 'user', text: msgText, image: msgImage || undefined };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);

    try {
        const responseText = await chatWithAssistant(messages, msgText, msgImage || undefined);
        setMessages([...newHistory, { role: 'model', text: responseText }]);
    } catch (error) {
        setMessages([...newHistory, { role: 'model', text: "Lỗi kết nối AI. Vui lòng thử lại." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  };

  return (
    <div 
        className={`flex flex-col h-full w-full overflow-hidden transition-all ${isDragging ? 'bg-brand-900/20' : ''}`}
        onPaste={handlePaste}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800 shrink-0 min-h-[60px]">
        <div className="flex items-center gap-2 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-bold text-white text-sm truncate">AI Prompt Assistant</span>
        </div>
        
        {/* Only show Close button if onClose is provided and meant to be interactive (Mobile) */}
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white rounded-full p-1 hover:bg-white/10 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Messages Area - Added min-h-0 for proper flex scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 scrollbar-hide w-full">
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-1 w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.image && (
                    <img 
                        src={`data:${msg.image.mimeType};base64,${msg.image.base64}`} 
                        className="w-32 h-32 object-cover rounded-lg border border-white/20 mb-1"
                        alt="User upload" 
                    />
                )}
                {msg.text && (
                   <div className={`p-3 rounded-2xl text-sm max-w-[95%] whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                     {msg.text}
                     {msg.role === 'model' && (
                         <div className="mt-2 pt-2 border-t border-white/10 flex gap-2">
                             <button 
                               onClick={() => {
                                 // Smart copy: Try to find content within code blocks or structured text
                                 onApplyPrompt(msg.text)
                               }}
                               className="text-xs bg-black/20 hover:bg-black/40 px-2 py-1 rounded text-brand-300 font-bold"
                             >
                               Use Prompt
                             </button>
                             <button 
                               onClick={() => navigator.clipboard.writeText(msg.text)}
                               className="text-xs bg-black/20 hover:bg-black/40 px-2 py-1 rounded text-slate-300"
                             >
                               Copy
                             </button>
                         </div>
                     )}
                   </div>
                )}
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-slate-700 p-3 rounded-2xl rounded-bl-none text-slate-400 text-xs flex gap-1 items-center">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Added shrink-0 to prevent compression */}
      <div className="p-3 border-t border-white/10 bg-slate-800 shrink-0 w-full relative z-10">
        
        {/* Pending Image Preview */}
        {pendingImage && (
            <div className="relative mb-2 inline-block">
                <img 
                    src={`data:${pendingImage.mimeType};base64,${pendingImage.base64}`} 
                    className="h-16 w-16 object-cover rounded-lg border border-brand-500 shadow-lg"
                    alt="Preview" 
                />
                <button 
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                   </svg>
                </button>
            </div>
        )}

        <div className="relative">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pendingImage ? "Thêm mô tả cho ảnh này..." : "Ctrl+V ảnh hoặc nhập yêu cầu..."}
                className="w-full bg-slate-900 text-white text-sm rounded-xl px-4 py-3 pr-10 border border-slate-700 focus:border-brand-500 outline-none resize-none h-12 scrollbar-hide"
            />
            <button 
                onClick={sendMessage}
                disabled={isLoading || (!inputText.trim() && !pendingImage)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-500 hover:text-brand-400 disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
            </button>
        </div>
        <div className="text-[10px] text-slate-500 text-center mt-2 truncate">
            AI trích xuất prompt Tiếng Việt chi tiết
        </div>
      </div>
    </div>
  );
};
