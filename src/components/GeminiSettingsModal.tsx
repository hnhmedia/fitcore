import React, { useState } from 'react';
import { 
  Key, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Download, 
  Upload, 
  RotateCcw, 
  X, 
  Settings, 
  Volume2, 
  VolumeX,
  Trash2 
} from 'lucide-react';
import { storageService, UserPreferences } from '../services/storageService';
import { geminiService } from '../services/geminiService';

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: () => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
  isOpen,
  onClose,
  onDataReloaded,
}) => {
  const [apiKey, setApiKey] = useState(storageService.getGeminiApiKey());
  const [model, setModel] = useState(storageService.getGeminiModel());
  const [prefs, setPrefs] = useState<UserPreferences>(storageService.getPreferences());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    storageService.saveGeminiApiKey(apiKey);
    storageService.saveGeminiModel(model);
    setTestStatus('success');
    setTestMessage('API Key saved successfully!');
    setTimeout(() => setTestStatus('idle'), 2500);
  };

  const handleTestConnection = async () => {
    storageService.saveGeminiApiKey(apiKey);
    storageService.saveGeminiModel(model);
    setTestStatus('testing');
    setTestMessage(null);

    try {
      const response = await geminiService.generateWithGemini(
        'Respond with one word: "Connected!"',
        'You are an AI assistant.'
      );
      setTestStatus('success');
      setTestMessage(`Gemini responded: "${response.trim()}"`);
    } catch (err: unknown) {
      const e = err as Error;
      setTestStatus('error');
      setTestMessage(e.message || 'Connection failed. Please check your API key.');
    }
  };

  const handleTogglePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    storageService.savePreferences(updated);
  };

  const handleExportData = () => {
    const jsonStr = storageService.exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerofit-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storageService.importAllDataJson(content);
      if (success) {
        setImportStatus('Backup restored successfully!');
        onDataReloaded();
      } else {
        setImportStatus('Failed to restore backup. Invalid format.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Reset routines, workouts, and measurements to demo data?')) {
      storageService.resetToDefault();
      onDataReloaded();
      onClose();
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all logged workouts and body measurements? Your saved routines will be kept so you can start fresh.')) {
      storageService.clearAllData(false);
      onDataReloaded();
      setImportStatus('All workout and body measurement logs have been cleared. Ready for your personal data!');
    }
  };

  const handleClearEverything = () => {
    if (confirm('Are you sure you want to completely erase ALL data, including all routines, workouts, and measurements?')) {
      storageService.clearAllData(true);
      onDataReloaded();
      setImportStatus('Entire app data has been erased.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gemini AI & App Settings</h2>
              <p className="text-xs text-zinc-400">Configure your AI model, unit preferences, and data backups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Gemini API Key Box */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Key size={14} /> Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 flex items-center gap-1"
            >
              Get free key from Google AI Studio <ExternalLink size={12} />
            </a>
          </div>

          <p className="text-[11px] text-zinc-400 mb-2">
            Your key stays securely inside your browser's local storage.
          </p>

          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs sm:text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 mb-3"
          />

          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Gemini Model (Interactions API)
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Latest, Ultra Fast & Recommended)</option>
              <option value="gemini-3.8-pro">Gemini 3.8 Pro (Advanced Sports Biomechanics & Planning)</option>
            </select>
          </div>

          {/* Action & Feedback */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveApiKey}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all shadow-sm"
            >
              Save Key
            </button>
            <button
              onClick={handleTestConnection}
              disabled={!apiKey || testStatus === 'testing'}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-semibold text-xs transition-all"
            >
              {testStatus === 'testing' ? 'Testing Connection...' : 'Test Gemini Connection'}
            </button>
          </div>

          {testMessage && (
            <div className={`mt-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              testStatus === 'success'
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                : 'bg-red-950/40 text-red-400 border border-red-800/40'
            }`}>
              {testStatus === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        {/* User Preferences */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Preferences</h3>

          {/* Units */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">Weight Unit</span>
            <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
              <button
                onClick={() => handleTogglePref('unit', 'kg')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  prefs.unit === 'kg' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                kg
              </button>
              <button
                onClick={() => handleTogglePref('unit', 'lbs')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  prefs.unit === 'lbs' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                lbs
              </button>
            </div>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">Sound Alerts & Timer Chimes</span>
            <button
              onClick={() => handleTogglePref('soundEnabled', !prefs.soundEnabled)}
              className={`p-2 rounded-lg border transition-colors ${
                prefs.soundEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {prefs.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Backup & Data Management */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Data Management</h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> Export Backup (.JSON)
            </button>

            <label className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload size={14} /> Restore Backup
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {importStatus && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">{importStatus}</p>
          )}

          {/* Reset & Wipe Options */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">Clear all workout logs & measurements:</span>
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} /> Clear Logs (Fresh Start)
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">Reset to starter demo data:</span>
              <button
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={13} /> Reset Demo Data
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">Wipe entire app (including routines):</span>
              <button
                onClick={handleClearEverything}
                className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
              >
                Erase Everything
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs"
        >
          Done
        </button>

      </div>
    </div>
  );
};

