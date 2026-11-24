"use client";

import { useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "travel-images";
const MAX_MB = 10;

let client: SupabaseClient | null = null;
function getClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

type Props = {
  label?: string;
  onUploaded: (publicUrl: string) => void;
};

export default function ImageDropzone({
  label = "Arrasta imagens para aqui ou clica para escolher",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function uploadOne(file: File) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name}: não é uma imagem.`);
    if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name}: máximo ${MAX_MB} MB.`);

    const res = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Falha ao preparar o upload.");

    const { error } = await getClient()
      .storage.from(BUCKET)
      .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type });
    if (error) throw new Error(error.message);

    setLastUrl(data.publicUrl);
    onUploaded(data.publicUrl);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) await uploadOne(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm ${
          dragging ? "border-stone-900 bg-stone-50" : "border-stone-300 text-stone-600"
        }`}
      >
        {busy ? "A enviar…" : label}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {lastUrl && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lastUrl} alt="" className="h-14 w-20 rounded object-cover" />
          <input
            readOnly
            value={lastUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(lastUrl)}
            className="rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-50"
          >
            Copiar URL
          </button>
        </div>
      )}
    </div>
  );
}
