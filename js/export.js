// =============================================================
// EXPORT DO CSV A XLSX
// SheetJS (xlsx) musí být načten v index.html
// =============================================================

const Export = {

  // ─── CSV export ─────────────────────────────────────────────

  summaryToCSV(summaries, year, month) {
    const monthLabel = `${CZ_MONTHS[month - 1]} ${year}`;
    const headers = [
      'Jméno', 'Role',
      'Hod. celkem', 'Hod. pracovní dny', 'Hod. víkend', 'Hod. svátky',
      'Výdělek prac. dny (Kč)', 'Výdělek víkend (Kč)', 'Výdělek svátky (Kč)',
      'Výdělek celkem (Kč)', 'K výplatě (Kč)'
    ];

    const rows = summaries.map(s => [
      s.employee.name,
      ROLE_LABELS[s.employee.role] || s.employee.role,
      s.hours_total,
      s.hours_weekday,
      s.hours_weekend,
      s.hours_holiday,
      s.earnings_weekday.toFixed(2),
      s.earnings_weekend.toFixed(2),
      s.earnings_holiday.toFixed(2),
      s.earnings_total.toFixed(2),
      s.amount_to_pay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    this._downloadText(csvContent, `vykazy_${year}_${String(month).padStart(2,'0')}.csv`, 'text/csv;charset=utf-8;');
  },

  // ─── XLSX export ────────────────────────────────────────────

  summaryToXLSX(summaries, year, month) {
    if (!window.XLSX) {
      alert('Knihovna XLSX není načtena. Zkontroluj připojení k internetu.');
      return;
    }

    const monthLabel = `${CZ_MONTHS[month - 1]} ${year}`;

    // Sestava — souhrn
    const summaryData = [
      ['Výkaz mezd — Koupaliště', monthLabel],
      [],
      [
        'Jméno', 'Role',
        'Hod. celkem', 'Hod. pracovní dny', 'Hod. víkend', 'Hod. svátky',
        'Výdělek prac. dny (Kč)', 'Výdělek víkend (Kč)', 'Výdělek svátky (Kč)',
        'Výdělek celkem (Kč)', 'K výplatě (Kč)'
      ],
      ...summaries.map(s => [
        s.employee.name,
        ROLE_LABELS[s.employee.role] || s.employee.role,
        s.hours_total,
        s.hours_weekday,
        s.hours_weekend,
        s.hours_holiday,
        parseFloat(s.earnings_weekday.toFixed(2)),
        parseFloat(s.earnings_weekend.toFixed(2)),
        parseFloat(s.earnings_holiday.toFixed(2)),
        parseFloat(s.earnings_total.toFixed(2)),
        parseFloat(s.amount_to_pay.toFixed(2))
      ])
    ];

    const wb = window.XLSX.utils.book_new();
    const wsSummary = window.XLSX.utils.aoa_to_sheet(summaryData);

    // Šířky sloupců
    wsSummary['!cols'] = [
      { wch: 22 }, { wch: 12 },
      { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
      { wch: 22 }, { wch: 22 }, { wch: 22 },
      { wch: 20 }, { wch: 14 }
    ];

    window.XLSX.utils.book_append_sheet(wb, wsSummary, 'Souhrn');

    // Detailní list — každý zaměstnanec
    for (const s of summaries) {
      if (s.shifts.length === 0) continue;
      const sheetData = [
        [s.employee.name, ROLE_LABELS[s.employee.role] || s.employee.role, monthLabel],
        [],
        ['Datum', 'Den', 'Typ dne', 'Začátek', 'Konec', 'Hodin', 'Sazba (Kč/h)', 'Výdělek (Kč)'],
        ...s.shifts.map(sh => {
          const d = new Date(sh.date);
          return [
            sh.date,
            CZ_DAYS[d.getDay()],
            DAY_TYPE_LABELS[sh.day_type] || sh.day_type,
            sh.start_time,
            sh.end_time,
            parseFloat(sh.hours),
            parseFloat(sh.rate_applied),
            parseFloat(parseFloat(sh.earnings).toFixed(2))
          ];
        }),
        [],
        ['', '', '', '', 'CELKEM', parseFloat(s.hours_total.toFixed(2)), '', parseFloat(s.earnings_total.toFixed(2))]
      ];

      const ws = window.XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 16 },
        { wch: 10 }, { wch: 10 }, { wch: 8 },
        { wch: 14 }, { wch: 14 }
      ];
      // Název listu max 31 znaků, bez speciálních znaků
      const sheetName = s.employee.name.substring(0, 28).replace(/[:\\/?*[\]]/g, '');
      window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    window.XLSX.writeFile(wb, `vykazy_${year}_${String(month).padStart(2,'0')}.xlsx`);
  },

  // ─── Detail jednoho zaměstnance ─────────────────────────────

  employeeDetailToXLSX(summary, year, month) {
    if (!window.XLSX) {
      alert('Knihovna XLSX není načtena.');
      return;
    }
    const monthLabel = `${CZ_MONTHS[month - 1]} ${year}`;
    const sheetData = [
      [`Výkaz: ${summary.employee.name}`, ROLE_LABELS[summary.employee.role], monthLabel],
      [],
      ['Datum', 'Den', 'Typ dne', 'Začátek', 'Konec', 'Hodin', 'Sazba (Kč/h)', 'Výdělek (Kč)'],
      ...summary.shifts.map(sh => {
        const d = new Date(sh.date);
        return [
          sh.date,
          CZ_DAYS[d.getDay()],
          DAY_TYPE_LABELS[sh.day_type] || sh.day_type,
          sh.start_time,
          sh.end_time,
          parseFloat(sh.hours),
          parseFloat(sh.rate_applied),
          parseFloat(parseFloat(sh.earnings).toFixed(2))
        ];
      }),
      [],
      ['', '', '', '', 'CELKEM', parseFloat(summary.hours_total.toFixed(2)), '', parseFloat(summary.earnings_total.toFixed(2))]
    ];

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 16 },
      { wch: 10 }, { wch: 10 }, { wch: 8 },
      { wch: 14 }, { wch: 14 }
    ];
    window.XLSX.utils.book_append_sheet(wb, ws, 'Směny');
    const fileName = `${summary.employee.name.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2,'0')}.xlsx`;
    window.XLSX.writeFile(wb, fileName);
  },

  // ─── Interní helper ─────────────────────────────────────────

  _downloadText(content, filename, mimeType) {
    const BOM = '﻿'; // UTF-8 BOM pro správné zobrazení v Excelu
    const blob = new Blob([BOM + content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
