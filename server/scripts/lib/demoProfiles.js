// Sample profile details for demo students (seed-campus-demo.js): personal details, schooling,
// graduation, an initials avatar and a one-page PDF resume. Sample data only.
const zlib = require("zlib");
const PDFDocument = require("pdfkit");
const { saveFile } = require("../../campus/services/files");

const BOARDS = ["CBSE", "Maharashtra State Board", "ICSE", "CBSE", "Maharashtra State Board"];
const DEGREES = [["BBA", "Savitribai Phule Pune University"], ["BCom", "University of Mumbai"], ["BTech", "Dr. Babasaheb Ambedkar Technological University"], ["BSc", "Sandip University"], ["BBA", "Sandip University"]];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** A 96x96 PNG: a coloured circle on white, standing in for a photo. */
const avatarPng = (hue) => {
  const size = 96;
  const [r, g, b] = [Math.round(120 + 100 * Math.sin(hue)), Math.round(90 + 80 * Math.cos(hue)), 160];
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = [0];
    for (let x = 0; x < size; x += 1) {
      const inside = (x - 48) ** 2 + (y - 48) ** 2 < 44 ** 2;
      const head = (x - 48) ** 2 + (y - 38) ** 2 < 16 ** 2;
      const body = (x - 48) ** 2 + (y - 88) ** 2 < 30 ** 2;
      row.push(...(inside ? (head || body ? [255, 255, 255] : [r, g, b]) : [255, 255, 255]));
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
};

const resumePdf = (member, degree) =>
  new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const parts = [];
    doc.on("data", (c) => parts.push(c));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.fontSize(22).text(member.fullName).fontSize(10).fillColor("#555").text(`${member.email} | ${member.phone}`).moveDown();
    doc.fillColor("#000").fontSize(13).text("Education").fontSize(10)
      .text(`MBA (2025-27), Sandip University. CGPA ${member.cgpa}`)
      .text(`${degree[0]}, ${degree[1]}`).moveDown();
    doc.fontSize(13).text("Skills").fontSize(10).text("Excel, presentations, market research, team work").moveDown();
    doc.fontSize(9).fillColor("#888").text("Sample resume for the demo portal.");
    doc.end();
  });

/** Fills a demo student's profile, photo and resume included. */
const fillDemoProfile = async (member, i) => {
  const degree = DEGREES[i % DEGREES.length];
  const photo = await saveFile({ institutionId: member.institutionId, memberId: member._id, kind: "photo", buffer: avatarPng(i), mimeType: "image/png" });
  const resume = await saveFile({ institutionId: member.institutionId, memberId: member._id, kind: "resume", buffer: await resumePdf(member, degree), mimeType: "application/pdf" });
  const slug = member.fullName.toLowerCase().replace(/[^a-z]+/g, "-");
  member.profile = {
    dob: new Date(Date.UTC(2001 + (i % 3), i % 12, 1 + (i % 27))),
    gender: i % 2 ? "female" : "male",
    linkedinUrl: `https://www.linkedin.com/in/${slug}-demo${i + 1}`,
    photoFileId: photo._id,
    resumeFileId: resume._id,
    class10: { board: BOARDS[i % BOARDS.length], maxMarks: 500, obtainedMarks: 330 + ((i * 37) % 160), year: 2017 + (i % 2) },
    class12: i % 7 === 3 ? {} : { board: BOARDS[(i + 1) % BOARDS.length], maxMarks: 600, obtainedMarks: 380 + ((i * 29) % 200), year: 2019 + (i % 2) },
    diploma: i % 7 === 3 ? { course: "Diploma in Mechanical Engineering", institute: "Government Polytechnic, Nashik", maxMarks: 1000, obtainedMarks: 640 + ((i * 13) % 300), year: 2020 } : {},
    graduation: { degree: degree[0], university: degree[1], cgpa: Math.round((6.2 + ((i * 17) % 30) / 10) * 100) / 100, year: 2024 + (i % 2) },
  };
  await member.save();
};

module.exports = { fillDemoProfile };
