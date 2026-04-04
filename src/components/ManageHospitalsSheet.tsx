import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, Pencil, Trash2, Plus, Building2 } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  department?: string;
  unit?: string;
}

interface ManageHospitalsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #DDE3EA',
  borderRadius: 12,
  background: '#F8FAFC',
  height: 48,
  padding: '0 14px',
  fontSize: 14,
  color: '#1A2332',
  width: '100%',
  outline: 'none',
};

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="text-[12px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#6B7C93' }}>
    {children}{required && <span style={{ color: '#EF4444' }}> *</span>}
  </label>
);

const initialHospitals: Hospital[] = [
  { id: '1', name: "St. Jude Children's", department: 'Main Wing', unit: 'Central Unit' },
  { id: '2', name: 'Cairo University', department: 'Pediatrics Dept', unit: '' },
  { id: '3', name: 'Ain Shams Hospital', department: 'Ward B', unit: '' },
];

const ManageHospitalsSheet = ({ open, onOpenChange }: ManageHospitalsSheetProps) => {
  const [hospitals, setHospitals] = useState<Hospital[]>(initialHospitals);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editHospital, setEditHospital] = useState<Hospital | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // Add state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDept, setAddDept] = useState('');
  const [addUnit, setAddUnit] = useState('');

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Hospital | null>(null);

  const openEdit = (h: Hospital) => {
    setEditHospital(h);
    setEditName(h.name);
    setEditDept(h.department || '');
    setEditUnit(h.unit || '');
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editHospital || !editName.trim()) return;
    setHospitals(prev => prev.map(h =>
      h.id === editHospital.id ? { ...h, name: editName.trim(), department: editDept.trim(), unit: editUnit.trim() } : h
    ));
    setEditOpen(false);
  };

  const confirmDelete = (h: Hospital) => {
    setDeleteTarget(h);
    setDeleteDialogOpen(true);
  };

  const doDelete = () => {
    if (!deleteTarget) return;
    setHospitals(prev => prev.filter(h => h.id !== deleteTarget.id));
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const openAdd = () => {
    setAddName('');
    setAddDept('');
    setAddUnit('');
    setAddOpen(true);
  };

  const doAdd = () => {
    if (!addName.trim()) return;
    const newH: Hospital = {
      id: Date.now().toString(),
      name: addName.trim(),
      department: addDept.trim(),
      unit: addUnit.trim(),
    };
    setHospitals(prev => [...prev, newH]);
    setAddOpen(false);
  };

  const subtitle = (h: Hospital) => {
    const parts = [h.department, h.unit].filter(Boolean);
    return parts.join(' • ') || '';
  };

  return (
    <>
      {/* Sheet A — List */}
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex items-center justify-between px-5 pb-2">
            <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Manage Hospitals</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-5 pb-6 overflow-y-auto">
            <div className="space-y-2 mb-4">
              {hospitals.map(h => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl"
                  style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #DDE3EA' }}
                >
                  <Building2 size={20} style={{ color: '#0EA5E9' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate" style={{ color: '#1A2332' }}>{h.name}</div>
                    {subtitle(h) && <div className="text-[12px] truncate" style={{ color: '#6B7C93' }}>{subtitle(h)}</div>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(h); }}
                    className="p-1.5 rounded-lg hover:bg-blue-50"
                  >
                    <Pencil size={16} style={{ color: '#2563EB' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmDelete(h); }}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={openAdd}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-[14px]"
              style={{ height: 48, background: '#fff', border: '1.5px dashed #2563EB', color: '#2563EB' }}
            >
              <Plus size={18} /> Add New Hospital
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Sheet B — Edit Hospital */}
      <Drawer open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex items-center justify-between px-5 pb-2">
            <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Edit Hospital</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-5 pb-6 space-y-4">
            <div>
              <Label required>Hospital Name</Label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
            </div>
            <div>
              <Label>Department / Wing</Label>
              <input
                value={editDept}
                onChange={e => setEditDept(e.target.value)}
                placeholder="e.g. Pediatrics Dept"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <input
                value={editUnit}
                onChange={e => setEditUnit(e.target.value)}
                placeholder="e.g. Ward B"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
            </div>

            <button
              onClick={saveEdit}
              disabled={!editName.trim()}
              className="w-full font-bold text-white rounded-xl disabled:opacity-50"
              style={{ height: 52, background: '#2563EB' }}
            >
              Save Changes
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Sheet C — Add Hospital */}
      <Drawer open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex items-center justify-between px-5 pb-2">
            <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Add New Hospital</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-5 pb-6 space-y-4">
            <div>
              <Label required>Hospital Name</Label>
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="Enter hospital name..."
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
            </div>
            <div>
              <Label>Department / Wing</Label>
              <input
                value={addDept}
                onChange={e => setAddDept(e.target.value)}
                placeholder="e.g. Pediatrics Dept"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <input
                value={addUnit}
                onChange={e => setAddUnit(e.target.value)}
                placeholder="e.g. Ward B"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
            </div>

            <button
              onClick={doAdd}
              disabled={!addName.trim()}
              className="w-full font-bold text-white rounded-xl disabled:opacity-50"
              style={{ height: 52, background: '#2563EB' }}
            >
              Add Hospital
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 size={20} style={{ color: '#EF4444' }} /> Delete Hospital?
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be removed from your hospital list.
              <br /><br />
              This will <strong>NOT</strong> delete any patient cases associated with this hospital.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={doDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ManageHospitalsSheet;
