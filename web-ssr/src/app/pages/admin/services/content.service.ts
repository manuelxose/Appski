/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, signal, computed } from "@angular/core";
import type {
  Media,
  MediaFilters,
  MediaFolder,
  MediaStats,
  MediaUploadRequest,
  MediaUploadResponse,
  Webcam,
  WebcamSnapshot,
  WebcamTimelapse,
  WebcamStats,
  StationMap,
  MapMarker,
  MapLayer,
  MapStats,
  MapFormat,
  ContentVersion,
  ContentApproval,
  UploadHistory,
} from "../models/content.models";

/**
 * Content & Media Management Service
 * Gestión de galería multimedia, webcams, mapas de pistas
 *
 * Features:
 * - Media Library (upload, organize, search, CDN)
 * - Webcam Management (snapshots, streaming, timelapse)
 * - Station Maps (interactive maps, markers, layers)
 * - Version Control & Approval Workflow
 */
@Injectable({
  providedIn: "root",
})
export class ContentService {
  // ============================================
  // STATE: MEDIA LIBRARY
  // ============================================

  private readonly _mediaLibrary = signal<Media[]>([]);
  private readonly _mediaFolders = signal<MediaFolder[]>([]);
  private readonly _selectedMedia = signal<Media | null>(null);
  private readonly _mediaStats = signal<MediaStats | null>(null);

  readonly mediaLibrary = this._mediaLibrary.asReadonly();
  readonly mediaFolders = this._mediaFolders.asReadonly();
  readonly selectedMedia = this._selectedMedia.asReadonly();
  readonly mediaStats = this._mediaStats.asReadonly();

  // Computed: Images only
  readonly images = computed(() =>
    this._mediaLibrary().filter((m) => m.type === "image")
  );

  // Computed: Videos only
  readonly videos = computed(() =>
    this._mediaLibrary().filter((m) => m.type === "video")
  );

  // Computed: Recent uploads (last 7 days)
  readonly recentUploads = computed(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this._mediaLibrary()
      .filter((m) => new Date(m.uploadedAt) >= sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  });

  // Computed: Storage usage
  readonly storageUsage = computed(() => {
    const stats = this._mediaStats();
    if (!stats) return { used: 0, limit: 0, percentage: 0 };
    return {
      used: stats.storageUsed,
      limit: stats.storageLimit,
      percentage: stats.storagePercentage,
    };
  });

  // ============================================
  // STATE: WEBCAMS
  // ============================================

  private readonly _webcams = signal<Webcam[]>([]);
  private readonly _selectedWebcam = signal<Webcam | null>(null);
  private readonly _webcamSnapshots = signal<WebcamSnapshot[]>([]);
  private readonly _webcamTimelapses = signal<WebcamTimelapse[]>([]);
  private readonly _webcamStats = signal<WebcamStats | null>(null);

  readonly webcams = this._webcams.asReadonly();
  readonly selectedWebcam = this._selectedWebcam.asReadonly();
  readonly webcamSnapshots = this._webcamSnapshots.asReadonly();
  readonly webcamTimelapses = this._webcamTimelapses.asReadonly();
  readonly webcamStats = this._webcamStats.asReadonly();

  // Computed: Online webcams
  readonly onlineWebcams = computed(() =>
    this._webcams().filter((w) => w.status === "online")
  );

  // Computed: Featured webcams
  readonly featuredWebcams = computed(() =>
    this._webcams()
      .filter((w) => w.isFeatured && w.isPublic)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  );

  // ============================================
  // STATE: STATION MAPS
  // ============================================

  private readonly _stationMaps = signal<StationMap[]>([]);
  private readonly _selectedMap = signal<StationMap | null>(null);
  private readonly _mapMarkers = signal<MapMarker[]>([]);
  private readonly _mapLayers = signal<MapLayer[]>([]);
  private readonly _mapStats = signal<MapStats | null>(null);

  readonly stationMaps = this._stationMaps.asReadonly();
  readonly selectedMap = this._selectedMap.asReadonly();
  readonly mapMarkers = this._mapMarkers.asReadonly();
  readonly mapLayers = this._mapLayers.asReadonly();
  readonly mapStats = this._mapStats.asReadonly();

  // Computed: Interactive maps
  readonly interactiveMaps = computed(() =>
    this._stationMaps().filter((m) => m.isInteractive)
  );

  // Computed: Primary maps (one per station)
  readonly primaryMaps = computed(() =>
    this._stationMaps().filter((m) => m.isPrimary)
  );

  // ============================================
  // STATE: VERSIONING & APPROVALS
  // ============================================

  private readonly _contentVersions = signal<ContentVersion[]>([]);
  private readonly _pendingApprovals = signal<ContentApproval[]>([]);
  private readonly _uploadHistory = signal<UploadHistory[]>([]);

  readonly contentVersions = this._contentVersions.asReadonly();
  readonly pendingApprovals = this._pendingApprovals.asReadonly();
  readonly uploadHistory = this._uploadHistory.asReadonly();

  // Computed: Recent upload history (last 50)
  readonly recentUploads_history = computed(() =>
    this._uploadHistory().slice(0, 50)
  );

  // Computed: Failed uploads
  readonly failedUploads = computed(() =>
    this._uploadHistory().filter((u) => u.status === "failed")
  );

  // ============================================
  // STATE: UI
  // ============================================

  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================
  // MEDIA LIBRARY: LOAD & SEARCH
  // ============================================

  /**
   * Load media library with optional filters
   */
  async loadMediaLibrary(filters?: MediaFilters): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: In production, send filters to backend
      const response = await fetch("/assets/mocks/admin/media-library.json");
      const data = await response.json();
      this._mediaLibrary.set(data);
    } catch (error) {
      this._error.set("Error al cargar galería de medios");
      console.error("Error loading media library:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load media folders (for organization)
   */
  async loadMediaFolders(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/media-folders.json");
      const data = await response.json();
      this._mediaFolders.set(data);
    } catch (error) {
      console.error("Error loading media folders:", error);
    }
  }

  /**
   * Load media statistics
   */
  async loadMediaStats(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/media-stats.json");
      const data = await response.json();
      this._mediaStats.set(data);
    } catch (error) {
      console.error("Error loading media stats:", error);
    }
  }

  /**
   * Select a media item
   */
  selectMedia(media: Media): void {
    this._selectedMedia.set(media);
  }

  /**
   * Search media by text query
   */
  searchMedia(query: string): Media[] {
    const lowerQuery = query.toLowerCase();
    return this._mediaLibrary().filter(
      (m) =>
        m.title?.toLowerCase().includes(lowerQuery) ||
        m.description?.toLowerCase().includes(lowerQuery) ||
        m.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // ============================================
  // MEDIA LIBRARY: UPLOAD & MANAGEMENT
  // ============================================

  /**
   * Upload new media file
   */
  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
    this._isLoading.set(true);

    try {
      // TODO: In production, upload to CDN/storage service
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newMedia: Media = {
        id: `media-${Date.now()}`,
        filename: `${Date.now()}-${request.file.name}`,
        originalFilename: request.file.name,
        title: request.title,
        description: request.description,
        altText: request.altText,
        type: request.file.type.startsWith("image")
          ? "image"
          : request.file.type.startsWith("video")
          ? "video"
          : "document",
        mimeType: request.file.type,
        url: URL.createObjectURL(request.file),
        size: request.file.size,
        hash: `hash-${Date.now()}`,
        variants: [],
        folderId: request.folderId,
        tags: request.tags || [],
        usage: request.usage,
        relatedEntityType: request.relatedEntityType,
        relatedEntityId: request.relatedEntityId,
        uploadedBy: "current-user-id",
        uploadedByName: "Current User",
        status: "ready",
        downloads: 0,
        views: 0,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to library
      this._mediaLibrary.update((media) => [newMedia, ...media]);

      return {
        media: newMedia,
        uploadedSize: request.file.size,
        processingTime: 2000,
        variantsCreated: 0,
      };
    } catch (error) {
      this._error.set("Error al subir archivo");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update media metadata
   */
  async updateMedia(mediaId: string, updates: Partial<Media>): Promise<void> {
    try {
      // TODO: In production, update via API
      this._mediaLibrary.update((media) =>
        media.map((m) =>
          m.id === mediaId
            ? { ...m, ...updates, updatedAt: new Date().toISOString() }
            : m
        )
      );
    } catch (error) {
      this._error.set("Error al actualizar medio");
      console.error("Error updating media:", error);
    }
  }

  /**
   * Delete media item
   */
  async deleteMedia(mediaId: string): Promise<void> {
    try {
      // TODO: In production, delete from storage and database
      this._mediaLibrary.update((media) =>
        media.filter((m) => m.id !== mediaId)
      );
    } catch (error) {
      this._error.set("Error al eliminar medio");
      console.error("Error deleting media:", error);
    }
  }

  /**
   * Create media folder
   */
  async createFolder(
    name: string,
    parentId?: string,
    description?: string
  ): Promise<MediaFolder> {
    try {
      const newFolder: MediaFolder = {
        id: `folder-${Date.now()}`,
        name,
        description,
        parentId,
        path: parentId ? `parent-path/${name}` : `/${name}`,
        mediaCount: 0,
        totalSize: 0,
        isPublic: false,
        createdBy: "current-user-id",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this._mediaFolders.update((folders) => [...folders, newFolder]);
      return newFolder;
    } catch (error) {
      this._error.set("Error al crear carpeta");
      throw error;
    }
  }

  // ============================================
  // WEBCAMS: LOAD & MANAGEMENT
  // ============================================

  /**
   * Load all webcams
   */
  async loadWebcams(): Promise<void> {
    this._isLoading.set(true);

    try {
      const response = await fetch("/assets/mocks/admin/webcams.json");
      const data = await response.json();
      this._webcams.set(data);
    } catch (error) {
      this._error.set("Error al cargar webcams");
      console.error("Error loading webcams:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load webcam statistics
   */
  async loadWebcamStats(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/webcam-stats.json");
      const data = await response.json();
      this._webcamStats.set(data);
    } catch (error) {
      console.error("Error loading webcam stats:", error);
    }
  }

  /**
   * Select a webcam
   */
  selectWebcam(webcam: Webcam): void {
    this._selectedWebcam.set(webcam);
    this.loadWebcamSnapshots(webcam.id);
  }

  /**
   * Load snapshots for a webcam
   */
  async loadWebcamSnapshots(webcamId: string): Promise<void> {
    try {
      const response = await fetch(
        `/assets/mocks/admin/webcam-${webcamId}-snapshots.json`
      );
      const data = await response.json();
      this._webcamSnapshots.set(data);
    } catch (error) {
      console.error("Error loading webcam snapshots:", error);
    }
  }

  /**
   * Load timelapses for a webcam
   */
  async loadWebcamTimelapses(webcamId: string): Promise<void> {
    try {
      const response = await fetch(
        `/assets/mocks/admin/webcam-${webcamId}-timelapses.json`
      );
      const data = await response.json();
      this._webcamTimelapses.set(data);
    } catch (error) {
      console.error("Error loading webcam timelapses:", error);
    }
  }

  /**
   * Create new webcam
   */
  async createWebcam(
    webcam: Omit<Webcam, "id" | "createdAt" | "updatedAt">
  ): Promise<Webcam> {
    try {
      const newWebcam: Webcam = {
        ...webcam,
        id: `webcam-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this._webcams.update((webcams) => [...webcams, newWebcam]);
      return newWebcam;
    } catch (error) {
      this._error.set("Error al crear webcam");
      throw error;
    }
  }

  /**
   * Update webcam configuration
   */
  async updateWebcam(
    webcamId: string,
    updates: Partial<Webcam>
  ): Promise<void> {
    try {
      this._webcams.update((webcams) =>
        webcams.map((w) =>
          w.id === webcamId
            ? { ...w, ...updates, updatedAt: new Date().toISOString() }
            : w
        )
      );
    } catch (error) {
      this._error.set("Error al actualizar webcam");
      console.error("Error updating webcam:", error);
    }
  }

  /**
   * Delete webcam
   */
  async deleteWebcam(webcamId: string): Promise<void> {
    try {
      this._webcams.update((webcams) =>
        webcams.filter((w) => w.id !== webcamId)
      );
    } catch (error) {
      this._error.set("Error al eliminar webcam");
      console.error("Error deleting webcam:", error);
    }
  }

  /**
   * Capture manual snapshot from webcam
   */
  async captureSnapshot(webcamId: string): Promise<WebcamSnapshot> {
    try {
      // TODO: In production, trigger snapshot capture
      const newSnapshot: WebcamSnapshot = {
        id: `snapshot-${Date.now()}`,
        webcamId,
        imageUrl: "/placeholder-snapshot.jpg",
        thumbnailUrl: "/placeholder-snapshot-thumb.jpg",
        capturedAt: new Date().toISOString(),
        width: 1920,
        height: 1080,
        size: 256000,
        isArchived: false,
      };

      this._webcamSnapshots.update((snapshots) => [newSnapshot, ...snapshots]);
      return newSnapshot;
    } catch (error) {
      this._error.set("Error al capturar snapshot");
      throw error;
    }
  }

  /**
   * Generate timelapse video
   */
  async generateTimelapse(
    webcamId: string,
    startDate: string,
    endDate: string,
    fps: number
  ): Promise<WebcamTimelapse> {
    try {
      // TODO: In production, trigger timelapse generation
      const webcam = this._webcams().find((w) => w.id === webcamId);

      const newTimelapse: WebcamTimelapse = {
        id: `timelapse-${Date.now()}`,
        webcamId,
        webcamName: webcam?.name || "Unknown",
        startDate,
        endDate,
        duration: 60,
        videoUrl: "/placeholder-timelapse.mp4",
        thumbnailUrl: "/placeholder-timelapse-thumb.jpg",
        fps,
        resolution: "1920x1080",
        frameCount: fps * 60,
        fileSize: 10485760,
        status: "processing",
        progress: 0,
        createdAt: new Date().toISOString(),
      };

      this._webcamTimelapses.update((timelapses) => [
        newTimelapse,
        ...timelapses,
      ]);
      return newTimelapse;
    } catch (error) {
      this._error.set("Error al generar timelapse");
      throw error;
    }
  }

  // ============================================
  // STATION MAPS: LOAD & MANAGEMENT
  // ============================================

  /**
   * Load all station maps
   */
  async loadStationMaps(): Promise<void> {
    this._isLoading.set(true);

    try {
      const response = await fetch("/assets/mocks/admin/station-maps.json");
      const data = await response.json();
      this._stationMaps.set(data);
    } catch (error) {
      this._error.set("Error al cargar mapas");
      console.error("Error loading station maps:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load map statistics
   */
  async loadMapStats(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/map-stats.json");
      const data = await response.json();
      this._mapStats.set(data);
    } catch (error) {
      console.error("Error loading map stats:", error);
    }
  }

  /**
   * Select a map
   */
  selectMap(map: StationMap): void {
    this._selectedMap.set(map);
    if (map.markers) {
      this._mapMarkers.set(map.markers);
    }
    if (map.layers) {
      this._mapLayers.set(map.layers);
    }
  }

  /**
   * Upload new station map
   */
  async uploadMap(
    stationId: string,
    file: File,
    metadata: Partial<StationMap>
  ): Promise<StationMap> {
    this._isLoading.set(true);

    try {
      // TODO: In production, upload to storage
      const newMap: StationMap = {
        id: `map-${Date.now()}`,
        stationId,
        stationName: metadata.stationName || "Unknown",
        name: metadata.name || file.name,
        description: metadata.description,
        type: metadata.type || "piste_map",
        fileUrl: URL.createObjectURL(file),
        format: (file.name.split(".").pop() as MapFormat) || "png",
        thumbnailUrl: "",
        width: 2000,
        height: 1500,
        size: file.size,
        isInteractive: metadata.isInteractive || false,
        markers: [],
        layers: [],
        version: metadata.version || "1.0",
        isPublic: metadata.isPublic || false,
        isPrimary: metadata.isPrimary || false,
        displayOrder: metadata.displayOrder || 0,
        season: metadata.season,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: "current-user-id",
      };

      this._stationMaps.update((maps) => [newMap, ...maps]);
      return newMap;
    } catch (error) {
      this._error.set("Error al subir mapa");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update map configuration
   */
  async updateMap(mapId: string, updates: Partial<StationMap>): Promise<void> {
    try {
      this._stationMaps.update((maps) =>
        maps.map((m) =>
          m.id === mapId
            ? { ...m, ...updates, updatedAt: new Date().toISOString() }
            : m
        )
      );
    } catch (error) {
      this._error.set("Error al actualizar mapa");
      console.error("Error updating map:", error);
    }
  }

  /**
   * Delete map
   */
  async deleteMap(mapId: string): Promise<void> {
    try {
      this._stationMaps.update((maps) => maps.filter((m) => m.id !== mapId));
    } catch (error) {
      this._error.set("Error al eliminar mapa");
      console.error("Error deleting map:", error);
    }
  }

  /**
   * Add marker to map
   */
  async addMarker(
    mapId: string,
    marker: Omit<MapMarker, "id">
  ): Promise<MapMarker> {
    try {
      const newMarker: MapMarker = {
        ...marker,
        id: `marker-${Date.now()}`,
      };

      // Add to current markers
      this._mapMarkers.update((markers) => [...markers, newMarker]);

      // Update map
      this._stationMaps.update((maps) =>
        maps.map((m) =>
          m.id === mapId
            ? {
                ...m,
                markers: [...(m.markers || []), newMarker],
                updatedAt: new Date().toISOString(),
              }
            : m
        )
      );

      return newMarker;
    } catch (error) {
      this._error.set("Error al añadir marcador");
      throw error;
    }
  }

  /**
   * Update marker
   */
  async updateMarker(
    markerId: string,
    updates: Partial<MapMarker>
  ): Promise<void> {
    try {
      this._mapMarkers.update((markers) =>
        markers.map((m) => (m.id === markerId ? { ...m, ...updates } : m))
      );
    } catch (error) {
      this._error.set("Error al actualizar marcador");
      console.error("Error updating marker:", error);
    }
  }

  /**
   * Delete marker
   */
  async deleteMarker(markerId: string): Promise<void> {
    try {
      this._mapMarkers.update((markers) =>
        markers.filter((m) => m.id !== markerId)
      );
    } catch (error) {
      this._error.set("Error al eliminar marcador");
      console.error("Error deleting marker:", error);
    }
  }

  /**
   * Add layer to map
   */
  async addLayer(
    mapId: string,
    layer: Omit<MapLayer, "id">
  ): Promise<MapLayer> {
    try {
      const newLayer: MapLayer = {
        ...layer,
        id: `layer-${Date.now()}`,
      };

      this._mapLayers.update((layers) => [...layers, newLayer]);

      this._stationMaps.update((maps) =>
        maps.map((m) =>
          m.id === mapId
            ? {
                ...m,
                layers: [...(m.layers || []), newLayer],
                updatedAt: new Date().toISOString(),
              }
            : m
        )
      );

      return newLayer;
    } catch (error) {
      this._error.set("Error al añadir capa");
      throw error;
    }
  }

  /**
   * Update layer
   */
  async updateLayer(
    layerId: string,
    updates: Partial<MapLayer>
  ): Promise<void> {
    try {
      this._mapLayers.update((layers) =>
        layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
      );
    } catch (error) {
      this._error.set("Error al actualizar capa");
      console.error("Error updating layer:", error);
    }
  }

  /**
   * Delete layer
   */
  async deleteLayer(layerId: string): Promise<void> {
    try {
      this._mapLayers.update((layers) =>
        layers.filter((l) => l.id !== layerId)
      );
    } catch (error) {
      this._error.set("Error al eliminar capa");
      console.error("Error deleting layer:", error);
    }
  }

  // ============================================
  // VERSIONING & APPROVALS
  // ============================================

  /**
   * Load version history for an entity
   */
  async loadVersionHistory(
    entityType: string,
    entityId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `/assets/mocks/admin/versions-${entityType}-${entityId}.json`
      );
      const data = await response.json();
      this._contentVersions.set(data);
    } catch (error) {
      console.error("Error loading version history:", error);
    }
  }

  /**
   * Load pending approvals
   */
  async loadPendingApprovals(): Promise<void> {
    try {
      const response = await fetch(
        "/assets/mocks/admin/pending-approvals.json"
      );
      const data = await response.json();
      this._pendingApprovals.set(data);
    } catch (error) {
      console.error("Error loading pending approvals:", error);
    }
  }

  /**
   * Approve content
   */
  async approveContent(approvalId: string, comments?: string): Promise<void> {
    try {
      this._pendingApprovals.update((approvals) =>
        approvals.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status: "approved",
                reviewedBy: "current-user-id",
                reviewedByName: "Current User",
                reviewedAt: new Date().toISOString(),
                reviewComments: comments,
              }
            : a
        )
      );
    } catch (error) {
      this._error.set("Error al aprobar contenido");
      console.error("Error approving content:", error);
    }
  }

  /**
   * Reject content
   */
  async rejectContent(approvalId: string, reason: string): Promise<void> {
    try {
      this._pendingApprovals.update((approvals) =>
        approvals.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status: "rejected",
                reviewedBy: "current-user-id",
                reviewedByName: "Current User",
                reviewedAt: new Date().toISOString(),
                reviewComments: reason,
              }
            : a
        )
      );
    } catch (error) {
      this._error.set("Error al rechazar contenido");
      console.error("Error rejecting content:", error);
    }
  }

  /**
   * Load upload history
   */
  async loadUploadHistory(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/upload-history.json");
      const data = await response.json();
      this._uploadHistory.set(data);
    } catch (error) {
      console.error("Error loading upload history:", error);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Clear all content data
   */
  clearAll(): void {
    this._mediaLibrary.set([]);
    this._mediaFolders.set([]);
    this._selectedMedia.set(null);
    this._mediaStats.set(null);

    this._webcams.set([]);
    this._selectedWebcam.set(null);
    this._webcamSnapshots.set([]);
    this._webcamTimelapses.set([]);
    this._webcamStats.set(null);

    this._stationMaps.set([]);
    this._selectedMap.set(null);
    this._mapMarkers.set([]);
    this._mapLayers.set([]);
    this._mapStats.set(null);

    this._contentVersions.set([]);
    this._pendingApprovals.set([]);
    this._uploadHistory.set([]);

    this._error.set(null);
  }

  /**
   * Refresh all content data
   */
  async refreshAll(): Promise<void> {
    await Promise.all([
      this.loadMediaLibrary(),
      this.loadMediaFolders(),
      this.loadMediaStats(),
      this.loadWebcams(),
      this.loadWebcamStats(),
      this.loadStationMaps(),
      this.loadMapStats(),
      this.loadPendingApprovals(),
      this.loadUploadHistory(),
    ]);
  }
}
