/**
 * Generates habit_reminder_build_guide.pdf from the markdown source.
 * Run: node scripts/generate-build-guide-pdf.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const mdPath = path.join(root, ".requirements", "habit_reminder_build_guide.md");
const pdfPath = path.join(root, ".requirements", "habit_reminder_build_guide.pdf");

const md = fs.readFileSync(mdPath, "utf8");
const doc = new PDFDocument({ margin: 50, size: "A4" });
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
let inCode = false;
let codeBuffer = [];

function flushCode() {
  if (codeBuffer.length === 0) return;
  doc.moveDown(0.3);
  doc.font("Courier").fontSize(8.5).fillColor("#1a1a1a");
  for (const line of codeBuffer) {
    if (doc.y > doc.page.height - 60) doc.addPage();
    doc.text(line, { width: pageWidth, lineGap: 1 });
  }
  codeBuffer = [];
  doc.moveDown(0.5);
  doc.fillColor("#000000");
}

for (const rawLine of md.split("\n")) {
  const line = rawLine.replace(/\r$/, "");

  if (line.startsWith("```")) {
    if (inCode) {
      inCode = false;
      flushCode();
    } else {
      inCode = true;
    }
    continue;
  }

  if (inCode) {
    codeBuffer.push(line);
    continue;
  }

  if (line.trim() === "---") {
    doc.moveDown(0.3);
    doc.strokeColor("#cccccc").moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);
    continue;
  }

  if (line.startsWith("# ")) {
    if (doc.y > 80) doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111");
    doc.text(line.slice(2), { width: pageWidth });
    doc.moveDown(0.4);
    continue;
  }

  if (line.startsWith("## ")) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#222222");
    doc.text(line.slice(3), { width: pageWidth });
    doc.moveDown(0.25);
    continue;
  }

  if (line.startsWith("### ")) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333");
    doc.text(line.slice(4), { width: pageWidth });
    doc.moveDown(0.15);
    continue;
  }

  if (line.startsWith("> ")) {
    doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#555555");
    doc.text(line.slice(2), { width: pageWidth, indent: 10 });
    doc.moveDown(0.15);
    continue;
  }

  if (line.startsWith("|") && line.includes("|")) {
    doc.font("Courier").fontSize(8).fillColor("#333333");
    if (doc.y > doc.page.height - 50) doc.addPage();
    doc.text(line, { width: pageWidth, lineGap: 0 });
    continue;
  }

  if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    const checked = line.startsWith("- [x] ");
    doc.text(`${checked ? "[x]" : "[ ]"} ${line.slice(6)}`, { width: pageWidth, indent: 10 });
    continue;
  }

  if (line.startsWith("- ")) {
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    doc.text(`• ${line.slice(2)}`, { width: pageWidth, indent: 10 });
    continue;
  }

  if (/^\d+\.\s/.test(line)) {
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    doc.text(line, { width: pageWidth, indent: 10 });
    continue;
  }

  if (line.trim() === "") {
    doc.moveDown(0.25);
    continue;
  }

  // Inline bold/code cleanup (basic)
  const text = line
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  if (doc.y > doc.page.height - 50) doc.addPage();
  doc.text(text, { width: pageWidth, lineGap: 2 });
}

if (inCode) flushCode();

doc.end();

stream.on("finish", () => {
  console.log(`PDF created: ${pdfPath}`);
});

stream.on("error", (err) => {
  console.error("PDF error:", err);
  process.exit(1);
});
