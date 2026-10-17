'use strict';
// Capture the untouched shell before loading names, roles, settings or live boards.
// Downloading a game must never serialize the current screen or private round.
const standaloneSource = '<!doctype html>\n' + document.documentElement.outerHTML;
function downloadStandalone() {
  let url;
  try {
    const file = new Blob([standaloneSource], { type: 'text/html;charset=utf-8' });
    url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lamma_universe.html';
    document.body.append(link);
    link.click();
    link.remove();
    // Let mobile browsers finish accepting the download before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('تم تجهيز ملف اللعبة. لنقل نقاطك صدّر نسخة التقدّم JSON أيضًا.');
    return true;
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    toast('تعذّر تنزيل الملف في هذا المتصفح. افتح الموقع في متصفح يدعم التنزيل.');
    return false;
  }
}
