import React from 'react';
import Head from 'next/head';
const config = require('../wikitdb.config.js');

const Tools = () => {
    return (
        <>
            <Head>
                <title>工具 - {config.SITE_NAME}</title>
            </Head>

            <div className="py-8 max-w-5xl mx-auto">
                <div className="mb-8 border-b border-gray-700 pb-6">
                    <h1 className="text-3xl font-bold text-white">工具库</h1>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-12 border border-white/10 flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
                    <i className="fa-solid fa-screwdriver-wrench text-5xl mb-4 opacity-20"></i>
                    <p className="text-xl font-medium text-gray-400">暂未开发</p>
                    <p className="text-sm opacity-60 mt-2">更多实用工具正在筹备中，敬请期待。</p>
                </div>
            </div>
        </>
    );
};

export default Tools;
