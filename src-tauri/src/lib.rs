// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use sysinfo::System;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize, Deserialize, Clone)]
struct ProcessInfo {
    pid: u32,
    ppid: Option<u32>,
    name: String,
    exe: String,
    cmd: String,
    memory: u64,
    cpu_usage: f32,
    status: String,
    ports: Vec<u16>,
    window_handle: Option<String>,
}

fn get_netstat_ports() -> HashMap<u32, Vec<u16>> {
    let mut map: HashMap<u32, Vec<u16>> = HashMap::new();
    
    // Execute netstat -ano
    if let Ok(output) = Command::new("netstat")
        .args(["-ano"])
        .creation_flags(CREATE_NO_WINDOW)
        .output() 
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            // Example line: "  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       4"
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 && (parts[0] == "TCP" || parts[0] == "UDP") {
                // Extract PID (last column)
                if let Ok(pid) = parts[parts.len() - 1].parse::<u32>() {
                    // Extract Port from Local Address (2nd column like 0.0.0.0:135)
                    if let Some(colon_pos) = parts[1].rfind(':') {
                        if let Ok(port) = parts[1][colon_pos + 1..].parse::<u16>() {
                            map.entry(pid).or_default().push(port);
                        }
                    }
                }
            }
        }
    }
    
    // Dedup ports
    for ports in map.values_mut() {
        ports.sort();
        ports.dedup();
    }
    
    map
}

fn get_window_handles() -> HashMap<u32, String> {
    let mut map = HashMap::new();
    
    // Using PowerShell to get MainWindowHandle
    // Warning: This is relatively slow.
    let ps_script = "(Get-Process).Where({$_.MainWindowHandle -ne 0}) | Select-Object Id, MainWindowHandle | ConvertTo-Json -Compress";
    
    if let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        #[derive(Deserialize)]
        struct HandleInfo {
            Id: u32,
            MainWindowHandle: usize, // Handle can be large
        }

        // Handle single object or array of objects from PowerShell JSON
        if let Ok(info_list) = serde_json::from_str::<Vec<HandleInfo>>(&stdout) {
            for info in info_list {
                map.insert(info.Id, format!("0x{:X}", info.MainWindowHandle));
            }
        } else if let Ok(info) = serde_json::from_str::<HandleInfo>(&stdout) {
             map.insert(info.Id, format!("0x{:X}", info.MainWindowHandle));
        }
    }
    
    map
}

#[tauri::command]
fn get_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Fetch additional info
    let ports_map = get_netstat_ports();
    let handles_map = get_window_handles();

    let mut processes = Vec::new();

    for (pid, process) in sys.processes() {
        let pid_val = pid.as_u32();
        processes.push(ProcessInfo {
            pid: pid_val,
            ppid: process.parent().map(|p| p.as_u32()),
            name: process.name().to_string_lossy().into_owned(),
            exe: process.exe().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default(),
            cmd: process.cmd().iter().map(|s| s.to_string_lossy().into_owned()).collect::<Vec<_>>().join(" "),
            memory: process.memory(),
            cpu_usage: process.cpu_usage(),
            status: process.status().to_string(),
            ports: ports_map.get(&pid_val).cloned().unwrap_or_default(),
            window_handle: handles_map.get(&pid_val).cloned(),
        });
    }

    processes
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use std::net::ToSocketAddrs;

#[tauri::command]
fn resolve_domain(domain: &str) -> Result<Vec<String>, String> {
    let domain_with_port = format!("{}:80", domain);
    match domain_with_port.to_socket_addrs() {
        Ok(addrs) => {
            let ips: Vec<String> = addrs.map(|addr| addr.ip().to_string()).collect();
             // Simple dedup
            let mut ips = ips;
            ips.sort();
            ips.dedup();
            Ok(ips)
        },
        Err(e) => Err(e.to_string()),
    }
}

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
    image::Image,
};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit aTools", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // Try to load icon from file bytes directly to be safe, or fallback to default
            // In a real app we might bundle the icon, but app.default_window_icon() should work if configured.
            // Let's print an error if it fails instead of unwrapping potentially.
            let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
                 // Fallback or explicit load if needed.
                 // For now, let's assuming bundle config is correct but maybe failed to load.
                 // We can try to use a built-in one or just not panic.
                 panic!("Failed to load default window icon for tray!");
            });

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(icon)
                .tooltip("aTools")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                     "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                             let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let win = window.clone();
                // Prevent the app from closing, just hide it
                // We typically only want to intercept the Main Window
                if win.label() == "main" {
                    let _ = win.hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![greet, get_processes, resolve_domain])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
