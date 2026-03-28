// pages/tools/escape.js
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// 预设的异常突破关卡数据
const LEVELS = [
    {
        id: 1,
        name: "收容单元 01 - 基础格式偏移",
        description: "系统的基础排版模块受到轻微干扰，一些常规的闭合标签发生了变异。",
        time: 45,
        original: "这是一段**加粗**的警告文本。\n[[collapsible show=\"+ 展开面板\" hide=\"- 收起面板\"]]\n内部机密数据\n[[/collapsible]]",
        damaged: "这是一段**加粗*的警告文本。\n[[collapsbile show=\"+ 展开面板\" hide=\"- 收起面板\"]]\n内部机密数据\n[[/collapsible]]",
        errorCount: 2
    },
    {
        id: 2,
        name: "收容单元 02 - 结构性组件损坏",
        description: "页面结构层遭到破坏，部分 Div 容器与模块调用的括号丢失或拼写错误。",
        time: 60,
        original: "[[div class=\"warning-box\"]]\n危险：检测到模因污染。\n[[/div]]\n\n[[module Rate]]",
        damaged: "[[div class=\"warning-box\"]\n危险：检测到模因污染。\n[[/div]]\n\n[[modul Rate]]",
        errorCount: 2
    },
    {
        id: 3,
        name: "收容单元 03 - 深度逻辑崩溃",
        description: "多重排版语法交织处发生严重错误，请在核心熔毁前修复所有语法错漏。",
        time: 90,
        original: "[[>]]\n右对齐的引用块\n[[/>]]\n\n[[div style=\"color: red; padding: 10px;\"]]\n**核心已熔毁**\n[[/div]]",
        damaged: "[[>]]\n右对齐的引用块\n[[/ >]]\n\n[[div style=\"color: red; padding: 10px;\"]\n**核心已熔毁*\n[[/div]]",
        errorCount: 3
    }
];

export default function CodeEscape() {
    const [gameState, setGameState] = useState('idle'); // 状态：idle, playing, success, fail
    const [currentLevel, setCurrentLevel] = useState(0);
    const [code, setCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [score, setScore] = useState(0);

    const timerRef = useRef(null);

    // 处理倒计时逻辑
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (gameState === 'playing' && timeLeft <= 0) {
            setGameState('fail');
        }

        return () => clearTimeout(timerRef.current);
    }, [timeLeft, gameState]);

    // 开始指定关卡
    const startGame = (levelIndex) => {
        const levelData = LEVELS[levelIndex];
        setCurrentLevel(levelIndex);
        setCode(levelData.damaged);
        setTimeLeft(levelData.time);
        setGameState('playing');
    };

    // 提交代码进行验证
    const handleVerify = () => {
        if (gameState !== 'playing') return;

        const levelData = LEVELS[currentLevel];
        // 简单去除首尾空格后进行精确匹配
        if (code.trim() === levelData.original.trim()) {
            setGameState('success');
            // 计算得分：基础分 + 剩余时间奖励
            const levelScore = 100 + timeLeft * 2;
            setScore(prev => prev + levelScore);
        } else {
            // 提交错误会受到时间惩罚
            setTimeLeft(prev => Math.max(0, prev - 5));
        }
    };

    // 放弃当前关卡
    const handleAbort = () => {
        setGameState('idle');
        clearTimeout(timerRef.current);
    };

    return (
        <>
            <Head>
                <title>异常突破：代码修复逃脱 - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-red-500 tracking-tight">
                        <i className="fa-solid fa-triangle-exclamation mr-3"></i>
                        异常突破：代码修复逃脱
                    </h1>
                    <p className="mt-2 text-gray-400 text-sm">
                        收容失效警告。你被困在虚拟控制室中，必须在倒计时结束前修复受损的 Wikidot 语法才能重启隔离门。
                    </p>
                </div>

                {gameState === 'idle' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        {LEVELS.map((level, index) => (
                            <div key={level.id} className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 flex flex-col justify-between hover:border-red-500/50 transition-colors">
                                <div>
                                    <div className="text-red-400 font-mono text-sm mb-2">SECURITY LEVEL 0{level.id}</div>
                                    <h3 className="text-xl font-bold text-white mb-2">{level.name}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed h-16">
                                        {level.description}
                                    </p>
                                    <div className="flex gap-4 mt-4 text-sm text-gray-500 font-mono">
                                        <span>时间限制: {level.time}s</span>
                                        <span>异常数: {level.errorCount}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => startGame(index)}
                                    className="mt-6 w-full py-2.5 bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-900/50 rounded-lg font-bold transition-colors"
                                >
                                    进入控制室
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center bg-gray-900 border border-red-900/50 p-4 rounded-lg">
                            <div>
                                <div className="text-gray-400 text-sm mb-1">当前区域</div>
                                <div className="text-white font-bold">{LEVELS[currentLevel].name}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-sm mb-1">系统崩溃倒计时</div>
                                <div className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-sm font-medium text-gray-400 flex justify-between">
                                <span>源代码控制台 (请在下方直接修改受损代码)</span>
                                <span className="text-red-400">错误提交将扣除 5 秒时间</span>
                            </label>
                            <textarea 
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full h-64 bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                                spellCheck="false"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={handleVerify}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg transition-colors"
                            >
                                编译并验证覆写
                            </button>
                            <button 
                                onClick={handleAbort}
                                className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                紧急脱离
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'success' && (
                    <div className="bg-green-900/20 border border-green-500/30 p-8 rounded-xl text-center flex flex-col items-center">
                        <div className="text-green-500 text-5xl mb-4">
                            <i className="fa-solid fa-check-circle"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">隔离门已重启</h2>
                        <p className="text-gray-400 mb-6">你成功修复了控制代码并阻止了收容失效。该次操作得分为：<span className="text-green-400 font-bold">{score}</span></p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setGameState('idle')}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                            >
                                返回控制大厅
                            </button>
                            {currentLevel < LEVELS.length - 1 && (
                                <button 
                                    onClick={() => startGame(currentLevel + 1)}
                                    className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                                >
                                    前往下一区域
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {gameState === 'fail' && (
                    <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-xl text-center flex flex-col items-center">
                        <div className="text-red-500 text-5xl mb-4">
                            <i className="fa-solid fa-skull"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">收容失效</h2>
                        <p className="text-gray-400 mb-6">倒计时结束，系统已完全崩溃。你未能逃脱该区域。</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => startGame(currentLevel)}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
                            >
                                重新尝试
                            </button>
                            <button 
                                onClick={() => setGameState('idle')}
                                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                            >
                                返回大厅
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
