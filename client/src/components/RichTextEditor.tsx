import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Palette,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxLength?: number;
}

const COLORS = [
  '#000000', '#374151', '#DC2626', '#EA580C', '#CA8A04',
  '#16A34A', '#2563EB', '#7C3AED', '#DB2777', '#64748B',
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  className = '',
  minHeight = '100px',
  maxLength,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Se o editor está vazio, retornar string vazia
      if (html === '<p></p>') {
        onChange('');
        return;
      }
      if (maxLength) {
        const textLength = editor.state.doc.textContent.length;
        if (textLength > maxLength) return;
      }
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}; padding: 0.625rem 0.75rem;`,
      },
    },
  });

  // Sincronizar valor externo com o editor (ex: reset de formulário)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== undefined) {
      const currentEmpty = editor.getHTML() === '<p></p>';
      const newEmpty = !value || value === '' || value === '<p></p>';
      if (currentEmpty && newEmpty) return;
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const setColor = useCallback((color: string) => {
    editor?.chain().focus().setColor(color).run();
  }, [editor]);

  if (!editor) return null;

  const textLength = editor.state.doc.textContent.length;

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        {/* Formatação de texto */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Alinhamento */}
        <ToolbarButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Alinhar à esquerda"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Centralizar"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Alinhar à direita"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justificar"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Listas */}
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com marcadores"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Cor do texto */}
        <div className="relative group">
          <ToolbarButton active={false} onClick={() => {}} title="Cor do texto">
            <Palette className="w-4 h-4" />
          </ToolbarButton>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-wrap gap-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[140px]">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
                onClick={() => setColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="overflow-auto" style={{ maxHeight: '300px' }}>
        <EditorContent editor={editor} />
      </div>

      {/* Placeholder overlay */}
      {editor.isEmpty && placeholder && (
        <div
          className="pointer-events-none absolute text-gray-400 text-sm"
          style={{ top: '45px', left: '12px' }}
        />
      )}

      {/* Contador de caracteres */}
      {maxLength && (
        <div className="flex justify-end px-3 py-1 border-t border-gray-100 bg-gray-50">
          <span className={`text-xs ${textLength > maxLength * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
            {textLength}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors cursor-pointer ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}
