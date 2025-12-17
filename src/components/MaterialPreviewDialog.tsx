import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState } from "react";

interface MaterialPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  material: {
    id: number;
    display_name?: string;
    filename?: string;
    public_url?: string;
    file_url?: string;
    file_size_bytes?: number;
    type?: string;
    file_type?: string;
  } | null;
}

export function MaterialPreviewDialog({ open, onClose, material }: MaterialPreviewDialogProps) {
  const [imageError, setImageError] = useState(false);
  
  if (!material) return null;

  const fileUrl = material.public_url || material.file_url || '';
  const fileName = material.display_name || material.filename || 'Документ';
  const fileType = material.type || material.file_type || '';
  
  // Определяем тип файла по расширению
  const getFileType = (url: string): 'pdf' | 'image' | 'other' => {
    const ext = url.toLowerCase().split('.').pop() || '';
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    return 'other';
  };
  
  const detectedType = getFileType(fileUrl);
  
  const renderPreview = () => {
    if (detectedType === 'pdf') {
      return (
        <div className="w-full h-[600px] bg-black/20 rounded-lg overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full"
            title={fileName}
          />
        </div>
      );
    }
    
    if (detectedType === 'image' && !imageError) {
      return (
        <div className="w-full max-h-[600px] bg-black/20 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[600px] object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    
    // Fallback для других типов файлов или ошибки загрузки
    return (
      <div className="w-full h-[400px] bg-black/20 rounded-lg flex flex-col items-center justify-center gap-4 border border-gray-700">
        <div className="w-20 h-20 rounded-full bg-[#00FF88]/10 flex items-center justify-center">
          <Download className="w-10 h-10 text-[#00FF88]" />
        </div>
        <div className="text-center">
          <p className="text-gray-300 mb-2">
            Предпросмотр недоступен для этого типа файла
          </p>
          <p className="text-sm text-gray-500">
            Скачайте файл для просмотра
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#0a0a0f] border-gray-800 text-white p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-800">
          <DialogTitle className="text-xl font-bold text-white mb-1">
            {fileName}
          </DialogTitle>
          {material.file_size_bytes && (
            <p className="text-sm text-gray-400">
              {(material.file_size_bytes / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </DialogHeader>

        {/* Preview Content */}
        <div className="px-6 py-6">
          {renderPreview()}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-800">
          <Button
            asChild
            className="w-full bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold"
          >
            <a href={fileUrl} download={fileName}>
              <Download className="w-4 h-4 mr-2" />
              Скачать файл
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

