import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function Post() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(path);

      const { error: insertError } = await supabase.from('videos').insert({
        creator_id: user.id,
        video_url: urlData.publicUrl,
        caption,
      });
      if (insertError) throw insertError;

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 pt-10">
      <h1 className="font-display text-2xl font-bold">New post</h1>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="mt-6 flex aspect-[9/16] w-full max-w-xs cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary"
      >
        {previewUrl ? (
          <video src={previewUrl} className="h-full w-full object-cover" muted autoPlay loop />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <span className="text-sm">Choose a video</span>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onPickFile} />

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption…"
        maxLength={2000}
        className="mt-4 w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        rows={3}
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <button onClick={submit} disabled={!file || busy} className="btn-primary mt-4 w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
      </button>
    </div>
  );
}
