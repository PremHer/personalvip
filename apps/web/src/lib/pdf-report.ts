import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFReportOptions {
    title: string;
    subtitle?: string;
    date?: string;
    sections?: Array<{
        title: string;
        data: Array<{ label: string; value: string }>;
    }>;
    table?: {
        head: string[];
        body: string[][];
    };
    fileName: string;
}

export function generatePDFReport(options: PDFReportOptions) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(124, 58, 237); // primary purple
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, 14, 20);

    if (options.subtitle) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(options.subtitle, 14, 30);
    }

    // Date info
    doc.setFontSize(9);
    doc.text(`Generado: ${options.date || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 30, { align: 'right' });

    let yPos = 50;

    // Summary sections (KPI cards)
    if (options.sections) {
        for (const section of options.sections) {
            doc.setTextColor(60, 60, 70);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(section.title, 14, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            for (const item of section.data) {
                doc.setTextColor(100, 100, 120);
                doc.text(item.label + ':', 14, yPos);
                doc.setTextColor(30, 30, 40);
                doc.setFont('helvetica', 'bold');
                doc.text(item.value, 80, yPos);
                doc.setFont('helvetica', 'normal');
                yPos += 6;
            }
            yPos += 6;
        }
    }

    // Table
    if (options.table && options.table.body.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [options.table.head],
            body: options.table.body,
            theme: 'grid',
            headStyles: {
                fillColor: [124, 58, 237],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [50, 50, 60],
            },
            alternateRowStyles: {
                fillColor: [245, 243, 255],
            },
            styles: {
                cellPadding: 4,
                overflow: 'linebreak',
            },
            margin: { left: 14, right: 14 },
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.text(`GymCore — Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`${options.fileName}.pdf`);
}
