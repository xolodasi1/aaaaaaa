/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Video, Sparkles, AlertCircle, Key, Film, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Episode {
  id: string;
  prompt: string;
  videoUrl: string;
  createdAt: Date;
}

export default function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const generateEpisode = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    setLoadingMessage('Initializing AI studio...');

    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      setLoadingMessage('Writing the storyboard...');

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `${prompt}, 2d anime style, high quality animation, vibrant colors, masterpiece, studio ghibli style, detailed`,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      const loadingMessages = [
        "Sketching the characters...",
        "Painting the backgrounds...",
        "Animating the keyframes...",
        "Adding special effects...",
        "Rendering the final video...",
        "Polishing the episode..."
      ];
      let messageIndex = 0;

      const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, 15000);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      clearInterval(messageInterval);

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

      if (!downloadLink) {
        throw new Error("Failed to generate video URI.");
      }

      setLoadingMessage('Downloading your episode...');

      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!videoResponse.ok) {
        const errText = await videoResponse.text();
        throw new Error(`Failed to fetch video: ${videoResponse.statusText} - ${errText}`);
      }

      const blob = await videoResponse.blob();
      const videoUrl = URL.createObjectURL(blob);

      setEpisodes(prev => [{
        id: Date.now().toString(),
        prompt,
        videoUrl,
        createdAt: new Date()
      }, ...prev]);

      setPrompt('');
    } catch (err: any) {
      console.error(err);
      const errorMessage = typeof err.message === 'string' ? err.message : JSON.stringify(err);
      
      if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
          setError("Error 403: The provided API key does not have permission to use the Veo video model. Please ensure your Google Cloud Project has billing enabled.");
          setHasKey(false);
      } else {
          setError(errorMessage || 'An error occurred while generating the episode.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
            <Key className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Custom API Key Required</h1>
            <p className="text-neutral-400 leading-relaxed">
              Video generation requires a personal Google Cloud API key with billing enabled. The default free key cannot be used for this feature.
            </p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
          >
            Select Your API Key
          </button>
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-400/10 py-2 px-3 rounded-lg text-left">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Film className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
              Anime Studio AI
            </h1>
          </div>
          <button
            onClick={handleSelectKey}
            className="text-xs font-medium text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors bg-neutral-900 hover:bg-neutral-800 py-1.5 px-3 rounded-full border border-neutral-800"
          >
            <Key className="w-3 h-3" />
            Change Key
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Generator Section */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Generate New Episode</h2>
            <p className="text-neutral-400">Describe the scene, characters, and action. We'll animate it in a vibrant anime style.</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-2 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A young swordsman with silver hair standing on a cliff overlooking a futuristic cyberpunk city at sunset, wind blowing through his coat..."
              className="w-full h-32 bg-transparent text-neutral-100 placeholder:text-neutral-600 resize-none outline-none p-4 text-lg"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between p-2 border-t border-neutral-800/50 mt-2">
              <div className="flex items-center gap-2 text-xs text-neutral-500 px-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Veo 3.1 Fast Generate</span>
              </div>
              <button
                onClick={generateEpisode}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Create Episode
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 p-4 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl mt-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-blue-400">Studio is working...</h3>
                    <p className="text-sm text-neutral-400">{loadingMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Episodes Gallery */}
        {episodes.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">Your Episodes</h2>
              <span className="text-sm text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence>
                {episodes.map((episode) => (
                  <motion.div
                    key={episode.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden group"
                  >
                    <div className="aspect-video bg-black relative">
                      <video
                        src={episode.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster={`https://picsum.photos/seed/${episode.id}/1920/1080?blur=10`}
                      />
                    </div>
                    <div className="p-5 space-y-3">
                      <p className="text-sm text-neutral-300 line-clamp-2 leading-relaxed">
                        "{episode.prompt}"
                      </p>
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{episode.createdAt.toLocaleTimeString()}</span>
                        <a
                          href={episode.videoUrl}
                          download={`anime-episode-${episode.id}.mp4`}
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Save Video
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
        
        {episodes.length === 0 && !isGenerating && (
          <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-3xl">
            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Film className="w-6 h-6 text-neutral-600" />
            </div>
            <h3 className="text-lg font-medium text-neutral-300 mb-1">No episodes yet</h3>
            <p className="text-neutral-500">Write a description above to generate your first anime scene.</p>
          </div>
        )}
      </main>
    </div>
  );
}
