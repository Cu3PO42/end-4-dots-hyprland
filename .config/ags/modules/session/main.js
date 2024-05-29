import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import SessionScreen from "./sessionscreen.js";
import PopupWindow from '../.widgethacks/popupwindow.js';

export default (gdkmonitor) => PopupWindow({ // On-screen keyboard
    gdkmonitor,
    name: `session${gdkmonitor.connector}`,
    visible: false,
    keymode: 'on-demand',
    layer: 'overlay',
    exclusivity: 'ignore',
    anchor: ['top', 'bottom', 'left', 'right'],
    child: SessionScreen({ id: gdkmonitor.connector }),
})
