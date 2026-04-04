import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, GraduationCap, CalendarIcon, Pencil, Trash2, Award } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { courseService } from '@/services/courseService';
import { settingsService } from '@/services/settingsService';
import CourseExportSheet from '@/lib/export/course/CourseExportSheet';
import type { Course } from '@/services/db/database';
import { toast } from 'sonner';

const CoursesScreen = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [showExport, setShowExport] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const displayed = useMemo(() => courses.slice(0, displayCount), [courses, displayCount]);
  const hasMore = displayCount < courses.length;


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
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formProvider, setFormProvider] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formHasCert, setFormHasCert] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  const loadCourses = useCallback(async () => {
    const all = await courseService.getAll();
    setCourses(all);
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const resetForm = () => {
    setFormName(''); setFormDate(new Date()); setFormProvider('');
    setFormDuration(''); setFormHasCert(false); setFormNotes('');
    setEditingId(null);
  };

  const handleEdit = (c: Course) => {
    setFormName(c.name);
    setFormDate(new Date(c.date));
    setFormProvider(c.provider ?? '');
    setFormDuration(c.duration ?? '');
    setFormHasCert(c.has_certificate === 1);
    setFormNotes(c.notes ?? '');
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const data = {
      name: formName.trim(),
      date: format(formDate, 'yyyy-MM-dd'),
      provider: formProvider || undefined,
      duration: formDuration || undefined,
      has_certificate: formHasCert,
      notes: formNotes || undefined,
    };
    if (editingId) {
      await courseService.update(editingId, data);
      toast.success('Course updated');
    } else {
      await courseService.create(data);
      toast.success('Course saved');
    }
    resetForm();
    setShowForm(false);
    loadCourses();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await courseService.delete(deleteId);
    toast.success('Course deleted');
    setDeleteId(null);
    loadCourses();
  };

  const inputClass = 'w-full h-11 px-4 bg-card border border-border rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all';

  if (showForm) return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => { resetForm(); setShowForm(false); }} className="p-1.5 rounded-xl hover:bg-muted/50">
          <X size={22} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{editingId ? 'Edit Course' : 'Add Course'}</h1>
        <button onClick={handleSave} disabled={!formName.trim()}
          className={cn('ml-auto px-4 py-2 rounded-xl text-[14px] font-semibold transition-all',
            formName.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
          Save
        </button>
      </div>
      <div className="px-5 py-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Course Name *</label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Course name" className={inputClass} />
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Provider</label>
            <Input value={formProvider} onChange={e => setFormProvider(e.target.value)} placeholder="e.g. Coursera" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Duration</label>
            <Input value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="e.g. 3 days" className={inputClass} />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
          <div>
            <p className="text-[14px] font-semibold text-foreground">Has Certificate</p>
            <p className="text-[12px] text-muted-foreground">Did you receive a certificate?</p>
          </div>
          <button onClick={() => setFormHasCert(p => !p)}
            className={cn('w-12 h-6 rounded-full transition-all relative', formHasCert ? 'bg-primary' : 'bg-muted')}>
            <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm', formHasCert ? 'left-6' : 'left-0.5')} />
          </button>
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
        <h2 className="text-[16px] font-bold text-foreground">{courses.length} Course{courses.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-[13px] font-semibold">
          <Plus size={15} /> Add Course
        </button>
      </div>

      {courses.length === 0 && (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4"><GraduationCap size={24} className="text-muted-foreground" /></div>
          <p className="text-[14px] font-semibold text-foreground">No courses yet</p>
          <p className="text-[12px] text-muted-foreground mt-1">Tap "Add Course" to log a completed course</p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-bold text-foreground truncate">{c.name}</h4>
                    {c.has_certificate === 1 && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">
                        <Award size={10} /> Cert
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil size={14} /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 ml-11">
              {c.provider && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">🏫 {c.provider}</span>}
              {c.duration && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">⏱ {c.duration}</span>}
            </div>
            {c.notes && <p className="text-[12px] text-muted-foreground ml-11 leading-relaxed">{c.notes}</p>}
          </div>
        ))}
        <div ref={loaderRef} className="py-2 text-center">
          {hasMore && <p className="text-[12px] text-muted-foreground">Loading more...</p>}
          {!hasMore && courses.length > 20 && <p className="text-[11px] text-muted-foreground">All {courses.length} courses loaded</p>}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-card rounded-t-2xl p-6 w-full max-w-[430px] space-y-4">
            <h3 className="text-[16px] font-bold text-foreground">Delete Course?</h3>
            <p className="text-[13px] text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-muted-foreground">Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[14px] font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>

      <CourseExportSheet
        open={showExport}
        onOpenChange={setShowExport}
        courses={courses.map(c => ({
          id: c.id,
          name: c.name,
          date: c.date,
          provider:       c.provider,
          duration:       c.duration,
          hasCertificate: c.has_certificate === 1,
          notes:          c.notes,
        }))}
      />
    </>
  );
};

export default CoursesScreen;
