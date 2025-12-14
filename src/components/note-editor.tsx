'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Pilcrow, ImageIcon } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import React from 'react';

const TipTapToolbar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input bg-transparent rounded-md p-1 flex flex-wrap gap-1 mb-4 sticky top-16 z-10 bg-background/80 backdrop-blur-sm">
      <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm"
        onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  editor.chain().focus().setImage({ src: e.target?.result as string }).run();
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
        }}
      >
        <ImageIcon className="h-4 w-4" />
      </Toggle>
    </div>
  );
};

export const NoteEditor = ({value, onChange}: {value: string; onChange: (value:string) => void}) => {
  const editor = useEditor({
    extensions: [
        StarterKit, 
        Underline, 
        Image,
        Placeholder.configure({
            placeholder: 'Start writing your note here...',
        })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none p-4 rounded-md border border-input min-h-[200px]',
      },
    },
  });

  return (
    <div>
      <TipTapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
