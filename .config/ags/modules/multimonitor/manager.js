
class MultiMonitorManager {
    #display;
    #widgetConstructors = [];
    #windowsForMonitor = new Map();

    constructor() {
        this.#display = Gdk.Display.get_default();
        this.#display.connect("monitor-added", monitor => {
            const geometry = monitor.get_geometry();
            const hyprlandMonitors = Hyprland.monitors;
            for (let i = 0; i < this.#display.get_n_monitors(); ++i) {
                const candidate = this.#display.get_monitor(i).get_geometry();
                if (candidate.x === geometry.x && candidate.y === geometry.y && candidate.width === geometry.width && candidate.height === geometry.height) {
                    Object.assign(monitor, { connector: hyprlandMonitors[i].name });
                    break;
                }
            }
            this.#constructForMonitor(monitor);
        });

        this.#display.connect("monitor-removed", monitor => {
            // FIXME: unclear if these things have stable identity, I'd wager not
            const windows = this.#windowsForMonitor.get(monitor);
            for (const window of windows) {
                App.removeWindow(window);
            }
            this.#windowsForMonitor.delete(monitor);
        });
    }

    forMonitors(fn) {
        this.#widgetConstructors.push(fn);
    }

    init() {
        const hyprlandMonitors = Hyprland.monitors;
        for (let i = 0; i < this.#display.get_n_monitors(); ++i) {
            const monitor = this.#display.get_monitor(i);
            // Polyfill the connector property. It's present (but private) in
            // GDK 3 and part of the public API in GDK 4.
            Object.assign(monitor, { connector: hyprlandMonitors[i].name })
            this.#constructForMonitor(monitor)
        }
    }

    #constructForMonitor(monitor) {
        const windows = [];
        this.#windowsForMonitor.set(monitor, windows);

        for (const fn of this.#widgetConstructors) {
            const res = fn(monitor);
            if (res instanceof Promise) {
                res.then(res => {
                    windows.push(res);
                    App.addWindow(res);
                }, print);
            } else {
                windows.push(res);
                App.addWindow(res);
            }
        }
    }
}

// TODO: add openonall, closeonall, etc. methods