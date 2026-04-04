import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, BookOpen, CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { lectureService } from '@/services/lectureService';
import { settingsService } from '@/services/settingsService';
import LectureExportSheet from '@/lib/export/lecture/LectureExportSheet';
import type { Lecture } from '@/services/db/database';
import { toast } from 'sonner';

const LecturesScreen = () => {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [showExport, setShowExport] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const displayed = useMemo(() => lectures.slice(0, displayCount), [lectures, displayCount]);
  const hasMore = displayCount < lectures.length;


  useEffect(() => {
    const handler = () => setShowExport(true);
    window.addEventListener('open-export-sheet', handler);
    return () => window.removeEventListener('open-export-sheet', handler);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) setDisplayCount(c => c + 20); },
      { threshold: 0.1 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore]);

  // Form state
  const [formTopic, setFormTopic] = useState('');
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formSpeaker, setFormSpeaker] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const loadLectures = useCallback(async () => {
    const all = await lectureService.getAll();
    setLectures(all);
  }, []);

  useEffect(() => { loadLectures(); }, [loadLectures]);

  const resetForm = () => {
    setFormTopic(''); setFormDate(new Date()); setFormSpeaker('');
    setFormDuration(''); setFormLocation(''); setFormNotes('');
    setEditingId(null);
  };

  const handleEdit = (l: Lecture) => {
    setFormTopic(l.topic);
    setFormDate(new Date(l.date));
    setFormSpeaker(l.speaker ?? '');
    setFormDuration(l.duration ?? '');
    setFormLocation(l.location ?? '');
    setFormNotes(l.notes ?? '');
    setEditingId(l.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTopic.trim()) return;
    const data = {
      topic: formTopic.trim(),
      date: format(formDate, 'yyyy-MM-dd'),
      speaker: formSpeaker || undefined,
      duration: formDuration || undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
    };
    if (editingId) {
      await lectureService.update(editingId, data);
      toast.success('Lecture updated');
    } else {
      await lectureService.create(data);
      toast.success('Lecture saved');
    }
    resetForm();
    setShowForm(false);
    loadLectures();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await lectureService.delete(deleteId);
    toast.success('Lecture deleted');
    setDeleteId(null);
    loadLectures();
  };

  const inputClass = 'w-full h-11 px-4 bg-card border border-border rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all';

  if (showForm) return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => { resetForm(); setShowForm(false); }} className="p-1.5 rounded-xl hover:bg-muted/50">
          <X size={22} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{editingId ? 'Edit Lecture' : 'Add Lecture'}</h1>
        <button onClick={handleSave} disabled={!formTopic.trim()}
          className={cn('ml-auto px-4 py-2 rounded-xl text-[14px] font-semibold transition-all',
            formTopic.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
          Save
        </button>
      </div>
      <div className="px-5 py-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Topic *</label>
          <Input value={formTopic} onChange={e => setFormTopic(e.target.value)} placeholder="Lecture topic" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Date *</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full h-11 justify-start text-left font-normal', !formDate && 'text-muted-foreground')}>
                <CalendarIcon size={16} className="mr-2" />
                {formDate ? format(formDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formDate} onSelect={d => d && setFormDate(d)} initialFocus /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Speaker</label>
          <Input value={formSpeaker} onChange={e => setFormSpeaker(e.target.value)} placeholder="Speaker name" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Duration</label>
            <Input value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="e.g. 1h 30m" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Location</label>
            <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="Venue" className={inputClass} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Notes</label>
          <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes..." className="min-h-[100px] resize-none" />
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="px-5 py-6 space-y-4 animate-fade-in pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-foreground">{lectures.length} Lecture{lectures.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-[13px] font-semibold">
          <Plus size={15} /> Add Lecture
        </button>
      </div>

      {lectures.length === 0 && (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4"><BookOpen size={24} className="text-muted-foreground" /></div>
          <p className="text-[14px] font-semibold text-foreground">No lectures yet</p>
          <p className="text-[12px] text-muted-foreground mt-1">Tap "Add Lecture" to log an attended lecture</p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map(l => (
          <div key={l.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-bold text-foreground truncate">{l.topic}</h4>
                  <p className="text-[11px] text-muted-foreground">{new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(l)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil size={14} /></button>
                <button onClick={() => setDeleteId(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 ml-11">
              {l.speaker && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">👤 {l.speaker}</span>}
              {l.duration && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">⏱ {l.duration}</span>}
              {l.location && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">📍 {l.location}</span>}
            </div>
            {l.notes && <p className="text-[12px] text-muted-foreground ml-11 leading-relaxed">{l.notes}</p>}
          </div>
        ))}
        <div ref={loaderRef} className="py-2 text-center">
          {hasMore && <p className="text-[12px] text-muted-foreground">Loading more...</p>}
          {!hasMore && lectures.length > 20 && <p className="text-[11px] text-muted-foreground">All {lectures.length} lectures loaded</p>}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-card rounded-t-2xl p-6 w-full max-w-[430px] space-y-4">
            <h3 className="text-[16px] font-bold text-foreground">Delete Lecture?</h3>
            <p className="text-[13px] text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-muted-foreground">Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[14px] font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>

      <LectureExportSheet
        open={showExport}
        onOpenChange={setShowExport}
        lectures={lectures.map(l => ({
          id: l.id,
          topic: l.topic,
          date: l.date,
          speaker:  l.speaker,
          duration: l.duration,
          location: l.location,
          notes:    l.notes,
        }))}
      />
    </>
  );
};

export default LecturesScreen;
