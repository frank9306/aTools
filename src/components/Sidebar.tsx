import { Link, useLocation } from "react-router-dom";
import { Terminal, Code, Activity, Settings, Bot } from "lucide-react";
import { cn } from "../lib/utils";
import { useSettings } from "../context/SettingsContext";

const Sidebar = () => {
    const location = useLocation();
    const { t } = useSettings();

    const navItems = [
        { name: t("nav.processes"), path: "/", icon: Activity },
        { name: t("nav.devtools"), path: "/devtools", icon: Code },
        { name: t("nav.automation"), path: "/automation", icon: Bot },
        { name: t("nav.settings"), path: "/settings", icon: Settings },
    ];

    return (
        <div className="h-screen w-64 bg-slate-950 border-r border-primary/50 p-4 flex flex-col font-mono text-xs">
            <div className="flex items-center gap-2 mb-8 text-primary">
                <Terminal className="h-6 w-6" />
                <h1 className="text-xl font-bold tracking-widest uppercase glitch-text">{t("app.title")}</h1>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 uppercase tracking-wider relative overflow-hidden group hover:text-primary",
                            location.pathname === item.path
                                ? "bg-primary/10 text-primary border-l-2 border-primary"
                                : "text-slate-400 hover:bg-primary/5"
                        )}
                    >
                         <span className={cn(
                            "absolute inset-0 bg-primary/10 translate-x-[-100%] transition-transform duration-300",
                            location.pathname === item.path ? "translate-x-0" : "group-hover:translate-x-0"
                         )}/>
                        <item.icon className="h-4 w-4 z-10" />
                        <span className="z-10">{item.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="text-[10px] text-slate-600 uppercase">
                v0.1.0 // SYS.READY
            </div>
        </div>
    );
};

export default Sidebar;
