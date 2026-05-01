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

function _noImg(doc: jsPDF, x: number, w: number, y: number, h: number, color: [number, number, number]) {
  doc.setTextColor(...color);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Image non disponible", x + w / 2, y + h / 2, { align: "center" });
}

// ── Ajoute une nouvelle page avec header leger ────────────────────────────
const addPage = (doc: jsPDF, W: number, C: Record<string, [number,number,number]>, now: Date) => {
  doc.addPage();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 14, "F");
  doc.setFillColor(...C.blue);
  doc.rect(0, 12, W, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text("Neuro", 14, 9);
  const nW = doc.getTextWidth("Neuro");
  doc.setTextColor(...C.blueBright);
  doc.text("Scan", 14 + nW, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 200, 235);
  doc.text(`Rapport d'Analyse Cerebrale  ·  ${now.toLocaleDateString("fr-FR")}`, W - 14, 9, { align: "right" });
  return 20; // curY apres le mini header
};

export const generateMedicalReport = async (data: ReportData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const isPositive = data.result === "positive";
  const mX = 14;
  const tW = W - mX * 2;

  const C: Record<string, [number,number,number]> = {
    navy:        [10, 20, 55],
    navyMid:     [20, 40, 90],
    blue:        [37, 99, 195],
    blueSoft:    [219, 234, 254],
    blueText:    [29, 78, 160],
    blueBright:  [96, 165, 250],
    red:         [185, 28, 28],
    redSoft:     [254, 226, 226],
    redText:     [153, 27, 27],
    green:       [21, 128, 61],
    greenSoft:   [220, 252, 231],
    amber:       [161, 98, 7],
    amberSoft:   [254, 243, 199],
    amberBorder: [217, 119, 6],
    white:       [255, 255, 255],
    offWhite:    [248, 250, 252],
    grayDark:    [15, 23, 42],
    grayMid:     [100, 116, 139],
    grayLight:   [203, 213, 225],
    grayBorder:  [226, 232, 240],
  };

  const STATUS   = isPositive ? C.red     : C.green;
  const STATUS_S = isPositive ? C.redSoft : C.greenSoft;
  const STATUS_T = isPositive ? C.redText : C.green;

  const rr = (x: number, y: number, w: number, h: number, r: number, s: "F"|"S"|"FD" = "F") =>
    doc.roundedRect(x, y, w, h, r, r, s);

  const now               = new Date();
  const fmtDT             = (d: Date) =>
    `${d.toLocaleDateString("fr-FR")} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  const scanDateFormatted = formatDate(data.scanDate);
  const reportText        = buildReportText(data);
  const tumorTypeFR       = translateTumorType(data.tumorType);
  const locationFR        = translateLocation(data.tumorLocation);

  // ════════════════════════════════════════════════════════════════════════
  // 1. HEADER PAGE 1
  // ════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 45, "F");
  doc.setFillColor(...C.blue);
  doc.rect(0, 42, W, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...C.white);
  doc.text("Neuro", mX, 22);
  const neuroW = doc.getTextWidth("Neuro");
  doc.setTextColor(...C.blueBright);
  doc.text("Scan", mX + neuroW, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 185, 225);
  doc.text("INTELLIGENCE ARTIFICIELLE MEDICALE", mX, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text("Rapport d'Analyse Cerebrale", W - mX, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 235);
  doc.text(`Genere le : ${fmtDT(now)}`, W - mX, 22, { align: "right" });
  if (data.doctorName) {
    const drSpec = data.doctorSpecialty ? `  -  ${data.doctorSpecialty}` : "";
    doc.text(`Dr. ${data.doctorName}${drSpec}`, W - mX, 30, { align: "right" });
    if (data.doctorHospital) doc.text(data.doctorHospital, W - mX, 37, { align: "right" });
  } else {
    doc.text("NeuroScan AI Analysis System", W - mX, 30, { align: "right" });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. TABLEAU PATIENT
  // ════════════════════════════════════════════════════════════════════════
  const tY = 52;
  const tH = 26;

  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.7);
  rr(mX, tY, tW, tH, 3, "FD");

  doc.setFillColor(...C.navyMid);
  rr(mX, tY, tW, 8, 3, "F");
  doc.rect(mX, tY + 4, tW, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.text("INFORMATIONS PATIENT", mX + tW / 2, tY + 5.8, { align: "center" });

  const cols = [
    { label: "NOM COMPLET",  value: data.patientName },
    { label: "ID PATIENT",   value: String(data.patientId) },
    { label: "DATE DU SCAN", value: scanDateFormatted },
  ];
  const cW = tW / 3;
  cols.forEach((col, i) => {
    const cx = mX + i * cW;
    doc.setFillColor(i % 2 === 0 ? 255 : 240, i % 2 === 0 ? 255 : 246, 255);
    doc.rect(cx, tY + 8, cW, tH - 8, "F");
    if (i > 0) {
      doc.setDrawColor(...C.grayLight);
      doc.setLineWidth(0.3);
      doc.line(cx, tY + 8, cx, tY + tH);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.grayMid);
    doc.text(col.label, cx + cW / 2, tY + 13.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.grayDark);
    const val = col.value.length > 22 ? col.value.substring(0, 20) + "..." : col.value;
    doc.text(val, cx + cW / 2, tY + 21.5, { align: "center" });
  });
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.7);
  rr(mX, tY, tW, tH, 3, "S");

  // ════════════════════════════════════════════════════════════════════════
  // 3. BANNIERE STATUT
  // ════════════════════════════════════════════════════════════════════════
  const stY = tY + tH + 6;
  const stH = 20;

  doc.setFillColor(...STATUS_S);
  doc.setDrawColor(...STATUS);
  doc.setLineWidth(0.7);
  rr(mX, stY, tW, stH, 3, "FD");
  doc.setFillColor(...STATUS);
  rr(mX, stY, 6, stH, 2, "F");
  doc.rect(mX, stY, 3, stH, "F");

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(isPositive ? "!" : "✓", mX + 3, stY + stH / 2 + 2.5, { align: "center" });

  doc.setTextColor(...STATUS);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text(
    isPositive ? "ANOMALIE DETECTEE — TUMEUR IDENTIFIEE" : "AUCUNE TUMEUR DETECTEE",
    mX + 11, stY + 8
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...STATUS_T);
  const stSub = isPositive
    ? `${tumorTypeFR} detectee — ${locationFR}. Consultation urgente recommandee.`
    : "Aucune anomalie tumorale detectee dans l'IRM cerebrale. Suivi de routine conseille.";
  doc.text(stSub, mX + 11, stY + 15.5);

  // ════════════════════════════════════════════════════════════════════════
  // 4. IMAGE IRM — ratio préservé, centrée horizontalement
  // ════════════════════════════════════════════════════════════════════════
  const imgAreaY  = stY + stH + 8;
  const maxImgW   = tW;
  const maxImgH   = 90;

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
        // Calcule les dimensions réelles en respectant le ratio
        const dims = await computeImageDimensions(finalB64, maxImgW, maxImgH);
        imgDrawW = dims.w;
        imgDrawH = dims.h;
      }
    } catch { /* fallback */ }
  }

  // Fond noir centré
  const imgX = mX + (tW - imgDrawW) / 2;
  doc.setFillColor(4, 6, 16);
  rr(imgX, imgAreaY, imgDrawW, imgDrawH, 3, "F");

  if (finalB64) {
    const pad = 2;
    doc.addImage(finalB64, "JPEG", imgX + pad, imgAreaY + pad, imgDrawW - pad * 2, imgDrawH - pad * 2, undefined, "FAST");
  } else {
    _noImg(doc, imgX, imgDrawW, imgAreaY, imgDrawH, C.grayMid);
  }

  const capY = imgAreaY + imgDrawH + 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.grayMid);
  doc.text(
    `Analyse NeuroScan AI  ·  ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    mX + tW / 2, capY, { align: "center" }
  );

  // ════════════════════════════════════════════════════════════════════════
  // 5. 3 CARTES MÉTRIQUES — grandes, lisibles, texte bold + wrap
  // ════════════════════════════════════════════════════════════════════════
  const cardGap = 5;
  const cardW   = (tW - cardGap * 2) / 3;

  // Calcule la hauteur de carte nécessaire selon le contenu
  const cardFontSize = 13;
  doc.setFontSize(cardFontSize);

  const cardValues = [
    `${(data.confidence ?? 0).toFixed(1)}%`,
    tumorTypeFR,
    locationFR,
  ];
  const cardLabels    = ["CONFIANCE IA", "TYPE DE TUMEUR", "LOCALISATION"];
  const cardSubLabels = [
    isPositive ? "Niveau de certitude diagnostique" : "Scan normal confirme",
    isPositive ? "Lesion neoplasique detectee"       : "Aucune lesion identifiee",
    isPositive ? "Zone cerebrale affectee"           : "N/A",
  ];
  const cardColors = [STATUS, isPositive ? C.red : C.green, C.blue];
  const cardSofts  = [STATUS_S, isPositive ? C.redSoft : C.greenSoft, C.blueSoft];

  // Hauteur dynamique selon nombre de lignes de la valeur
  const cardHeights = cardValues.map((val, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cardFontSize);
    const lines = doc.splitTextToSize(val, cardW - 10) as string[];
    // topBar(6) + padding(4) + lignes valeur + séparateur(4) + sublabel(5) + padding(4)
    return 6 + 4 + lines.length * 7 + 4 + 5 + 4;
  });
  const cardH = Math.max(...cardHeights, 38);

  const cardsY = capY + 6;

  cardValues.forEach((val, i) => {
    const cx = mX + i * (cardW + cardGap);

    // Fond + bordure
    doc.setFillColor(...cardSofts[i]);
    doc.setDrawColor(...cardColors[i]);
    doc.setLineWidth(0.8);
    rr(cx, cardsY, cardW, cardH, 4, "FD");

    // Barre colorée haut
    doc.setFillColor(...cardColors[i]);
    rr(cx, cardsY, cardW, 6, 4, "F");
    doc.rect(cx, cardsY + 3, cardW, 3, "F");

    // Label haut
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.text(cardLabels[i], cx + cardW / 2, cardsY + 4.5, { align: "center" });

    // Valeur — bold, grande, avec wrap
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cardFontSize);
    doc.setTextColor(...cardColors[i]);
    const valLines = doc.splitTextToSize(val, cardW - 10) as string[];
    const valStartY = cardsY + 6 + 4 + 6; // top bar + padding + line height
    valLines.forEach((line, li) => {
      doc.text(line, cx + cardW / 2, valStartY + li * 7, { align: "center" });
    });

    // Séparateur
    const sepY = cardsY + 6 + 4 + valLines.length * 7 + 3;
    doc.setDrawColor(...cardColors[i]);
    doc.setLineWidth(0.4);
    doc.line(cx + 6, sepY, cx + cardW - 6, sepY);

    // Sous-label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...cardColors[i]);
    const subLines = doc.splitTextToSize(cardSubLabels[i], cardW - 10) as string[];
    subLines.forEach((line, li) => {
      doc.text(line, cx + cardW / 2, sepY + 4 + li * 5, { align: "center" });
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 6. COMPTE RENDU — sur nouvelle page si pas assez de place
  // ════════════════════════════════════════════════════════════════════════
  const crFontSize = 10.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(crFontSize);
  const crLines = doc.splitTextToSize(reportText, tW - 16) as string[];
  const crLineH = 6;
  const crTextH = crLines.length * crLineH;
  const crBodyH = crTextH + 20 + (data.doctorName ? 14 : 0); // text + padding + médecin
  const crTitleH = 12;
  const recH = 22;
  const footH = 22;
  const totalNeeded = crTitleH + crBodyH + recH + 10;

  let crY: number;
  const afterCards = cardsY + cardH + 7;

  if (afterCards + totalNeeded > H - footH) {
    // Nouvelle page
    crY = addPage(doc, W, C, now);
  } else {
    crY = afterCards;
  }

  // Titre section compte rendu
  doc.setFillColor(...C.navyMid);
  rr(mX, crY, tW, crTitleH, 3, "F");
  doc.rect(mX, crY + 6, tW, 6, "F");

  doc.setFillColor(...C.blue);
  doc.circle(mX + 7, crY + 6, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.text("IA", mX + 7, crY + 7.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text("Compte rendu d'analyse assistee par intelligence artificielle", mX + 15, crY + 7.5);

  // Corps
  const crBodyY = crY + crTitleH;
  doc.setFillColor(...C.offWhite);
  doc.setDrawColor(...C.grayBorder);
  doc.setLineWidth(0.3);
  rr(mX, crBodyY, tW, crBodyH, 3, "FD");

  // Barre latérale colorée
  doc.setFillColor(...STATUS);
  doc.rect(mX, crBodyY, 4, crBodyH, "F");

  // Texte bold grand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(crFontSize);
  doc.setTextColor(...C.grayDark);
  crLines.forEach((line, li) => {
    doc.text(line, mX + 9, crBodyY + 9 + li * crLineH);
  });

  // Signature médecin
  if (data.doctorName) {
    const drSigY = crBodyY + crBodyH - 11;
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.3);
    doc.line(mX + 6, drSigY, mX + tW - 4, drSigY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...C.grayMid);
    const drInfo = `Analyse etablie par : Dr. ${data.doctorName}${data.doctorSpecialty ? "  —  " + data.doctorSpecialty : ""}${data.doctorHospital ? "  —  " + data.doctorHospital : ""}`;
    doc.text(drInfo, mX + 9, drSigY + 7);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 7. RECOMMANDATION
  // ════════════════════════════════════════════════════════════════════════
  const recY = crBodyY + crBodyH + 6;

  doc.setFillColor(...C.amberSoft);
  doc.setDrawColor(...C.amberBorder);
  doc.setLineWidth(0.5);
  rr(mX, recY, tW, recH, 3, "FD");
  doc.setFillColor(...C.amber);
  rr(mX, recY, 5, recH, 2, "F");
  doc.rect(mX, recY, 3, recH, "F");

  doc.setTextColor(...C.amber);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Recommandation Medicale", mX + 9, recY + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.grayDark);
  const recText = isPositive
    ? "Un scanner cerebral injecte et une consultation en neurochirurgie sont fortement recommandes. Ce rapport doit etre confirme par un radiologue certifie avant toute decision clinique."
    : "Un suivi IRM annuel est recommande a titre preventif. Ce rapport doit etre confirme par un medecin radiologue qualifie.";
  doc.text(doc.splitTextToSize(recText, tW - 16), mX + 9, recY + 14);

  // ════════════════════════════════════════════════════════════════════════
  // 8. FOOTER — toujours en bas de la dernière page
  // ════════════════════════════════════════════════════════════════════════
  const footY = H - footH;

  doc.setFillColor(...C.navy);
  doc.rect(0, footY, W, footH, "F");
  doc.setFillColor(...C.blue);
  doc.rect(0, footY, W, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(200, 215, 240);
  doc.text("Ce rapport est genere par un systeme d'IA a titre d'aide au diagnostic uniquement.", mX, footY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(155, 178, 220);
  doc.text("Il ne remplace pas l'avis d'un medecin radiologue qualifie. Tout resultat doit etre confirme par un professionnel de sante habilite.", mX, footY + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const nW2 = doc.getTextWidth("Neuro");
  const bX  = W - mX - nW2 - doc.getTextWidth("Scan");
  doc.setTextColor(...C.white);
  doc.text("Neuro", bX, footY + 9);
  doc.setTextColor(...C.blueBright);
  doc.text("Scan", bX + nW2, footY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(155, 178, 220);
  doc.text(`Patient ID : ${data.patientId}`, W - mX, footY + 15, { align: "right" });
  doc.text(fmtDT(now), W - mX, footY + 20, { align: "right" });

  doc.save(`NeuroScan_Rapport_${data.patientId}_${Date.now()}.pdf`);
};