"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useCallback, useState } from "react";
import { tokenStorage } from "@/lib/token";

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const token = tokenStorage.getToken();
  const res = await fetch("/api/upload/image", {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "فشل رفع الصورة");
  }
  const data = await res.json() as { url: string };
  return data.url;
}

// ── Image Dialog ──────────────────────────────────────────────────────────────

interface ImageDialogState {
  open: boolean;
  mode: "url" | "uploaded";
  uploadedUrl?: string;
}

function ImageDialog({
  state,
  onConfirm,
  onClose,
}: {
  state: ImageDialogState;
  onConfirm: (src: string, alt: string) => void;
  onClose: () => void;
}) {
  const [src, setSrc] = useState(state.uploadedUrl ?? "");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    setSrc(state.uploadedUrl ?? "");
    setAlt("");
  }, [state.uploadedUrl, state.open]);

  if (!state.open) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div style={{
        background: "var(--color-bg, #fff)",
        borderRadius: 12, padding: "1.5rem 1.75rem",
        width: "min(90vw, 420px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", gap: "0.85rem",
        direction: "rtl",
      }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>إدراج صورة داخلية</h3>

        {state.mode === "url" && (
          <div>
            <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-text-secondary)" }}>
              رابط الصورة *
            </label>
            <input
              autoFocus
              type="url"
              value={src}
              onChange={e => setSrc(e.target.value)}
              placeholder="https://example.com/image.jpg"
              dir="ltr"
              style={{
                width: "100%", padding: "0.5rem 0.7rem", borderRadius: 7,
                border: "1.5px solid var(--color-border, #e5e7eb)",
                fontSize: "0.9rem", boxSizing: "border-box",
                background: "var(--color-bg)",
              }}
            />
          </div>
        )}

        {state.mode === "uploaded" && state.uploadedUrl && (
          <div>
            <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-text-secondary)" }}>
              الصورة المرفوعة
            </label>
            <img
              src={state.uploadedUrl}
              alt="preview"
              style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 7 }}
            />
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--color-text-secondary)" }}>
            النص البديل (Alt Text) — للـ SEO وإمكانية الوصول
          </label>
          <input
            autoFocus={state.mode === "uploaded"}
            type="text"
            value={alt}
            onChange={e => setAlt(e.target.value)}
            placeholder="صورة توضيحية لشقة في دمشق"
            style={{
              width: "100%", padding: "0.5rem 0.7rem", borderRadius: 7,
              border: "1.5px solid var(--color-border, #e5e7eb)",
              fontSize: "0.9rem", boxSizing: "border-box",
              background: "var(--color-bg)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-start" }}>
          <button
            type="button"
            onClick={() => {
              const finalSrc = src.trim();
              if (!finalSrc) return;
              onConfirm(finalSrc, alt.trim());
            }}
            disabled={state.mode === "url" ? !src.trim() : false}
            style={{
              padding: "0.5rem 1.2rem", borderRadius: 7,
              background: "var(--color-primary)", color: "#fff",
              border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem",
            }}
          >
            إدراج
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem", borderRadius: 7,
              background: "transparent", color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border, #e5e7eb)", cursor: "pointer", fontSize: "0.9rem",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toolbar Button ─────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.3rem 0.5rem",
        border: "1px solid transparent",
        borderRadius: 5,
        background: active ? "var(--color-primary)" : "transparent",
        color: active ? "#fff" : "var(--color-text-primary)",
        cursor: disabled ? "default" : "pointer",
        fontSize: "0.85rem",
        fontWeight: active ? 700 : 400,
        opacity: disabled ? 0.4 : 1,
        minWidth: 28,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span style={{
      display: "inline-block", width: 1, height: 20,
      background: "var(--color-border, #e5e7eb)", margin: "0 0.15rem",
      verticalAlign: "middle",
    }} />
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({
  editor, disabled,
  onOpenUrlDialog, onOpenUploadDialog,
}: {
  editor: Editor | null;
  disabled?: boolean;
  onOpenUrlDialog: () => void;
  onOpenUploadDialog: () => void;
}) {
  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("أدخل الرابط:", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.1rem", padding: "0.4rem 0.6rem",
      borderBottom: "1px solid var(--color-border, #e5e7eb)",
      background: "var(--color-bg-secondary, #f9fafb)",
      borderRadius: "8px 8px 0 0",
    }}>
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={disabled || !editor.can().undo()} title="تراجع">↩</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={disabled || !editor.can().redo()} title="إعادة">↪</ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} disabled={disabled} title="عنوان 1">H1</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} disabled={disabled} title="عنوان 2">H2</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} disabled={disabled} title="عنوان 3">H3</ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} disabled={disabled} title="غامق"><b>B</b></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} disabled={disabled} title="مائل"><i>I</i></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} disabled={disabled} title="تحته خط"><u>U</u></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} disabled={disabled} title="يتوسطه خط"><s>S</s></ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} disabled={disabled} title="قائمة نقطية">☰</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} disabled={disabled} title="قائمة مرقمة">№</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} disabled={disabled} title="اقتباس">❝</ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} disabled={disabled} title="محاذاة يمين">⟶</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} disabled={disabled} title="توسيط">≡</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} disabled={disabled} title="محاذاة يسار">⟵</ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={setLink} active={editor.isActive("link")} disabled={disabled} title="إضافة رابط">🔗</ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={onOpenUrlDialog} disabled={disabled} title="إدراج صورة برابط">🖼</ToolbarBtn>
      <ToolbarBtn onClick={onOpenUploadDialog} disabled={disabled} title="رفع صورة من الجهاز">📁</ToolbarBtn>
      <Divider />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} disabled={disabled} title="كود">{"`"}</ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={disabled} title="خط فاصل">—</ToolbarBtn>
    </div>
  );
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "اكتب محتوى المقال هنا...",
  disabled = false,
  minHeight = 450,
}: RichTextEditorProps) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [imgDialog, setImgDialog] = useState<ImageDialogState>({
    open: false, mode: "url",
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: false,
        link: { openOnClick: false },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        dir: "rtl",
        style: `min-height:${minHeight}px; padding:1rem; outline:none; line-height:1.8; font-size:0.97rem;`,
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const handleInsertImage = useCallback((src: string, alt: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src, alt }).run();
    setImgDialog({ open: false, mode: "url" });
  }, [editor]);

  const handleFileChange = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImgDialog({ open: true, mode: "uploaded", uploadedUrl: url });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <>
      <ImageDialog
        state={imgDialog}
        onConfirm={handleInsertImage}
        onClose={() => setImgDialog({ open: false, mode: "url" })}
      />

      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFileChange(f);
          e.target.value = "";
        }}
      />

      <div style={{
        border: "1.5px solid var(--color-border, #e5e7eb)",
        borderRadius: 8,
        background: "var(--color-bg)",
        opacity: disabled ? 0.7 : 1,
      }}>
        <Toolbar
          editor={editor}
          disabled={disabled || uploading}
          onOpenUrlDialog={() => setImgDialog({ open: true, mode: "url", uploadedUrl: undefined })}
          onOpenUploadDialog={() => imgInputRef.current?.click()}
        />

        {uploading && (
          <div style={{
            padding: "0.4rem 1rem", fontSize: "0.82rem",
            color: "var(--color-primary)", background: "#f0fdf4",
            borderBottom: "1px solid #bbf7d0",
          }}>
            ⏳ جاري رفع الصورة...
          </div>
        )}

        <style>{`
          .tiptap-editor .ProseMirror { outline: none; }
          .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: right;
            color: var(--color-text-secondary);
            pointer-events: none;
            height: 0;
            font-style: italic;
          }
          .tiptap-editor .ProseMirror h1 { font-size:1.6rem; font-weight:800; margin:1rem 0 0.5rem; }
          .tiptap-editor .ProseMirror h2 { font-size:1.3rem; font-weight:700; margin:1rem 0 0.5rem; }
          .tiptap-editor .ProseMirror h3 { font-size:1.1rem; font-weight:700; margin:0.75rem 0 0.35rem; }
          .tiptap-editor .ProseMirror blockquote {
            border-right: 4px solid var(--color-primary);
            padding: 0.5rem 1rem;
            margin: 0.75rem 0;
            background: #f1f8f1;
            border-radius: 0 6px 6px 0;
            color: var(--color-text-secondary);
          }
          .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-right: 1.5rem; }
          .tiptap-editor .ProseMirror a { color: var(--color-primary); text-decoration: underline; }
          .tiptap-editor .ProseMirror img {
            max-width: 100%; height: auto; border-radius: 6px;
            margin: 0.75rem 0; display: block;
            box-shadow: 0 2px 8px rgba(0,0,0,0.10);
            cursor: pointer;
          }
          .tiptap-editor .ProseMirror img.ProseMirror-selectednode {
            outline: 3px solid var(--color-primary);
          }
          .tiptap-editor .ProseMirror code {
            background: #f0f0f0; padding: 0.15rem 0.4rem;
            border-radius: 4px; font-size: 0.88em; font-family: monospace;
          }
          .tiptap-editor .ProseMirror hr {
            border: none; border-top: 2px solid var(--color-border, #e5e7eb); margin: 1rem 0;
          }
          .tiptap-editor .ProseMirror p { margin: 0.4rem 0; }
        `}</style>

        <div className="tiptap-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
