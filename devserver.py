"""
devserver.py — سيرفر تطوير محلي بدون كاش (بديل: python -m http.server 8080)
يرسل Cache-Control: no-store لكل استجابة — يمنع شبح "الكود القديم المخبأ"
أثناء تطوير ES Modules (متصفح يقدّم نسخ قديمة من mvodules رغم تعديل الملفات).

الاستخدام:  python devserver.py 8080
"""

import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # سطر واحد هادئ لكل طلب
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    # قاعدة مهمة: ES Modules تحتاج HTTP — لا تعمل عبر file://
    http.server.test(HandlerClass=NoCacheHandler, port=port, bind='127.0.0.1')
