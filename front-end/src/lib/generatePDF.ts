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
  doctorName?: string;
  doctorEmail?: string;
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
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const roundRect = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F"
) => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

export const generateMedicalReport = async (data: ReportData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isPositive = data.result === "positive";

  // ─── PALETTE ───────────────────────────────────────────────────────────────
  const NAVY        = [10, 25, 60]    as [number, number, number];
  const BLUE        = [41, 98, 194]   as [number, number, number];
  const BLUE_LIGHT  = [99, 155, 230]  as [number, number, number];
  const RED         = [200, 30, 30]   as [number, number, number];
  const RED_LIGHT   = [240, 80, 80]   as [number, number, number];
  const AMBER       = [194, 120, 20]  as [number, number, number];
  const WHITE       = [255, 255, 255] as [number, number, number];
  const GRAY_DARK   = [40, 50, 70]    as [number, number, number];
  const GRAY_MID    = [100, 115, 140] as [number, number, number];
  const GRAY_LIGHT  = [220, 225, 235] as [number, number, number];
  const BG_LIGHT    = [245, 247, 252] as [number, number, number];
  const SECTION_BG  = [235, 240, 252] as [number, number, number];

  const STATUS_COLOR = isPositive ? RED      : BLUE;
  const STATUS_LIGHT = isPositive ? RED_LIGHT : BLUE_LIGHT;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER BAND
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(...BLUE_LIGHT);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("NeuroScan", 14, 17);

  doc.setTextColor(...GRAY_LIGHT);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("INTELLIGENCE ARTIFICIELLE MÉDICALE", 14, 24);

  doc.setTextColor(...BLUE_LIGHT);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport d'analyse cérébrale", pageWidth - 14, 14, { align: "right" });

  doc.setTextColor(...GRAY_LIGHT);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const now = new Date();
  const dateStr = `Généré le : ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  doc.text(dateStr, pageWidth - 14, 22, { align: "right" });

  const doctorLine = data.doctorName
    ? `Médecin : ${data.doctorName}${data.doctorEmail ? " · " + data.doctorEmail : ""}`
    : "NeuroScan AI Analysis System";
  doc.text(doctorLine, pageWidth - 14, 29, { align: "right" });

  doc.setFillColor(...BLUE);
  doc.rect(0, 38, pageWidth, 1.2, "F");

  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENT INFO BAND
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...SECTION_BG);
  doc.rect(0, 39.2, pageWidth, 22, "F");

  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(0, 61.2, pageWidth, 61.2);

  const patientLabel = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MID);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_DARK);
    doc.text(value, x, y + 5.5);
  };

  const colW = (pageWidth - 28) / 4;
  patientLabel("Nom complet",  data.patientName,                    14,             44);
  patientLabel("Date du scan", data.scanDate,                       14 + colW,      44);
  patientLabel("Type de scan", data.scanType || "T1-weighted MRI",  14 + colW * 2,  44);
  patientLabel("ID Patient",   data.patientId,                      14 + colW * 3,  44);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS ALERT BANNER
  // ═══════════════════════════════════════════════════════════════════════════
  let curY = 68;

  doc.setFillColor(...(isPositive
    ? [255, 243, 243] as [number, number, number]
    : [243, 247, 255] as [number, number, number]));
  doc.setDrawColor(...STATUS_COLOR);
  doc.setLineWidth(0.5);
  roundRect(doc, 14, curY, pageWidth - 28, 18, 3, "FD");

  doc.setFillColor(...STATUS_COLOR);
  roundRect(doc, 14, curY, 6, 18, 2, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(isPositive ? "!" : "✓", 17, curY + 11.5, { align: "center" });

  doc.setTextColor(...STATUS_COLOR);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    isPositive ? "TUMEUR DÉTECTÉE" : "AUCUNE TUMEUR DÉTECTÉE",
    26, curY + 7
  );

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const statusSub = isPositive
    ? `Tumeur ${data.tumorType || ""} détectée ${data.tumorLocation ? "dans " + data.tumorLocation : ""}. Consultation urgente recommandée.`
    : "Aucune anomalie tumorale détectée dans l'IRM cérébrale. Suivi de routine conseillé.";
  doc.text(statusSub, 26, curY + 14);

  curY += 24;

  // ═══════════════════════════════════════════════════════════════════════════
  // TWO-COLUMN BODY
  // ═══════════════════════════════════════════════════════════════════════════
  const leftX  = 14;
  const leftW  = 88;
  const rightX = leftX + leftW + 6;
  const rightW = pageWidth - rightX - 14;
  const bodyY  = curY;

  // ── LEFT: IRM IMAGE PANEL ─────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  roundRect(doc, leftX, bodyY, leftW, 7, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    isPositive ? "IRM ANNOTÉE PAR IA" : "IMAGE IRM",
    leftX + leftW / 2, bodyY + 4.8,
    { align: "center" }
  );

  const imgContainerY = bodyY + 7;
  const imgContainerH = 90;
  doc.setFillColor(15, 20, 40);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  roundRect(doc, leftX, imgContainerY, leftW, imgContainerH, 2, "FD");

  if (data.imageUrl) {
    try {
      const base64 = await loadImageAsBase64(data.imageUrl);
      if (base64) {
        const padding = 3;
        doc.addImage(
          base64, "JPEG",
          leftX + padding,
          imgContainerY + padding,
          leftW - padding * 2,
          imgContainerH - padding * 2,
          undefined,
          "FAST"
        );
      } else {
        doc.setTextColor(...GRAY_MID);
        doc.setFontSize(8);
        doc.text("Image non disponible", leftX + leftW / 2, imgContainerY + imgContainerH / 2, { align: "center" });
      }
    } catch {
      doc.setTextColor(...GRAY_MID);
      doc.setFontSize(8);
      doc.text("Image non disponible", leftX + leftW / 2, imgContainerY + imgContainerH / 2, { align: "center" });
    }
  } else {
    doc.setTextColor(...GRAY_MID);
    doc.setFontSize(8);
    doc.text("Aucune image fournie", leftX + leftW / 2, imgContainerY + imgContainerH / 2, { align: "center" });
  }

  // Caption
  const captionY = imgContainerY + imgContainerH + 3;
  doc.setTextColor(...GRAY_MID);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Analyse automatique NeuroScan AI · ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    leftX + leftW / 2, captionY,
    { align: "center" }
  );

  // ── RIGHT: AI MEDICAL REPORT ──────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  roundRect(doc, rightX, bodyY, rightW, 7, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("RAPPORT MÉDICAL IA", rightX + rightW / 2, bodyY + 4.8, { align: "center" });

  const reportBoxY = bodyY + 7;
  const reportBoxH = 57;
  doc.setFillColor(...BG_LIGHT);
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.3);
  roundRect(doc, rightX, reportBoxY, rightW, reportBoxH, 2, "FD");

  if (data.reportText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_DARK);
    const lines = doc.splitTextToSize(data.reportText, rightW - 8);
    doc.text(lines, rightX + 4, reportBoxY + 5);
  }

  // ── METRICS (3 cards) ─────────────────────────────────────────────────────
  const metricsY    = reportBoxY + reportBoxH + 4;
  const metricCount = 3;
  const metricW     = (rightW - (metricCount - 1) * 3) / metricCount;

  const metrics = [
    {
      value: `${(data.confidence ?? 0).toFixed(1)}%`,
      label: "Confiance IA",
      color: STATUS_COLOR,
      bg: isPositive
        ? [255, 220, 220] as [number, number, number]
        : [220, 235, 255] as [number, number, number],
    },
    {
      value: data.tumorGrade || "N/A",
      label: "Tumor Grade",
      color: isPositive ? RED : BLUE,
      bg: isPositive
        ? [255, 220, 220] as [number, number, number]
        : [220, 235, 255] as [number, number, number],
    },
    {
      value: data.tumorLocation || "N/A",
      label: "Localisation",
      color: BLUE,
      bg: [220, 235, 255] as [number, number, number],
    },
  ];

  metrics.forEach((m, i) => {
    const mx = rightX + i * (metricW + 3);
    doc.setFillColor(...m.bg);
    doc.setDrawColor(...m.color);
    doc.setLineWidth(0.4);
    roundRect(doc, mx, metricsY, metricW, 20, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...m.color);
    // Truncate long location values
    const displayValue = m.value.length > 12 ? m.value.substring(0, 11) + "…" : m.value;
    doc.text(displayValue, mx + metricW / 2, metricsY + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_MID);
    doc.text(m.label.toUpperCase(), mx + metricW / 2, metricsY + 16, { align: "center" });
  });

  // Volume card (full width)
  if (data.tumorVolume) {
    const volY = metricsY + 24;
    doc.setFillColor(235, 248, 255);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    roundRect(doc, rightX, volY, rightW, 13, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text(`Volume tumoral : ${data.tumorVolume}`, rightX + 4, volY + 8.5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOMMENDATION BANNER
  // ═══════════════════════════════════════════════════════════════════════════
  const recY = captionY + 8;

  doc.setFillColor(255, 252, 235);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.5);
  roundRect(doc, 14, recY, pageWidth - 28, 18, 3, "FD");

  doc.setFillColor(...AMBER);
  roundRect(doc, 14, recY, 5, 18, 2, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("★", 16.5, recY + 11, { align: "center" });

  doc.setTextColor(...AMBER);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Recommandation", 24, recY + 7);

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const recText = isPositive
    ? "Un scanner cérébral injecté et une consultation en neurochirurgie sont fortement recommandés. Ce rapport doit être confirmé par un radiologue certifié."
    : "Un suivi IRM annuel est recommandé. Ce rapport doit être confirmé par un médecin radiologue qualifié.";
  const recLines = doc.splitTextToSize(recText, pageWidth - 28 - 14);
  doc.text(recLines, 24, recY + 13.5);

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const footerY = pageHeight - 18;
  doc.setFillColor(...BG_LIGHT);
  doc.rect(0, footerY, pageWidth, 18, "F");

  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(0, footerY, pageWidth, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY_MID);
  doc.text(
    "⚠  Ce rapport est généré par un système d'IA à titre d'aide au diagnostic uniquement. Il ne remplace pas l'avis d'un médecin radiologue\nqualifié. Tout résultat doit être confirmé par un professionnel de santé habilité.",
    14, footerY + 5.5
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE_LIGHT);
  doc.text("NeuroScan v2.0", pageWidth - 14, footerY + 5.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Patient : ${data.patientId}`, pageWidth - 14, footerY + 10, { align: "right" });
  doc.text(
    `${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth - 14, footerY + 14.5,
    { align: "right" }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.save(`NeuroScan_Rapport_${data.patientId}_${Date.now()}.pdf`);
};