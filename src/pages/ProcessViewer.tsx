import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Search,  Activity, HardDrive } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface ProcessInfo {
    pid: number;
    ppid?: number;
    name: string;
    exe: string;
    cmd: string;
    memory: number;
    cpu_usage: number;
    status: string;
    ports: number[];
    window_handle?: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const ProcessViewer = () => {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");
    const [sortBy, setSortBy] = useState<keyof ProcessInfo>("cpu_usage");
    const [sortDesc, setSortDesc] = useState(true);
    const { t } = useSettings();

    const fetchProcesses = async () => {
        setLoading(true);
        try {
            const res = await invoke<ProcessInfo[]>("get_processes");
            setProcesses(res);
        } catch (e) {
            console.error("Failed to fetch processes", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
        const interval = setInterval(fetchProcesses, 5000); // Auto refresh every 5s
        return () => clearInterval(interval);
    }, []);

    const filteredProcesses = processes.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase()) || 
        p.pid.toString().includes(filter)
    ).sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (valA === undefined || valB === undefined) return 0;
        
        if (valA < valB) return sortDesc ? 1 : -1;
        if (valA > valB) return sortDesc ? -1 : 1;
        return 0;
    });

    const handleSort = (key: keyof ProcessInfo) => {
        if (sortBy === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortBy(key);
            setSortDesc(true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Activity className="h-6 w-6" />
                        {t("process.title")}
                    </h2>
                    <p className="text-muted-foreground text-xs font-mono mt-1">
                        {t("process.monitoring").replace("{0}", processes.length.toString())}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            placeholder={t("process.search_placeholder")} 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-input border border-border rounded pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground font-mono"
                        />
                    </div>
                    <button 
                        onClick={fetchProcesses}
                        disabled={loading}
                        className="bg-primary/10 border border-primary/50 text-primary p-2 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-lg overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-mono">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th onClick={() => handleSort("pid")} className="p-4 cursor-pointer hover:text-primary">{t("process.pid")}</th>
                                <th onClick={() => handleSort("ppid")} className="p-4 cursor-pointer hover:text-primary">{t("process.ppid")}</th>
                                <th onClick={() => handleSort("name")} className="p-4 cursor-pointer hover:text-primary">{t("process.name")}</th>
                                <th className="p-4">{t("process.ports")}</th>
                                <th className="p-4">{t("process.window")}</th>
                                <th className="p-4">{t("process.cmd")}</th>
                                <th onClick={() => handleSort("cpu_usage")} className="p-4 cursor-pointer hover:text-primary text-right">{t("process.cpu")}</th>
                                <th onClick={() => handleSort("memory")} className="p-4 cursor-pointer hover:text-primary text-right">{t("process.memory")}</th>
                                <th className="p-4">{t("process.status")}</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProcesses.map((p) => (
                                <tr key={p.pid} className="hover:bg-primary/5 transition-colors group">
                                    <td className="p-4 text-muted-foreground group-hover:text-foreground">{p.pid}</td>
                                    <td className="p-4 text-muted-foreground">{p.ppid || '-'}</td>
                                    <td className="p-4 font-medium text-primary">{p.name}</td>
                                    <td className="p-4 text-xs text-primary/70 max-w-[100px] truncate" title={p.ports.join(', ')}>
                                        {p.ports.length > 0 ? p.ports.slice(0, 3).join(', ') + (p.ports.length > 3 ? '...' : '') : '-'}
                                    </td>
                                    <td className="p-4 text-xs text-muted-foreground">{p.window_handle || '-'}</td>
                                    <td className="p-4 text-xs text-muted-foreground max-w-[150px] truncate" title={p.cmd}>{p.cmd}</td>
                                    <td className="p-4 text-right text-foreground">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="w-12">{p.cpu_usage.toFixed(1)}%</span>
                                            <div className="w-16 h-1 bg-secondary/30 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary" 
                                                    style={{ width: `${Math.min(p.cpu_usage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-foreground">{formatBytes(p.memory)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                                            p.status === "Run" ? "border-primary/50 text-primary bg-primary/10" : 
                                            "border-border text-muted-foreground"
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.umami?.track('Process Copy', { name: p.name, pid: p.pid });
                                                const content = JSON.stringify(p, null, 2);
                                                navigator.clipboard.writeText(content).then(() => {
                                                    alert(`${t("process.name")}: ${p.name}\n${t("process.pid")}: ${p.pid}\n${t("process.copied")}`);
                                                });
                                            }}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                            title="Copy Details"
                                        >
                                            <HardDrive className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProcessViewer;
