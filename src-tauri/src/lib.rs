use rdev::{listen, Event, EventType};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{Emitter, Manager, WebviewWindow};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn always_on_top(window: tauri::Window, top: bool) -> String {
    match window.set_always_on_top(top) {
        Ok(_) => String::from("ok"),
        Err(err) => err.to_string(),
    }
}

// 定义一个结构体来表示我们想发送到前端的键盘事件
#[derive(Debug, Serialize, Deserialize, Clone)]
struct KeyboardEvent {
    key: String,
    name: String,
    event_type: String,
}

// 事件监听函数
fn start_keyboard_listener(window: WebviewWindow) {
    let window_arc = Arc::new(Mutex::new(window));

    thread::spawn(move || {
        let callback = move |event: Event| {
            let window = window_arc.lock().unwrap();
            let mut ke = KeyboardEvent {
                key: "".to_string(),
                name: "".to_string(),
                event_type: "".to_string(),
            };

            match event.event_type {
                EventType::KeyPress(key) => {
                    ke.event_type = "KeyPress".to_string();
                    ke.key = format!("{:?}", key)
                }
                EventType::KeyRelease(key) => {
                    ke.key = format!("{:?}", key);
                    ke.event_type = "KeyRelease".to_string();
                }
                _ => return, // 忽略其他事件类型 (MouseMove, ButtonPress等)
            };

            if let Some(name) = event.name {
                ke.key = name;
            }

            // 发送事件到前端
            window.emit("keyboard-event", ke).unwrap();
        };

        // 开始监听事件
        if let Err(error) = listen(callback) {
            println!("Error: {:?}", error);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap(); // 获取主窗口
            start_keyboard_listener(window); // 在应用启动时开始监听键盘事件
            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, always_on_top])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
