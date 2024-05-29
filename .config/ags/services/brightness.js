import Gdk from 'gi://Gdk';
import Hyprland from 'resource:///com/github/Aylur/ags/service/hyprland.js';
import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { exec, execAsync } = Utils;

import { clamp } from '../modules/.miscutils/mathfuncs.js';

class BrightnessServiceBase extends Service {
    static {
        Service.register(
            this,
            { 'screen-changed': ['float'], },
            { 'screen-value': ['float', 'rw'], },
        );
    }

    _screenValue = 0;

    // the getter has to be in snake_case
    get screen_value() { return this._screenValue; }

    // the setter has to be in snake_case too
    set screen_value(percent) {
        percent = clamp(percent, 0, 1);
        this._screenValue = percent;

        Utils.execAsync(this.setBrightnessCmd(percent))
            .then(() => {
                // signals has to be explicity emitted
                this.emit('screen-changed', percent);
                this.notify('screen-value');

                // or use Service.changed(propName: string) which does the above two
                // this.changed('screen');
            })
            .catch(print);
    }

    // overwriting connectWidget method, lets you
    // change the default event that widgets connect to
    connectWidget(widget, callback, event = 'screen-changed') {
        super.connectWidget(widget, callback, event);
    }
}

class BrightnessCtlService extends BrightnessServiceBase {
    static {
        Service.register(this);
    }

    constructor() {
        super();
        const current = Number(exec('brightnessctl g'));
        const max = Number(exec('brightnessctl m'));
        this._screenValue = current / max;
    }

    setBrightnessCmd(percent) {
        return `brightnessctl s ${percent * 100}% -q`;
    }
}

class BrightnessDdcService extends BrightnessServiceBase {
    static {
        Service.register(this);
    }

    constructor(busNum) {
        super();
        this._busNum = busNum;
        Utils.execAsync(`ddcutil -b ${this._busNum} getvcp 10 --brief`)
            .then((out) => {
                // only the last line is useful
                out = out.split('\n');
                out = out[out.length - 1];

                out = out.split(' ');
                const current = Number(out[3]);
                const max = Number(out[4]);
                this._screenValue = current / max;
            })
            .catch(print);
    }

    setBrightnessCmd(percent) {
        return `ddcutil -b ${this._busNum} setvcp 10 ${Math.round(percent * 100)}`;
    }
}

async function listDdcMonitorsSnBus() {
    let ddcSnBus = {};
    try {
        const out = await Utils.execAsync('ddcutil detect --brief');
        const displays = out.split('\n\n');
        displays.forEach(display => {
            const reg = /^Display \d+/;
            if (!reg.test(display))
                return;
            const lines = display.split('\n');
            const sn = lines[3].split(':')[3];
            const busNum = lines[1].split('/dev/i2c-')[1];
            ddcSnBus[sn] = busNum;
        });
    } catch (err) {
        print(err);
    }
    return ddcSnBus;
}

// Service instance
const display = Gdk.Display.get_default();
const service = {};
let ddcSnBus = await listDdcMonitorsSnBus();
let hyprlandMonitors = new Map(Hyprland.monitors.map(e => [e.name, e]));
console.log(Hyprland.monitors);
function constructForMonitor(monitor) {
    const monitorName = monitor.connector;
    console.log(monitorName)
    const monitorSn = hyprlandMonitors.get(monitorName).serial;
    const preferredController = userOptions.brightness.controllers[monitorName]
        || userOptions.brightness.controllers.default || "auto";
    switch (preferredController) {
        case "brightnessctl":
            service[monitorName] = new BrightnessCtlService();
            break;
        case "ddcutil":
            service[monitorName] = new BrightnessDdcService(ddcSnBus[monitorSn]);
            break;
        case "auto":
            if (monitorSn in ddcSnBus)
                service[monitorName] = new BrightnessDdcService(ddcSnBus[monitorSn]);
            else
                service[monitorName] = new BrightnessCtlService();
            break;
        default:
            throw new Error(`Unknown brightness controller ${preferredController}`);
    }
}
{
    const hyprlandMonitors = Hyprland.monitors;
    for (let i = 0; i < display.get_n_monitors(); ++i) {
        const monitor = display.get_monitor(i);
        Object.assign(monitor, { connector: hyprlandMonitors[i].name })
        constructForMonitor(monitor);
    }
}
display.connect("monitor-added", async monitor => {
    ddcSnBus = await listDdcMonitorsSnBus();
    const monitorList = Hyprland.monitors;
    hyprlandMonitors = new Map(monitorList.map(e => [e.name, e]));
    const geometry = monitor.get_geometry();
    for (let i = 0; i < display.get_n_monitors(); ++i) {
        const candidate = display.get_monitor(i).get_geometry();
        if (candidate.x === geometry.x && candidate.y === geometry.y && candidate.width === geometry.width && candidate.height === geometry.height) {
            Object.assign(monitor, { connector: monitorList[i].name });
            break;
        }
    }
    constructForMonitor(monitor);
});
display.connect("monitor-removed", monitor => {
    delete service[monitor.connector];
});

// make it global for easy use with cli
globalThis.brightness = service[0];

// export to use in other modules
export default service;
