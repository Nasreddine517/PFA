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
  doctorSpecialty?: string;
  doctorHospital?: string;
}

type RGB = [number, number, number];

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
      const bw = box.width * c.width;
      const bh = box.height * c.height;
      ctx.shadowColor = "rgba(239,68,68,0.7)";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = Math.max(3, c.width * 0.007);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.shadowBlur = 0;
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = "rgba(239,68,68,0.55)";
      ctx.lineWidth = Math.max(2, c.width * 0.004);
      const inset = c.width * 0.012;
      ctx.strokeRect(bx + inset, by + inset, bw - inset * 2, bh - inset * 2);
      ctx.setLineDash([]);
      const fs = Math.max(14, c.width * 0.03);
      ctx.font = `bold ${fs}px Arial`;
      const txt = "Region Tumorale";
      const tw = ctx.measureText(txt).width;
      const px = 14, py = 8;
      const lx = bx + bw / 2 - tw / 2 - px;
      const ly = by - fs - py * 2 - 4;
      const lw = tw + px * 2;
      const lh = fs + py * 2;
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
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fs}px Arial`;
      ctx.textBaseline = "middle";
      ctx.fillText(txt, lx + px, ly + lh / 2);
      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = base64;
  });

// ── Calcule la hauteur reelle d'une image en preservant le ratio ──────────
const computeImageDimensions = (
  base64: string,
  maxW: number,
  maxH: number
): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      resolve({ w, h });
    };
    img.onerror = () => resolve({ w: maxW, h: maxH });
    img.src = base64;
  });

const formatDate = (raw: string): string => {
  if (!raw) return "N/A";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return raw || "N/A";
};

const translateTumorType = (type?: string): string => {
  if (!type) return "N/A";
  const map: Record<string, string> = {
    glioma: "Gliome", meningioma: "Meningiome",
    pituitary: "Tumeur hypophysaire",
    "no tumor": "Aucune tumeur", notumor: "Aucune tumeur",
  };
  return map[type.toLowerCase()] || type;
};

const translateLocation = (loc?: string): string => {
  if (!loc) return "N/A";
  return loc
    .replace(/upper-left/gi,  "region superieure gauche")
    .replace(/upper-right/gi, "region superieure droite")
    .replace(/lower-left/gi,  "region inferieure gauche")
    .replace(/lower-right/gi, "region inferieure droite")
    .replace(/upper/gi,       "region superieure")
    .replace(/lower/gi,       "region inferieure")
    .replace(/left/gi,        "hemisphere gauche")
    .replace(/right/gi,       "hemisphere droit")
    .replace(/brain/gi,       "cerebrale")
    .replace(/region/gi,      "region");
};

const buildReportText = (data: ReportData): string => {
  const conf = (data.confidence ?? 0).toFixed(1);
  const type = translateTumorType(data.tumorType);
  const loc  = translateLocation(data.tumorLocation);
  if (data.result !== "positive") {
    return `L'analyse par intelligence artificielle NeuroScan n'a detecte aucune anomalie tumorale dans l'imagerie IRM cerebrale du patient ${data.patientName}. Les structures encephaliques apparaissent dans les limites de la normale. Aucune lesion expansive, aucun signe d'hydrocephalie ni d'anomalie de signal significative n'ont ete identifies. Un suivi radiologique annuel est recommande a titre preventif.`;
  }
  const grade = data.tumorGrade ? `, de grade ${data.tumorGrade},` : "";
  return `L'analyse par intelligence artificielle NeuroScan a mis en evidence une suspicion de ${type}${grade} localisee dans la ${loc} du cerveau, avec un niveau de confiance diagnostique de ${conf}%. La morphologie et la densite de la lesion identifiee evoquent une origine neoplasique primitive. Le parenchyme cerebral environnant presente des modifications structurelles compatibles avec un processus expansif. Au vu de ces elements, un scanner cerebral injecte ainsi qu'une consultation urgente en neurochirurgie ou en neuro-oncologie sont fortement recommandes pour confirmation diagnostique et prise en charge adaptee.`;
};



export const generateMedicalReport = async (data: ReportData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const isPositive = data.result === "positive";
  const mX = 14;
  const tW = W - mX * 2;

  // ── Palette ──────────────────────────────────────────────────────────────
  const C: Record<string, RGB> = {
    navy:        [5,  12, 45],
    navyMid:     [18, 40, 95],
    navyLight:   [28, 60, 130],
    blue:        [37, 99, 195],
    blueSoft:    [219, 234, 254],
    blueText:    [29, 78, 160],
    blueBright:  [96, 165, 250],
    blueGlow:    [60, 120, 230],
    gold:        [210, 165, 45],
    goldLight:   [245, 215, 130],
    red:         [190, 28, 28],
    redSoft:     [254, 226, 226],
    redBright:   [239, 68,  68],
    redText:     [153, 27, 27],
    teal:        [13, 140, 110],
    tealSoft:    [210, 248, 238],
    tealText:    [10, 100, 80],
    amber:       [161, 98, 7],
    amberSoft:   [254, 243, 199],
    amberBorder: [217, 119, 6],
    white:       [255, 255, 255],
    offWhite:    [246, 249, 255],
    grayDark:    [20, 30, 55],
    grayMid:     [95, 115, 145],
    grayLight:   [200, 215, 235],
    grayBorder:  [220, 230, 245],
  };

  const STATUS   = isPositive ? C.red      : C.teal;
  const STATUS_S = isPositive ? C.redSoft  : C.tealSoft;
  const STATUS_T = isPositive ? C.redText  : C.tealText;
  const STATUS_B = isPositive ? C.redBright: C.teal;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const rr = (x: number, y: number, w: number, h: number, r: number, s: "F"|"S"|"FD" = "F") =>
    doc.roundedRect(x, y, w, h, r, r, s);

  // Gradient background: fills a rect with a linear gradient by stacking thin rects
  const gradRect = (
    x: number, y: number, w: number, h: number,
    from: RGB, to: RGB, steps = 24
  ) => {
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      doc.setFillColor(
        Math.round(from[0] + (to[0] - from[0]) * t),
        Math.round(from[1] + (to[1] - from[1]) * t),
        Math.round(from[2] + (to[2] - from[2]) * t),
      );
      doc.rect(x, y + i * (h / steps), w, h / steps + 0.5, "F");
    }
  };

  // Draw arc using line segments
  const drawArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number, color: RGB, lw: number) => {
    const steps = 60;
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg   * Math.PI) / 180;
    doc.setDrawColor(...color);
    doc.setLineWidth(lw);
    for (let i = 0; i < steps; i++) {
      const t1 = s + (e - s) * (i       / steps);
      const t2 = s + (e - s) * ((i + 1) / steps);
      doc.line(
        cx + r * Math.cos(t1), cy + r * Math.sin(t1),
        cx + r * Math.cos(t2), cy + r * Math.sin(t2)
      );
    }
  };

  const now               = new Date();
  const fmtDT             = (d: Date) =>
    `${d.toLocaleDateString("fr-FR")} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  const scanDateFormatted = formatDate(data.scanDate);
  const reportText        = buildReportText(data);
  const tumorTypeFR       = translateTumorType(data.tumorType);
  const locationFR        = translateLocation(data.tumorLocation);
  const confidencePct     = data.confidence ?? 0;

  let pageNum = 1;
  const stampPageNumber = (pn: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.grayMid);
    doc.text(`— ${pn} —`, W / 2, H - 5, { align: "center" });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. HEADER — gradient deep navy → blue ────────────────────────────────
  const hdrH = 60;
  gradRect(0, 0, W, hdrH, C.navy, C.navyLight, 30);

  // Decorative semi-transparent circles (blended color, top-right corner)
  const blendCircle = (cx: number, cy: number, r: number, t: number) => {
    doc.setFillColor(
      Math.round(C.navyLight[0] + (C.blueBright[0] - C.navyLight[0]) * t),
      Math.round(C.navyLight[1] + (C.blueBright[1] - C.navyLight[1]) * t),
      Math.round(C.navyLight[2] + (C.blueBright[2] - C.navyLight[2]) * t),
    );
    doc.circle(cx, cy, r, "F");
  };
  blendCircle(W + 2,  -4,  45, 0.09);
  blendCircle(W - 12, 28,  28, 0.07);
  blendCircle(W - 40, 58,  16, 0.05);
  blendCircle(-6,      4,  22, 0.07);

  // Gold accent bar + blue border
  doc.setFillColor(...C.gold);
  doc.rect(0, hdrH - 3, W * 0.55, 1.5, "F");
  doc.setFillColor(...C.blue);
  doc.rect(0, hdrH - 1.5, W, 2, "F");

  // NeuroScan wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...C.white);
  doc.text("Neuro", mX, 24);
  const neuroW = doc.getTextWidth("Neuro");
  doc.setTextColor(...C.blueBright);
  doc.text("Scan", mX + neuroW, 24);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.gold);
  doc.text("INTELLIGENCE ARTIFICIELLE MEDICALE  ·  ANALYSE IRM CEREBRALE", mX, 31);

  // Horizontal rule under tagline
  doc.setDrawColor(...C.blueGlow);
  doc.setLineWidth(0.35);
  doc.line(mX, 34, mX + 88, 34);

  // Reference & confidential tag
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 155, 210);
  doc.text(`REF : NSR-${data.patientId}-${now.getFullYear()}`, mX, 41);
  doc.setTextColor(100, 135, 200);
  doc.text("DOCUMENT MEDICAL CONFIDENTIEL", mX, 48);

  // Right side — report title + meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...C.white);
  doc.text("Rapport d'Analyse Cerebrale", W - mX, 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.goldLight);
  doc.text(`Genere le : ${fmtDT(now)}`, W - mX, 23, { align: "right" });

  if (data.doctorName) {
    doc.setTextColor(185, 210, 255);
    const drSpec = data.doctorSpecialty ? `  ·  ${data.doctorSpecialty}` : "";
    doc.text(`Dr. ${data.doctorName}${drSpec}`, W - mX, 31, { align: "right" });
    if (data.doctorHospital) {
      doc.setTextColor(155, 185, 240);
      doc.text(data.doctorHospital, W - mX, 39, { align: "right" });
    }
    doc.setTextColor(130, 165, 230);
    doc.text(`Date du scan : ${scanDateFormatted}`, W - mX, data.doctorHospital ? 47 : 39, { align: "right" });
  } else {
    doc.setTextColor(185, 210, 255);
    doc.text("NeuroScan AI Analysis System", W - mX, 31, { align: "right" });
    doc.setTextColor(155, 185, 240);
    doc.text(`Date du scan : ${scanDateFormatted}`, W - mX, 39, { align: "right" });
  }

  let curY = hdrH + 8;

  // ── 2. PATIENT INFO CARD ──────────────────────────────────────────────────
  const patH = 32;

  // Card drop-shadow (slightly offset dark rect)
  doc.setFillColor(185, 205, 235);
  rr(mX + 0.8, curY + 0.8, tW, patH, 4, "F");

  // Card background + border
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.6);
  rr(mX, curY, tW, patH, 4, "FD");

  // Left colored strip
  doc.setFillColor(...C.blue);
  rr(mX, curY, 5, patH, 2, "F");
  doc.rect(mX + 3, curY, 2, patH, "F");

  // "INFORMATIONS PATIENT" label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.blueText);
  doc.text("INFORMATIONS PATIENT", mX + 10, curY + 7);

  // 3 data columns
  const patCols = [
    { badge: "P",  label: "Nom Complet",  value: data.patientName },
    { badge: "ID", label: "Identifiant",  value: String(data.patientId) },
    { badge: "D",  label: "Date du Scan", value: scanDateFormatted },
  ];
  const cW3 = (tW - 5) / 3;
  patCols.forEach((col, i) => {
    const cx = mX + 5 + i * cW3;
    if (i > 0) {
      doc.setDrawColor(...C.grayBorder);
      doc.setLineWidth(0.3);
      doc.line(cx, curY + 10, cx, curY + patH - 3);
    }
    // Badge pill
    doc.setFillColor(...C.blueSoft);
    rr(cx + 4, curY + 12, 9, 5, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...C.blue);
    doc.text(col.badge, cx + 8.5, curY + 15.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.grayMid);
    doc.text(col.label, cx + cW3 / 2 + 2, curY + 13.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.grayDark);
    const val = col.value.length > 24 ? col.value.substring(0, 22) + "..." : col.value;
    doc.text(val, cx + cW3 / 2 + 2, curY + 24.5, { align: "center" });
  });

  curY += patH + 6;

  // ── 3. STATUS BANNER ──────────────────────────────────────────────────────
  const stH = 24;

  // Shadow
  doc.setFillColor(
    isPositive ? 210 : 140,
    isPositive ? 160 : 210,
    isPositive ? 160 : 195
  );
  rr(mX + 0.8, curY + 0.8, tW, stH, 4, "F");

  doc.setFillColor(...STATUS_S);
  doc.setDrawColor(...STATUS);
  doc.setLineWidth(0.8);
  rr(mX, curY, tW, stH, 4, "FD");

  // Left bold accent strip
  doc.setFillColor(...STATUS);
  rr(mX, curY, 8, stH, 3, "F");
  doc.rect(mX + 5, curY, 3, stH, "F");

  // Icon
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.text(isPositive ? "!" : "✓", mX + 4, curY + stH / 2 + 3.5, { align: "center" });

  // Main label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...STATUS);
  doc.text(
    isPositive ? "ANOMALIE DETECTEE  —  TUMEUR IDENTIFIEE" : "AUCUNE TUMEUR DETECTEE",
    mX + 14, curY + 10
  );

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...STATUS_T);
  const stSub = isPositive
    ? `Type : ${tumorTypeFR}  ·  Localisation : ${locationFR}  ·  Consultation urgente recommandee`
    : "Aucune lesion tumorale detectee dans l'imagerie IRM cerebrale. Suivi de routine conseille.";
  doc.text(stSub, mX + 14, curY + 18.5);

  curY += stH + 7;

  // ── 4. IMAGE IRM ──────────────────────────────────────────────────────────
  const maxImgW = tW;
  const maxImgH = 88;

  let finalB64: string | null = null;
  let imgDrawW = maxImgW;
  let imgDrawH = maxImgH;

  if (data.imageUrl) {
    try {
      const rawB64 = await loadImageAsBase64(data.imageUrl);
      if (rawB64) {
        finalB64 = rawB64;
        if (isPositive && data.boundingBox) {
          finalB64 = await composeMriWithBox(rawB64, data.boundingBox);
        }
        const dims = await computeImageDimensions(finalB64, maxImgW, maxImgH);
        imgDrawW = dims.w;
        imgDrawH = dims.h;
      }
    } catch { /* fallback */ }
  }

  const imgX = mX + (tW - imgDrawW) / 2;

  // Blue glow border (slightly larger rect behind image)
  doc.setFillColor(...C.blueGlow);
  rr(imgX - 2, curY - 2, imgDrawW + 4, imgDrawH + 4, 5, "F");

  // Dark background for image
  doc.setFillColor(3, 5, 15);
  rr(imgX, curY, imgDrawW, imgDrawH, 3, "F");

  if (finalB64) {
    const pad = 2;
    doc.addImage(finalB64, "JPEG", imgX + pad, curY + pad, imgDrawW - pad * 2, imgDrawH - pad * 2, undefined, "FAST");
  } else {
    doc.setTextColor(...C.grayMid);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Image IRM non disponible", imgX + imgDrawW / 2, curY + imgDrawH / 2, { align: "center" });
  }

  const capY = curY + imgDrawH + 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.grayMid);
  doc.text(
    `IRM Cerebrale  ·  Analyse NeuroScan AI  ·  ${now.toLocaleDateString("fr-FR")}`,
    mX + tW / 2, capY, { align: "center" }
  );
  if (isPositive && data.boundingBox) {
    doc.setFontSize(7);
    doc.setTextColor(...C.redText);
    doc.text("[ Region tumorale delimitee par le systeme d'IA ]", mX + tW / 2, capY + 5, { align: "center" });
  }

  curY = capY + (isPositive && data.boundingBox ? 8 : 6);

  // ── 5. METRIC CARDS — confidence bar on first card ────────────────────────
  const cardGap = 4;
  const cardW   = (tW - cardGap * 2) / 3;
  const cardH   = 44;

  const cardDefs = [
    {
      label: "CONFIANCE IA",
      value: `${confidencePct.toFixed(1)}%`,
      sub:   isPositive ? "Niveau de certitude" : "Scan normal confirme",
      color: STATUS,
      soft:  STATUS_S,
      bright:STATUS_B,
      showBar: true,
    },
    {
      label: "TYPE DE TUMEUR",
      value: isPositive ? tumorTypeFR : "Aucune lesion",
      sub:   isPositive ? "Classification IA" : "Resultat negatif",
      color: C.blue,
      soft:  C.blueSoft,
      bright:C.blueGlow,
      showBar: false,
    },
    {
      label: "LOCALISATION",
      value: isPositive ? locationFR : "N/A",
      sub:   isPositive ? "Zone cerebrale" : "Aucune region",
      color: C.navyMid,
      soft:  [232, 238, 255] as RGB,
      bright:C.navyLight,
      showBar: false,
    },
  ];

  cardDefs.forEach((card, i) => {
    const cx = mX + i * (cardW + cardGap);

    // Shadow
    doc.setFillColor(185, 205, 235);
    rr(cx + 0.7, curY + 0.7, cardW, cardH, 4, "F");

    // Card
    doc.setFillColor(...card.soft);
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.7);
    rr(cx, curY, cardW, cardH, 4, "FD");

    // Top strip (gradient simulation)
    gradRect(cx, curY, cardW, 8, card.color, card.bright, 8);
    // Round top corners mask
    doc.setFillColor(...card.color);
    rr(cx, curY, cardW, 4, 4, "F");
    doc.rect(cx, curY + 4, cardW, 4, "F");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text(card.label, cx + cardW / 2, curY + 5.8, { align: "center" });

    if (card.showBar) {
      // Large confidence value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(...card.color);
      doc.text(card.value, cx + cardW / 2, curY + 22, { align: "center" });

      // Progress bar track
      const barX  = cx + 6;
      const barY2 = curY + 27;
      const barW2 = cardW - 12;
      const barH2 = 4;
      doc.setFillColor(...C.grayBorder);
      rr(barX, barY2, barW2, barH2, 2, "F");
      // Filled portion
      gradRect(barX, barY2, barW2 * (confidencePct / 100), barH2, card.color, card.bright, 8);

      // Sub label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...card.color);
      doc.text(card.sub, cx + cardW / 2, curY + 38.5, { align: "center" });

    } else {
      // Value text (with wrap)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(i === 1 ? 12 : 11);
      doc.setTextColor(...card.color);
      const valLines = doc.splitTextToSize(card.value, cardW - 8) as string[];
      valLines.slice(0, 2).forEach((line, li) => {
        doc.text(line, cx + cardW / 2, curY + 21 + li * 7, { align: "center" });
      });

      // Separator
      const sepY2 = curY + 32;
      doc.setDrawColor(...C.grayBorder);
      doc.setLineWidth(0.3);
      doc.line(cx + 7, sepY2, cx + cardW - 7, sepY2);

      // Sub label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.grayMid);
      doc.text(card.sub, cx + cardW / 2, sepY2 + 6, { align: "center" });
    }
  });

  curY += cardH + 8;

  // ── 6. COMPTE RENDU ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const crLines = doc.splitTextToSize(reportText, tW - 18) as string[];
  const crLineH = 6;
  const crBodyH = crLines.length * crLineH + 18 + (data.doctorName ? 14 : 0);
  const crTitleH = 12;
  const recH  = 26;
  const footH = 22;
  const totalNeeded = crTitleH + crBodyH + recH + 14;

  // New page if needed
  if (curY + totalNeeded > H - footH) {
    stampPageNumber(pageNum++);
    doc.addPage();

    // Page 2 — mini gradient header
    const mhH = 15;
    gradRect(0, 0, W, mhH, C.navy, C.navyLight, 14);
    doc.setFillColor(...C.blue);
    doc.rect(0, mhH - 1.5, W, 1.5, "F");
    doc.setFillColor(...C.gold);
    doc.rect(0, mhH - 0.6, W * 0.4, 0.6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.white);
    doc.text("Neuro", mX, 10);
    const nW2 = doc.getTextWidth("Neuro");
    doc.setTextColor(...C.blueBright);
    doc.text("Scan", mX + nW2, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 200, 235);
    doc.text(
      `Rapport  ·  ${data.patientName}  ·  ${now.toLocaleDateString("fr-FR")}`,
      W - mX, 10, { align: "right" }
    );

    // Watermark (drawn before content so it appears behind)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(54);
    doc.setTextColor(236, 241, 253);
    doc.text("CONFIDENTIEL", W / 2, H / 2 + 10, { align: "center", angle: 45 });

    curY = mhH + 9;
  }

  // Section title — Compte Rendu
  // Shadow
  doc.setFillColor(175, 198, 235);
  rr(mX + 0.6, curY + 0.6, tW, crTitleH, 3, "F");

  // Gradient title bar
  gradRect(mX, curY, tW, crTitleH, C.navyMid, C.navyLight, 12);
  rr(mX, curY, tW, crTitleH, 3, "S");

  // Gold left accent
  doc.setFillColor(...C.gold);
  doc.rect(mX, curY, 3.5, crTitleH, "F");

  // IA badge
  doc.setFillColor(...C.blue);
  rr(mX + 7, curY + 2.5, 13, 7, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.white);
  doc.text("IA", mX + 13.5, curY + 7, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.white);
  doc.text("Compte Rendu  —  Analyse par Intelligence Artificielle", mX + 24, curY + 7.5);

  // Body
  const crBodyY = curY + crTitleH;

  // Body shadow
  doc.setFillColor(200, 215, 238);
  rr(mX + 0.6, crBodyY + 0.6, tW, crBodyH, 3, "F");

  doc.setFillColor(...C.offWhite);
  doc.setDrawColor(...C.grayBorder);
  doc.setLineWidth(0.3);
  rr(mX, crBodyY, tW, crBodyH, 3, "FD");

  // Left status bar
  gradRect(mX, crBodyY, 4, crBodyH, STATUS, STATUS_B, 12);

  // Gold top-right accent corner
  doc.setFillColor(...C.gold);
  doc.rect(mX + tW - 4, crBodyY, 4, 3.5, "F");

  // Report text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.grayDark);
  crLines.forEach((line, li) => {
    doc.text(line, mX + 9, crBodyY + 9 + li * crLineH);
  });

  // Doctor signature line
  if (data.doctorName) {
    const drSigY = crBodyY + crBodyH - 12;
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.3);
    doc.line(mX + 6, drSigY, mX + tW - 4, drSigY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.grayMid);
    const drInfo = `Etabli par : Dr. ${data.doctorName}${data.doctorSpecialty ? "  ·  " + data.doctorSpecialty : ""}${data.doctorHospital ? "  ·  " + data.doctorHospital : ""}`;
    doc.text(drInfo, mX + 9, drSigY + 8);
  }

  // ── 7. RECOMMANDATION ────────────────────────────────────────────────────
  const recY = crBodyY + crBodyH + 7;

  // Shadow
  doc.setFillColor(215, 185, 100);
  rr(mX + 0.6, recY + 0.6, tW, recH, 3, "F");

  doc.setFillColor(...C.amberSoft);
  doc.setDrawColor(...C.amberBorder);
  doc.setLineWidth(0.6);
  rr(mX, recY, tW, recH, 3, "FD");

  doc.setFillColor(...C.amber);
  rr(mX, recY, 7, recH, 2, "F");
  doc.rect(mX + 4, recY, 3, recH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.amber);
  doc.text("Recommandation Medicale", mX + 13, recY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.grayDark);
  const recText = isPositive
    ? "Un scanner cerebral injecte et une consultation en neurochirurgie sont fortement recommandes. Ce rapport doit etre confirme par un radiologue certifie avant toute decision clinique."
    : "Un suivi IRM annuel est recommande a titre preventif. Ce rapport doit etre confirme par un medecin radiologue qualifie.";
  const recLines = doc.splitTextToSize(recText, tW - 18) as string[];
  recLines.forEach((line, li) => doc.text(line, mX + 13, recY + 17 + li * 5.8));

  // Confidence arc gauge (bottom right of recommendation box — decorative)
  const gaugeX = mX + tW - 20;
  const gaugeY = recY + recH / 2;
  const gaugeR = 9;
  drawArc(gaugeX, gaugeY, gaugeR, 180, 360, C.grayBorder, 1.8);
  drawArc(gaugeX, gaugeY, gaugeR, 180, 180 + 180 * (confidencePct / 100), STATUS, 1.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...STATUS);
  doc.text(`${confidencePct.toFixed(0)}%`, gaugeX, gaugeY + 1.5, { align: "center" });

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────
  const footY = H - footH;

  // Gradient footer
  gradRect(0, footY, W, footH, C.navy, C.navyLight, 10);
  doc.setFillColor(...C.blue);
  doc.rect(0, footY, W, 1.8, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, footY + 1.8, W * 0.3, 0.8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(200, 218, 248);
  doc.text("Ce rapport est genere par un systeme d'IA a titre d'aide au diagnostic uniquement.", mX, footY + 8.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 175, 222);
  doc.text("Il ne remplace pas l'avis d'un medecin qualifie. Tout resultat doit etre confirme par un professionnel de sante habilite.", mX, footY + 14.5);

  // NeuroScan wordmark in footer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const nsW = doc.getTextWidth("Neuro");
  const bX  = W - mX - nsW - doc.getTextWidth("Scan");
  doc.setTextColor(...C.white);
  doc.text("Neuro", bX, footY + 9.5);
  doc.setTextColor(...C.blueBright);
  doc.text("Scan", bX + nsW, footY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 175, 222);
  doc.text(`ID Patient : ${data.patientId}`, W - mX, footY + 15, { align: "right" });
  doc.text(fmtDT(now), W - mX, footY + 20, { align: "right" });

  stampPageNumber(pageNum);

  doc.save(`NeuroScan_Rapport_${data.patientId}_${Date.now()}.pdf`);
};