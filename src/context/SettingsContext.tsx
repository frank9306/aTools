import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "cyberpunk" | "hacker";
type Language = "en" | "zh";

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: {
        "nav.processes": "Processes",
        "nav.devtools": "Dev Tools",
        "nav.settings": "Settings",
        "settings.title": "Settings",
        "settings.general": "General",
        "settings.theme": "UI Style",
        "settings.language": "Language",
        "settings.autostart": "Run on Startup",
        "settings.autostart_desc": "Automatically launch aTools when you log in",
        "theme.cyberpunk": "Cyberpunk",
        "theme.hacker": "Matrix Console",
        "lang.en": "English",
        "lang.zh": "Chinese",
        "app.title": "aTools",
        
        // Process Viewer
        "process.title": "System Processes",
        "process.monitoring": "MONITORING {0} ACTIVE PROCESSES",
        "process.search_placeholder": "SEARCH PID / NAME...",
        "process.pid": "PID",
        "process.ppid": "PPID",
        "process.name": "Name",
        "process.ports": "Ports",
        "process.window": "Window",
        "process.cmd": "CMD",
        "process.cpu": "CPU %",
        "process.memory": "Memory",
        "process.status": "Status",

        // Dev Tools
        "devtools.title": "Developer Tools",
        "devtools.tab.base64": "Base64",
        "devtools.tab.json": "JSON Formatter",
        "devtools.tab.timestamp": "Timestamp",
        "devtools.tab.ascii": "ASCII Art",
        "devtools.tab.network": "Network Info",
        
        // Base64
        "devtools.base64.encode": "ENCODE",
        "devtools.base64.decode": "DECODE",
        "devtools.base64.input": "Input",
        "devtools.base64.output": "Output",
        "devtools.base64.placeholder.encode": "Type text to encode...",
        "devtools.base64.placeholder.decode": "Paste Base64 to decode...",
        
        // JSON
        "devtools.json.minify": "Minify",
        "devtools.json.input": "Input JSON",
        "devtools.json.formatted": "Formatted",
        "devtools.json.placeholder": "Paste JSON here...",
        
        // Timestamp
        "devtools.time.current": "Current Unix Timestamp",
        "devtools.time.ts_to_date": "Timestamp to Date",
        "devtools.time.date_to_ts": "Date to Timestamp",
        "devtools.time.convert": "CONVERT",
        
        // ASCII
        "devtools.ascii.text": "Text to ASCII",
        "devtools.ascii.font": "Font Style",
        "devtools.ascii.placeholder": "Enter text...",
        
        // Network
        "devtools.network.public_ip": "Public IP Information",
        "devtools.network.refresh": "REFRESH",
        "devtools.network.ip": "IP Address",
        "devtools.network.location": "Location",
        "devtools.network.isp": "ISP / Org",
        "devtools.network.details": "Details",
        "devtools.network.dns": "DNS Resolver",
        "devtools.network.resolve": "RESOLVE",
        "devtools.network.scanning": "SCANNING...",
        "devtools.network.resolved": "Resolved IP Addresses",
        "devtools.network.placeholder": "Enter domain (e.g., google.com)",
        "devtools.network.fail": "Failed to retrieve IP information.",
        "devtools.network.error": "Resolution Error",
    },
    zh: {
        "nav.processes": "系统进程",
        "nav.devtools": "开发者工具",
        "nav.settings": "设置",
        "settings.title": "设置",
        "settings.general": "通用",
        "settings.theme": "界面风格",
        "settings.language": "语言",
        "settings.autostart": "开机自启",
        "settings.autostart_desc": "登录系统时自动启动 aTools",
        "theme.cyberpunk": "赛博朋克",
        "theme.hacker": "黑客终端",
        "lang.en": "英文",
        "lang.zh": "中文",
        "app.title": "aTools",

        // Process Viewer
        "process.title": "系统进程",
        "process.monitoring": "正在监控 {0} 个活跃进程",
        "process.search_placeholder": "搜索 PID / 进程名...",
        "process.pid": "PID",
        "process.ppid": "父进程ID",
        "process.name": "名称",
        "process.ports": "端口",
        "process.window": "窗口句柄",
        "process.cmd": "命令行",
        "process.cpu": "CPU %",
        "process.memory": "内存",
        "process.status": "状态",

        // Dev Tools
        "devtools.title": "开发者工具",
        "devtools.tab.base64": "Base64 转换",
        "devtools.tab.json": "JSON 格式化",
        "devtools.tab.timestamp": "时间戳工具",
        "devtools.tab.ascii": "字符画生成",
        "devtools.tab.network": "网络信息",
        
        // Base64
        "devtools.base64.encode": "编码",
        "devtools.base64.decode": "解码",
        "devtools.base64.input": "输入内容",
        "devtools.base64.output": "输出结果",
        "devtools.base64.placeholder.encode": "输入要编码的文本...",
        "devtools.base64.placeholder.decode": "粘贴 Base64 字符串进行解码...",
        
        // JSON
        "devtools.json.minify": "压缩",
        "devtools.json.input": "输入 JSON",
        "devtools.json.formatted": "格式化结果",
        "devtools.json.placeholder": "粘贴 JSON 代码...",
        
        // Timestamp
        "devtools.time.current": "当前 Unix 时间戳",
        "devtools.time.ts_to_date": "时间戳 转 日期",
        "devtools.time.date_to_ts": "日期 转 时间戳",
        "devtools.time.convert": "转换",
        
        // ASCII
        "devtools.ascii.text": "输入文本",
        "devtools.ascii.font": "字体风格",
        "devtools.ascii.placeholder": "输入文字...",
        
        // Network
        "devtools.network.public_ip": "公网 IP 信息",
        "devtools.network.refresh": "刷新",
        "devtools.network.ip": "IP 地址",
        "devtools.network.location": "地理位置",
        "devtools.network.isp": "运营商 / 组织",
        "devtools.network.details": "详细信息",
        "devtools.network.dns": "域名解析 (DNS)",
        "devtools.network.resolve": "解析",
        "devtools.network.scanning": "扫描中...",
        "devtools.network.resolved": "解析结果 IP",
        "devtools.network.placeholder": "输入域名 (如 baidu.com)",
        "devtools.network.fail": "无法获取 IP 信息",
        "devtools.network.error": "解析错误",
    }
};

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    // Load initial state from localStorage or use defaults
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("atools_theme");
        return (saved === "cyberpunk" || saved === "hacker") ? saved : "cyberpunk";
    });
    
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem("atools_language");
        return (saved === "en" || saved === "zh") ? saved : "zh";
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute("data-theme", theme);
        localStorage.setItem("atools_theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("atools_language", language);
    }, [language]);

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
