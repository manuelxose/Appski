/**
 * Content & Media Management Models
 * Interfaces para galería de medios, webcams y mapas de pistas
 */

// ============================================
// MEDIA LIBRARY
// ============================================

export type MediaType = "image" | "video" | "document" | "audio";
export type ImageFormat = "jpeg" | "png" | "gif" | "webp" | "avif" | "svg";
export type MediaUsage =
  | "station"
  | "lodging"
  | "shop"
  | "blog"
  | "user"
  | "branding"
  | "other";
export type MediaStatus = "processing" | "ready" | "failed" | "archived";

export interface Media {
  id: string;
  filename: string;
  originalFilename: string;
  title?: string;
  description?: string;
  altText?: string;

  // Type and format
  type: MediaType;
  mimeType: string;
  format?: ImageFormat;

  // URLs
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;

  // Dimensions (for images/videos)
  width?: number;
  height?: number;
  aspectRatio?: string; // e.g., "16:9"

  // File info
  size: number; // Bytes
  hash: string; // MD5 or SHA256 for deduplication

  // Variants (for images)
  variants?: MediaVariant[];

  // Organization
  folderId?: string;
  folderPath?: string;
  tags: string[];
  usage: MediaUsage;

  // Related entities
  relatedEntityType?: string; // 'station', 'blog_post', etc.
  relatedEntityId?: string;

  // Ownership
  uploadedBy: string;
  uploadedByName: string;

  // Status
  status: MediaStatus;
  processingProgress?: number; // 0-100

  // Metadata
  exif?: ExifData;
  blurhash?: string; // For progressive loading
  dominantColor?: string; // Hex color

  // Usage tracking
  downloads: number;
  views: number;
  lastAccessedAt?: string;

  // Lifecycle
  uploadedAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface MediaVariant {
  name: string; // 'thumbnail', 'small', 'medium', 'large', 'original'
  url: string;
  width: number;
  height: number;
  size: number;
  format: ImageFormat;
}

export interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  dateTaken?: string;
  iso?: number;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  orientation?: number;
}

export interface MediaFolder {
  id: string;
  name: string;
  description?: string;

  // Hierarchy
  parentId?: string;
  path: string; // Full path like "/stations/baqueira-beret"

  // Contents
  mediaCount: number;
  totalSize: number; // Bytes

  // Permissions
  isPublic: boolean;
  allowedUserIds?: string[];

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFilters {
  type?: MediaType[];
  format?: ImageFormat[];
  usage?: MediaUsage[];
  folderId?: string;
  tags?: string[];
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  minSize?: number;
  maxSize?: number;
  search?: string;
}

export interface MediaUploadRequest {
  file: File;
  title?: string;
  description?: string;
  altText?: string;
  folderId?: string;
  tags?: string[];
  usage: MediaUsage;
  relatedEntityType?: string;
  relatedEntityId?: string;

  // Processing options
  generateThumbnail?: boolean;
  generateVariants?: boolean;
  variantSizes?: number[]; // Widths for variants
  optimizeForWeb?: boolean;
  convertToWebP?: boolean;
}

export interface MediaUploadResponse {
  media: Media;
  uploadedSize: number;
  processingTime: number; // Milliseconds
  variantsCreated: number;
}

export interface MediaStats {
  totalCount: number;
  totalSize: number; // Bytes
  totalSizeMB: number;
  totalSizeGB: number;

  // By type
  byType: { type: MediaType; count: number; size: number }[];

  // By usage
  byUsage: { usage: MediaUsage; count: number; size: number }[];

  // By format
  byFormat: { format: string; count: number; size: number }[];

  // Storage
  storageUsed: number; // Bytes
  storageLimit: number;
  storagePercentage: number;

  // Traffic
  totalDownloads: number;
  totalViews: number;
  bandwidthUsed: number; // Bytes

  // Top items
  mostViewed: Media[];
  mostDownloaded: Media[];
  largestFiles: Media[];
  recentUploads: Media[];
}

// ============================================
// WEBCAMS
// ============================================

export type WebcamStatus = "online" | "offline" | "maintenance";
export type WebcamType = "streaming" | "snapshot" | "timelapse";
export type WebcamQuality = "low" | "medium" | "high" | "4k";

export interface Webcam {
  id: string;
  name: string;
  description?: string;

  // Location
  stationId: string;
  stationName: string;
  location: WebcamLocation;

  // Type and quality
  type: WebcamType;
  quality: WebcamQuality;
  status: WebcamStatus;

  // URLs
  streamUrl?: string; // For streaming webcams
  snapshotUrl?: string; // For snapshot webcams
  thumbnailUrl?: string;
  embedUrl?: string; // For iframe embedding

  // Configuration
  refreshIntervalSeconds?: number; // For snapshots
  captureIntervalMinutes?: number; // For timelapse

  // Snapshots
  latestSnapshot?: WebcamSnapshot;
  snapshotHistory: WebcamSnapshot[];
  snapshotRetentionDays: number;

  // Metadata
  altitude?: number; // Meters
  direction?: string; // 'north', 'south', 'panoramic', etc.
  viewDescription?: string; // What you can see

  // Features
  hasPanTilt: boolean;
  hasZoom: boolean;
  hasNightVision: boolean;

  // Display
  isPublic: boolean;
  isFeatured: boolean;
  displayOrder: number;

  // Stats
  viewCount: number;
  lastViewedAt?: string;

  // Health
  lastOnlineAt?: string;
  uptimePercentage: number;

  // Lifecycle
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WebcamLocation {
  latitude: number;
  longitude: number;
  altitude?: number; // Meters above sea level
  zone?: string; // 'base', 'mid-station', 'summit', etc.
  buildingName?: string;
}

export interface WebcamSnapshot {
  id: string;
  webcamId: string;

  // Image
  imageUrl: string;
  thumbnailUrl: string;

  // Metadata
  capturedAt: string;
  width: number;
  height: number;
  size: number; // Bytes

  // Weather conditions (if available)
  temperature?: number;
  conditions?: string; // 'sunny', 'cloudy', 'snowing', etc.
  visibility?: string; // 'excellent', 'good', 'poor'

  // Storage
  isArchived: boolean;
  expiresAt?: string;
}

export interface WebcamTimelapse {
  id: string;
  webcamId: string;
  webcamName: string;

  // Period
  startDate: string;
  endDate: string;
  duration: number; // Seconds of video

  // Video
  videoUrl: string;
  thumbnailUrl: string;

  // Settings
  fps: number; // Frames per second
  resolution: string; // e.g., "1920x1080"

  // Stats
  frameCount: number;
  fileSize: number; // Bytes

  // Status
  status: "processing" | "ready" | "failed";
  progress?: number; // 0-100

  // Metadata
  createdAt: string;
  processedAt?: string;
}

export interface WebcamStats {
  totalWebcams: number;
  onlineWebcams: number;
  offlineWebcams: number;

  // By station
  byStation: { stationId: string; stationName: string; count: number }[];

  // By type
  byType: { type: WebcamType; count: number }[];

  // Performance
  averageUptime: number; // Percentage
  totalSnapshots: number;
  totalTimelapses: number;

  // Storage
  storageUsed: number; // Bytes
  oldestSnapshot: string; // Date
  newestSnapshot: string; // Date

  // Most viewed
  mostViewedWebcams: Webcam[];
}

// ============================================
// STATION MAPS
// ============================================

export type MapType = "piste_map" | "trail_map" | "resort_map" | "area_map";
export type MapFormat = "svg" | "png" | "jpg" | "pdf";
export type MapMarkerType =
  | "piste"
  | "lift"
  | "restaurant"
  | "shop"
  | "parking"
  | "first_aid"
  | "restroom"
  | "point_of_interest";

export interface StationMap {
  id: string;
  stationId: string;
  stationName: string;

  // Map details
  name: string;
  description?: string;
  type: MapType;

  // Files
  fileUrl: string;
  format: MapFormat;
  thumbnailUrl?: string;

  // Dimensions
  width: number;
  height: number;
  size: number; // Bytes

  // Interactive features
  isInteractive: boolean;
  markers?: MapMarker[];
  layers?: MapLayer[];

  // Coordinates (for geo-referencing)
  bounds?: MapBounds;

  // Versions
  version: string; // e.g., "2024-25"
  previousVersionId?: string;

  // Display
  isPublic: boolean;
  isPrimary: boolean; // Main map for the station
  displayOrder: number;

  // Metadata
  season?: string; // e.g., "2024-2025"
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
}

export interface MapMarker {
  id: string;
  type: MapMarkerType;
  name: string;
  description?: string;

  // Position (relative or absolute)
  x: number; // Percentage or pixels
  y: number;

  // Coordinates (if geo-referenced)
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // Visual
  icon?: string; // Icon name or URL
  color?: string;
  size?: number;

  // Interactivity
  clickable: boolean;
  popupContent?: string;
  linkUrl?: string;

  // Related entity
  entityType?: string; // 'piste', 'lift', 'restaurant', etc.
  entityId?: string;

  // Metadata
  isVisible: boolean;
  displayOrder: number;
}

export interface MapLayer {
  id: string;
  name: string;
  description?: string;

  // Visual
  imageUrl?: string;
  svgContent?: string;

  // Display
  isVisible: boolean;
  opacity: number; // 0-1
  zIndex: number;

  // Toggle
  isToggable: boolean; // Can users show/hide this layer?
  defaultVisible: boolean;
}

export interface MapBounds {
  north: number; // Latitude
  south: number;
  east: number; // Longitude
  west: number;
}

export interface MapEditor {
  id: string;
  mapId: string;

  // Editor state
  zoom: number;
  panX: number;
  panY: number;
  selectedMarkerId?: string;
  selectedLayerId?: string;

  // Tools
  activeTool:
    | "select"
    | "pan"
    | "zoom"
    | "marker"
    | "polygon"
    | "line"
    | "text";

  // History
  undoStack: EditorAction[];
  redoStack: EditorAction[];

  // Changes
  hasUnsavedChanges: boolean;
  lastSavedAt?: string;
}

export interface EditorAction {
  type:
    | "add_marker"
    | "remove_marker"
    | "move_marker"
    | "update_marker"
    | "add_layer"
    | "remove_layer"
    | "reorder_layer";
  data: unknown;
  timestamp: string;
}

export interface MapStats {
  totalMaps: number;
  totalMarkers: number;
  totalLayers: number;

  // By station
  byStation: { stationId: string; stationName: string; mapCount: number }[];

  // By type
  byType: { type: MapType; count: number }[];

  // Storage
  storageUsed: number; // Bytes

  // Most viewed
  mostViewedMaps: StationMap[];
}

// ============================================
// CONTENT MANAGEMENT
// ============================================

export interface ContentVersion {
  id: string;
  entityType: string; // 'map', 'image', 'document', etc.
  entityId: string;
  version: number;

  // Changes
  changes: string; // Description of what changed
  changedBy: string;
  changedByName: string;

  // Data
  data: unknown; // Snapshot of the entity at this version

  // Files
  fileUrl?: string;
  fileSize?: number;

  // Metadata
  createdAt: string;
}

export interface ContentApproval {
  id: string;
  entityType: string;
  entityId: string;

  // Request
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  reason?: string;

  // Review
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewComments?: string;

  // Changes preview
  changes?: unknown;
}

export interface UploadHistory {
  id: string;

  // Upload details
  filename: string;
  fileType: string;
  fileSize: number;

  // Destination
  destinationType: "media" | "webcam" | "map";
  destinationId?: string;

  // User
  uploadedBy: string;
  uploadedByName: string;

  // Status
  status: "processing" | "completed" | "failed";
  progress?: number; // 0-100
  error?: string;

  // Result
  mediaId?: string;
  webcamId?: string;
  mapId?: string;

  // Metadata
  uploadedAt: string;
  completedAt?: string;
  processingTime?: number; // Milliseconds
}
