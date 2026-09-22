import { defaultMusicProject } from "./music-domain";
import { exportScorePdf } from "./score-pdf-export";
const project = defaultMusicProject(); project.notes.push({ id: "tuplet", pitch: "D", accidental: "natural", octave: 4, startBeat: 0, durationBeats: 1, velocity: 90, tuplet: { actual: 3, normal: 2 } }); const bytes = exportScorePdf(project, "PDF Test"); const text = new TextDecoder().decode(bytes);
if (!text.startsWith("%PDF-1.4") || !text.includes("/Type /Catalog") || !text.includes("PDF Test") || !text.includes("tuplet 3:2") || !text.includes("duration 0.6666666666666666") || !text.includes("430 655 m 475 655 l")) throw new Error("PDF da partitura não preservou bracket visual do tuplet.");
console.log("Score PDF export tests passed: valid catalog, page and text stream.");
