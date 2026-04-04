import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, ImageIcon, Trash2, X, ZoomIn, Plus } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';
import { mediaService } from '@/services/mediaService';
import type { Media } from '@/services/db/database';
import { toast } from 'sonner';

const MediaGalleryScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [mediaList, setMediaList] = useState<(Media & { dataUrl?: string })[]>([]);
  const [selectedItem, setSelectedItem] = useState<(Media & { dataUrl?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const items = await mediaService.getByCase(id);
      // For web: full_path stores base64 dataUrl
      setMediaList(items.map(m => ({ ...m, dataUrl: m.full_path.startsWith('data:') ? m.full_path : undefined })));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!id || files.length === 0) return;
    for (const file of files) {
      const dataUrl = await compressImage(file);
      const checksum = btoa(file.name + file.size);
      await mediaService.add(id, dataUrl, dataUrl, checksum);
      load();
    }
    e.target.value = '';
    toast.success('Image added');
  };

  const handleDelete = async (mediaId: string) => {
    await mediaService.delete(mediaId);
    toast.success('Image deleted');
    setSelectedItem(null);
    load();
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-[16px] font-bold text-foreground">Media Gallery</h1>
        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-muted text-primary">
          <Camera size={18} />
        </button>
      </header>

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-foreground">{mediaList.length} Image{mediaList.length !== 1 ? 's' : ''}</h3>
          <button onClick={() => fileInputRef.current?.click()} className="text-[12px] text-primary font-medium">+ Add Image</button>
        </div>

        {loading && <div className="py-10 text-center text-[13px] text-muted-foreground">Loading...</div>}

        {!loading && mediaList.length === 0 && (
          <div className="py-16 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4"><ImageIcon size={24} className="text-muted-foreground" /></div>
            <p className="text-[14px] font-semibold text-foreground">No images yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Tap the camera icon to add images</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {mediaList.map(m => (
            <div key={m.id} onClick={() => setSelectedItem(m)}
              className="aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all relative group">
              {m.dataUrl
                ? <img src={m.dataUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={28} className="text-muted-foreground" /></div>
              }
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
              </div>
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Plus size={24} />
            <span className="text-[9px] font-bold mt-1">ADD</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Preview */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setSelectedItem(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setSelectedItem(null)}><X size={24} /></button>
          <button className="absolute bottom-8 right-8 p-3 bg-red-500 rounded-full text-white"
            onClick={e => { e.stopPropagation(); handleDelete(selectedItem.id); }}>
            <Trash2 size={20} />
          </button>
          <div className="max-w-[90vw] max-h-[80vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {selectedItem.dataUrl
              ? <img src={selectedItem.dataUrl} alt="" className="max-w-full max-h-[80vh] rounded-2xl object-contain" />
              : <div className="w-[300px] h-[300px] bg-muted rounded-2xl flex items-center justify-center"><ImageIcon size={64} className="text-muted-foreground" /></div>
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGalleryScreen;
