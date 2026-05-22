import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { produtoService, type ProductImage } from "../../features/produtos/produtoService";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type PendingProductImage = {
  id: string;
  kind: "file" | "url";
  file?: File;
  url?: string;
  previewUrl: string;
  is_primary: boolean;
};

type GalleryItem = {
  id: string;
  url: string;
  alt_text?: string | null;
  is_primary: boolean;
  pending?: boolean;
};

type ProductImageGalleryProps = {
  productId?: string;
  productName: string;
  pendingImages?: PendingProductImage[];
  onPendingImagesChange?: (images: PendingProductImage[]) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) return fallback;
  const data = error.response.data;
  return typeof data.message === "string" ? data.message : fallback;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateFile(file: File) {
  if (!ACCEPTED_MIMES.includes(file.type)) {
    return "Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Imagem muito grande. Envie um arquivo de até 8 MB.";
  }
  return null;
}

export default function ProductImageGallery({
  productId,
  productName,
  pendingImages = [],
  onPendingImagesChange,
}: ProductImageGalleryProps) {
  const queryClient = useQueryClient();
  const [urlValue, setUrlValue] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isPersistedProduct = Boolean(productId);

  const { data: serverImages = [], isLoading } = useQuery({
    queryKey: ["produto-images", productId],
    queryFn: () => produtoService.listImages(productId!),
    enabled: isPersistedProduct,
  });

  useEffect(() => () => {
    pendingImages.forEach((image) => {
      if (image.kind === "file") URL.revokeObjectURL(image.previewUrl);
    });
  }, []);

  const invalidateImages = () => {
    queryClient.invalidateQueries({ queryKey: ["produto-images", productId] });
    queryClient.invalidateQueries({ queryKey: ["produto", productId] });
    queryClient.invalidateQueries({ queryKey: ["produtos"] });
  };

  const uploadMutation = useMutation({
    mutationFn: ({ file, isPrimary }: { file: File; isPrimary: boolean }) =>
      produtoService.uploadImage(productId!, file, { alt_text: productName, is_primary: isPrimary }),
    onSuccess: () => {
      setMessage({ type: "success", text: "Imagem enviada com sucesso." });
      invalidateImages();
    },
    onError: (error) => {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Erro ao enviar imagem.") });
    },
  });

  const uploadUrlMutation = useMutation({
    mutationFn: ({ url, isPrimary }: { url: string; isPrimary: boolean }) =>
      produtoService.uploadImageFromUrl(productId!, { url, alt_text: productName, is_primary: isPrimary }),
    onSuccess: () => {
      setUrlValue("");
      setMessage({ type: "success", text: "Imagem baixada e salva com sucesso." });
      invalidateImages();
    },
    onError: (error) => {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Erro ao baixar imagem externa.") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => produtoService.deleteImage(productId!, imageId),
    onSuccess: () => {
      setMessage({ type: "success", text: "Imagem removida." });
      invalidateImages();
    },
    onError: (error) => {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Erro ao remover imagem.") });
    },
  });

  const primaryMutation = useMutation({
    mutationFn: (imageId: string) => produtoService.setPrimaryImage(productId!, imageId),
    onSuccess: () => {
      setMessage({ type: "success", text: "Imagem principal atualizada." });
      invalidateImages();
    },
    onError: (error) => {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Erro ao definir imagem principal.") });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) => produtoService.reorderImages(productId!, imageIds),
    onSuccess: () => {
      invalidateImages();
    },
    onError: (error) => {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Erro ao reorganizar imagens.") });
    },
  });

  const persistFiles = async (files: File[]) => {
    let currentCount = serverImages.length;
    for (const file of files) {
      await uploadMutation.mutateAsync({ file, isPrimary: currentCount === 0 });
      currentCount += 1;
    }
  };

  const addPendingFiles = (files: File[]) => {
    const nextImages = [...pendingImages];
    const hasPrimary = nextImages.some((image) => image.is_primary);

    files.forEach((file, index) => {
      nextImages.push({
        id: crypto.randomUUID(),
        kind: "file",
        file,
        previewUrl: URL.createObjectURL(file),
        is_primary: !hasPrimary && index === 0,
      });
    });

    onPendingImagesChange?.(nextImages);
    setMessage({ type: "success", text: "Imagem adicionada. Ela será enviada após salvar o produto." });
  };

  const onDrop = (acceptedFiles: File[]) => {
    setMessage(null);
    const validFiles: File[] = [];

    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setMessage({ type: "error", text: validationError });
        return;
      }
      validFiles.push(file);
    }

    if (isPersistedProduct) {
      persistFiles(validFiles).catch(() => undefined);
    } else {
      addPendingFiles(validFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];
      setMessage({
        type: "error",
        text: firstError?.code === "file-too-large"
          ? "Imagem muito grande. Envie um arquivo de até 8 MB."
          : "Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.",
      });
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxSize: MAX_IMAGE_BYTES,
    multiple: true,
    noClick: true,
  });

  const galleryItems: GalleryItem[] = useMemo(() => (
    isPersistedProduct
      ? serverImages.map((image: ProductImage) => ({
          id: image.id,
          url: image.url,
          alt_text: image.alt_text,
          is_primary: image.is_primary,
        }))
      : pendingImages.map((image) => ({
          id: image.id,
          url: image.previewUrl,
          alt_text: productName,
          is_primary: image.is_primary,
          pending: true,
        }))
  ), [isPersistedProduct, pendingImages, productName, serverImages]);

  const addUrlImage = () => {
    const trimmedUrl = urlValue.trim();
    setMessage(null);

    if (!isValidHttpUrl(trimmedUrl)) {
      setMessage({ type: "error", text: "Link inválido. Informe uma URL http ou https." });
      return;
    }

    if (isPersistedProduct) {
      uploadUrlMutation.mutate({ url: trimmedUrl, isPrimary: serverImages.length === 0 });
      return;
    }

    const hasPrimary = pendingImages.some((image) => image.is_primary);
    onPendingImagesChange?.([
      ...pendingImages,
      {
        id: crypto.randomUUID(),
        kind: "url",
        url: trimmedUrl,
        previewUrl: trimmedUrl,
        is_primary: !hasPrimary,
      },
    ]);
    setUrlValue("");
    setMessage({ type: "success", text: "Link adicionado. O backend baixará a imagem após salvar o produto." });
  };

  const removePendingImage = (imageId: string) => {
    const removed = pendingImages.find((image) => image.id === imageId);
    if (removed?.kind === "file") URL.revokeObjectURL(removed.previewUrl);

    const remaining = pendingImages.filter((image) => image.id !== imageId);
    if (removed?.is_primary && remaining.length > 0) {
      remaining[0] = { ...remaining[0], is_primary: true };
    }
    onPendingImagesChange?.(remaining);
  };

  const setPendingPrimary = (imageId: string) => {
    onPendingImagesChange?.(pendingImages.map((image) => ({
      ...image,
      is_primary: image.id === imageId,
    })));
  };

  const movePendingImage = (imageId: string, direction: -1 | 1) => {
    const index = pendingImages.findIndex((image) => image.id === imageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= pendingImages.length) return;
    const nextImages = [...pendingImages];
    [nextImages[index], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[index]];
    onPendingImagesChange?.(nextImages);
  };

  const moveServerImage = (imageId: string, direction: -1 | 1) => {
    const index = serverImages.findIndex((image) => image.id === imageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= serverImages.length) return;
    const nextImages = [...serverImages];
    [nextImages[index], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[index]];
    reorderMutation.mutate(nextImages.map((image) => image.id));
  };

  const isBusy = uploadMutation.isPending || uploadUrlMutation.isPending || deleteMutation.isPending || primaryMutation.isPending || reorderMutation.isPending;

  return (
    <div className="space-y-4 rounded-md border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="image_url_input">Adicionar imagem por URL</Label>
          <div className="flex gap-2">
            <Input
              id="image_url_input"
              value={urlValue}
              onChange={(event) => setUrlValue(event.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            <Button type="button" onClick={addUrlImage} disabled={isBusy}>
              {uploadUrlMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Baixar e salvar imagem
            </Button>
          </div>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
        <p className="font-medium text-sm">Arraste imagens aqui</p>
        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP ou GIF até 8 MB. O backend converte para WebP otimizado.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={open} disabled={isBusy}>
          Selecionar arquivo
        </Button>
      </div>

      {message && (
        <div className={`rounded-md border px-3 py-2 text-sm ${
          message.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Carregando imagens...
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 py-10 text-center text-muted-foreground">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">Produto sem imagens</p>
          <p className="text-xs">Adicione uma imagem por URL ou arquivo local.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {galleryItems.map((image, index) => (
            <div key={image.id} className="group rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
              <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative">
                <img src={image.url} alt={image.alt_text || productName} className="h-full w-full object-cover" />
                <div className="absolute left-2 top-2 flex gap-1">
                  {image.is_primary && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Principal</Badge>}
                  {image.pending && <Badge variant="secondary">Pendente</Badge>}
                </div>
              </div>
              <div className="p-2 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Mover para cima"
                    className="h-8 w-8"
                    disabled={index === 0 || isBusy}
                    onClick={() => isPersistedProduct ? moveServerImage(image.id, -1) : movePendingImage(image.id, -1)}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Mover para baixo"
                    className="h-8 w-8"
                    disabled={index === galleryItems.length - 1 || isBusy}
                    onClick={() => isPersistedProduct ? moveServerImage(image.id, 1) : movePendingImage(image.id, 1)}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Definir como principal"
                    className={`h-8 w-8 ${image.is_primary ? "text-amber-600" : ""}`}
                    disabled={image.is_primary || isBusy}
                    onClick={() => isPersistedProduct ? primaryMutation.mutate(image.id) : setPendingPrimary(image.id)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remover imagem"
                    className="h-8 w-8 text-red-600"
                    disabled={isBusy}
                    onClick={() => isPersistedProduct ? deleteMutation.mutate(image.id) : removePendingImage(image.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
