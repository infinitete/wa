import { invoke } from "@tauri-apps/api/core";
import { Event, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";
import { exit } from "@tauri-apps/plugin-process";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

function App() {
  let strings: string[] = [];
  let [noti, setNoti] = useState<string[]>([]);

  const disableContextMenu = useCallback(() => {
    document.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
  }, []);

  const disableCopy = useCallback(() => {
    document.addEventListener("copy", function (e) {
      e.preventDefault();
    });
  }, []);

  const listener = (
    event: Event<{ key: string; name: string; event_type: string }>,
  ) => {
    const payload = event.payload;
    if (payload.event_type == "KeyPress") {
      strings = [...strings];
      strings.push(payload.key);
      strings = strings.slice(-5).map((x) => {
        if (x == "\b") return "Backspc";
        if (x == "\u001b") return "Esc";
        if (x == "ShiftLeft" || x == "ShiftRight") {
          return "Shift";
        }

        // 处理ControlLeft和ControlRight
        if (x.startsWith("Control")) {
          return "Ctrl";
        }

        if (x.endsWith("Arrow")) {
          switch (x.replace(/Arrow$/, "").toLowerCase()) {
            case "left":
              return "←";
            case "right":
              return "→";
            case "up":
              return "↑";
            case "down":
              return "↓";
          }
        }

        // 处理空格键
        if (x.length == 1 && x.charCodeAt(0) == 32) {
          return "Space";
        }

        if (x == "\t") {
          return "Tab";
        }

        if (x == "\r") {
          return "Enter";
        }

        return x;
      });

      let filtered = strings
        .filter((x) => !x.startsWith("Kp")) // 过滤小数字键盘
        .filter((x) => !x.startsWith("Unknow")); // 过滤全键盘的Meta和Control左边的键

      setNoti(filtered);
    }
  };

  const setupEventListener = async () => {
    const re = await listen("keyboard-event", listener);
    return re;
  };

  const alwaysOnTop = useCallback(async () => {
    const window = getCurrentWindow();
    const top = true;
    invoke("always_on_top", { window, top });
    window.setVisibleOnAllWorkspaces(true);
  }, []);

  const listenQuitEvent = useCallback(() => {
    window.addEventListener("keydown", (evt) => {
      if (evt.code == "KeyQ") {
        exit(0);
      }
    });
  }, []);

  useEffect(() => {
    moveWindow(Position.BottomCenter);
    disableCopy();
    disableContextMenu();
    let r = setupEventListener();
    alwaysOnTop();
    listenQuitEvent();
    return () => {
      r.then();
    };
  }, []);

  return (
    <main className="container" data-tauri-drag-region>
      <div style={{ color: "#fff" }}>
        {noti.map((x) => (
          <span style={{ margin: "0 4px" }}>{x}</span>
        ))}
      </div>
    </main>
  );
}

export default App;
