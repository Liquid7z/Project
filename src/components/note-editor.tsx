'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Image as ImageIcon, Paperclip } from 'lucide-react';
import { Button } from './ui/button';
import { useCallback, useRef } from 'react';
import { useUser, useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Image from '@tiptap/extension-image';


const EditorToolbar = ({ editor }: { editor: any }) => {
  const { user } = useUser();
  const storage = useStorage();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor || !storage || !user) return;

    const fileId = uuidv4();
    const filePath = `note_attachments/${user.uid}/${fileId}/${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);
    
    try {
        await uploadBytes(fileStorageRef, file);
        const url = await getDownloadURL(fileStorageRef);
        editor.chain().focus('end').setImage({ src: url }).run();
    } catch (error) {
        console.error("Error uploading image:", error);
        // Add user-facing error feedback (e.g., a toast)
    }
  }, [editor, storage, user]);
  
  const handleDocUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor || !storage || !user) return;

    const fileId = uuidv4();
    const filePath = `note_attachments/${user.uid}/${fileId}/${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);
    
    try {
        await uploadBytes(fileStorageRef, file);
        const url = await getDownloadURL(fileStorageRef);
        
        // Insert a styled link/chip for the document
        const html = `
            <p>
                <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; background-color: hsl(var(--muted)); padding: 4px 8px; border-radius: 4px; text-decoration: none; color: hsl(var(--foreground));">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
                    ${file.name}
                </a>
            </p>
        `;
        editor.chain().focus('end').insertContent(html).run();

    } catch (error) {
        console.error("Error uploading document:", error);
    }
  }, [editor, storage, user]);

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

      {/* Hidden file inputs */}
      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={docInputRef} onChange={handleDocUpload} accept=".pdf,.doc,.docx,.txt" className="hidden" />
      
      {/* Visible Toolbar Buttons */}
      <Button
        variant={'ghost'}
        size="icon"
        onClick={() => imageInputRef.current?.click()}
        title="Add Image"
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
      <Button
        variant={'ghost'}
        size="icon"
        onClick={() => docInputRef.current?.click()}
        title="Add Document"
      >
        <Paperclip className="w-5 h-5" />
      </Button>
    </div>
  );
};


export const NoteEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
      Image, // Add the Image extension
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
