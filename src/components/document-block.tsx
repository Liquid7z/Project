'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewProps, Node as TipTapNode } from '@tiptap/react';
import { DocumentPreviewer } from './document-previewer';
import { X } from 'lucide-react';
import { Button } from './ui/button';

export const DocumentBlockNode = TipTapNode.create({
  name: 'documentBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileURL: { default: null },
      fileName: { default: null },
      fileType: { default: null },
      fileSize: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="documentBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'documentBlock', ...HTMLAttributes }];
  },

  addNodeView() {
    return ({ node, deleteNode, editor }) => {
      const { fileURL, fileName, fileType, fileSize } = node.attrs;
      return (
        <NodeViewWrapper className="my-4 p-4 rounded-lg bg-muted/50 relative group not-prose">
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
                fileType={fileType}
                fileName={fileName}
            />
        </NodeViewWrapper>
      );
    };
  },
});

export default DocumentBlockNode;

    