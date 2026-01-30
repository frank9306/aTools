import { useState, useEffect, useRef } from "react";
import { Bot, Plus, Play, Square, Trash2, Edit, Save, X, Clock, Terminal } from "lucide-react";
import { cn } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSettings } from "../context/SettingsContext";

interface Task {
    id: string;
    name: string;
    cron_expr: string;
    command: string;
    enabled: boolean;
    last_run: string | null;
    last_result: string | null;
}

const Automation = () => {
    const { t } = useSettings();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
    const [outputStreams, setOutputStreams] = useState<Record<string, string>>({});

    const fetchTasks = async () => {
        try {
            const res = await invoke<Task[]>("get_tasks");
            setTasks(res);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTasks();
        const unlisten = listen("task-updated", () => {
            fetchTasks();
        });
        
        const unlistenOutput = listen<[string, string]>("task-output", (event) => {
            const [id, msg] = event.payload;
            setOutputStreams(prev => ({
                ...prev,
                [id]: (prev[id] || "") + msg
            }));
        });

        return () => {
            unlisten.then(f => f());
            unlistenOutput.then(f => f());
        };
    }, []);

    const handleSave = async () => {
        if (!currentTask.name || !currentTask.command) return;
        
        const taskPayload = {
            id: currentTask.id || "",
            name: currentTask.name,
            cron_expr: currentTask.cron_expr || "",
            command: currentTask.command,
            enabled: currentTask.enabled ?? true,
            last_run: currentTask.last_run || null,
            last_result: currentTask.last_result || null
        };

        if (currentTask.id) {
            await invoke("update_task", { task: taskPayload });
        } else {
            await invoke("add_task", { task: taskPayload });
        }
        setIsEditing(false);
        setCurrentTask({});
        fetchTasks();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure?")) {
            await invoke("delete_task", { id });
            fetchTasks();
        }
    };

    const handleRun = async (id: string) => {
        // Clear previous output log for this task
        setOutputStreams(prev => ({ ...prev, [id]: "" }));
        await invoke("run_task_manual", { id });
    };

    const handleStop = async (id: string) => {
        await invoke("stop_task", { id });
    };

    const startEdit = (task: Task) => {
        setCurrentTask({ ...task });
        setIsEditing(true);
    };

    const startNew = () => {
        setCurrentTask({ enabled: true, cron_expr: "", command: "", name: "" });
        setIsEditing(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold text-primary uppercase tracking-widest leading-none">
                        {t("automation.title")}
                    </h2>
                </div>
                {!isEditing && (
                    <button 
                        onClick={startNew}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold text-sm rounded hover:shadow-[0_0_15px_var(--color-primary)] transition-shadow"
                    >
                        <Plus className="h-4 w-4" />
                        {t("automation.add_task")}
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-muted/30 border border-border rounded p-6 animate-in fade-in slide-in-from-top-2">
                    <div className="grid gap-4 max-w-2xl">
                        <div className="grid gap-2">
                            <label className="text-xs uppercase text-muted-foreground font-mono">{t("automation.name")}</label>
                            <input 
                                value={currentTask.name || ""}
                                onChange={e => setCurrentTask({...currentTask, name: e.target.value})}
                                placeholder={t("automation.placeholder_name")}
                                className="bg-input border border-border rounded px-4 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs uppercase text-muted-foreground font-mono flex justify-between">
                                <span>{t("automation.cron")}</span>
                                <a href="https://crontab.guru/" target="_blank" className="hover:text-primary hover:underline">Help</a>
                            </label>
                            <input 
                                value={currentTask.cron_expr || ""}
                                onChange={e => setCurrentTask({...currentTask, cron_expr: e.target.value})}
                                placeholder={t("automation.placeholder_cron")}
                                className="bg-input border border-border rounded px-4 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs uppercase text-muted-foreground font-mono">{t("automation.command")} (CMD/Sh)</label>
                            <textarea 
                                value={currentTask.command || ""}
                                onChange={e => setCurrentTask({...currentTask, command: e.target.value})}
                                placeholder={t("automation.placeholder_cmd")}
                                className="bg-input border border-border rounded px-4 py-2 font-mono text-sm focus:border-primary focus:outline-none min-h-[100px]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs uppercase text-muted-foreground font-mono">{t("automation.enabled")}</label>
                             <button
                                onClick={() => setCurrentTask({...currentTask, enabled: !currentTask.enabled})}
                                className={cn(
                                    "w-10 h-5 rounded-full transition-colors relative",
                                    currentTask.enabled ? "bg-primary" : "bg-muted"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-3 h-3 rounded-full bg-background transition-all",
                                    currentTask.enabled ? "left-6" : "left-1"
                                )} />
                            </button>
                        </div>
                        
                        <div className="flex gap-4 mt-4">
                            <button 
                                onClick={handleSave}
                                disabled={!currentTask.name || !currentTask.command}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-black font-bold text-sm rounded hover:shadow-[0_0_15px_var(--color-primary)] transition-shadow disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {t("automation.save")}
                            </button>
                            <button 
                                onClick={() => { setIsEditing(false); setCurrentTask({}); }}
                                className="flex items-center gap-2 px-6 py-2 bg-muted text-muted-foreground font-bold text-sm rounded hover:bg-muted/80 transition-colors"
                            >
                                <X className="h-4 w-4" />
                                {t("automation.cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tasks.length === 0 && (
                        <div className="text-center py-20 bg-muted/30 border border-border rounded text-muted-foreground">
                            <Bot className="h-10 w-10 mx-auto mb-4 opacity-20" />
                            {t("automation.no_tasks")}
                        </div>
                    )}
                    
                    {tasks.map(task => (
                        <div key={task.id} className={cn(
                            "group bg-card border border-border rounded p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-primary/50 transition-colors",
                            !task.enabled && "opacity-60"
                        )}>
                            <div className="flex-1 space-y-2 w-full">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", task.enabled ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" : "bg-muted-foreground")}></div>
                                    <h3 className="font-bold text-lg text-primary font-mono">{task.name}</h3>
                                    <span className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">{task.cron_expr || "MANUAL ONLY"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-black/20 p-2 rounded truncate max-w-full">
                                    <Terminal className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{task.command}</span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs font-mono">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{t("automation.last_run")}: {task.last_run ? new Date(task.last_run).toLocaleString() : "-"}</span>
                                    </div>
                                    {task.last_result && task.last_result !== "Running..."  && task.last_result !== "Success" && (
                                         <details className="w-full">
                                            <summary className={cn("cursor-pointer hover:underline flex items-center gap-1", task.last_result.startsWith("Error") ? "text-destructive" : "text-foreground")}>
                                              <span>[{task.last_result.startsWith("Error") ? "ERR" : "OK"}] Output</span>
                                            </summary>
                                            <div className="mt-2 p-2 bg-black/50 rounded overflow-x-auto whitespace-pre-wrap max-h-40 border border-border">
                                                {task.last_result}
                                            </div>
                                         </details>
                                    )}
                                    {task.last_result === "Success" && (
                                         <span className="text-green-500 font-bold">[SUCCESS]</span>
                                    )}
                                    {task.last_result === "Running..." && (
                                        <div className="w-full mt-2">
                                            <div className="text-yellow-500 font-bold animate-pulse text-xs mb-1">[RUNNING...]</div>
                                            <div className="p-2 bg-black/80 rounded overflow-x-auto overflow-y-auto whitespace-pre-wrap h-40 border border-yellow-500/30 text-xs font-mono text-green-400">
                                                {outputStreams[task.id] || task.last_result || "Waiting for output..."}
                                                <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                {task.last_result === "Running..." ? (
                                    <button 
                                        onClick={() => handleStop(task.id)}
                                        className="p-2 bg-destructive/10 text-destructive rounded hover:bg-destructive hover:text-white transition-colors"
                                        title={t("automation.stop")}
                                    >
                                        <Square className="h-4 w-4 fill-current" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleRun(task.id)}
                                        className="p-2 bg-primary/10 text-primary rounded hover:bg-primary hover:text-black transition-colors"
                                        title={t("automation.run_now")}
                                    >
                                        <Play className="h-4 w-4" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => startEdit(task)}
                                    className="p-2 bg-muted text-muted-foreground rounded hover:bg-muted-foreground hover:text-black transition-colors"
                                    title={t("automation.edit")}
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 bg-destructive/10 text-destructive rounded hover:bg-destructive hover:text-white transition-colors"
                                    title={t("automation.delete")}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Automation;
