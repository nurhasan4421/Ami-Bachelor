/**
 * Generates an interactive, responsive printable HTML document with:
 * - Simple, inline, responsive top toolbar (← Back, Editable Filename, 📥 Save / Download, 🖨️ Print)
 * - html2pdf.js integration for real client-side PDF saving with user-chosen filename
 * - Native print fallback
 * - Screen and print media styling
 */
export function generatePrintableDoc({
  defaultFilename,
  contentHtml,
}: {
  defaultFilename: string;
  contentHtml: string;
}): string {
  const cleanDefault = defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${cleanDefault}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .no-print { display: block; }
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff !important; padding: 0 !important; }
      .sheet-container { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
    }
    .tb-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      z-index: 999999;
      padding: 8px 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .tb-row {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tb-btn {
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .tb-back {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .tb-back:hover { background: #e2e8f0; }
    .tb-name-box {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1 1 180px;
      min-width: 130px;
    }
    .tb-tag {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tb-name-box input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
    }
    .tb-name-box input:focus {
      border-color: #ff0000;
      background: #ffffff;
    }
    .tb-btns {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .tb-save {
      background: #ff0000;
      color: #ffffff;
      border: none;
    }
    .tb-save:hover { background: #e60000; }
    .tb-print {
      background: #0f172a;
      color: #ffffff;
      border: none;
    }
    .tb-print:hover { background: #1e293b; }
    .sheet-container {
      max-width: 860px;
      margin: 20px auto 40px auto;
      background: #ffffff;
      padding: 24px 28px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }
    @media (max-width: 640px) {
      .sheet-container { padding: 16px 14px; margin: 12px auto; border-radius: 0; border: none; }
      .tb-bar { padding: 6px 10px; }
    }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 24px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
    th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 11px; color: #64748b; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; font-size: 14px; font-weight: 700; }
    .credit { color: #16a34a; font-weight: 700; }
    .due { color: #dc2626; font-weight: 700; }
    .bengali-font { font-family: 'Noto Sans Bengali', sans-serif; }
    h1, h2, h3 { color: #0f172a; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 6px 0; }
    h2 { font-size: 16px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; margin-bottom: 12px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="no-print tb-bar">
    <div class="tb-row">
      <button type="button" onclick="goBack()" class="tb-btn tb-back">← Back</button>
      <div class="tb-name-box">
        <span class="tb-tag">File:</span>
        <input type="text" id="pdfNameInput" value="${cleanDefault}" placeholder="Enter file name" oninput="document.title=this.value" />
      </div>
      <div class="tb-btns">
        <button type="button" id="btnSavePDF" onclick="handleSavePDF()" class="tb-btn tb-save">📥 Save / Download</button>
        <button type="button" onclick="window.print()" class="tb-btn tb-print">🖨️ Print</button>
      </div>
    </div>
  </div>
  <div class="sheet-container" id="printable-content">
    ${contentHtml}
  </div>
  <script>
    function goBack() {
      try {
        if (window.opener && !window.opener.closed) {
          window.close();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      } catch(e) {
        window.location.href = '/';
      }
    }
    function getCleanFileName() {
      var inp = document.getElementById('pdfNameInput');
      var val = inp ? inp.value.trim() : '';
      if (!val) val = '${cleanDefault}';
      val = val.replace(/[\\\\/:*?"<>|]/g, '_');
      if (!val.toLowerCase().endsWith('.pdf')) val += '.pdf';
      return val;
    }
    function handleSavePDF() {
      var filename = getCleanFileName();
      document.title = filename;
      var btn = document.getElementById('btnSavePDF');
      var orig = btn ? btn.innerText : '';
      if (btn) { btn.innerText = '⏳ Generating...'; btn.disabled = true; }

      var el = document.getElementById('printable-content');
      if (window.html2pdf && el) {
        var opt = {
          margin: [10, 10, 10, 10],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(el).save().then(function() {
          if (btn) { btn.innerText = '✅ Saved!'; setTimeout(function() { btn.innerText = orig; btn.disabled = false; }, 2000); }
        }).catch(function(err) {
          console.warn('html2pdf fallback to print', err);
          window.print();
          if (btn) { btn.innerText = orig; btn.disabled = false; }
        });
      } else {
        window.print();
        if (btn) { btn.innerText = orig; btn.disabled = false; }
      }
    }
  </script>
</body>
</html>`;
}

export function openPrintableWindow(html: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
