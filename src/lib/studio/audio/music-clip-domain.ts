import { MusicClip } from "./types";
import { MusicProjectState, MusicalNote, transposeNote } from "./music-domain";
export function createMusicClip(trackId: string, notes: MusicalNote[], startBeat = 0, durationBeats = 4, name = "Music Clip"): MusicClip { return { id: `music-clip-${Date.now()}`, trackId, name, timelineStartMs: 0, startBeat, endBeat: startBeat + durationBeats, transposeSemitones: 0, notes: notes.map((note) => ({ ...note, startBeat: note.startBeat - startBeat })) }; }
export function transposeMusicClip(clip: MusicClip, semitones: number): MusicClip { return { ...clip, transposeSemitones: clip.transposeSemitones + semitones, notes: clip.notes.map((note) => transposeNote(note, semitones)) }; }
export function duplicateMusicClip(clip: MusicClip, startBeat: number): MusicClip { const duration = clip.endBeat - clip.startBeat; return { ...clip, id: `music-clip-${Date.now()}-${startBeat}`, startBeat, endBeat: startBeat + duration, notes: clip.notes.map((note) => ({ ...note, id: `${note.id}-copy` })) }; }
export function syncPrimaryMusicClip(music: MusicProjectState, trackId: string): MusicProjectState { const duration = Math.max(4, ...music.notes.map((note) => note.startBeat + note.durationBeats)); const existing = music.clips?.find((clip) => clip.trackId === trackId); const clip: MusicClip = existing ? { ...existing, endBeat: duration, notes: music.notes.map((note) => ({ ...note })) } : createMusicClip(trackId, music.notes, 0, duration, "Instrumento principal"); return { ...music, clips: [...(music.clips || []).filter((item) => item.trackId !== trackId), clip] }; }

/** Keeps the legacy note list and structured Music Clips aligned without replacing unrelated clips. */
export function syncMusicNotesWithClips(music: MusicProjectState, trackId: string): MusicProjectState {
  const clips = music.clips || [];
  if (!clips.length) return syncPrimaryMusicClip(music, trackId);
  const notesById = new Map(music.notes.map((note) => [note.id, note]));
  const knownIds = new Set(clips.flatMap((clip) => clip.notes.map((note) => note.id)));
  const missing = music.notes.filter((note) => !knownIds.has(note.id));
  const targetClips = clips.filter((clip) => clip.trackId === trackId);
  const target = targetClips.find((clip) => clip.name === "Instrumento principal") || targetClips[0];
  return {
    ...music,
    clips: clips.map((clip) => {
      const updatedNotes = clip.notes.map((note) => notesById.get(note.id) || note);
      if (!target || clip.id !== target.id) return { ...clip, notes: updatedNotes };
      const nextNotes = [...updatedNotes, ...missing];
      const duration = Math.max(4, ...nextNotes.map((note) => note.startBeat + note.durationBeats));
      return { ...clip, notes: nextNotes, endBeat: Math.max(clip.endBeat, duration) };
    }),
  };
}
