'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';

interface EditMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newContent: string) => Promise<boolean>;
  currentContent: string;
  isLoading?: boolean;
}

export function EditMessageDialog({
  isOpen,
  onClose,
  onSave,
  currentContent,
  isLoading = false
}: EditMessageDialogProps) {
  const [editedContent, setEditedContent] = useState(currentContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editedContent.trim() === currentContent.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(editedContent.trim());
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving edited message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setEditedContent(currentContent);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Message
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Edit your message..."
            className="min-h-[100px] resize-none"
            disabled={isSaving || isLoading}
            autoFocus
          />
          
          <div className="text-xs text-muted-foreground">
            You can edit this message within 5 minutes of sending.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving || isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editedContent.trim() || isSaving || isLoading}
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}