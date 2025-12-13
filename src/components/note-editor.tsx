'use client';

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Image as ImageIcon, Paperclip, Undo, Redo, Quote, Code } from 'lucide-react';
import { Button } from './ui/button';
import { useCallback, useRef } from 'react';
import { useUser, useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Image from '@tiptap/extension-image';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Node } from '@tiptap/core';
import DocumentBlock from './document-block';


const EditorToolbar = ({ editor }: { editor: any }) => {
  const { user } = useUser();
  const storage = useStorage();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const addFile = useCallback(async (file: File, type: 'image' | 'document') => {
    if (!file || !editor || !storage || !user) return;
    
    const fileId = uuidv4();
    const filePath = `note_attachments/${user.uid}/${fileId}/${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);

    try {
        await uploadBytes(fileStorageRef, file);
        const url = await getDownloadURL(fileStorageRef);
        
        editor.chain().focus().insertContentAt(editor.state.selection.head, {
            type: 'documentBlock',
            attrs: {
              fileURL: url,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            },
        }).run()

    } catch (error) {
        console.error("Error uploading file:", error);
    }
  }, [editor, storage, user]);
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) addFile(file, 'image');
  };

  const handleDocUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) addFile(file, 'document');
  };


  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 rounded-t-md border-b bg-background/50 sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></Button>
      <div className="w-[1px] h-6 bg-border mx-1"/>
      <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-4 h-4" /></Button>
      <Button variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-4 h-4" /></Button>
      <Button variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="w-4 h-4" /></Button>
      <div className="w-[1px] h-6 bg-border mx-1"/>
      <Button variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 className="w-5 h-5" /></Button>
      <Button variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 className="w-5 h-5" /></Button>
      <Button variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 className="w-5 h-5" /></Button>
      <div className="w-[1px] h-6 bg-border mx-1"/>
      <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><List className="w-5 h-5" /></Button>
      <Button variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List"><ListOrdered className="w-5 h-5" /></Button>
      <Button variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="w-5 h-5" /></Button>
      <Button variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block"><Code className="w-5 h-5" /></Button>
      <div className="w-[1px] h-6 bg-border mx-1"/>
      <input type="file" ref={docInputRef} onChange={handleDocUpload} accept=".pdf,.doc,.docx,.txt,.pptx" className="hidden" />
      <Button variant={'ghost'} size="icon" onClick={() => docInputRef.current?.click()} title="Add Document"><Paperclip className="w-5 h-5" /></Button>
    </div>
  );
};


export const NoteEditor = ({ value, onChange, onTitleChange, title }: { value: any; onChange: (value: any) => void; onTitleChange: (title: string) => void; title: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false,
        codeBlock: {
            HTMLAttributes: {
                class: 'prose-sm p-4 my-4 rounded-md bg-muted text-muted-foreground'
            }
        }
      }),
      Document,
      Paragraph,
      Text,
      Image,
      DocumentBlock
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none p-4 h-full',
      },
    },
  });

  return (
    <div className="relative h-full flex flex-col">
        <div className="p-4 border-b">
             <input 
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Note Title"
                className="text-2xl font-headline bg-transparent border-0 focus:ring-0 w-full p-0"
            />
        </div>
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
};
