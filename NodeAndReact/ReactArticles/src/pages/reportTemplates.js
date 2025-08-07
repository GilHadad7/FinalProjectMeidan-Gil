// תבניות דמו לדוחות (שכר, הוצאות, נוכחות)

export function getSalaryReportHtml(report) {
  return `
    <div dir="rtl" style="font-family:inherit;max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 18px #0001;">
      <h2 style="color:#b8925c;margin-bottom:16px;">דוח שכר חודשי</h2>
      <div style="font-size:16px;margin-bottom:12px;">חודש: <b>${report.month}</b> | שנה: <b>${report.year}</b></div>
      <div style="font-size:16px;margin-bottom:12px;">שם עובד: <b>ישראל ישראלי</b></div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <thead>
          <tr style="background:#f6e8d7;color:#4b3b2a;">
            <th style="border:1px solid #b8925c;padding:8px;">רכיב</th>
            <th style="border:1px solid #b8925c;padding:8px;">סכום (₪)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border:1px solid #b8925c;padding:8px;">שכר בסיס</td><td style="border:1px solid #b8925c;padding:8px;">8,500</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">בונוס</td><td style="border:1px solid #b8925c;padding:8px;">1,200</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">נסיעות</td><td style="border:1px solid #b8925c;padding:8px;">400</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">סה"כ</td><td style="border:1px solid #b8925c;padding:8px;font-weight:bold;">10,100</td></tr>
        </tbody>
      </table>
      <div style="margin-top:18px;font-size:15px;color:#888;">חתימה: ______________</div>
    </div>
  `;
}

export function getExpenseReportHtml(report) {
  return `
    <div dir="rtl" style="font-family:inherit;max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 18px #0001;">
      <h2 style="color:#b8925c;margin-bottom:16px;">דוח הוצאות</h2>
      <div style="font-size:16px;margin-bottom:12px;">חודש: <b>${report.month}</b> | שנה: <b>${report.year}</b></div>
      <div style="font-size:16px;margin-bottom:12px;">שם מגיש: <b>ישראל ישראלי</b></div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <thead>
          <tr style="background:#f6e8d7;color:#4b3b2a;">
            <th style="border:1px solid #b8925c;padding:8px;">סוג הוצאה</th>
            <th style="border:1px solid #b8925c;padding:8px;">סכום (₪)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border:1px solid #b8925c;padding:8px;">תחזוקה</td><td style="border:1px solid #b8925c;padding:8px;">2,000</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">חשמל</td><td style="border:1px solid #b8925c;padding:8px;">1,100</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">מים</td><td style="border:1px solid #b8925c;padding:8px;">700</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">סה"כ</td><td style="border:1px solid #b8925c;padding:8px;font-weight:bold;">3,800</td></tr>
        </tbody>
      </table>
      <div style="margin-top:18px;font-size:15px;color:#888;">חתימה: ______________</div>
    </div>
  `;
}

export function getAttendanceReportHtml(report) {
  return `
    <div dir="rtl" style="font-family:inherit;max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 18px #0001;">
      <h2 style="color:#b8925c;margin-bottom:16px;">דוח נוכחות</h2>
      <div style="font-size:16px;margin-bottom:12px;">חודש: <b>${report.month}</b> | שנה: <b>${report.year}</b></div>
      <div style="font-size:16px;margin-bottom:12px;">שם עובד: <b>ישראל ישראלי</b></div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <thead>
          <tr style="background:#f6e8d7;color:#4b3b2a;">
            <th style="border:1px solid #b8925c;padding:8px;">תאריך</th>
            <th style="border:1px solid #b8925c;padding:8px;">שעת כניסה</th>
            <th style="border:1px solid #b8925c;padding:8px;">שעת יציאה</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border:1px solid #b8925c;padding:8px;">01/${report.month}</td><td style="border:1px solid #b8925c;padding:8px;">08:00</td><td style="border:1px solid #b8925c;padding:8px;">17:00</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">02/${report.month}</td><td style="border:1px solid #b8925c;padding:8px;">08:00</td><td style="border:1px solid #b8925c;padding:8px;">17:00</td></tr>
          <tr><td style="border:1px solid #b8925c;padding:8px;">03/${report.month}</td><td style="border:1px solid #b8925c;padding:8px;">08:30</td><td style="border:1px solid #b8925c;padding:8px;">17:10</td></tr>
          <tr><td colspan="2" style="border:1px solid #b8925c;padding:8px;font-weight:bold;">סה"כ ימים</td><td style="border:1px solid #b8925c;padding:8px;">3</td></tr>
        </tbody>
      </table>
      <div style="margin-top:18px;font-size:15px;color:#888;">חתימה: ______________</div>
    </div>
  `;
}
