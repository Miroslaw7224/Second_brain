'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Extension } from '@tiptap/core';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// Custom FontSize extension (TipTap 3 TextStyle attribute)
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => { setMark: (...a: unknown[]) => { run: () => boolean }; run: () => boolean } }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => { setMark: (...a: unknown[]) => { removeEmptyTextStyle: () => { run: () => boolean } }; run: () => boolean } }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONT_FAMILIES = [
  { label: 'Sans', value: '' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
];
const COLORS = [
  '#000000',
  '#374151',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#2563EB',
  '#7C3AED',
];

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={twMerge(
        'p-2 rounded-lg transition-colors',
        active ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg3)] text-[var(--text)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

export function NoteEditor({
  content,
  onContentChange,
  placeholder,
  className,
}: {
  content: string;
  onContentChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize,
    ],
    content: content || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none min-h-[60vh] outline-none px-0 py-0 text-[var(--text)] leading-relaxed',
      },
      handleDOMEvents: {
        paste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain');
          if (text) {
            event.preventDefault();
            const { state } = view;
            const tr = state.tr.insertText(text);
            view.dispatch(tr);
            return true;
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = content || '<p></p>';
    if (current !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={twMerge('min-h-[60vh] bg-[var(--surface)] rounded-lg', className)}>
        <div className="animate-pulse h-8 bg-[var(--bg3)] rounded mb-4 w-1/3" />
        <div className="animate-pulse h-4 bg-[var(--bg3)] rounded mb-2" />
        <div className="animate-pulse h-4 bg-[var(--bg3)] rounded mb-2 w-5/6" />
      </div>
    );
  }

  return (
    <div className={twMerge('border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--border)] bg-[var(--bg2)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Pogrubienie"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Kursywa"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Podkreślenie"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Przekreślenie"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <span className="w-px h-6 bg-[var(--border)] mx-1" />
        {/* Text alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Wyrównaj do lewej"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Wyśrodkuj"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Wyrównaj do prawej"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Justowanie"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>
        <span className="w-px h-6 bg-[var(--border)] mx-1" />
        {/* Font size */}
        <select
          title="Rozmiar czcionki"
          value={
            (editor.getAttributes('textStyle').fontSize as string) || ''
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontSize(v).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] min-w-[4rem]"
        >
          <option value="">Rozmiar</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        {/* Font family */}
        <select
          title="Czcionka"
          value={(editor.getAttributes('textStyle').fontFamily as string) ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontFamily(v).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
          className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] min-w-[5rem]"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value || 'default'} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="w-px h-6 bg-[var(--border)] mx-1" />
        {/* Color */}
        <div className="flex items-center gap-1" title="Kolor">
          <Palette className="w-4 h-4 text-[var(--text2)]" />
          <select
            value={(editor.getAttributes('textStyle').color as string) ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v) editor.chain().focus().setColor(v).run();
              else editor.chain().focus().unsetColor().run();
            }}
            className="h-8 w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] cursor-pointer"
          >
            <option value="">Kolor</option>
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      </div>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
