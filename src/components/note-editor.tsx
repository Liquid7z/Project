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
import { useStorage, useUser } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

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


const EditorToolbar = ({ editor, noteId }: { editor: any, noteId?: string }) => {
  const storage = useStorage();
  const { user } = useUser();

  const addFile = useCallback(async (fileType: 'image' | 'doc' = 'image') => {
    if (!storage || !user) return;
    const currentNoteId = noteId || 'new-note';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'image' ? 'image/*' : '*/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create a unique path for the file in Firebase Storage
        const uniqueFileName = `${uuidv4()}-${file.name}`;
        const filePath = `notes/${user.uid}/${currentNoteId}/${uniqueFileName}`;
        const fileStorageRef = storageRef(storage, filePath);

        try {
          // Upload the file
          const snapshot = await uploadBytes(fileStorageRef, file);
          // Get the public URL
          const downloadURL = await getDownloadURL(snapshot.ref);

          if (file.type.startsWith('image/')) {
            editor.chain().focus('end').setImage({ src: downloadURL }).run();
          } else {
            editor.chain().focus('end').insertContent({
              type: 'attachment',
              attrs: { src: downloadURL, title: file.name },
            }).run();
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          // TODO: Add user-facing error toast
        }
      }
    };
    input.click();
  }, [editor, storage, user, noteId]);

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


export const NoteEditor = ({ value, onChange, noteId }: { value: string; onChange: (value: string) => void, noteId?: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Allow links
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
      Image.configure({
        inline: false, 
        allowBase64: true,
      }),
      Attachment, 
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
        <EditorToolbar editor={editor} noteId={noteId} />
        <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
};
