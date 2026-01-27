import { useState, useEffect } from "react";
import { Monitor, Globe, Power } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { cn } from "../lib/utils";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

const Settings = () => {
    const { theme, setTheme, language, setLanguage, t } = useSettings();
    const [autostart, setAutostart] = useState(false);

    useEffect(() => {
        isEnabled().then(setAutostart);
    }, []);

    const toggleAutostart = async () => {
        try {
            if (autostart) {
                await disable();
                setAutostart(false);
                window.umami?.track('Settings Autostart', { enabled: false });
            } else {
                await enable();
                setAutostart(true);
                window.umami?.track('Settings Autostart', { enabled: true });
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Monitor className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-primary uppercase tracking-widest">
                    {t("settings.title")}
                </h2>
            </div>

            <div className="grid gap-6 max-w-2xl">
                 {/* Autostart */}
                 <div className="bg-card border border-border rounded p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Power className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-mono text-foreground">{t("settings.autostart")}</h3>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background border border-border rounded">
                        <span className="text-sm text-muted-foreground font-mono">{t("settings.autostart_desc")}</span>
                         <button
                            onClick={toggleAutostart}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                autostart ? "bg-primary" : "bg-muted"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-background transition-all",
                                autostart ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>
                </div>

                {/* UI Style */}
                <div className="bg-card border border-border rounded p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-mono text-foreground">{t("settings.theme")}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Cyberpunk Theme */}
                        <button
                            onClick={() => {
                                setTheme("cyberpunk");
                                window.umami?.track('Settings Theme', { theme: 'cyberpunk' });
                            }}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded border-2 transition-all",
                                theme === "cyberpunk"
                                    ? "border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]"
                                    : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                            )}
                        >
                            <div className="w-full h-20 bg-slate-900 relative overflow-hidden rounded mb-2 border border-slate-800">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/20 to-[#ff00ff]/20"></div>
                                <div className="absolute bottom-2 right-2 w-8 h-2 bg-[#00f0ff]"></div>
                            </div>
                            <span className="font-mono text-xs uppercase">{t("theme.cyberpunk")}</span>
                        </button>

                         {/* Hacker Theme */}
                         <button
                            onClick={() => {
                                setTheme("hacker");
                                window.umami?.track('Settings Theme', { theme: 'hacker' });
                            }}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all",
                                theme === "hacker"
                                    ? "border-[#00ff00] bg-black text-[#00ff00]"
                                    : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                            )}
                        >
                            <div className="w-full h-20 bg-black relative overflow-hidden rounded-none mb-2 border border-[#00ff00]">
                                <div className="absolute inset-0 font-mono text-[8px] text-[#00ff00] opacity-30 p-1 leading-none select-none">
                                    01010101
                                    10101010
                                    00110011
                                </div>
                                <div className="absolute bottom-2 right-2 w-8 h-2 bg-[#00ff00]"></div>
                            </div>
                            <span className="font-mono text-xs uppercase">{t("theme.hacker")}</span>
                        </button>
                    </div>
                </div>

                {/* Language */}
                <div className="bg-slate-900/50 border border-slate-800 rounded p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe className="h-5 w-5 text-slate-400" />
                        <h3 className="text-lg font-mono text-slate-200">{t("settings.language")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => {
                                setLanguage("zh");
                                window.umami?.track('Settings Language', { target: 'zh' });
                            }}
                            className={cn(
                                "px-4 py-3 rounded border font-mono text-sm uppercase transition-all",
                                language === "zh"
                                    ? "border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]"
                                    : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                            )}
                        >
                            {t("lang.zh")}
                        </button>
                        <button
                            onClick={() => {
                                setLanguage("en");
                                window.umami?.track('Settings Language', { target: 'en' });
                            }}
                            className={cn(
                                "px-4 py-3 rounded border font-mono text-sm uppercase transition-all",
                                language === "en"
                                    ? "border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]"
                                    : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                            )}
                        >
                            {t("lang.en")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
