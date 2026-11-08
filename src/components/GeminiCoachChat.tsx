import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, X, Loader2, Dumbbell, Flame, Key } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { BodyMeasurement, CompletedWorkout } from '../types';

interface GeminiCoachChatProps {
  isOpen: boolean;
  onClose: () => void;
  measurements: BodyMeasurement[];
  workouts: CompletedWorkout[];
  onOpenSettings: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "How can I break my Bench Press plateau?",
  "What should my daily protein intake be for body recomposition?",
  "Are my weights increasing fast enough according to my logs?",
  "Recommend a finisher for chest and triceps",
];

export const GeminiCoachChat: React.FC<GeminiCoachChatProps> = ({
  isOpen,
  onClose,
  measurements,
  workouts,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'model',
      text: "Hey! I'm your AeroFit AI Coach powered by Gemini. I have your workout logs and body measurements loaded. Ask me anything about progressive overload, meal planning, or workout modifications!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasApiKey = Boolean(storageService.getGeminiApiKey());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const latestM = measurements[measurements.length - 1];

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!userText) setInput('');
    setLoading(true);

    try {
      if (!hasApiKey) {
        // Friendly simulation fallback response
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: `m-${Date.now()}`,
              sender: 'model',
              text: `Based on your recent measurements (Stomach: ${latestM?.stomachWaistCm || 83.5}cm, Chest: ${latestM?.chestCm || 105}cm):\n\n• You are making solid progress in progressive overload.\n• For optimal hypertrophy, target 1.8g to 2.2g of protein per kg of bodyweight daily.\n• Focus on adding 1-2 reps to your primary compound lifts next week!\n\n*(Tip: Add your free Gemini API key in Settings for full interactive conversation!)*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setLoading(false);
        }, 800);
        return;
      }

      // Format conversation history for Gemini API
      const conversationPayload = messages.slice(-6).map(m => ({
        role: m.sender,
        parts: [{ text: m.text }]
      }));
      conversationPayload.push({
        role: 'user',
        parts: [{ text: textToSend.trim() }]
      });

      const responseText = await geminiService.chatWithCoach(conversationPayload, {
        weight: latestM?.weightKg,
        stomach: latestM?.stomachWaistCm,
        chest: latestM?.chestCm,
        overloadRate: 75,
        recentWorkouts: workouts.slice(0, 3).map(w => `${w.routineName} (${w.totalVolumeKg}kg)`).join(', ')
      });

      setMessages(prev => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          sender: 'model',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: unknown) {
      const e = err as Error;
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'model',
          text: `⚠️ Error: ${e.message || 'Could not communicate with Gemini.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl h-[85vh] flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Gemini Fitness Coach</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-xs text-zinc-400">Contextual training & nutrition advisor</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* API Key notice if missing */}
        {!hasApiKey && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
            <span>Running in preview mode. Connect your free Gemini API key for live deep discussions.</span>
            <button
              onClick={onOpenSettings}
              className="px-2 py-1 rounded bg-amber-500/20 text-amber-200 font-semibold text-[11px] shrink-0"
            >
              Add Key
            </button>
          </div>
        )}

        {/* Chat Message Scroll */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'model' && (
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={15} />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-black font-medium'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>
                <span
                  className={`block text-[10px] mt-1.5 ${
                    msg.sender === 'user' ? 'text-black/60 text-right' : 'text-zinc-500 text-left'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 mt-1">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-xs text-zinc-400 p-2">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              <span>Gemini Coach is formulating scientific guidance...</span>
            </div>
          )}
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-4 py-2 border-t border-zinc-800/60 bg-zinc-950 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 whitespace-nowrap shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask Gemini Coach about exercises, weights, diet..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold transition-all shadow-md shadow-emerald-500/20"
          >
            <Send size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};

