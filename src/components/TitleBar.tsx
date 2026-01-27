import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "../lib/utils";

interface TitleBarProps {
    className?: string;
}

export const TitleBar = ({ className }: TitleBarProps) => {
    const handleMinimize = () => {
        getCurrentWindow().minimize();
    };

    const handleMaximize = async () => {
        const win = getCurrentWindow();
        const isMaximized = await win.isMaximized();
        if (isMaximized) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    };

    const handleClose = () => {
        // Since we are interfering with the close event in Rust to hide the window,
        // calling close() here will trigger that event.
        getCurrentWindow().close();
    };

    return (
        <div className={cn("h-8 flex-none flex items-center justify-between select-none bg-background/80 backdrop-blur-sm border-b border-border z-50", className)}>
            <div data-tauri-drag-region className="flex items-center gap-2 px-3 h-full flex-1 cursor-default">
                <span className="text-xs font-mono font-bold text-primary tracking-wider uppercase pointer-events-none">
                    aTools // SYS.ADMIN
                </span>
            </div>
            
            <div className="flex items-center h-full">
                <div 
                    onClick={handleMinimize}
                    className="h-full px-4 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    <Minus className="h-4 w-4" />
                </div>
                <div 
                    onClick={handleMaximize}
                    className="h-full px-4 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    <Square className="h-3 w-3" />
                </div>
                <div 
                    onClick={handleClose}
                    className="h-full px-4 flex items-center justify-center hover:bg-red-500 hover:text-white text-muted-foreground transition-colors cursor-pointer"
                >
                    <X className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
};
