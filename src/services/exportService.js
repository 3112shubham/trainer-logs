import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType } from 'docx';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const fetchTrainersMap = async () => {
  const map = {};
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'trainer'));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const d = doc.data() || {};
      const item = { name: d.name || '', email: d.email || '', uid: d.uid || doc.id };
      // map by document id and by uid (if present)
      map[doc.id] = item;
      if (d.uid) map[d.uid] = item;
    });
  } catch (err) {
    console.error('Error fetching trainers for export:', err);
  }
  return map;
};

export const exportToPDF = async (data, filters, companyName) => {
  // fetch trainers map from DB to resolve names/emails
  const trainersMap = await fetchTrainersMap();
  
  // Create new PDF instance
  const doc = new jsPDF();
  
  // Add company header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(companyName || 'Training Management System', 14, 22);
  
  // Add filters info if any
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  let filterText = 'All Entries';
  
  const campusName = filters.campusName || 'All Campuses';
  const batchName = filters.batchName || 'All Batches';
  
  filterText = `Filtered: ${campusName} - ${batchName}`;
  doc.text(filterText, 14, 32);
  
  // Add date of export
  doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 42);
  
  // Prepare data for the table (PDF/Word: no project column). Use safe date and trainer name fallback.
  const tableData = data.map(entry => {
    // safe date handling
    let dateStr = '';
    if (entry.date && typeof entry.date === 'object' && entry.date.seconds) {
      dateStr = new Date(entry.date.seconds * 1000).toLocaleDateString();
    } else if (entry.date) {
      try { dateStr = new Date(entry.date).toLocaleDateString(); } catch { dateStr = String(entry.date); }
    }

    // Resolve trainer fields with preference to DB name/email over entry fields
    const trainerRef = trainersMap[entry.trainerId] || trainersMap[entry.trainer && entry.trainer.uid] || null;
    const trainerObj = trainerRef || entry.trainer || {};
    const rawTrainerName = entry.trainerName || '';
    const rawTrainerEmail = entry.trainerEmail || '';

    // If older entries stored email in trainerName, detect that
    const trainerNameFromEntry = (rawTrainerName && rawTrainerName.includes('@')) ? '' : rawTrainerName;
    const trainerEmailFromEntry = rawTrainerEmail || (rawTrainerName && rawTrainerName.includes('@') ? rawTrainerName : '');

    const trainerDisplay = trainerObj.name || trainerNameFromEntry || trainerEmailFromEntry || trainerObj.email || 'N/A';

    return [
      dateStr,
      entry.campusName || 'N/A',
      entry.batchName || 'N/A',
      trainerDisplay,
      entry.topic || '',
      entry.subtopic || '',
      entry.hours != null ? String(entry.hours) : '',
      entry.studentCount != null ? String(entry.studentCount) : ''
    ];
  });

  // Add table using autoTable with better column widths
  autoTable(doc, {
    startY: 50,
    head: [['Date', 'Campus', 'Batch', 'Trainer', 'Topic', 'Subtopic', 'Hours', 'Count']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    columnStyles: {
  0: { cellWidth: 22, halign: 'center' }, // Date
  1: { cellWidth: 30, halign: 'center' }, // Campus
  2: { cellWidth: 14, halign: 'center' }, // Batch (shorter)
  3: { cellWidth: 28, halign: 'center' }, // Trainer
  4: { cellWidth: 28, halign: 'center' }, // Topic
  5: { cellWidth: 28, halign: 'center' }, // Subtopic
  6: { cellWidth: 15, halign: 'center' }, // Hours
  7: { cellWidth: 15, halign: 'center' }  // Count
    }
  });
  
  // Save the PDF
  doc.save('training_entries.pdf');
};

export const exportToExcel = (data, filters) => {
  // Format data for Excel (include all fields including Project and trainer email)
  // We'll fetch trainers from DB to ensure name/email are taken from users collection when available
  return (async () => {
    const trainersMap = await fetchTrainersMap();
    const excelData = data.map(entry => {
    let dateStr = '';
    if (entry.date && typeof entry.date === 'object' && entry.date.seconds) {
      dateStr = new Date(entry.date.seconds * 1000).toLocaleDateString();
    } else if (entry.date) {
      try { dateStr = new Date(entry.date).toLocaleDateString(); } catch { dateStr = String(entry.date); }
    }

    const trainerRef = trainersMap[entry.trainerId] || trainersMap[entry.trainer && entry.trainer.uid] || null;
    const trainerObj = trainerRef || entry.trainer || {};
    const rawTrainerName = entry.trainerName || '';
    const rawTrainerEmail = entry.trainerEmail || '';

    // Determine trainer name and email for Excel: prefer DB values, but fallback to entry fields and handle old entries
    let trainerName = trainerObj.name || '';
    let trainerEmail = trainerObj.email || '';

    if (!trainerName && rawTrainerName) {
      if (rawTrainerName.includes('@')) {
        // stored as email in old entries
        trainerEmail = trainerEmail || rawTrainerName;
      } else {
        trainerName = rawTrainerName;
      }
    }

    if (!trainerEmail && rawTrainerEmail) {
      trainerEmail = rawTrainerEmail;
    }

    return {
      Date: dateStr,
      Project: entry.projectName || 'N/A',
      Campus: entry.campusName || 'N/A',
      Batch: entry.batchName || 'N/A',
      'Trainer Name': trainerName,
      'Trainer Email': trainerEmail,
      Topic: entry.topic || '',
      Subtopic: entry.subtopic || '',
      'Start Time': entry.startTime || '',
      'End Time': entry.endTime || '',
      Hours: entry.hours != null ? entry.hours : '',
      'Student Count': entry.studentCount != null ? entry.studentCount : ''
    };
  });
  
    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    // Set column widths to help fit content (approx chars)
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 18 }, // Project
      { wch: 14 }, // Campus
      { wch: 10 }, // Batch (shorter)
      { wch: 20 }, // Trainer Name
      { wch: 26 }, // Trainer Email
      { wch: 20 }, // Topic
      { wch: 20 }, // Subtopic
      { wch: 12 }, // Start Time
      { wch: 12 }, // End Time
      { wch: 8 },  // Hours
      { wch: 12 }  // Student Count
    ];

    // Center-align all cells (headers + data)
    try {
      const range = worksheet['!ref'];
      if (range) {
        // iterate all cells in sheet and set alignment style if cell exists
        Object.keys(worksheet).forEach(addr => {
          if (addr[0] === '!') return;
          const cell = worksheet[addr];
          if (!cell.s) cell.s = {};
          if (!cell.s.alignment) cell.s.alignment = {};
          cell.s.alignment.horizontal = 'center';
          cell.s.alignment.vertical = 'center';
        });
      }
  } catch {
      // styling is best-effort; ignore errors
      // console.warn('Could not apply Excel cell styles for alignment', e);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Entries');

    // Generate file name
    const campusName = filters.campusName || 'all';
    const batchName = filters.batchName || 'all';

    const fileName = `training_entries_${campusName}_${batchName}.xlsx`;

    // Save the file
    XLSX.writeFile(workbook, fileName);
  })();
};

export const exportToWord = async (data, filters, companyName) => {
  // fetch trainers map to resolve names/emails
  const trainersMap = await fetchTrainersMap();

  // Create table rows
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Date', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Campus', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Batch', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Trainer', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Topic', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Subtopic', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Hours', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ 
            text: 'Students', 
            style: 'TableHeader',
            alignment: AlignmentType.CENTER
          })], 
          width: { size: 7, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
      ],
      tableHeader: true
    })
  ];

  // Add data rows with alternating colors
  data.forEach((entry, index) => {
    const isEvenRow = index % 2 === 0;
    const rowColor = isEvenRow ? "FFFFFF" : "F0F0F0";
  // resolve trainer display using DB when available
  const trainerRef = trainersMap[entry.trainerId] || trainersMap[entry.trainer && entry.trainer.uid] || null;
  const trainerObj = trainerRef || entry.trainer || {};
  const rawTrainerName = entry.trainerName || '';
  const rawTrainerEmail = entry.trainerEmail || '';
  const trainerNameFromEntry = (rawTrainerName && rawTrainerName.includes('@')) ? '' : rawTrainerName;
  const trainerEmailFromEntry = rawTrainerEmail || (rawTrainerName && rawTrainerName.includes('@') ? rawTrainerName : '');
  const trainerDisplay = trainerObj.name || trainerNameFromEntry || trainerEmailFromEntry || trainerObj.email || 'N/A';

  tableRows.push(
      new TableRow({
        children: [
          new TableCell({ 
              children: [new Paragraph({
          text: (entry.date && entry.date.seconds) ? new Date(entry.date.seconds * 1000).toLocaleDateString() : (entry.date ? new Date(entry.date).toLocaleDateString() : ''),
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: rowColor }
            }),
          new TableCell({ 
            children: [new Paragraph({
              text: entry.campusName || 'N/A',
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({
              text: entry.batchName || 'N/A',
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({
              text: trainerDisplay,
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({
              text: entry.topic || '',
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({
              text: entry.subtopic || '',
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({
              text: entry.hours != null ? String(entry.hours) : '',
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({
              text: entry.studentCount != null ? String(entry.studentCount) : '',
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
        ]
      })
    );
  });

  // Create the document with styles
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "282828",
          },
          paragraph: {
            spacing: {
              after: 120,
            },
          },
        },
        {
          id: "TableHeader",
          name: "Table Header",
          basedOn: "Normal",
          next: "Normal",
          run: {
            color: "FFFFFF",
            bold: true,
          },
        },
        {
          id: "FilterText",
          name: "Filter Text",
          basedOn: "Normal",
          next: "Normal",
          run: {
            color: "646464",
            size: 22,
          },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: [
        new Paragraph({
          text: companyName || 'Training Management System',
          style: "Heading1",
        }),
        new Paragraph({
          text: `Filtered: ${filters.campusName || 'All Campuses'} - ${filters.batchName || 'All Batches'}`,
          style: "FilterText",
        }),
        new Paragraph({
          text: `Exported on: ${new Date().toLocaleDateString()}`,
          style: "FilterText",
        }),
        new Paragraph({ text: "" }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
          borders: {
            all: {
              style: "single",
              size: 1,
              color: "DDDDDD",
            },
          },
          layout: {
            type: "fixed" // This ensures consistent column widths
          }
        }),
      ],
    }],
  });

  // Generate the blob and download
  const blob = await Packer.toBlob(doc);
  
  // Generate file name
  const campusName = filters.campusName || 'all';
  const batchName = filters.batchName || 'all';
  
  saveAs(blob, `training_entries_${campusName}_${batchName}.docx`);
};