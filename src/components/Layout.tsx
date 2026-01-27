import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useSettings } from "../context/SettingsContext";
import { TitleBar } from "./TitleBar";

const Layout = () => {
    const { theme } = useSettings();

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-primary selection:text-black">
            <TitleBar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto relative">
                    {/* Cyberpunk grid background effect - Only show in cyberpunk theme */}
                    {theme === 'cyberpunk' && (
                        <>
                            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" 
                                style={{
                                    backgroundImage: `
                                        linear-gradient(to right, #00f0ff 1px, transparent 1px),
                                        linear-gradient(to bottom, #00f0ff 1px, transparent 1px)
                                    `
                                }} 
                            />
                             {/* Vignette */}
                            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)]" />
                        </>
                    )}

                    <div className="relative z-10 p-6 min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
