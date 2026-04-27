import jsPDF from "jspdf";

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
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
  doctorName?: string;
  doctorEmail?: string;
}

const loadImageAsBase64 = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) { ctx.drawImage(img, 0, 0); resolve(c.toDataURL("image/jpeg", 0.95)); }
      else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const composeMriWithBox = (
  base64: string,
  box: { x: number; y: number; width: number; height: number }
): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const bx = box.x * c.width;
      const by = box.y * c.height;
      const bw = box.width  * c.width;
      const bh = box.height * c.height;

      ctx.shadowColor = "rgba(239,68,68,0.7)";
      ctx.shadowBlur  = 18;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth   = Math.max(3, c.width * 0.007);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.shadowBlur  = 0;

      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = "rgba(239,68,68,0.55)";
      ctx.lineWidth   = Math.max(2, c.width * 0.004);
      const inset = c.width * 0.012;
      ctx.strokeRect(bx + inset, by + inset, bw - inset * 2, bh - inset * 2);
      ctx.setLineDash([]);

      const fs  = Math.max(14, c.width * 0.03);
      ctx.font  = `bold ${fs}px Arial`;
      const txt = "Région Tumorale";
      const tw  = ctx.measureText(txt).width;
      const px  = 14, py = 8;
      const lx  = bx + bw / 2 - tw / 2 - px;
      const ly  = by - fs - py * 2 - 4;
      const lw  = tw + px * 2;
      const lh  = fs + py * 2;
      const rad = lh / 2;

      ctx.fillStyle = "rgba(239,68,68,0.92)";
      ctx.beginPath();
      ctx.moveTo(lx + rad, ly);
      ctx.lineTo(lx + lw - rad, ly);
      ctx.arcTo(lx + lw, ly, lx + lw, ly + lh, rad);
      ctx.lineTo(lx + lw, ly + lh - rad);
      ctx.arcTo(lx + lw, ly + lh, lx + lw - rad, ly + lh, rad);
      ctx.lineTo(lx + rad, ly + lh);
      ctx.arcTo(lx, ly + lh, lx, ly + lh - rad, rad);
      ctx.lineTo(lx, ly + rad);
      ctx.arcTo(lx, ly, lx + rad, ly, rad);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle    = "#ffffff";
      ctx.font         = `bold ${fs}px Arial`;
      ctx.textBaseline = "middle";
      ctx.fillText(txt, lx + px, ly + lh / 2);

      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = base64;
  });

function _noImg(
  doc: jsPDF,
  x: number,
  w: number,
  y: number,
  h: number,
  color: [number, number, number]
) {
  doc.setTextColor(...color);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Image non disponible", x + w / 2, y + h / 2, { align: "center" });
}

export const generateMedicalReport = async (data: ReportData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const isPositive = data.result === "positive";

  const C = {
    navy:        [15, 32, 72]    as [number, number, number],
    navyDark:    [10, 20, 50]    as [number, number, number],
    blue:        [37, 99, 195]   as [number, number, number],
    blueSoft:    [210, 225, 250] as [number, number, number],
    blueText:    [29, 78, 160]   as [number, number, number],
    blueMid:     [59, 130, 246]  as [number, number, number],
    blueBright:  [80, 150, 255]  as [number, number, number],
    red:         [185, 28, 28]   as [number, number, number],
    redSoft:     [254, 226, 226] as [number, number, number],
    redText:     [153, 27, 27]   as [number, number, number],
    amber:       [161, 98, 7]    as [number, number, number],
    amberSoft:   [254, 243, 199] as [number, number, number],
    amberBorder: [217, 119, 6]   as [number, number, number],
    white:       [255, 255, 255] as [number, number, number],
    grayDark:    [17, 24, 39]    as [number, number, number],
    grayMid:     [107, 114, 128] as [number, number, number],
    grayLight:   [209, 213, 219] as [number, number, number],
    grayBg:      [249, 250, 251] as [number, number, number],
    grayBorder:  [229, 231, 235] as [number, number, number],
    tableHead:   [37, 99, 195]   as [number, number, number],
    tableRow1:   [255, 255, 255] as [number, number, number],
    tableRow2:   [239, 246, 255] as [number, number, number],
  };

  const STATUS   = isPositive ? C.red  : C.blue;
  const STATUS_S = isPositive ? C.redSoft : C.blueSoft;
  const STATUS_T = isPositive ? C.redText : C.blueText;

  const rr = (x: number, y: number, w: number, h: number, r: number, s: "F" | "S" | "FD" = "F") =>
    doc.roundedRect(x, y, w, h, r, r, s);

  const now   = new Date();
  const fmtDT = (d: Date) =>
    `${d.toLocaleDateString("fr-FR")} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  // ════════════════════════════════════════════════════════════════════════
  // 1. HEADER
  // ════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...C.navyDark);
  doc.rect(0, 0, W, 38, "F");

  doc.setFillColor(...C.blue);
  doc.rect(0, 34, W, 4, "F");

  const brandX = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text("Neuro", brandX, 20);
  const neuroW = doc.getTextWidth("Neuro");
  doc.setTextColor(...C.blueBright);
  doc.text("Scan", brandX + neuroW, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 185, 225);
  doc.text("INTELLIGENCE ARTIFICIELLE MÉDICALE", brandX, 27);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text("Rapport d'analyse cérébrale", W - 14, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 185, 225);
  doc.text(`Généré le : ${fmtDT(now)}`, W - 14, 22, { align: "right" });

  const drLine = data.doctorName
    ? `Médecin : ${data.doctorName}${data.doctorEmail ? "  ·  " + data.doctorEmail : ""}`
    : "NeuroScan AI Analysis System";
  doc.text(drLine, W - 14, 29, { align: "right" });

  // ════════════════════════════════════════════════════════════════════════
  // 2. TABLEAU PATIENT
  // ════════════════════════════════════════════════════════════════════════
  const tY = 44;
  const tH = 28;
  const tX = 14;
  const tW = W - 28;

  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.5);
  rr(tX, tY, tW, tH, 3, "S");

  doc.setFillColor(...C.tableHead);
  rr(tX, tY, tW, 9, 3, "F");
  doc.setFillColor(...C.tableHead);
  doc.rect(tX, tY + 5, tW, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.text("INFORMATIONS PATIENT", tX + tW / 2, tY + 6, { align: "center" });

  const cols = [
    { label: "NOM COMPLET",  value: data.patientName },
    { label: "ID PATIENT",   value: data.patientId   },
    { label: "DATE DU SCAN", value: data.scanDate    },
  ];
  const cW = tW / cols.length;

  cols.forEach((col, i) => {
    const cx = tX + i * cW;
    doc.setFillColor(...(i % 2 === 0 ? C.tableRow1 : C.tableRow2));
    doc.rect(cx, tY + 9, cW, tH - 9, "F");

    if (i > 0) {
      doc.setDrawColor(...C.grayLight);
      doc.setLineWidth(0.3);
      doc.line(cx, tY + 9, cx, tY + tH);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.grayMid);
    doc.text(col.label, cx + cW / 2, tY + 14, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.grayDark);
    doc.text(col.value, cx + cW / 2, tY + 22, { align: "center" });
  });

  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.5);
  doc.line(tX, tY + tH, tX + tW, tY + tH);

  // ════════════════════════════════════════════════════════════════════════
  // 3. BANNIÈRE STATUT
  // ════════════════════════════════════════════════════════════════════════
  let curY = tY + tH + 7;

  doc.setFillColor(...STATUS_S);
  doc.setDrawColor(...STATUS);
  doc.setLineWidth(0.6);
  rr(14, curY, W - 28, 20, 3, "FD");

  doc.setFillColor(...STATUS);
  rr(14, curY, 5, 20, 2, "F");

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(isPositive ? "!" : "✓", 16.5, curY + 13, { align: "center" });

  doc.setTextColor(...STATUS);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text(
    isPositive ? "ANOMALIE DÉTECTÉE" : "AUCUNE TUMEUR DÉTECTÉE",
    24, curY + 8
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...STATUS_T);
  const subLine = isPositive
    ? `Tumeur ${data.tumorType || ""} détectée${data.tumorLocation ? " – " + data.tumorLocation : ""}. Consultation urgente recommandée.`
    : "Aucune anomalie tumorale détectée dans l'IRM cérébrale. Suivi de routine conseillé.";
  doc.text(subLine, 24, curY + 15.5);

  curY += 26;

  // ════════════════════════════════════════════════════════════════════════
  // 4. CORPS : IMAGE (gauche) + RAPPORT IA (droite)
  // ════════════════════════════════════════════════════════════════════════
  // leftW réduit à 82 pour donner plus de place à droite
  const leftX  = 14;
  const leftW  = 82;
  const rightX = leftX + leftW + 6;
  const rightW = W - rightX - 14;
  const bodyY  = curY;

  // ── Gauche : IRM ────────────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  rr(leftX, bodyY, leftW, 8, 2, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Résultat IRM avec IA", leftX + leftW / 2, bodyY + 5.5, { align: "center" });

  const imgY = bodyY + 8;
  const imgH = 92;
  doc.setFillColor(8, 12, 24);
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.5);
  rr(leftX, imgY, leftW, imgH, 2, "FD");

  if (data.imageUrl) {
    try {
      const rawB64 = await loadImageAsBase64(data.imageUrl);
      if (rawB64) {
        let finalB64 = rawB64;
        if (isPositive && data.boundingBox) {
          finalB64 = await composeMriWithBox(rawB64, data.boundingBox);
        }
        const pad = 2;
        doc.addImage(
          finalB64, "JPEG",
          leftX + pad, imgY + pad,
          leftW - pad * 2, imgH - pad * 2,
          undefined, "FAST"
        );
      } else {
        _noImg(doc, leftX, leftW, imgY, imgH, C.grayMid);
      }
    } catch {
      _noImg(doc, leftX, leftW, imgY, imgH, C.grayMid);
    }
  } else {
    _noImg(doc, leftX, leftW, imgY, imgH, C.grayMid);
  }

  const capY = imgY + imgH + 3.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...C.grayMid);
  doc.text(
    `Analyse NeuroScan AI · ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    leftX + leftW / 2, capY, { align: "center" }
  );

  // ── Droite : Rapport IA ─────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  rr(rightX, bodyY, rightW, 8, 2, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("RAPPORT MÉDICAL IA", rightX + rightW / 2, bodyY + 5.5, { align: "center" });

  const rptH = 58;
  doc.setFillColor(...C.grayBg);
  doc.setDrawColor(...C.grayBorder);
  doc.setLineWidth(0.3);
  rr(rightX, bodyY + 8, rightW, rptH, 2, "FD");

  if (data.reportText) {
    // Texte plus grand et gras pour bien le voir
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.grayDark);
    const lines = doc.splitTextToSize(data.reportText, rightW - 8);
    doc.text(lines, rightX + 4, bodyY + 14);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...C.grayMid);
    doc.text("Aucun rapport généré.", rightX + 4, bodyY + 35);
  }

  // ── 2 cartes : Confiance IA + Localisation ──────────────────────────
  const mY  = bodyY + 8 + rptH + 5;
  const mGap = 5;
  const mW  = (rightW - mGap) / 2;
  const mH  = 36;

  // Carte 1 — Confiance IA
  doc.setFillColor(...STATUS_S);
  doc.setDrawColor(...STATUS);
  doc.setLineWidth(0.6);
  rr(rightX, mY, mW, mH, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...STATUS);
  doc.text(
    `${(data.confidence ?? 0).toFixed(1)}%`,
    rightX + mW / 2, mY + 14,
    { align: "center" }
  );

  doc.setDrawColor(...STATUS);
  doc.setLineWidth(0.3);
  doc.line(rightX + 4, mY + mH - 12, rightX + mW - 4, mY + mH - 12);

  // Label CONFIANCE IA — taille 8 bien lisible
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...STATUS);
  doc.text("CONFIANCE IA", rightX + mW / 2, mY + mH - 4, { align: "center" });

  // Carte 2 — Localisation
  const locX = rightX + mW + mGap;
  doc.setFillColor(...C.blueSoft);
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.6);
  rr(locX, mY, mW, mH, 3, "FD");

  // Texte localisation : splitTextToSize avec marge intérieure confortable
  const locFull  = data.tumorLocation || "N/A";
  const locLines = doc.splitTextToSize(locFull, mW - 12) as string[];
  const lineH    = 5.5;
  const totalTH  = locLines.length * lineH;
  // Zone valeur = mH moins la zone label (12 px en bas)
  const locValueZoneH = mH - 14;
  const locStartY = mY + (locValueZoneH - totalTH) / 2 + lineH;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.blue);
  locLines.forEach((ln, i) => {
    doc.text(ln, locX + mW / 2, locStartY + i * lineH, { align: "center" });
  });

  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.3);
  doc.line(locX + 4, mY + mH - 12, locX + mW - 4, mY + mH - 12);

  // Label LOCALISATION — taille 8 bien lisible
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.blue);
  doc.text("LOCALISATION", locX + mW / 2, mY + mH - 4, { align: "center" });

  // ════════════════════════════════════════════════════════════════════════
  // 5. RECOMMANDATION
  // ════════════════════════════════════════════════════════════════════════
  const recY = capY + 7;

  doc.setFillColor(...C.amberSoft);
  doc.setDrawColor(...C.amberBorder);
  doc.setLineWidth(0.5);
  rr(14, recY, W - 28, 20, 3, "FD");

  doc.setFillColor(...C.amber);
  rr(14, recY, 5, 20, 2, "F");

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("★", 16.5, recY + 12.5, { align: "center" });

  doc.setTextColor(...C.amber);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Recommandation", 24, recY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...C.grayDark);
  const recText = isPositive
    ? "Un scanner cérébral injecté et une consultation en neurochirurgie sont fortement recommandés. Ce rapport doit être confirmé par un radiologue certifié."
    : "Un suivi IRM annuel est recommandé. Ce rapport doit être confirmé par un médecin radiologue qualifié.";
  doc.text(doc.splitTextToSize(recText, W - 28 - 14), 24, recY + 14.5);

  // ════════════════════════════════════════════════════════════════════════
  // 6. FOOTER
  // ════════════════════════════════════════════════════════════════════════
  const footH = 24;
  const footY = H - footH;

  doc.setFillColor(...C.navyDark);
  doc.rect(0, footY, W, footH, "F");

  // Bande bleue fine en haut du footer
  doc.setFillColor(...C.blue);
  doc.rect(0, footY, W, 1.5, "F");

  // Disclaimer — gras et bien visible
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(200, 215, 240);
  doc.text(
    "⚠  Ce rapport est généré par un système d'IA à titre d'aide au diagnostic uniquement.",
    14, footY + 9
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(170, 190, 225);
  doc.text(
    "Il ne remplace pas l'avis d'un médecin radiologue qualifié. Tout résultat doit être confirmé par un professionnel de santé habilité.",
    14, footY + 15
  );

  // Droite : NeuroScan bicolore — une seule fois, propre
  const fBrandY  = footY + 9;
  const neuroTxt = "Neuro";
  const scanTxt  = "Scan";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const neuroFW = doc.getTextWidth(neuroTxt);
  const scanFW  = doc.getTextWidth(scanTxt);
  const totalBW = neuroFW + scanFW;
  const bStartX = W - 14 - totalBW;

  doc.setTextColor(...C.white);
  doc.text(neuroTxt, bStartX, fBrandY);
  doc.setTextColor(...C.blueBright);
  doc.text(scanTxt, bStartX + neuroFW, fBrandY);

  // Patient ID et date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(170, 190, 225);
  doc.text(`Patient ID : ${data.patientId}`, W - 14, footY + 15, { align: "right" });
  doc.text(fmtDT(now), W - 14, footY + 21, { align: "right" });

  // ════════════════════════════════════════════════════════════════════════
  // SAVE
  // ════════════════════════════════════════════════════════════════════════
  doc.save(`NeuroScan_Rapport_${data.patientId}_${Date.now()}.pdf`);
};