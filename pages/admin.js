// pages/admin.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('members');
    const [currentUser, setCurrentUser] = useState(null);
    
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [logs, setLogs] = useState([]);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [airdropAmount, setAirdropAmount] = useState(1000);
    const [taxRate, setTaxRate] = useState(5);
    
    const [redisKey, setRedisKey] = useState('');
    const [redisValue, setRedisValue] = useState('');

    const [inspectData, setInspectData] = useState(null);
    const [inspectTarget, setInspectTarget] = useState('');

    const [bingoTagsInput, setBingoTagsInput] = useState('');
    const [bingoCostInput, setBingoCostInput] = useState(50);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) setCurrentUser(storedUsername);

        if (activeTab === 'members') fetchUsers();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'broadcast') fetchBroadcast();
        if (activeTab === 'settings') fetchSettings();
    }, [activeTab]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) setUsers((await res.json()).users || []);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const handleUserAction = async (targetUser, action) => {
        if (action === 'delete') {
            if (!confirm(`警告：确定要永久抹除 ${targetUser} 的档案吗？`)) return;
            if (!confirm(`再次确认：彻底删除操作不可逆转！`)) return;
        } else {
            if (!confirm(`确定要对 ${targetUser} 执行此操作吗？`)) return;
        }

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUser, action, operator: currentUser })
            });
            if (res.ok) {
                fetchUsers();
            } else {
                alert((await res.json()).error || '操作失败');
            }
        } catch (e) { 
            alert('请求失败'); 
        }
    };

    const handleInspect = async (username) => {
        setInspectTarget(username);
        setInspectData(null);
        try {
            const res = await fetch(`/api/admin/user-assets?username=${username}`);
            if (res.ok) setInspectData((await res.json()).portfolio);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/logs');
            if (res.ok) setLogs((await res.json()).logs || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchBroadcast = async () => {
        try {
            const res = await fetch('/api/admin/broadcast');
            if (res.ok) setBroadcastMsg((await res.json()).message || '');
        } catch (e) {
            console.error(e);
        }
    };

    const saveBroadcast = async () => {
        try {
            await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: broadcastMsg })
            });
            alert('广播设置成功，刷新页面即可在顶栏看到。清空文本保存可取消广播。');
        } catch (e) { 
            alert('保存失败'); 
        }
    };

    const executeMacro = async (action) => {
        if (!confirm(`警告：该操作将影响全站所有用户，确定执行吗？`)) return;
        try {
            const res = await fetch('/api/admin/macro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, amount: airdropAmount, rate: taxRate })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`执行完毕，影响了 ${data.affected} 个账户。`);
            }
        } catch (e) { 
            alert('执行失败'); 
        }
    };

    const queryRedis = async (action) => {
        if (!redisKey) return alert('请输入键名');
        try {
            const res = await fetch('/api/admin/redis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, key: redisKey, value: redisValue })
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error);
            
            if (action === 'get') {
                setRedisValue(typeof data.data === 'object' ? JSON.stringify(data.data, null, 2) : String(data.data || ''));
            } else {
                alert('写入成功');
            }
        } catch (e) { 
            alert('操作失败'); 
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/tools/bingo');
            if (res.ok) {
                const data = await res.json();
                setBingoTagsInput((data.tags || []).join(', '));
                setBingoCostInput(data.cost || 50);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const saveBingoSettings = async () => {
        const tagsArray = bingoTagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module: 'bingo',
                    data: { tags: tagsArray, cost: Number(bingoCostInput) || 50 }
                })
            });
            if (res.ok) alert('玩法配置保存成功！前端已同步生效。');
            else alert('保存失败');
        } catch (e) { alert('网络错误'); }
    };

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const navItems = [
        { id: 'members', label: '成员管理', icon: 'fa-users' },
        { id: 'logs', label: '交易审计', icon: 'fa-list-check' },
        { id: 'tools', label: '应用工具箱', icon: 'fa-toolbox' },
        { id: 'broadcast', label: '全站广播', icon: 'fa-bullhorn' },
        { id: 'macro', label: '宏观经济', icon: 'fa-money-bill-trend-up' },
        { id: 'settings', label: '系统设置', icon: 'fa-sliders' },
        { id: 'redis', label: '裸键终端', icon: 'fa-terminal' }
    ];

    if (!currentUser) return (
        <div className="min-h-screen flex items-center justify-center text-red-500 bg-[#0a0a0a] font-bold text-lg">
            <i className="fa-solid fa-lock mr-2"></i> 未登录，拒绝访问控制台
        </div>
    );

    return (
        <div className="h-screen bg-[#0a0a0a] text-gray-200 flex flex-col md:flex-row overflow-hidden font-sans">
            <Head><title>中央控制台 - WikitDB</title></Head>

            {/* 左侧导航栏 / 移动端顶部导航栏 */}
            <aside className="w-full md:w-64 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col shrink-0 shadow-lg z-20">
                <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-800 shrink-0">
                    <h1 className="text-lg md:text-xl font-bold text-blue-500 tracking-tight flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved"></i>
                        WIKIT ADMIN
                    </h1>
                    <div className="md:hidden flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold text-sm">
                            {currentUser.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
                
                <div className="hidden md:block p-6 pb-2 shrink-0">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">系统模块</div>
                </div>

                <nav className="flex-row md:flex-col flex px-2 md:px-4 py-2 md:py-0 space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto custom-scrollbar shrink-0 md:shrink md:flex-1 md:overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isActive 
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} w-4 md:w-5 text-center ${isActive ? 'text-blue-400' : 'text-gray-500'}`}></i>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="hidden md:flex p-4 border-t border-gray-800 shrink-0">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold">
                            {currentUser.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-sm font-bold text-white leading-none">{currentUser}</span>
                            <span className="text-xs text-gray-500 mt-1">系统操作员</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 主内容区域 */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="hidden md:flex h-16 bg-gray-900/50 border-b border-gray-800 items-center px-8 shrink-0 justify-between">
                    <h2 className="text-lg font-bold text-white">
                        {navItems.find(i => i.id === activeTab)?.label}
                    </h2>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        系统运行正常
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    
                    {/* 工具箱模块 */}
                    {activeTab === 'tools' && (
                        <div className="max-w-7xl mx-auto w-full">
                            <div className="mb-6 border-b border-gray-800 pb-4">
                                <h3 className="text-xl font-bold text-white">实验性应用与扩展</h3>
                                <p className="text-gray-400 text-sm mt-1">WikitDB 系统的各项扩展功能模块集合。</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                <Link href="/tools/gacha" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-purple-400 group-hover:text-purple-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-box-open"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">档案馆盲盒</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">消耗资产，在浩瀚的数据中随机抽取未知的页面标的进行投资。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/author-stock" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-green-400 group-hover:text-green-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-chart-line"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-green-400 transition-colors">作者概念股</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">投资有潜力的创作者，股价走势与近期发文量、存活率深度挂钩。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/bingo" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-teal-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-teal-400 group-hover:text-teal-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-ticket-simple"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-teal-400 transition-colors">标签大乐透</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">消耗扫描凭证，命中特定标签即可赢取最高百倍赔率的奖金。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/jackpot" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-yellow-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-yellow-400 group-hover:text-yellow-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-sack-dollar"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">全站公共彩票池</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">全站玩家共同注资的公共奖池，每日随机开奖，瓜分巨额奖金。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/quality-judge" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-cyan-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-cyan-400 group-hover:text-cyan-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-scale-balanced"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">页面打新评断</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">获取近期最新发布的页面，在信息流中快速做多或做空未来的评分。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/deathmatch" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-red-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-red-400 group-hover:text-red-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-skull-crossbones"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors">收容物斗兽场</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">押注两篇随机提取的异常档案，盲猜真实评分高低，赢取双倍返还。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/bounty" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-orange-400 group-hover:text-orange-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-scroll"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">异常档案悬赏令</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">全服寻宝任务，寻找符合特定标签与评分组合档案拿走高额赏金。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/radar" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-indigo-400 group-hover:text-indigo-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-crosshairs"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">战力雷达评估</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">跨站聚合创作者的历史档案，多维度生成雷达图并推算其危险等级。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/escape" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-orange-400 group-hover:text-orange-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">代码修复逃脱</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">随机抽取受损的真实页面源码，限时修复排版语法以阻止收容失效。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/splice" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-pink-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-pink-400 group-hover:text-pink-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-puzzle-piece"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">跨界缝合怪</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">抽取多站点的无关联文本碎片，由你来拼接命名属于你的荒诞故事。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/tag-futures" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-yellow-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-yellow-400 group-hover:text-yellow-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-tags"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">标签大宗商品</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">将常见分类标签视作商品，根据近期该标签页面的综合评分进行看涨跌。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/site-index" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-teal-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-teal-400 group-hover:text-teal-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-globe"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-teal-400 transition-colors">站点大盘指数</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">各站繁荣度量化为点数走势，可作为长线 ETF 基金大额认购持有。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/member-admin" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-blue-400 group-hover:text-blue-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-users-gear"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">成员管理</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">在特定站点对指定成员采取封禁、移除等操作。</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/tools/delete-announcement" className="bg-gray-800/50 p-5 md:p-6 rounded-xl border border-gray-700 hover:border-red-500 hover:bg-gray-800 transition-all group flex flex-col justify-between cursor-pointer shadow-lg">
                                    <div className="grid grid-cols-[min-content_1fr]">
                                        <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-red-400 group-hover:text-red-500 mb-4 mr-4 max-h-14 text-3xl flex items-center justify-center w-14">
                                            <i className="fa-solid fa-trash-can"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors">删帖公示</h2>
                                            <p className="text-gray-400 text-xs leading-relaxed">查看近期已被删除的页面记录与相关公示信息。</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* 成员管理模块 */}
                    {activeTab === 'members' && (
                        <div className="flex flex-col gap-4 md:gap-6 h-full max-w-7xl mx-auto w-full">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="relative w-full md:w-80">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                    <input 
                                        type="text" 
                                        placeholder="搜索用户名称..." 
                                        value={searchQuery} 
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                    />
                                </div>
                                <button onClick={fetchUsers} className="w-full md:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-200 transition-colors shadow-sm font-medium flex justify-center items-center gap-2">
                                    <i className={`fa-solid fa-rotate-right ${isLoading ? 'animate-spin text-blue-400' : 'text-gray-400'}`}></i>
                                    刷新表格
                                </button>
                            </div>

                            <div className="bg-gray-800/40 rounded-xl border border-gray-700 overflow-hidden shadow-sm flex-1 flex flex-col min-w-0">
                                <div className="overflow-x-auto flex-1 w-full custom-scrollbar">
                                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-900/80 border-b border-gray-800">
                                            <tr>
                                                <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-400">系统账户</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-400">Wikidot 绑定</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-400">账户余额</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-400">状态标签</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-400 text-right">管理操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {filteredUsers.map(u => (
                                                <tr key={u.username} className="hover:bg-gray-800/60 transition-colors">
                                                    <td className="px-4 md:px-6 py-3 md:py-4 font-bold text-white">{u.username}</td>
                                                    <td className="px-4 md:px-6 py-3 md:py-4 text-gray-400 font-mono text-xs">{u.wikidotAccount || '-'}</td>
                                                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-green-400 font-medium">¥ {Number(u.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    <td className="px-4 md:px-6 py-3 md:py-4 space-x-1 md:space-x-2">
                                                        <span className={`inline-block px-2 md:px-2.5 py-1 rounded-md text-xs font-medium border ${
                                                            u.role === 'admin' ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-gray-800 text-gray-400 border-gray-700'
                                                        }`}>
                                                            {u.role === 'admin' ? '管理员' : '普通成员'}
                                                        </span>
                                                        <span className={`inline-block px-2 md:px-2.5 py-1 rounded-md text-xs font-medium mt-1 md:mt-0 border ${
                                                            u.status === 'banned' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'
                                                        }`}>
                                                            {u.status === 'banned' ? '封禁中' : '正常'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-3 md:py-4 text-right space-x-1 md:space-x-2">
                                                        <button onClick={() => handleInspect(u.username)} className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-200 rounded-md transition-colors" title="资产透视">资产</button>
                                                        
                                                        {u.status === 'banned' ? (
                                                            <button onClick={() => handleUserAction(u.username, 'unban')} className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 hover:bg-green-700 hover:border-green-600 text-gray-200 rounded-md transition-colors" title="解封">解封</button>
                                                        ) : (
                                                            <button onClick={() => handleUserAction(u.username, 'ban')} className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 hover:bg-yellow-700 hover:border-yellow-600 text-gray-200 rounded-md transition-colors" title="封禁">封禁</button>
                                                        )}

                                                        {u.role === 'admin' ? (
                                                            <button onClick={() => handleUserAction(u.username, 'demote')} className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-200 rounded-md transition-colors" title="降级">降权</button>
                                                        ) : (
                                                            <button onClick={() => handleUserAction(u.username, 'promote')} className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 hover:bg-purple-700 hover:border-purple-600 text-gray-200 rounded-md transition-colors" title="提权">提权</button>
                                                        )}
                                                        
                                                        {u.role === 'admin' && (
                                                            <button onClick={() => handleUserAction(u.username, 'infinite')} className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 hover:bg-blue-700 hover:border-blue-600 text-gray-200 rounded-md transition-colors" title="无限财富"><i className="fa-solid fa-infinity"></i></button>
                                                        )}
                                                        <button onClick={() => handleUserAction(u.username, 'delete')} className="px-2 md:px-3 py-1.5 bg-red-900/30 border border-red-800 hover:bg-red-700 text-red-400 hover:text-white rounded-md transition-colors font-medium" title="永久删除">删除</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-900/80 px-4 md:px-6 py-3 md:py-4 border-t border-gray-800 text-xs text-gray-500 font-medium">
                                    当前列表共 {filteredUsers.length} 名成员
                                </div>
                            </div>
                            
                            {inspectData && (
                                <div className="bg-gray-800/40 p-4 md:p-6 border border-gray-700 rounded-xl shadow-sm">
                                    <div className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                                        <i className="fa-solid fa-box-open text-blue-400"></i>
                                        [{inspectTarget}] 的底层持仓数据：
                                    </div>
                                    <pre className="text-xs text-gray-400 bg-gray-900 border border-gray-800 p-4 rounded-lg font-mono overflow-auto custom-scrollbar">{JSON.stringify(inspectData, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 审计日志模块 */}
                    {activeTab === 'logs' && (
                        <div className="max-w-5xl mx-auto w-full bg-gray-800/40 border border-gray-700 rounded-xl shadow-sm overflow-hidden min-w-0">
                            <div className="p-4 md:p-6 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-bold text-white">全网交易流水记录</h3>
                                <button onClick={fetchLogs} className="text-sm text-blue-400 hover:text-blue-300 font-medium">刷新记录</button>
                            </div>
                            <div className="p-2 md:p-6 space-y-2 md:space-y-3 text-sm">
                                {logs.length === 0 ? <div className="text-gray-500 text-center py-8">暂无流水记录</div> : 
                                    logs.map((log, i) => (
                                    <div key={i} className="px-3 md:px-4 py-3 border border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-lg flex flex-col md:flex-row md:items-center gap-2 md:gap-6 transition-colors overflow-x-auto custom-scrollbar">
                                        <span className="text-gray-500 font-mono text-xs whitespace-nowrap">{new Date(log.time).toLocaleString()}</span>
                                        <span className="font-bold text-gray-300 w-auto md:w-32 truncate">{log.username}</span>
                                        <span className="flex-1 text-gray-400 whitespace-nowrap">
                                            执行了 <span className={log.action === 'buy' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{log.action === 'buy' ? '买入' : '卖出'}</span> 操作： 
                                            <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded mx-1 text-gray-200">{log.target}</span> 
                                            数量 <span className="font-bold text-gray-200">{log.amount}</span> 份，单价 <span className="font-mono text-gray-300">¥{log.price}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 全局广播模块 */}
                    {activeTab === 'broadcast' && (
                        <div className="max-w-2xl mx-auto w-full bg-gray-800/40 border border-gray-700 p-5 md:p-8 rounded-xl shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-white text-lg mb-1">全站紧急广播设置</h3>
                                <p className="text-sm text-gray-400">此内容将以红色警报横幅的形式，置顶显示在所有用户的页面最上方。</p>
                            </div>
                            <textarea 
                                value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                                className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 focus:outline-none focus:border-blue-500 transition-all shadow-inner custom-scrollbar"
                                placeholder="输入需要通知全站的紧急消息... (留空保存则为撤销广播)"
                            />
                            <div className="flex justify-end">
                                <button onClick={saveBroadcast} className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-sm transition-colors">
                                    保存并推送到全站
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 宏观经济模块 */}
                    {activeTab === 'macro' && (
                        <div className="max-w-3xl mx-auto w-full space-y-6">
                            <div className="bg-gray-800/40 border border-gray-700 p-5 md:p-8 rounded-xl shadow-sm flex flex-col gap-6 items-start">
                                <div className="w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-green-900/30 text-green-500 flex items-center justify-center text-lg shrink-0"><i className="fa-solid fa-parachute-box"></i></div>
                                        <h3 className="font-bold text-white text-lg">空投津贴 (Airdrop)</h3>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 md:ml-13">无差别向所有已注册的系统账户发放固定额度的资金，用于刺激交易活跃度。</p>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input type="number" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full md:w-48 text-white focus:outline-none focus:border-green-500" placeholder="额度"/>
                                        <button onClick={() => executeMacro('airdrop')} className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white font-medium rounded-lg shadow-sm transition-colors w-full md:w-auto">执行空投</button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800/40 border border-gray-700 p-5 md:p-8 rounded-xl shadow-sm flex flex-col gap-6 items-start">
                                <div className="w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center text-lg shrink-0"><i className="fa-solid fa-scale-unbalanced"></i></div>
                                        <h3 className="font-bold text-white text-lg">财富税征收 (Tax)</h3>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 md:ml-13">按设定的百分比，强制扣除所有用户当前账户余额的一部分，用于回收流动性。</p>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <div className="relative w-full md:w-48">
                                            <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg pl-4 pr-8 py-2 w-full text-white focus:outline-none focus:border-red-500" placeholder="比例"/>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                                        </div>
                                        <button onClick={() => executeMacro('tax')} className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white font-medium rounded-lg shadow-sm transition-colors w-full md:w-auto">执行扣款</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 系统设置模块 */}
                    {activeTab === 'settings' && (
                        <div className="max-w-4xl mx-auto w-full space-y-6">
                            <div className="bg-gray-800/40 border border-gray-700 p-5 md:p-8 rounded-xl shadow-sm">
                                <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                                    <i className="fa-solid fa-tags text-blue-400"></i> 标签大乐透 (Tag Bingo) 规则配置
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">候选标签池 (用逗号分隔)</label>
                                        <textarea 
                                            value={bingoTagsInput} 
                                            onChange={e => setBingoTagsInput(e.target.value)}
                                            className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 custom-scrollbar"
                                            placeholder="例如: 原创, 精品, scp, tale..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">前端页面将实时拉取这些标签供玩家选择。填写的标签必须能在 Wikidot 真实存在。</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">单次扫描基础价格 (¥)</label>
                                        <input 
                                            type="number" 
                                            value={bingoCostInput} 
                                            onChange={e => setBingoCostInput(e.target.value)}
                                            className="w-full md:w-48 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">命中1个标签返还此金额，命中2个返还10倍，全中3个返还100倍。</p>
                                    </div>

                                    <div className="pt-4 border-t border-gray-800 flex justify-end">
                                        <button onClick={saveBingoSettings} className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">
                                            保存配置并应用到全站
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 裸键终端模块 */}
                    {activeTab === 'redis' && (
                        <div className="max-w-4xl mx-auto w-full bg-gray-800/40 border border-gray-700 rounded-xl shadow-sm overflow-hidden min-w-0">
                            <div className="bg-[#1e1e1e] px-4 md:px-6 py-3 flex items-center gap-3 border-b border-gray-800">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-xs text-gray-500 font-mono tracking-widest">REDIS RAW CONSOLE</span>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div className="bg-orange-900/30 border border-orange-800 text-orange-400 p-4 rounded-lg text-sm mb-4 md:mb-6 flex gap-3 items-start">
                                    <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                    <div>
                                        <p className="font-bold text-orange-300">高危操作区域</p>
                                        <p>在此处修改数据将绕过所有业务逻辑代码的检查，直接覆写底层数据库，格式错误可能导致网站白屏崩溃。</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm hidden md:inline">Key:</span>
                                        <input type="text" value={redisKey} onChange={e => setRedisKey(e.target.value)} placeholder="如 user:xxx" className="w-full bg-gray-900 border border-gray-700 rounded-lg md:pl-12 px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 transition-all"/>
                                    </div>
                                    <button onClick={() => queryRedis('get')} className="w-full md:w-auto px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors border border-gray-600">查询数据</button>
                                </div>
                                <textarea 
                                    value={redisValue} onChange={e => setRedisValue(e.target.value)} 
                                    className="w-full h-64 md:h-80 bg-[#1e1e1e] border border-gray-700 rounded-lg p-3 md:p-4 text-green-400 font-mono text-xs md:text-sm focus:outline-none focus:border-blue-500 shadow-inner custom-scrollbar" 
                                    placeholder="Value 数据区域..."
                                />
                                <button onClick={() => queryRedis('set')} className="w-full py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 border border-red-800">
                                    <i className="fa-solid fa-file-code"></i> 强制覆盖写入
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
