/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, RefreshCw, Info, ChevronRight, Eye, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

// Types
interface Color {
  r: number;
  g: number;
  b: number;
}

interface GameState {
  score: number;
  timeLeft: number;
  gridSize: number;
  difficulty: number; // 0 to 1, where 0 is easiest
  status: 'idle' | 'playing' | 'gameover';
}

const INITIAL_TIME = 30;
const BASE_GRID_SIZE = 5;

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    timeLeft: INITIAL_TIME,
    gridSize: BASE_GRID_SIZE,
    difficulty: 0.2, // Starting delta (as a fraction of 255)
    status: 'idle',
  });

  const [colors, setColors] = useState<{ base: Color; target: Color; targetIndex: number }>({
    base: { r: 0, g: 0, b: 0 },
    target: { r: 0, g: 0, b: 0 },
    targetIndex: -1,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate random color and target color
  const generateLevel = useCallback((currentScore: number) => {
    const r = Math.floor(Math.random() * 200) + 25; // Avoid too dark/light
    const g = Math.floor(Math.random() * 200) + 25;
    const b = Math.floor(Math.random() * 200) + 25;

    // Difficulty scaling: delta decreases as score increases
    // Starts at ~40 units, goes down to ~2 units
    const delta = Math.max(2, Math.floor(40 * Math.pow(0.92, currentScore)));
    
    // Randomly choose which channel to change
    const channel = Math.floor(Math.random() * 3);
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    const target = { r, g, b };
    if (channel === 0) target.r = Math.min(255, Math.max(0, r + delta * direction));
    else if (channel === 1) target.g = Math.min(255, Math.max(0, g + delta * direction));
    else target.b = Math.min(255, Math.max(0, b + delta * direction));

    const targetIndex = Math.floor(Math.random() * (BASE_GRID_SIZE * BASE_GRID_SIZE));

    setColors({
      base: { r, g, b },
      target,
      targetIndex,
    });
  }, []);

  const startGame = () => {
    setGameState({
      score: 0,
      timeLeft: INITIAL_TIME,
      gridSize: BASE_GRID_SIZE,
      difficulty: 0.2,
      status: 'playing',
    });
    generateLevel(0);
  };

  const handleBlockClick = (index: number) => {
    if (gameState.status !== 'playing') return;

    if (index === colors.targetIndex) {
      // Correct!
      const newScore = gameState.score + 1;
      setGameState(prev => ({
        ...prev,
        score: newScore,
        timeLeft: Math.min(INITIAL_TIME, prev.timeLeft + 2), // Add bonus time
      }));
      generateLevel(newScore);
      
      if (newScore % 10 === 0) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: [`rgb(${colors.base.r}, ${colors.base.g}, ${colors.base.b})`]
        });
      }
    } else {
      // Wrong! Penalty
      setGameState(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 3),
      }));
    }
  };

  useEffect(() => {
    if (gameState.status === 'playing' && gameState.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...prev, timeLeft: 0, status: 'gameover' };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.status]);

  const colorToCss = (c: Color) => `rgb(${c.r}, ${c.g}, ${c.b})`;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-zinc-900 flex items-center gap-2">
            <Eye className="w-8 h-8 text-indigo-600" />
            色彩视界
          </h1>
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest">艺术生色彩敏感度挑战</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase leading-none mb-1">得分</p>
              <p className="text-xl font-mono font-bold leading-none">{gameState.score}</p>
            </div>
          </div>
          
          <div className={`bg-white border border-zinc-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3 transition-colors ${gameState.timeLeft < 10 ? 'border-red-200 bg-red-50' : ''}`}>
            <Timer className={`w-5 h-5 ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`} />
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase leading-none mb-1">剩余时间</p>
              <p className={`text-xl font-mono font-bold leading-none ${gameState.timeLeft < 10 ? 'text-red-600' : ''}`}>
                {gameState.timeLeft}秒
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full max-w-md relative">
        <AnimatePresence mode="wait">
          {gameState.status === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xl text-center"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">准备好测试你的眼力了吗？</h2>
              <p className="text-zinc-500 mb-8">找出颜色略有不同的那个色块。随着得分增加，差异会越来越小。</p>
              <button 
                onClick={startGame}
                className="w-full bg-zinc-900 text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 group"
              >
                开始挑战
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {gameState.status === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid-container grid grid-cols-5 gap-2 md:gap-3"
            >
              {Array.from({ length: BASE_GRID_SIZE * BASE_GRID_SIZE }).map((_, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleBlockClick(i)}
                  className="color-block"
                  style={{ 
                    backgroundColor: i === colors.targetIndex ? colorToCss(colors.target) : colorToCss(colors.base) 
                  }}
                />
              ))}
            </motion.div>
          )}

          {gameState.status === 'gameover' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xl text-center"
            >
              <h2 className="text-3xl font-bold mb-2 text-red-600">时间到！</h2>
              <div className="flex flex-col items-center mb-8">
                <p className="text-zinc-400 font-mono uppercase text-xs tracking-widest mb-1">最终得分</p>
                <p className="text-6xl font-bold tracking-tighter">{gameState.score}</p>
              </div>
              
              <div className="bg-zinc-50 rounded-2xl p-4 mb-8 text-left border border-zinc-100">
                <div className="flex items-center gap-2 mb-2 text-zinc-700 font-bold text-sm">
                  <Info className="w-4 h-4" />
                  表现评价
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  {gameState.score < 15 ? "继续练习！你的眼睛还在适应细微的数值变化。" : 
                   gameState.score < 30 ? "令人印象深刻！你对色调变化的敏锐度已达到专业设计师水平。" : 
                   "大师级！你的色彩敏感度处于艺术生中的顶尖 1%。"}
                </p>
              </div>

              <button 
                onClick={startGame}
                className="w-full bg-zinc-900 text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                再试一次
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Info Section */}
      <footer className="w-full max-w-2xl mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-500" />
            游戏规则
          </h3>
          <ul className="text-sm text-zinc-500 space-y-2 list-disc pl-4">
            <li>每次选择正确会增加 2 秒剩余时间。</li>
            <li>选择错误会扣除 3 秒作为惩罚。</li>
            <li>难度呈指数级增加；每一关的色彩差异（Delta）都会缩小。</li>
            <li>旨在测试 JND（最小可觉差）阈值。</li>
          </ul>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            色彩差异可视化
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-zinc-100 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${Math.max(5, 100 - (gameState.score * 2))}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono uppercase">当前色彩差异 (难度)</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-700">
                {Math.max(2, Math.floor(40 * Math.pow(0.92, gameState.score)))} 单位
              </p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-4 leading-tight italic">
            * Delta 代表单个 RGB 通道的数值差异。专业艺术生通常能分辨 2-3 单位的差异。
          </p>
        </div>
      </footer>
    </div>
  );
}
