use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::io::{Read, BufReader};
use std::collections::HashMap;
use cron::Schedule;
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use tauri::{AppHandle, Manager, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub cron_expr: String,
    pub command: String,
    pub enabled: bool,
    pub last_run: Option<String>, 
    pub last_result: Option<String>,
}

pub struct Scheduler {
    pub tasks: Arc<Mutex<Vec<Task>>>,
    pub running_tasks: Arc<Mutex<HashMap<String, Arc<Mutex<Child>>>>>,
    pub app_handle: AppHandle,
    pub data_path: PathBuf,
}

#[derive(Clone)]
pub struct SchedulerState(pub Arc<Scheduler>);

impl Scheduler {
    pub fn new(app_handle: AppHandle) -> Self {
        let data_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("data"));
        if !data_dir.exists() {
            let _ = fs::create_dir_all(&data_dir);
        }
        let data_path = data_dir.join("tasks.json");

        let tasks = if data_path.exists() {
            let content = fs::read_to_string(&data_path).unwrap_or_default();
            let mut loaded_tasks: Vec<Task> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
             // Reset stuck "Running..." status from previous sessions
            for task in loaded_tasks.iter_mut() {
                if let Some(res) = &task.last_result {
                    if res == "Running..." {
                         task.last_result = Some("Interrupted".to_string());
                    }
                }
            }
            loaded_tasks
        } else {
            Vec::new()
        };

        Scheduler {
            tasks: Arc::new(Mutex::new(tasks)),
            running_tasks: Arc::new(Mutex::new(HashMap::new())),
            app_handle,
            data_path,
        }
    }

    pub fn save(&self) {
        let tasks = self.tasks.lock().unwrap();
        let content = serde_json::to_string_pretty(&*tasks).unwrap_or_default();
        let _ = fs::write(&self.data_path, content);
    }
}

pub fn init(app_handle: AppHandle) -> SchedulerState {
    let scheduler = Scheduler::new(app_handle.clone());
    let state = SchedulerState(Arc::new(scheduler));
    
    // Start background thread
    let thread_state = state.clone();
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(1)); // Check every second
            
            let now = Local::now();
            let mut tasks_to_run = Vec::new(); // (id)

            {
                let scheduler = &thread_state.0;
                let mut tasks = scheduler.tasks.lock().unwrap();
                
                for task in tasks.iter_mut() {
                    if !task.enabled || task.cron_expr.is_empty() {
                        continue;
                    }

                    if let Ok(schedule) = Schedule::from_str(&task.cron_expr) {
                        // Check if we hit a schedule time in the last 2 seconds (to be safe with sleep drift)
                        let check_start = now - chrono::Duration::seconds(2);
                        let next_occurrence = schedule.after(&check_start).next();
                        
                        if let Some(time) = next_occurrence {
                            // If the scheduled time is <= now and > now - 2s
                            if time <= now {
                                 // Check debounce
                                 let last_run_ok = if let Some(lr) = &task.last_run {
                                     let lr_dt = DateTime::parse_from_rfc3339(lr).ok();
                                     if let Some(lrdt) = lr_dt {
                                          let diff = (now - lrdt.with_timezone(&Local)).num_seconds();
                                          diff > 1 
                                     } else { true }
                                 } else { true };
                                 
                                 if last_run_ok {
                                     tasks_to_run.push(task.id.clone());
                                     // Update last_run immediately to prevent double-add in very slow loops?
                                     // No, we update in run_task_internal.
                                     // Actually, if we sleep 1s, next iteration might see the same 'time' if update hasn't happened.
                                     // But run_task_internal writes last_run.
                                 }
                            }
                        }
                    }
                }
            }

            // Execute outside lock to avoid blocking
            for id in tasks_to_run {
                let thread_state_clone = thread_state.clone();
                let task_id = id.clone();
                thread::spawn(move || {
                    run_task_internal(&thread_state_clone, &task_id);
                });
            }
        }
    });

    state
}

fn run_task_internal(state: &SchedulerState, id: &str) {
    let scheduler = &state.0;
    
    let (cmd_str, _task_name) = {
        let mut tasks = scheduler.tasks.lock().unwrap();
        if let Some(t) = tasks.iter_mut().find(|t| t.id == id) {
             t.last_result = Some("Running...".to_string());
             (t.command.clone(), t.name.clone())
        } else {
            return;
        }
    };
    
    scheduler.save();
    let _ = scheduler.app_handle.emit("task-updated", ());

    // Execution
    let result = execute_streaming(scheduler, id, &cmd_str);
    let now_str = Local::now().to_rfc3339();

    // Update state
    {
        let mut tasks = scheduler.tasks.lock().unwrap();
        if let Some(t) = tasks.iter_mut().find(|t| t.id == id) {
            t.last_run = Some(now_str);
            t.last_result = Some(result);
        }
    } // Lock released

    scheduler.save();
    
    // Notify frontend
    let _ = scheduler.app_handle.emit("task-updated", ());
}

fn execute_streaming(scheduler: &Scheduler, id: &str, cmd_str: &str) -> String {
    let mut command;

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell without forcing UTF-8 on the console or pipe.
        // This ensures native commands (which output in system encoding, e.g. GBK) are transmitted as-is.
        // We will decode the output on the Rust side using encoding_rs.
        command = Command::new("powershell");
        command.args(&["-NoProfile", "-NonInteractive", "-Command", cmd_str]);

        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    #[cfg(not(target_os = "windows"))]
    {
        command = Command::new("sh");
        command.args(&["-c", cmd_str]);
    }

    // Pipe outputs
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    match command.spawn() {
        Ok(mut child) => {
            let stdout = child.stdout.take();
            let stderr = child.stderr.take();
            
            // Store child to allow killing
            {
                let mut running = scheduler.running_tasks.lock().unwrap();
                running.insert(id.to_string(), Arc::new(Mutex::new(child)));
            }
            
            let _output_acc = String::new();
            let app_handle = scheduler.app_handle.clone();
            let task_id = id.to_string();
            
            // We can only block on one thing easily in this thread.
            // Spawning separate threads for stdout/stderr?
            // Or just read one then the other? (Deadlock risk if buffer full)
            // Proper way: threads.
            
            let output_arc = Arc::new(Mutex::new(String::new()));
            let output_clone1 = output_arc.clone();
            let output_clone2 = output_arc.clone();
            let app_handle_clone = app_handle.clone();
            let task_id_t2 = task_id.clone();
            let task_id_t1 = task_id.clone();
            
            let t1 = if let Some(out) = stdout {
                thread::spawn(move || {
                    let mut reader = BufReader::new(out);
                    let mut buffer = [0; 1024];
                    let mut pending = Vec::new();
                    
                    loop {
                        match reader.read(&mut buffer) {
                            Ok(0) => break, // EOF
                            Ok(n) => {
                                pending.extend_from_slice(&buffer[..n]);

                                // Try decoding as UTF-8 first
                                if let Ok(s) = std::str::from_utf8(&pending) {
                                    let msg = s.to_string();
                                    {
                                        let mut acc = output_clone1.lock().unwrap();
                                        acc.push_str(&msg);
                                    }
                                    let _ = app_handle.emit("task-output", (task_id_t1.clone(), msg));
                                    pending.clear();
                                } else {
                                    // If not valid UTF-8, try decoding as GBK (common Windows encoding in CN)
                                    // Only do this if we have enough bytes or if the buffer is full?
                                    // Actually, we should probably just try decoding the whole pending buffer as GBK if UTF-8 fails
                                    // But what if it's a split UTF-8 character?
                                    
                                    // Simple heuristic: Try to decode as GBK using encoding_rs
                                    // encoding_rs handles partial sequences by returning replacement or valid_up_to logic, 
                                    // but here we just want to decode what we have if it looks like GBK.
                                    
                                    // Note: GBK is a superset of ASCII.
                                    let (res, _enc, errors) = encoding_rs::GBK.decode(&pending);
                                    if !errors {
                                         // It's valid GBK (or ASCII)
                                         let msg = res.to_string();
                                         {
                                             let mut acc = output_clone1.lock().unwrap();
                                             acc.push_str(&msg);
                                         }
                                         let _ = app_handle.emit("task-output", (task_id_t1.clone(), msg));
                                         pending.clear();
                                    } else {
                                         // It's neither valid UTF-8 nor valid GBK (or it's incomplete).
                                         // Wait for more data? 
                                         // Since we read 1024 bytes, and typical multi-byte chars are 2-3 bytes, 
                                         // if we have data left, we can keep it in pending.
                                         // But if the buffer is full (unlikely to have 1024 bytes of garbage), we might stuck.
                                         
                                         // Force decode using GBK lossy if pending gets too large or other conditions?
                                         // Implementation detail: for now, assume incomplete, wait next read.
                                         // BUT: if we are at EOF (handled by Ok(0)), we should flush.
                                         
                                         // Problem: If we never get valid sequence, we fill memory.
                                         // Let's rely on standard UTF-8 incomplete handling for now? No, we need GBK.
                                         
                                         // Let's decode as GBK lossy immediately for the bulk, handling stream safety?
                                         // encoding_rs::Decoder is better for streaming.
                                         
                                         let (res, _read, replaced) = encoding_rs::GBK.decode(&pending);
                                         // If replaced is true, it means there were errors. 
                                         // But maybe it's just incomplete at the end?
                                         // We really should use a streaming decoder state, but that requires refactoring structure.
                                         
                                         // Workaround: Just decode lossy as GBK for display
                                         let msg = res.to_string();
                                         {
                                             let mut acc = output_clone1.lock().unwrap();
                                             acc.push_str(&msg);
                                         }
                                         let _ = app_handle.emit("task-output", (task_id_t1.clone(), msg));
                                         pending.clear();
                                    }
                                }
                            }
                            Err(_) => break,
                        }
                    }
                    // Flush remaining if any (shouldn't really happen if stream ends cleanly on char boundary)
                    if !pending.is_empty() {
                         let msg = String::from_utf8_lossy(&pending).to_string();
                         {
                             let mut acc = output_clone1.lock().unwrap();
                             acc.push_str(&msg);
                         }
                         let _ = app_handle.emit("task-output", (task_id_t1.clone(), msg));
                    }
                })
            } else { thread::spawn(|| {}) };

            let t2 = if let Some(err) = stderr {
                thread::spawn(move || {
                    let mut reader = BufReader::new(err);
                    let mut buffer = [0; 1024];
                    let mut pending = Vec::new();
                    
                    loop {
                        match reader.read(&mut buffer) {
                            Ok(0) => break, // EOF
                            Ok(n) => {
                                pending.extend_from_slice(&buffer[..n]);
                                // Try UTF-8 first
                                if let Ok(s) = std::str::from_utf8(&pending) {
                                    let msg = s.to_string();
                                    {
                                        let mut acc = output_clone2.lock().unwrap();
                                        acc.push_str(&msg);
                                    }
                                    let _ = app_handle_clone.emit("task-output", (task_id_t2.clone(), msg));
                                    pending.clear();
                                } else {
                                    // Fallback to GBK
                                    let (res, _enc, _errors) = encoding_rs::GBK.decode(&pending);
                                    let msg = res.to_string(); // This deals with incomplete bytes by using replacements or waiting? 
                                    // decode() replaces malformed sequences. 
                                    // For streaming exactness we should usage Decoder, but for simple output logging this is usually acceptable 
                                    // provided we don't cut in the middle of a multibyte char too often.
                                    
                                    {
                                        let mut acc = output_clone2.lock().unwrap();
                                        acc.push_str(&msg);
                                    }
                                    let _ = app_handle_clone.emit("task-output", (task_id_t2.clone(), msg));
                                    pending.clear();
                                }
                            }
                            Err(_) => break,
                        }
                    }
                    if !pending.is_empty() {
                         let msg = String::from_utf8_lossy(&pending).to_string();
                         {
                             let mut acc = output_clone2.lock().unwrap();
                             acc.push_str(&msg);
                         }
                         let _ = app_handle_clone.emit("task-output", (task_id_t2.clone(), msg));
                    }
                })
            } else { thread::spawn(|| {}) };

            // Wait for threads (IO) and Child with timeout/polling to allow killing
            let mut wait_res = Err(std::io::Error::new(std::io::ErrorKind::Other, "Encoding"));
            let mut loop_count = 0;
            
            loop {
                // Check if child has exited
                let exited = {
                    // Scope for locks
                    let running = scheduler.running_tasks.lock().unwrap();
                    if let Some(child_arc) = running.get(&task_id) {
                        let mut child = child_arc.lock().unwrap();
                         match child.try_wait() {
                            Ok(Some(status)) => {
                                wait_res = Ok(status);
                                true
                            },
                            Ok(None) => false, // Still running
                            Err(e) => {
                                wait_res = Err(e);
                                true
                            }
                        }
                    } else {
                        // Lost child reference?
                         wait_res = Err(std::io::Error::new(std::io::ErrorKind::Other, "Process lost"));
                         true
                    }
                };
                
                if exited {
                    break;
                }
                
                thread::sleep(Duration::from_millis(200));
                
                // Periodically update the task's last_result with partial output
                // so the UI can see it even if the page is reloaded.
                loop_count += 1;
                if loop_count % 5 == 0 { // Every 1 second
                    let current_output = output_arc.lock().unwrap().clone();
                     let mut tasks = scheduler.tasks.lock().unwrap();
                    if let Some(t) = tasks.iter_mut().find(|t| t.id == task_id) {
                        t.last_result = Some(current_output);
                    }
                    // Optionally save? Might be too IO intensive.
                    // scheduler.save(); 
                }
            }

            // Remove from map
            {
                let mut running = scheduler.running_tasks.lock().unwrap();
                running.remove(&task_id);
            }
            
            // Join IO threads
            let _ = t1.join();
            let _ = t2.join();
            
            let mut final_output = output_arc.lock().unwrap().clone();
            
            // Truncate output if too large to prevent persistent storage bloat
            const MAX_LOG_SIZE: usize = 20 * 1024; // 20KB
            if final_output.len() > MAX_LOG_SIZE {
                final_output = format!("... [Output Truncated, {} bytes hidden] ...\n{}", 
                    final_output.len() - MAX_LOG_SIZE,
                    &final_output[final_output.len() - MAX_LOG_SIZE..]);
            }

            match wait_res {
                Ok(status) => {
                    if status.success() {
                        if final_output.trim().is_empty() { "Success".to_string() } else { final_output }
                    } else {
                        format!("Error (Exit Code {}):\n{}", status.code().unwrap_or(-1), final_output)
                    }
                },
                Err(e) => format!("Process Error: {}\nOutput:\n{}", e, final_output)
            }
        },
        Err(e) => format!("Execution Failed: {}", e),
    }
}

// Commands
#[tauri::command]
pub async fn get_tasks(state: State<'_, SchedulerState>) -> Result<Vec<Task>, ()> {
    Ok(state.0.tasks.lock().unwrap().clone())
}

#[tauri::command]
pub async fn add_task(mut task: Task, state: State<'_, SchedulerState>) -> Result<(), ()> {
    task.id = uuid::Uuid::new_v4().to_string();
    let mut tasks = state.0.tasks.lock().unwrap();
    tasks.push(task);
    drop(tasks);
    state.0.save();
    Ok(())
}

#[tauri::command]
pub async fn update_task(task: Task, state: State<'_, SchedulerState>) -> Result<(), ()> {
    let mut tasks = state.0.tasks.lock().unwrap();
    if let Some(t) = tasks.iter_mut().find(|t| t.id == task.id) {
        *t = task;
    }
    drop(tasks);
    state.0.save();
    Ok(())
}

#[tauri::command]
pub async fn delete_task(id: String, state: State<'_, SchedulerState>) -> Result<(), ()> {
    let mut tasks = state.0.tasks.lock().unwrap();
    tasks.retain(|t| t.id != id);
    drop(tasks);
    state.0.save();
    Ok(())
}

#[tauri::command]
pub async fn run_task_manual(id: String, state: State<'_, SchedulerState>) -> Result<(), ()> {
    let state_clone = (*state).clone();
    thread::spawn(move || {
        run_task_internal(&state_clone, &id);
    });
    Ok(())
}

#[tauri::command]
pub async fn stop_task(id: String, state: State<'_, SchedulerState>) -> Result<(), ()> {
    let scheduler = &state.0;
    
    // Get PID and Child reference safely
    let (pid, child_arc) = {
        let running = scheduler.running_tasks.lock().unwrap();
        if let Some(child_arc) = running.get(&id) {
            let child = child_arc.lock().unwrap();
            (child.id(), child_arc.clone())
        } else {
            return Ok(());
        }
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        // Force kill process tree
        let _ = Command::new("taskkill")
            .args(&["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }

    {
        let mut child = child_arc.lock().unwrap();
        let _ = child.kill();
    }
    
    Ok(())
}
