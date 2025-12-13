'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, ImageIcon, Paperclip, File as FileIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useCallback, useState, useEffect } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { useStorage, useUser } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { extractTextAction } from '@/actions/generation';
import NextImage from 'next/image';
import { Skeleton } from './ui/skeleton';

const AttachmentComponent = (props: any) => {
  const { node, updateAttributes } = props;
  const { src, title } = node.attrs;
  const [previewSrc, setPreviewSrc] = useState(node.attrs.previewSrc);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If the preview is a generic SVG, it means we need to generate a real one.
    const needsPreviewGeneration = previewSrc && previewSrc.startsWith('data:image/svg+xml');

    if (needsPreviewGeneration && src && !isLoading) {
      setIsLoading(true);
      
      // Since we can't get a data URI directly from a Firebase storage URL due to CORS,
      // and we don't want to expose a proxy, we will make a compromise.
      // We will assume that if a preview is needed, it's because it wasn't generated on upload.
      // The `extractTextAction` can take a `documentDataUri`, but we only have a `src` URL.
      // We will create a generic but more informative preview.
      
      const fileType = title.split('.').pop()?.toUpperCase() || 'FILE';

      const generateBetterPreview = (fileType: string): string => {
        const svg = `<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="500" fill="#2d3748" />
            <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="30" fill="white" font-weight="bold">${fileType}</text>
            <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#a0aec0">${title}</text>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      };

      const newPreview = generateBetterPreview(fileType);
      setPreviewSrc(newPreview);
      updateAttributes({ previewSrc: newPreview });
      setIsLoading(false);
    }
  }, [src, previewSrc, title, updateAttributes, isLoading]);

  return (
    <NodeViewWrapper className="not-prose my-4">
      <div 
        className="p-4 rounded-lg border border-border bg-card/50 flex flex-col gap-4"
        contentEditable={false}
      >
        <div className="flex items-center gap-3">
          <FileIcon className="w-6 h-6 text-accent flex-shrink-0" />
          <a 
            href={src} 
            download={title}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline truncate"
            onClick={(e) => e.stopPropagation()} 
          >
            {title}
          </a>
        </div>
        <div className="relative aspect-video w-full rounded-md overflow-hidden border">
            {isLoading ? (
                <Skeleton className="h-full w-full" />
            ) : previewSrc ? (
              <NextImage
                src={previewSrc}
                alt={`Preview of ${title}`}
                fill
                className="object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-muted-foreground text-sm">No preview available</p>
              </div>
            )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const AttachmentNode = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true, 
  
  addAttributes() {
    return {
      src: { default: null },
      title: { default: 'attachment' },
      previewSrc: { default: null },
    };
  },

  parseHTML() {
    return [{
        tag: 'div[data-type="attachment"]',
        getAttrs: (dom) => {
            const element = dom as HTMLElement;
            return {
                src: element.getAttribute('data-src'),
                title: element.getAttribute('data-title'),
                previewSrc: element.getAttribute('data-preview-src'),
            }
        },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'attachment' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentComponent);
  },
});


const EditorToolbar = ({ editor, noteId }: { editor: any, noteId?: string }) => {
  const storage = useStorage();
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);

  const fileToDataUri = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  }

  const addFile = useCallback(async (fileType: 'image' | 'doc' = 'image') => {
    if (!storage || !user || isUploading) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'image' ? 'image/*' : '.pdf,.doc,.docx';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        const uniqueFileName = `${uuidv4()}-${file.name}`;
        const filePath = `notes/${user.uid}/${noteId || 'new-note'}/${uniqueFileName}`;
        const fileStorageRef = storageRef(storage, filePath);

        try {
          const snapshot = await uploadBytes(fileStorageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);

          if (file.type.startsWith('image/')) {
            editor.chain().focus().insertContentAt(editor.state.doc.content.size, `<p></p>`).setImage({ src: downloadURL }).run();
          } else {
            const documentDataUri = await fileToDataUri(file);
            const { previewDataUri } = await extractTextAction({ documentDataUri });

            editor.chain().focus().insertContentAt(editor.state.selection.to, {
              type: 'attachment',
              attrs: { src: downloadURL, title: file.name, previewSrc: previewDataUri },
            }).run();
          }
        } catch (error) {
          console.error("Error uploading file:", error);
        } finally {
            setIsUploading(false);
        }
      }
    };
    input.click();
  }, [editor, storage, user, noteId, isUploading]);

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
        disabled={isUploading}
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
      <Button
        variant='ghost'
        size="icon"
        onClick={() => addFile('doc')}
        title="Attach Document"
        disabled={isUploading}
      >
        <Paperclip className="w-5 h-5" />
      </Button>
    </div>
  );
};


export const NoteEditor = ({ value, onChange, noteId }: { value: string; onChange: (value: string) => void, noteId?: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
      Image.configure({
        inline: false, 
        allowBase64: true,
      }),
      AttachmentNode, 
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
