'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewProps, Node as TipTapNode } from '@tiptap/react';
import { DocumentPreviewer } from './document-previewer';
import { X } from 'lucide-react';
import { Button } from './ui/button';

export const PdfBlockNode = TipTapNode.create({
  name: 'pdfBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileURL: { default: null },
      fileName: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="pdfBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'pdfBlock', ...HTMLAttributes }];
  },

  addNodeView() {
    return ({ node, deleteNode, editor }) => {
      const { fileURL, fileName } = node.attrs;
      return (
        <NodeViewWrapper className="my-4 relative group not-prose">
             <div className="p-4 rounded-lg bg-card border-l-4 border-accent shadow-md">
                <h3 className="text-sm font-semibold mb-2 text-foreground">{fileName}</h3>
                {editor.isEditable && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-destructive/50 hover:bg-destructive"
                        onClick={deleteNode}
                    >
                        <X className="h-4 w-4"/>
                    </Button>
                )}
                <DocumentPreviewer 
                    fileURL={fileURL}
                    fileType="application/pdf"
                    fileName={fileName}
                />
            </div>
        </NodeViewWrapper>
      );
    };
  },
});

export default PdfBlockNode;
