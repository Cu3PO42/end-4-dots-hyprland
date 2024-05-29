import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Dock from './dock.js';

export default (gdkmonitor) => Widget.Window({
    gdkmonitor,
    name: `dock${gdkmonitor.connector}`,
    layer: userOptions.dock.layer,
    anchor: ['bottom'],
    exclusivity: 'normal',
    visible: true,
    child: Dock(gdkmonitor),
});
