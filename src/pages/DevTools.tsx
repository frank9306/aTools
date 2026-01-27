import { useState, useEffect } from "react";
import { Code, FileJson, Clock, Type, Copy, Check, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import figlet from "figlet";
import { invoke } from "@tauri-apps/api/core";
import axios from "axios";
import { useSettings } from "../context/SettingsContext";

// Import fonts to ensure they are bundled if using full figlet, but often default is enough or we use import
import standard from "figlet/importable-fonts/Standard.js";
import ghost from "figlet/importable-fonts/Ghost.js";
import graffiti from "figlet/importable-fonts/Graffiti.js";
import doom from "figlet/importable-fonts/Doom.js";
import isometric1 from "figlet/importable-fonts/Isometric1.js";
import slant from "figlet/importable-fonts/Slant.js";
import threeD from "figlet/importable-fonts/3-D.js";
import banner3 from "figlet/importable-fonts/Banner3.js";
import alligator from "figlet/importable-fonts/Alligator.js";
import alpha from "figlet/importable-fonts/Alpha.js";

const DevTools = () => {
    const [activeTab, setActiveTab] = useState("base64");
    const { t } = useSettings();

    const tabs = [
        { id: "base64", name: t("devtools.tab.base64"), icon: Code },
        { id: "json", name: t("devtools.tab.json"), icon: FileJson },
        { id: "timestamp", name: t("devtools.tab.timestamp"), icon: Clock },
        { id: "ascii", name: t("devtools.tab.ascii"), icon: Type },
        { id: "network", name: t("devtools.tab.network"), icon: Globe },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Code className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-primary uppercase tracking-widest">
                    {t("devtools.title")}
                </h2>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded text-sm font-mono uppercase tracking-wider transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-primary text-black shadow-[0_0_10px_var(--color-primary)]"
                                    : "bg-muted text-muted-foreground hover:text-primary hover:bg-muted/80"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="bg-muted/30 border border-border rounded p-6 min-h-[400px]">
                    {activeTab === "base64" && <Base64Tool />}
                    {activeTab === "json" && <JsonTool />}
                    {activeTab === "timestamp" && <TimestampTool />}
                    {activeTab === "ascii" && <AsciiTool />}
                    {activeTab === "network" && <NetworkTool />}
                </div>
            </div>
        </div>
    );
};

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-2 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"
            title="Copy to clipboard"
        >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
    );
};

const Base64Tool = () => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [mode, setMode] = useState<"encode" | "decode">("encode");
    const { t } = useSettings();

    useEffect(() => {
        try {
            if (mode === "encode") {
                setOutput(btoa(input));
            } else {
                setOutput(atob(input));
            }
        } catch {
            setOutput("Invalid input for decoding");
        }
    }, [input, mode]);

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <button
                    onClick={() => setMode("encode")}
                    className={cn(
                        "px-4 py-2 rounded text-sm font-mono border",
                        mode === "encode"
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border text-muted-foreground"
                    )}
                >
                    {t("devtools.base64.encode")}
                </button>
                <button
                    onClick={() => setMode("decode")}
                    className={cn(
                        "px-4 py-2 rounded text-sm font-mono border",
                        mode === "decode"
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border text-muted-foreground"
                    )}
                >
                    {t("devtools.base64.decode")}
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.base64.input")}</label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-64 bg-card border border-border rounded p-4 font-mono text-sm focus:border-primary focus:outline-none resize-none text-foreground"
                        placeholder={mode === "encode" ? t("devtools.base64.placeholder.encode") : t("devtools.base64.placeholder.decode")}
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                         <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.base64.output")}</label>
                         <CopyButton text={output} />
                    </div>
                    <textarea
                        readOnly
                        value={output}
                        className="w-full h-64 bg-background border border-border rounded p-4 font-mono text-sm text-primary resize-none focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

const JsonTool = () => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");
    const { t } = useSettings();

    useEffect(() => {
        if (!input.trim()) {
            setOutput("");
            setError("");
            return;
        }
        try {
            const parsed = JSON.parse(input);
            setOutput(JSON.stringify(parsed, null, 2));
            setError("");
        } catch (e: any) {
            setError(e.message);
        }
    }, [input]);

    const handleMinify = () => {
         try {
            const parsed = JSON.parse(input);
            setOutput(JSON.stringify(parsed));
            setError("");
        } catch (e: any) {
            setError(e.message);
        }
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-end">
                <button onClick={handleMinify} className="text-xs text-primary hover:underline font-mono uppercase">{t("devtools.json.minify")}</button>
             </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.json.input")}</label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className={cn(
                            "w-full h-96 bg-card border rounded p-4 font-mono text-xs focus:outline-none resize-none text-foreground",
                            error ? "border-red-500" : "border-border focus:border-primary"
                        )}
                        placeholder={t("devtools.json.placeholder")}
                    />
                    {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                         <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.json.formatted")}</label>
                         <CopyButton text={output} />
                    </div>
                    <textarea
                        readOnly
                        value={output}
                        className="w-full h-96 bg-background border border-border rounded p-4 font-mono text-xs text-green-400 resize-none focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

const TimestampTool = () => {
    const [now, setNow] = useState(Date.now());
    const [tsInput, setTsInput] = useState("");
    const [dateInput, setDateInput] = useState("");
    const [result, setResult] = useState("");
    const { t } = useSettings();

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const convertTs = () => {
        const ts = parseInt(tsInput);
        if (!isNaN(ts)) {
            setResult(new Date(ts).toLocaleString());
        } else {
            setResult("Invalid Timestamp");
        }
    };

    const convertDate = () => {
        const d = new Date(dateInput);
        if (!isNaN(d.getTime())) {
            setResult(d.getTime().toString());
        } else {
            setResult("Invalid Date");
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center p-8 bg-background border border-primary/30 rounded relative overflow-hidden group">
                 <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <h3 className="text-sm text-muted-foreground font-mono uppercase mb-2">{t("devtools.time.current")}</h3>
                <div className="text-4xl md:text-5xl font-mono text-primary font-bold tracking-tighter">
                    {Math.floor(now / 1000)}
                </div>
                 <div className="text-xs text-muted-foreground font-mono mt-2">
                    {now} (ms)
                </div>
            </div>

            <div className="grid gap-6">
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.time.ts_to_date")}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={tsInput}
                            onChange={(e) => setTsInput(e.target.value)}
                            placeholder="e.g. 1678888888"
                            className="flex-1 bg-input border border-border rounded px-4 py-2 text-sm font-mono focus:border-primary focus:outline-none text-foreground"
                        />
                        <button onClick={convertTs} className="px-4 py-2 bg-primary text-black font-bold text-xs rounded hover:shadow-[0_0_10px_var(--color-primary)] transition-shadow">
                            {t("devtools.time.convert")}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.time.date_to_ts")}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={dateInput}
                            onChange={(e) => setDateInput(e.target.value)}
                            placeholder="e.g. 2023-01-01 12:00:00"
                            className="flex-1 bg-input border border-border rounded px-4 py-2 text-sm font-mono focus:border-primary focus:outline-none text-foreground"
                        />
                        <button onClick={convertDate} className="px-4 py-2 bg-primary text-black font-bold text-xs rounded hover:shadow-[0_0_10px_var(--color-primary)] transition-shadow">
                            {t("devtools.time.convert")}
                        </button>
                    </div>
                </div>

                {result && (
                    <div className="p-4 bg-primary/10 border border-primary rounded text-center">
                        <p className="text-primary font-mono text-lg font-bold">{result}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AsciiTool = () => {
    const [text, setText] = useState("CYBER");
    const [font, setFont] = useState<any>("Standard");
    const [result, setResult] = useState("");
    const { t } = useSettings();

    const fontMap: any = {
        "Standard": standard,
        "Ghost": ghost,
        "Graffiti": graffiti,
        "Doom": doom,
        "Isometric1": isometric1,
        "Slant": slant,
        "3-D": threeD,
        "Banner3": banner3,
        "Alligator": alligator,
        "Alpha": alpha,
    };

    useEffect(() => {
        const fontData = fontMap[font];
        if (fontData) {
            figlet.parseFont(font, fontData);
            figlet.text(text, { font: font as any }, (err: any, data: any) => {
                if (err) {
                    console.log('Something went wrong...');
                    console.dir(err);
                    return;
                }
                setResult(data);
            });
        }
    }, [text, font]);

    return (
        <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.ascii.text")}</label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full bg-input border border-border rounded px-4 py-3 text-sm font-mono focus:border-primary focus:outline-none text-primary"
                        placeholder={t("devtools.ascii.placeholder")}
                         maxLength={20}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.ascii.font")}</label>
                    <select
                        value={font}
                        onChange={(e) => setFont(e.target.value)}
                        className="w-full bg-input border border-border rounded px-4 py-3 text-sm font-mono focus:border-primary focus:outline-none text-foreground"
                    >
                        {Object.keys(fontMap).map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={result} />
                </div>
                <pre className="w-full overflow-x-auto bg-black border border-border rounded p-6 font-mono text-xs leading-none text-primary min-h-[200px] flex items-center justify-center whitespace-pre text-left">
                    {result}
                </pre>
            </div>
        </div>
    );
};


const NetworkTool = () => {
    const [ipData, setIpData] = useState<any>(null);
    const [loadingIp, setLoadingIp] = useState(false);
    
    const [domain, setDomain] = useState("");
    const [resolvedIps, setResolvedIps] = useState<string[]>([]);
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState("");
    const { t } = useSettings();

    const fetchMyIp = async () => {
        setLoadingIp(true);
        try {
            // Using ipapi.co for detailed info, falling back to ipify for just IP
            const res = await axios.get("https://ipapi.co/json/");
            setIpData(res.data);
        } catch (e) {
            console.error("Primary IP fetch failed", e);
            try {
                 const res = await axios.get("https://api.ipify.org?format=json");
                 setIpData({ ip: res.data.ip, city: "Unknown", country_name: "-", org: "-" });
            } catch (e2) {
                setIpData({ error: "Failed to fetch IP" });
            }
        } finally {
            setLoadingIp(false);
        }
    };

    useEffect(() => {
        if (ipData === null) {
            fetchMyIp();
        }
    }, [ipData]);

    const handleResolve = async () => {
        if (!domain) return;
        setResolving(true);
        setResolveError("");
        setResolvedIps([]);
        try {
            const ips = await invoke<string[]>("resolve_domain", { domain });
            setResolvedIps(ips);
        } catch (e: any) {
            setResolveError(e.toString());
        } finally {
            setResolving(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                    <h3 className="text-sm text-muted-foreground font-mono uppercase">{t("devtools.network.public_ip")}</h3>
                    <button onClick={fetchMyIp} className="text-xs text-primary hover:underline font-mono">{t("devtools.network.refresh")}</button>
                </div>
                
                {loadingIp ? (
                    <div className="text-primary font-mono animate-pulse">{t("devtools.network.scanning")}</div>
                ) : ipData && !ipData.error ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-card border border-border rounded hover:border-primary transition-colors group">
                            <div className="text-xs text-muted-foreground uppercase mb-1">{t("devtools.network.ip")}</div>
                            <div className="flex justify-between items-center">
                                <div className="text-xl text-primary font-bold font-mono">{ipData.ip}</div>
                                <CopyButton text={ipData.ip} />
                            </div>
                        </div>
                        <div className="p-4 bg-card border border-border rounded hover:border-primary transition-colors">
                             <div className="text-xs text-muted-foreground uppercase mb-1">{t("devtools.network.location")}</div>
                            <div className="text-sm text-foreground font-mono">{ipData.city}, {ipData.region}, {ipData.country_name}</div>
                        </div>
                        <div className="p-4 bg-card border border-border rounded hover:border-primary transition-colors">
                             <div className="text-xs text-muted-foreground uppercase mb-1">{t("devtools.network.isp")}</div>
                            <div className="text-sm text-foreground font-mono truncate" title={ipData.org}>{ipData.org}</div>
                        </div>
                         <div className="p-4 bg-card border border-border rounded hover:border-primary transition-colors">
                             <div className="text-xs text-muted-foreground uppercase mb-1">{t("devtools.network.details")}</div>
                            <div className="text-sm text-foreground font-mono">
                                {ipData.timezone} | {ipData.asn}
                            </div>
                        </div>
                     </div>
                ) : (
                    <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive font-mono text-sm rounded">
                        {t("devtools.network.fail")}
                    </div>
                )}
            </div>

             <div className="space-y-4">
                <h3 className="text-sm text-muted-foreground font-mono uppercase border-b border-border pb-2">{t("devtools.network.dns")}</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder={t("devtools.network.placeholder")}
                        className="flex-1 bg-input border border-border rounded px-4 py-2 text-sm font-mono focus:border-primary focus:outline-none text-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                    />
                    <button 
                        onClick={handleResolve}
                        disabled={resolving}
                        className="px-6 py-2 bg-primary text-black font-bold text-sm rounded hover:shadow-[0_0_15px_var(--color-primary)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resolving ? t("devtools.network.scanning") : t("devtools.network.resolve")}
                    </button>
                </div>
                
                {resolveError && (
                    <div className="p-4 bg-destructive/20 border border-destructive/50 rounded text-destructive font-mono text-sm">
                        {t("devtools.network.error")}: {resolveError}
                    </div>
                )}

                {resolvedIps.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-xs text-muted-foreground font-mono uppercase">{t("devtools.network.resolved")}</label>
                        <div className="bg-background border border-border rounded p-4 font-mono text-sm text-primary">
                            {resolvedIps.map((ip) => (
                                <div key={ip} className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-muted px-2 -mx-2 rounded">
                                    <span>{ip}</span>
                                    <CopyButton text={ip} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
        </div>
    );
};

export default DevTools;
