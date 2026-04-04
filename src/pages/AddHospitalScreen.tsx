import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Briefcase, CalendarDays, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hospitalService } from '@/services/hospitalService';
import { toast } from 'sonner';

const AddHospitalScreen = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [position, setPosition] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  const isValid = name.trim() && department.trim();

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await hospitalService.create({
        name: name.trim(),
        department: department.trim(),
        location: location.trim() || undefined,
        position: (position as 'intern' | 'resident' | 'registrar' | 'specialist') || undefined,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
      });
      toast.success('Hospital saved successfully');
      navigate(-1);
    } catch (e) {
      toast.error('Failed to save hospital');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="max-w-[430px] mx-auto min-h-screen relative flex flex-col border-x border-border bg-background shadow-elevated">
        {/* Header */}
        <header className="sticky top-0 z-50 px-5 pb-4 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[18px] font-bold text-foreground">Add New Hospital</h1>
        </header>

        {/* Form */}
        <div className="flex-1 px-5 py-6 space-y-5 animate-fade-in">
          {/* Hospital Name */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <Building2 size={15} className="text-primary" />
              Hospital Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter hospital name"
              className="w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-card"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <Stethoscope size={15} className="text-primary" />
              Department <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Enter department (e.g. Pediatric ICU)"
              className="w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-card"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <MapPin size={15} className="text-primary" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-card"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <Briefcase size={15} className="text-primary" />
              Position
            </label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] shadow-card focus:ring-primary/20">
                <SelectValue placeholder="Select your position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="registrar">Registrar</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Working Date */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <CalendarDays size={15} className="text-primary" />
              Start Working Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] text-left shadow-card transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 flex items-center justify-between',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  <CalendarDays size={16} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-0 px-5 pt-4 border-t border-border bg-background/80 backdrop-blur-md" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className={cn(
              'w-full h-[50px] rounded-xl font-semibold text-[15px] transition-all shadow-brand',
              isValid
                ? 'bg-primary text-primary-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
            )}
          >
            {saving ? 'Saving...' : 'Save Hospital'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddHospitalScreen;
