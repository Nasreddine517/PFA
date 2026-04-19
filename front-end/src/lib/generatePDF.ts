import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  patientName: string;
  patientId: string;
  scanDate: string;
  scanType: string;
  result: string;
  confidence: number;
  tumorType?: string;
  tumorGrade?: string;
  tumorLocation?: string;
  tumorSize?: string;
  tumorVolume?: string;
  reportText?: string;
  imageUrl?: string;
}

const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const generateMedicalReport = async (data: ReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(10, 25, 47);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(74, 144, 217);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("NeuroScan", 20, 22);

  doc.setTextColor(180, 190, 210);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Brain Cancer Detection Report", 20, 32);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, 32, { align: "right" });

  // Status banner
  const isPositive = data.result === "positive";
  if (isPositive) {
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(15, 52, pageWidth - 30, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TUMOR DETECTED", pageWidth / 2, 61, { align: "center" });
  } else {
    doc.setFillColor(74, 144, 217);
    doc.roundedRect(15, 52, pageWidth - 30, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("NO TUMOR DETECTED", pageWidth / 2, 61, { align: "center" });
  }

  // Patient Info
  doc.setTextColor(10, 25, 47);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", 20, 82);

  doc.setDrawColor(74, 144, 217);
  doc.setLineWidth(0.5);
  doc.line(20, 85, 80, 85);

  autoTable(doc, {
    startY: 90,
    margin: { left: 20, right: 20 },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 130], cellWidth: 50 },
      1: { textColor: [30, 40, 60] },
    },
    body: [
      ["Patient Name", data.patientName],
      ["Patient ID", data.patientId],
      ["Scan Date", data.scanDate],
      ["Scan Type", data.scanType],
    ],
  });

  // Analysis Results
  let y = (doc as any).lastAutoTable.finalY + 15;
  doc.setTextColor(10, 25, 47);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Analysis Results", 20, y);
  doc.setDrawColor(74, 144, 217);
  doc.line(20, y + 3, 80, y + 3);

  const results: string[][] = [
    ["Detection Result", isPositive ? "Tumor Detected" : "No Tumor"],
    ["Confidence Score", `${data.confidence}%`],
  ];
  if (data.tumorType) results.push(["Tumor Type", data.tumorType]);
  if (data.tumorGrade) results.push(["Tumor Grade", data.tumorGrade]);
  if (data.tumorLocation) results.push(["Location", data.tumorLocation]);
  if (data.tumorSize) results.push(["Size", data.tumorSize]);
  if (data.tumorVolume) results.push(["Volume", data.tumorVolume]);

  autoTable(doc, {
    startY: y + 8,
    margin: { left: 20, right: 20 },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 110, 130], cellWidth: 50 },
      1: { textColor: [30, 40, 60] },
    },
    body: results,
  });

  // Scan Image
  if (data.imageUrl) {
    y = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(10, 25, 47);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(isPositive ? "Tumor Localization" : "Scan Image", 20, y);
    doc.setDrawColor(74, 144, 217);
    doc.line(20, y + 3, 80, y + 3);

    try {
      const base64 = await loadImageAsBase64(data.imageUrl);
      if (base64) {
        const imgWidth = 80;
        const imgHeight = 80;
        const imgX = (pageWidth - imgWidth) / 2;
        doc.addImage(base64, "JPEG", imgX, y + 8, imgWidth, imgHeight);
        y = y + 8 + imgHeight + 5;

        if (isPositive && data.tumorLocation) {
          doc.setFontSize(9);
          doc.setTextColor(220, 38, 38);
          doc.setFont("helvetica", "italic");
          doc.text(`Tumor region identified: ${data.tumorLocation}`, pageWidth / 2, y, { align: "center" });
        }
      }
    } catch {
      // Image loading failed, skip
    }
  }

  // Report
  if (data.reportText) {
    y = data.imageUrl ? y + 10 : (doc as any).lastAutoTable.finalY + 15;
    
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(10, 25, 47);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AI Medical Report", 20, y);
    doc.setDrawColor(74, 144, 217);
    doc.line(20, y + 3, 80, y + 3);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 60, 80);
    const lines = doc.splitTextToSize(data.reportText, pageWidth - 40);
    doc.text(lines, 20, y + 12);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 245, 250);
    doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
    doc.setTextColor(150, 155, 170);
    doc.setFontSize(7);
    doc.text(
      "This report is AI-generated and intended as a clinical decision support tool. Not for sole diagnostic use.",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`NeuroScan_Report_${data.patientId}_${Date.now()}.pdf`);
};
