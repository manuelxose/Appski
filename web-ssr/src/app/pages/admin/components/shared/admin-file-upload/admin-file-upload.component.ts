import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";

export type FileUploadType = "image" | "video" | "document" | "any";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  preview?: string;
  error?: string;
}

/**
 * AdminFileUploadComponent
 *
 * Subida de archivos con drag & drop, validación y preview
 *
 * @example
 * <app-admin-file-upload
 *   [acceptedTypes]="'image'"
 *   [maxFileSizeMB]="5"
 *   [multiple]="true"
 *   (filesSelected)="onFilesSelected($event)"
 *   (uploadComplete)="onUploadComplete($event)"
 * />
 */
@Component({
  selector: "app-admin-file-upload",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-file-upload.component.html",
  styleUrl: "./admin-file-upload.component.css",
})
export class AdminFileUploadComponent {
  readonly acceptedTypes = input<FileUploadType>("any");
  readonly maxFileSizeMB = input(10);
  readonly multiple = input(true);
  readonly autoUpload = input(false);

  readonly filesSelected = output<File[]>();
  readonly uploadComplete = output<UploadedFile[]>();

  readonly isDragging = signal(false);
  readonly files = signal<UploadedFile[]>([]);

  readonly totalProgress = computed(() => {
    const fileList = this.files();
    if (fileList.length === 0) return 0;

    const total = fileList.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(total / fileList.length);
  });

  readonly isUploading = computed(() =>
    this.files().some((f) => f.status === "uploading")
  );

  readonly hasPendingFiles = computed(() =>
    this.files().some((f) => f.status === "pending")
  );

  constructor() {
    effect(() => {
      const fileList = this.files();
      const allComplete =
        fileList.length > 0 &&
        fileList.every((f) => f.status === "success" || f.status === "error");

      if (allComplete) {
        this.uploadComplete.emit(fileList);
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);

    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    this.handleFiles(droppedFiles);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files || []);
    this.handleFiles(selectedFiles);
  }

  private handleFiles(fileList: File[]): void {
    const validFiles = fileList.filter((file) => this.validateFile(file));

    if (validFiles.length === 0) return;

    const uploadedFiles: UploadedFile[] = validFiles.map((file) => ({
      id: this.generateId(),
      file,
      progress: 0,
      status: "pending",
    }));

    // Generate previews for images
    uploadedFiles.forEach(async (uploadedFile) => {
      if (uploadedFile.file.type.startsWith("image/")) {
        uploadedFile.preview = await this.generatePreview(uploadedFile.file);
      }
    });

    this.files.update((current) => [...current, ...uploadedFiles]);
    this.filesSelected.emit(validFiles);

    if (this.autoUpload()) {
      this.uploadFiles();
    }
  }

  private validateFile(file: File): boolean {
    // Check file size
    const maxBytes = this.maxFileSizeMB() * 1024 * 1024;
    if (file.size > maxBytes) {
      console.error(`File ${file.name} exceeds ${this.maxFileSizeMB()}MB`);
      return false;
    }

    // Check file type
    const type = this.acceptedTypes();
    if (type === "any") return true;

    const typeMap: Record<FileUploadType, string[]> = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      video: ["video/mp4", "video/webm", "video/ogg"],
      document: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      any: [],
    };

    const acceptedMimeTypes = typeMap[type] || [];
    if (!acceptedMimeTypes.includes(file.type)) {
      console.error(`File ${file.name} type not accepted`);
      return false;
    }

    return true;
  }

  private async generatePreview(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  uploadFiles(): void {
    this.files().forEach((file) => {
      if (file.status === "pending") {
        this.uploadFile(file);
      }
    });
  }

  private uploadFile(uploadedFile: UploadedFile): void {
    uploadedFile.status = "uploading";

    // Simular upload (reemplazar con llamada real HTTP)
    const interval = setInterval(() => {
      uploadedFile.progress += 10;

      if (uploadedFile.progress >= 100) {
        uploadedFile.progress = 100;
        uploadedFile.status = "success";
        clearInterval(interval);
        this.files.set([...this.files()]);
      } else {
        this.files.set([...this.files()]);
      }
    }, 200);
  }

  removeFile(fileId: string): void {
    this.files.update((current) => current.filter((f) => f.id !== fileId));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  getAcceptAttribute(): string {
    const type = this.acceptedTypes();
    const acceptMap: Record<FileUploadType, string> = {
      image: "image/*",
      video: "video/*",
      document: ".pdf,.doc,.docx",
      any: "*/*",
    };
    return acceptMap[type] || "*/*";
  }
}
