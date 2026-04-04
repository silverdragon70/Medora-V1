import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { patientService } from '@/services/patientService';
import { toast } from 'sonner';

const inputClass =
  'w-full h-11 px-4 rounded-[12px] text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors'
  + ' bg-[hsl(210,40%,98%)] border-[1.5px] border-[hsl(216,20%,90%)] focus:border-primary';

const labelClass = 'text-[12px] font-bold uppercase tracking-wide';

const EditPatientScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [name, setName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [fileNumber, setFileNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    patientService.getById(id).then(p => {
      if (!p) return;
      setName(p.full_name);
      const parts = p.dob.split('-');
      setDobYear(parts[0] ?? '');
      setDobMonth(parts[1] ?? '');
      setDobDay(parts[2] ?? '');
      setGender(p.gender);
      setFileNumber(p.file_number ?? '');
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const dob = `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`;
      await patientService.update(id, {
        full_name: name.trim(),
        dob,
        gender,
        file_number: fileNumber || undefined,
      });
      toast.success('Patient updated');
      navigate(-1);
    } catch {
      toast.error('Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() && dobDay && dobMonth && dobYear && gender;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-[14px] text-muted-foreground">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-foreground">Edit Patient</h1>
        <div className="w-9" />
      </header>

      <div className="px-5 py-5 space-y-5 pb-10">
        <div className="space-y-1.5">
          <label className={labelClass} style={{ color: '#6B7C93' }}>Full Name <span className="text-destructive">*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Patient's full name" className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} style={{ color: '#6B7C93' }}>Date of Birth <span className="text-destructive">*</span></label>
          <div className="grid grid-cols-3 gap-3">
            <input type="text" inputMode="numeric" maxLength={2} value={dobDay}
              onChange={e => setDobDay(e.target.value.replace(/\D/g, ''))}
              placeholder="DD" className={cn(inputClass, 'text-center')} />
            <input type="text" inputMode="numeric" maxLength={2} value={dobMonth}
              onChange={e => setDobMonth(e.target.value.replace(/\D/g, ''))}
              placeholder="MM" className={cn(inputClass, 'text-center')} />
            <input type="text" inputMode="numeric" maxLength={4} value={dobYear}
              onChange={e => setDobYear(e.target.value.replace(/\D/g, ''))}
              placeholder="YYYY" className={cn(inputClass, 'text-center')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} style={{ color: '#6B7C93' }}>Gender <span className="text-destructive">*</span></label>
          <div className="flex gap-3">
            {(['male', 'female'] as const).map(g => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className={cn('flex-1 h-11 rounded-[12px] text-[14px] font-medium border-[1.5px] transition-colors',
                  gender === g ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-muted-foreground border-[hsl(216,20%,90%)] hover:bg-muted/50')}>
                {g === 'male' ? '♂ Male' : '♀ Female'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} style={{ color: '#6B7C93' }}>File Number</label>
          <input type="text" value={fileNumber} onChange={e => setFileNumber(e.target.value)}
            placeholder="e.g. 24-10842" className={inputClass} />
        </div>

        <Button onClick={handleSave} disabled={!isValid || saving}
          className="w-full h-12 rounded-[12px] text-[15px] font-semibold">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default EditPatientScreen;
