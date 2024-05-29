import PopupWindow from '../.widgethacks/popupwindow.js';
import OnScreenKeyboard from "./onscreenkeyboard.js";

export default (gdkmonitor) => PopupWindow({
    gdkmonitor,
    anchor: ['bottom'],
    name: `osk${gdkmonitor.connector}`,
    showClassName: 'osk-show',
    hideClassName: 'osk-hide',
    child: OnScreenKeyboard({ id: gdkmonitor.connector }),
});
