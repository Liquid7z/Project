'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Image as ImageIcon, Undo, Redo, Quote, Code, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from './ui/button';
import { useCallback, useRef, useState } from 'react';
import { useUser, useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Image from '@tiptap/extension-image';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { LoadingAnimation } from './loading-animation';


const EditorToolbar = ({ editor }: { editor: any }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useUser();
  const storage = useStorage();

  const handleImageUpload = useCallback(async (file: File) => {
      if (!file || !user || !editor) return;

      setIsUploading(true);

      const filePath = `users/${user.uid}/images/${uuidv4()}-${file.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      
      try {
        await uploadBytes(fileStorageRef, file);
        const url = await getDownloadURL(fileStorageRef);
        
        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error("Image upload failed", error);
        // Maybe show a toast
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
  }, [editor, user, storage]);
  
  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  if (!editor) {
    return null;
  }

  const iconButtonClass = "hover:shadow-[0_0_10px_hsl(var(--accent)/0.7)] hover:text-accent";

  return (
    <>
      {isUploading && <LoadingAnimation text="Uploading image..." />}
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-t-md border-b bg-background/50 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()} className={iconButtonClass}><Undo className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()} className={iconButtonClass}><Redo className="w-4 h-4" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1"/>
        <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" className={iconButtonClass}><Bold className="w-4 h-4" /></Button>
        <Button variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" className={iconButtonClass}><Italic className="w-4 h-4" /></Button>
        <Button variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" className={iconButtonClass}><Underline className="w-4 h-4" /></Button>
        <Button variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" className={iconButtonClass}><Strikethrough className="w-4 h-4" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1"/>
        <Button variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" className={iconButtonClass}><Heading1 className="w-5 h-5" /></Button>
        <Button variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" className={iconButtonClass}><Heading2 className="w-5 h-5" /></Button>
        <Button variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" className={iconButtonClass}><Heading3 className="w-5 h-5" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1"/>
        <Button variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left" className={iconButtonClass}><AlignLeft className="w-5 h-5" /></Button>
        <Button variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center" className={iconButtonClass}><AlignCenter className="w-5 h-5" /></Button>
        <Button variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right" className={iconButtonClass}><AlignRight className="w-5 h-5" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1"/>
        <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List" className={iconButtonClass}><List className="w-5 h-5" /></Button>
        <Button variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List" className={iconButtonClass}><ListOrdered className="w-5 h-5" /></Button>
        <Button variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote" className={iconButtonClass}><Quote className="w-5 h-5" /></Button>
        <Button variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block" className={iconButtonClass}><Code className="w-5 h-5" /></Button>
        <div className="w-[1px] h-6 bg-border mx-1"/>
        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
        <Button variant={'ghost'} size="icon" onClick={() => fileInputRef.current?.click()} title="Add Image" className={iconButtonClass}><ImageIcon className="w-5 h-5" /></Button>
      </div>
    </>
  );
};


export const NoteEditor = ({ value, onChange, isEditable = true }: { value: any; onChange?: (value: any) => void; isEditable?: boolean; }) => {
  const editor = useEditor({
    editable: isEditable,
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'my-4 rounded-md max-w-full h-auto',
        },
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none p-4 ${isEditable ? 'min-h-[200px]' : ''}`,
      },
    },
  });

  return (
    <div className="relative h-full flex flex-col">
        {isEditable && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} className={`flex-1 overflow-y-auto ${isEditable ? '' : 'py-4'}`} />
    </div>
  );
};
