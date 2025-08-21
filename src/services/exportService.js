import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';

export const exportToPDF = (data, filters, companyName) => {
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
  
  const projectName = filters.projectName || 'All Projects';
  const campusName = filters.campusName || 'All Campuses';
  const batchName = filters.batchName || 'All Batches';
  
  filterText = `Filtered: ${projectName} - ${campusName} - ${batchName}`;
  doc.text(filterText, 14, 32);
  
  // Add date of export
  doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 42);
  
  // Prepare data for the table
  const tableData = data.map(entry => [
    new Date(entry.date.seconds * 1000).toLocaleDateString(),
    entry.projectName || 'N/A',
    entry.campusName || 'N/A',
    entry.batchName || 'N/A',
    entry.trainerName,
    entry.topic,
    entry.subtopic,
    entry.hours,
    entry.studentCount.toString()
  ]);

  // Add table using autoTable
  autoTable(doc, {
    startY: 50,
    head: [['Date', 'Project', 'Campus', 'Batch', 'Trainer', 'Topic', 'Subtopic', 'Hours', 'Count']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });
  
  // Save the PDF
  doc.save('training_entries.pdf');
};

export const exportToExcel = (data, filters) => {
  // Format data for Excel
  const excelData = data.map(entry => ({
    Date: new Date(entry.date.seconds * 1000).toLocaleDateString(),
    Project: entry.projectName || 'N/A',
    Campus: entry.campusName || 'N/A',
    Batch: entry.batchName || 'N/A',
    'Trainer Name': entry.trainerName,
    Topic: entry.topic,
    Subtopic: entry.subtopic,
    'Start Time': entry.startTime,
    'End Time': entry.endTime,
    Hours: entry.hours,
    'Student Count': entry.studentCount
  }));
  
  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Entries');
  
  // Generate file name
  const projectName = filters.projectName || 'all';
  const campusName = filters.campusName || 'all';
  const batchName = filters.batchName || 'all';
  
  const fileName = `training_entries_${projectName}_${campusName}_${batchName}.xlsx`;
  
  // Save the file
  XLSX.writeFile(workbook, fileName);
};

export const exportToWord = async (data, filters, companyName) => {
  // Create table rows
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ 
          children: [new Paragraph({ text: 'Date', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" } // Blue background similar to PDF
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Project', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Campus', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Batch', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Trainer', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Topic', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Subtopic', style: 'TableHeader' })], 
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Hours', style: 'TableHeader' })], 
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
        new TableCell({ 
          children: [new Paragraph({ text: 'Students', style: 'TableHeader' })], 
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "2B80B9" }
        }),
      ],
      tableHeader: true
    })
  ];

  // Add data rows with alternating colors
  data.forEach((entry, index) => {
    const isEvenRow = index % 2 === 0;
    const rowColor = isEvenRow ? "FFFFFF" : "F0F0F0"; // White and light gray alternating
    
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph(new Date(entry.date.seconds * 1000).toLocaleDateString())],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.projectName || 'N/A')],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.campusName || 'N/A')],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.batchName || 'N/A')],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.trainerName)],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.topic)],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.subtopic)],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.hours.toString())],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(entry.studentCount.toString())],
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
            color: "FFFFFF", // White text
            bold: true,
          },
        },
        {
          id: "FilterText",
          name: "Filter Text",
          basedOn: "Normal",
          next: "Normal",
          run: {
            color: "646464", // Gray text
            size: 22,
          },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 1 inch margin (72 * 10)
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
          text: `Filtered: ${filters.projectName || 'All Projects'} - ${filters.campusName || 'All Campuses'} - ${filters.batchName || 'All Batches'}`,
          style: "FilterText",
        }),
        new Paragraph({
          text: `Exported on: ${new Date().toLocaleDateString()}`,
          style: "FilterText",
        }),
        new Paragraph({ text: "" }), // Empty paragraph for spacing
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
        }),
      ],
    }],
  });

  // Generate the blob and download
  const blob = await Packer.toBlob(doc);
  
  // Generate file name
  const projectName = filters.projectName || 'all';
  const campusName = filters.campusName || 'all';
  const batchName = filters.batchName || 'all';
  
  saveAs(blob, `training_entries_${projectName}_${campusName}_${batchName}.docx`);
};