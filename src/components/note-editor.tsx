'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, ImageIcon, Paperclip, File as FileIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useCallback } from 'react';
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

// 1. Create a custom component for the attachment
const AttachmentComponent = (props: any) => {
  const { node } = props;
  const { src, title } = node.attrs;

  return (
    <NodeViewWrapper className="not-prose my-4">
      <div 
        className="p-4 rounded-lg border border-border bg-card/50 flex items-center gap-4"
        contentEditable={false}
      >
        <FileIcon className="w-8 h-8 text-accent" />
        <div className="flex-grow">
          <a 
            href={src} 
            download={title}
            className="font-medium text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()} // Prevent editor focus issues
          >
            {title}
          </a>
          <p className="text-xs text-muted-foreground">Click to download</p>
        </div>
      </div>
    </NodeViewWrapper>
  );
};


// 2. Create a Tiptap Node for attachments
const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true, // This makes it behave like a single, non-editable unit
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: 'attachment',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Removed the "0" content hole to fix the "Content hole not allowed in a leaf node spec" error.
    return ['div', { 'data-type': 'attachment', ...HTMLAttributes }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentComponent);
  },
});


const EditorToolbar = ({ editor }: { editor: any }) => {
  const addFile = useCallback((fileType: 'image' | 'doc' = 'image') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'image' ? 'image/*' : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target?.result;
              if (url) {
                editor.chain().focus('end').setImage({ src: url as string }).run();
              }
            };
            reader.readAsDataURL(file);
        } else {
           const url = URL.createObjectURL(file);
           // 3. Use the custom attachment node
           editor.chain().focus('end').insertContent({
             type: 'attachment',
             attrs: { src: url, title: file.name },
           }).run();
        }
      }
    };
    input.click();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 rounded-t-md border-b bg-background/50">
      <Button
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className="w-5 h-5" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className="w-5 h-5" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className="w-5 h-5" />
      </Button>
      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="w-5 h-5" />
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered List"
      >
        <ListOrdered className="w-5 h-5" />
      </Button>
      <Button
        variant='ghost'
        size="icon"
        onClick={() => addFile('image')}
        title="Add Image"
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
      <Button
        variant='ghost'
        size="icon"
        onClick={() => addFile('doc')}
        title="Attach Document"
      >
        <Paperclip className="w-5 h-5" />
      </Button>
    </div>
  );
};


export const NoteEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Allow links
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
      Image.configure({
        inline: false, // Set to false to make images block elements
        allowBase64: true,
      }),
      Attachment, // 4. Add the custom node to the editor
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="relative h-full flex flex-col">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
};
