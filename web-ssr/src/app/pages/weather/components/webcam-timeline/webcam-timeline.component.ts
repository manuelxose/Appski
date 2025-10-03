import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  WebcamHistory,
  WebcamSnapshot,
  WebcamItem,
} from "../../models/meteo.models";

@Component({
  selector: "app-webcam-timeline",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="webcam-timeline">
      <div class="header-container">
        <div class="header-left">
          <h2 class="section-title">
            <span class="title-icon">📸</span>
            Histórico de {{ history()?.webcamName || "Webcam" }}
          </h2>
          <div class="snapshots-badge">{{ totalSnapshots() }} imágenes</div>
        </div>
        <div class="header-right">
          @if (availableWebcams() && availableWebcams().length > 0) {
          <div class="webcam-selector">
            <label for="webcam-picker" class="webcam-label">
              <span class="webcam-icon">📹</span>
              Cámara:
            </label>
            <select
              id="webcam-picker"
              class="webcam-select"
              [value]="currentWebcamId()"
              (change)="onWebcamChange($event)"
            >
              @for (webcam of availableWebcams(); track webcam.id) {
              <option [value]="webcam.id">{{ webcam.name }}</option>
              }
            </select>
          </div>
          }
          <div class="date-selector">
            <label for="date-picker" class="date-label">
              <span class="date-icon">📅</span>
              Fecha:
            </label>
            <input
              type="date"
              id="date-picker"
              class="date-input"
              [value]="selectedDate()"
              (change)="onDateChange($event)"
              [max]="maxDate"
            />
          </div>
        </div>
      </div>

      @if (history(); as hist) {
      <div class="timeline-container">
        <!-- Main Image Display -->
        <div class="image-viewer">
          @if (currentSnapshot(); as snapshot) {
          <div class="image-wrapper">
            <img
              [src]="snapshot.imageUrl"
              [alt]="'Snapshot ' + formatDateTime(snapshot.timestamp)"
              class="snapshot-image"
            />
            <div class="image-overlay">
              <div class="timestamp-badge">
                {{ formatDateTime(snapshot.timestamp) }}
              </div>
              @if (snapshot.conditions) {
              <div class="conditions-overlay">
                @if (snapshot.conditions.tempC !== undefined) {
                <div class="condition-item">
                  <span class="condition-icon">🌡️</span>
                  <span class="condition-value"
                    >{{ snapshot.conditions.tempC }}°C</span
                  >
                </div>
                } @if (snapshot.conditions.snowCm !== undefined) {
                <div class="condition-item">
                  <span class="condition-icon">❄️</span>
                  <span class="condition-value"
                    >{{ snapshot.conditions.snowCm }} cm</span
                  >
                </div>
                } @if (snapshot.conditions.visibility) {
                <div class="condition-item">
                  <span class="condition-icon">👁️</span>
                  <span class="condition-value">{{
                    getVisibilityLabel(snapshot.conditions.visibility)
                  }}</span>
                </div>
                }
              </div>
              }
            </div>
          </div>
          }
        </div>

        <!-- Timeline Controls -->
        <div class="timeline-controls">
          <!-- Play/Pause Button -->
          <button
            class="control-button play-button"
            (click)="togglePlayback()"
            [class.playing]="isPlaying()"
          >
            <span class="control-icon">{{ isPlaying() ? "⏸️" : "▶️" }}</span>
          </button>

          <!-- Timeline Scrubber -->
          <div class="timeline-scrubber">
            <div class="timeline-track">
              <!-- Progress Bar -->
              <div
                class="timeline-progress"
                [style.width.%]="progressPercent()"
              ></div>

              <!-- Snapshot Markers -->
              @for (snapshot of hist.snapshots; track snapshot.id; let idx =
              $index) {
              <button
                class="timeline-marker"
                [class.active]="currentIndex() === idx"
                [style.left.%]="getMarkerPosition(idx)"
                (click)="goToSnapshot(idx)"
                [title]="formatDateTime(snapshot.timestamp)"
              >
                <span class="marker-dot"></span>
              </button>
              }

              <!-- Draggable Handle -->
              <input
                type="range"
                class="timeline-slider"
                [min]="0"
                [max]="totalSnapshots() - 1"
                [value]="currentIndex()"
                (input)="onSliderChange($event)"
              />
            </div>

            <!-- Time Labels -->
            <div class="timeline-labels">
              <span class="time-label start">{{
                formatDate(hist.dateRange.from)
              }}</span>
              <span class="time-label current">{{
                formatDate(currentSnapshot()?.timestamp || "")
              }}</span>
              <span class="time-label end">{{
                formatDate(hist.dateRange.to)
              }}</span>
            </div>
          </div>

          <!-- Speed Control -->
          <div class="speed-control">
            <button
              class="control-button"
              (click)="decreaseSpeed()"
              [disabled]="playbackSpeed() <= 0.5"
            >
              <span class="control-icon">🐢</span>
            </button>
            <span class="speed-label">{{ playbackSpeed() }}x</span>
            <button
              class="control-button"
              (click)="increaseSpeed()"
              [disabled]="playbackSpeed() >= 4"
            >
              <span class="control-icon">🐇</span>
            </button>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="navigation-controls">
          <button
            class="nav-button"
            (click)="previousSnapshot()"
            [disabled]="currentIndex() === 0"
          >
            <span class="nav-icon">⏮️</span>
            <span class="nav-label">Anterior</span>
          </button>

          <div class="snapshot-counter">
            {{ currentIndex() + 1 }} / {{ totalSnapshots() }}
          </div>

          <button
            class="nav-button"
            (click)="nextSnapshot()"
            [disabled]="currentIndex() === totalSnapshots() - 1"
          >
            <span class="nav-label">Siguiente</span>
            <span class="nav-icon">⏭️</span>
          </button>
        </div>

        <!-- Thumbnail Strip -->
        <div class="thumbnail-strip">
          <div class="thumbnails-wrapper">
            @for (snapshot of visibleThumbnails(); track snapshot.id; let idx =
            $index) {
            <button
              class="thumbnail"
              [class.active]="getThumbnailIndex(idx) === currentIndex()"
              (click)="goToSnapshot(getThumbnailIndex(idx))"
            >
              <img
                [src]="snapshot.imageUrl"
                [alt]="'Thumbnail ' + formatTime(snapshot.timestamp)"
                class="thumbnail-image"
              />
              <div class="thumbnail-label">
                {{ formatTime(snapshot.timestamp) }}
              </div>
            </button>
            }
          </div>

          <!-- Thumbnail Navigation -->
          @if (totalSnapshots() > maxVisibleThumbnails) {
          <div class="thumbnail-nav">
            <button
              class="thumb-nav-button"
              (click)="scrollThumbnailsLeft()"
              [disabled]="thumbnailOffset() === 0"
            >
              ◀
            </button>
            <button
              class="thumb-nav-button"
              (click)="scrollThumbnailsRight()"
              [disabled]="
                thumbnailOffset() >= totalSnapshots() - maxVisibleThumbnails
              "
            >
              ▶
            </button>
          </div>
          }
        </div>
      </div>
      } @else {
      <div class="empty-state">
        <div class="empty-icon">📸</div>
        <p class="empty-message">No hay imágenes históricas disponibles</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .webcam-timeline {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      /* Header */
      .header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .section-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
        display: flex;
        align-items: center;
      }

      .title-icon {
        font-size: 2rem;
        margin-right: 0.5rem;
        display: inline-block;
      }

      .snapshots-badge {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        color: white;
        padding: 0.375rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Webcam Selector */
      .webcam-selector {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--primary-50);
        border: 2px solid var(--primary-200);
        border-radius: 12px;
        transition: all 0.2s ease;
      }

      .webcam-selector:focus-within {
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.1);
      }

      .webcam-label {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--primary-700);
        cursor: pointer;
        white-space: nowrap;
      }

      .webcam-icon {
        font-size: 1.25rem;
      }

      .webcam-select {
        border: none;
        background: transparent;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--primary-900);
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        transition: background 0.2s ease;
      }

      .webcam-select:hover {
        background: white;
      }

      .webcam-select:focus {
        outline: none;
        background: white;
      }

      /* Date Selector */
      .date-selector {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--neutral-50);
        border: 2px solid var(--neutral-200);
        border-radius: 12px;
        transition: all 0.2s ease;
      }

      .date-selector:focus-within {
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.1);
      }

      .date-label {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--neutral-700);
        cursor: pointer;
        white-space: nowrap;
      }

      .date-icon {
        font-size: 1.25rem;
      }

      .date-input {
        border: none;
        background: transparent;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--neutral-900);
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        transition: background 0.2s ease;
      }

      .date-input:hover {
        background: white;
      }

      .date-input:focus {
        outline: none;
        background: white;
      }

      .date-input::-webkit-calendar-picker-indicator {
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }

      .date-input::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
      }

      /* Image Viewer */
      .image-viewer {
        position: relative;
        width: 100%;
        aspect-ratio: 2.5 / 1;
        max-height: 400px;
        background: var(--neutral-900);
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 1.5rem;
      }

      .image-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .snapshot-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.6) 0%,
          transparent 30%,
          transparent 70%,
          rgba(0, 0, 0, 0.6) 100%
        );
        pointer-events: none;
      }

      .timestamp-badge {
        position: absolute;
        top: 1rem;
        left: 1rem;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .conditions-overlay {
        position: absolute;
        bottom: 1rem;
        left: 1rem;
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .condition-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        padding: 0.375rem 0.75rem;
        border-radius: 8px;
        color: white;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .condition-icon {
        font-size: 1.25rem;
      }

      /* Timeline Controls */
      .timeline-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .control-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: white;
        border: 2px solid var(--neutral-200);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .control-button:hover:not(:disabled) {
        background: var(--primary-50);
        border-color: var(--primary-400);
        transform: scale(1.1);
      }

      .control-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .control-button.playing {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        border-color: var(--primary-600);
      }

      .control-button.playing .control-icon {
        filter: brightness(0) invert(1);
      }

      .control-icon {
        font-size: 1.5rem;
        line-height: 1;
      }

      /* Timeline Scrubber */
      .timeline-scrubber {
        flex: 1;
        min-width: 0;
      }

      .timeline-track {
        position: relative;
        height: 48px;
        background: var(--neutral-100);
        border-radius: 24px;
        margin-bottom: 0.5rem;
        cursor: pointer;
      }

      .timeline-progress {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(
          90deg,
          var(--primary-400),
          var(--primary-500)
        );
        border-radius: 24px;
        transition: width 0.3s ease;
        pointer-events: none;
      }

      .timeline-marker {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: white;
        border: 3px solid var(--neutral-400);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 2;
        padding: 0;
      }

      .timeline-marker:hover {
        transform: translate(-50%, -50%) scale(1.3);
        border-color: var(--primary-500);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .timeline-marker.active {
        background: var(--primary-500);
        border-color: var(--primary-600);
        transform: translate(-50%, -50%) scale(1.4);
        box-shadow: 0 4px 16px rgba(var(--primary-500-rgb), 0.4);
      }

      .marker-dot {
        display: none;
      }

      .timeline-slider {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 3;
      }

      /* Timeline Labels */
      .timeline-labels {
        display: flex;
        justify-content: space-between;
        padding: 0 0.5rem;
      }

      .time-label {
        font-size: 0.75rem;
        color: var(--neutral-600);
        font-weight: 600;
      }

      .time-label.current {
        color: var(--primary-600);
        font-weight: 700;
      }

      /* Speed Control */
      .speed-control {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .speed-control .control-button {
        width: 40px;
        height: 40px;
      }

      .speed-control .control-icon {
        font-size: 1.25rem;
      }

      .speed-label {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--neutral-700);
        min-width: 40px;
        text-align: center;
      }

      /* Navigation Controls */
      .navigation-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 0 1rem;
      }

      .nav-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: white;
        border: 2px solid var(--neutral-200);
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nav-button:hover:not(:disabled) {
        background: var(--primary-50);
        border-color: var(--primary-400);
        color: var(--primary-700);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .nav-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .nav-icon {
        font-size: 1.25rem;
        line-height: 1;
      }

      .snapshot-counter {
        font-size: 1rem;
        font-weight: 700;
        color: var(--neutral-700);
      }

      /* Thumbnail Strip */
      .thumbnail-strip {
        position: relative;
      }

      .thumbnails-wrapper {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding: 0.5rem 0;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: var(--primary-400) var(--neutral-100);
      }

      .thumbnails-wrapper::-webkit-scrollbar {
        height: 6px;
      }

      .thumbnails-wrapper::-webkit-scrollbar-track {
        background: var(--neutral-100);
        border-radius: 3px;
      }

      .thumbnails-wrapper::-webkit-scrollbar-thumb {
        background: var(--primary-400);
        border-radius: 3px;
      }

      .thumbnail {
        position: relative;
        flex-shrink: 0;
        width: 120px;
        background: var(--neutral-100);
        border: 3px solid transparent;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
      }

      .thumbnail:hover {
        border-color: var(--primary-400);
        transform: translateY(-4px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }

      .thumbnail.active {
        border-color: var(--primary-600);
        box-shadow: 0 8px 20px rgba(var(--primary-500-rgb), 0.3);
      }

      .thumbnail-image {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        display: block;
      }

      .thumbnail-label {
        padding: 0.375rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--neutral-700);
        text-align: center;
        background: white;
      }

      .thumbnail-nav {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        transform: translateY(-50%);
        display: flex;
        justify-content: space-between;
        pointer-events: none;
        padding: 0 0.5rem;
      }

      .thumb-nav-button {
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid var(--neutral-300);
        border-radius: 50%;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        pointer-events: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .thumb-nav-button:hover:not(:disabled) {
        background: var(--primary-500);
        border-color: var(--primary-600);
        color: white;
        transform: scale(1.1);
      }

      .thumb-nav-button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
      }

      .empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .empty-message {
        font-size: 1.125rem;
        color: var(--neutral-600);
        margin: 0;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .webcam-timeline {
          padding: 1rem;
        }

        .section-title {
          font-size: 1.25rem;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .timeline-controls {
          flex-wrap: wrap;
        }

        .speed-control {
          order: 3;
          width: 100%;
          justify-content: center;
        }

        .nav-label {
          display: none;
        }

        .thumbnail {
          width: 100px;
        }

        .condition-item {
          font-size: 0.75rem;
        }

        .header-container {
          flex-direction: column;
          align-items: stretch;
        }

        .header-left {
          width: 100%;
          justify-content: space-between;
        }

        .header-right {
          width: 100%;
        }

        .date-selector {
          width: 100%;
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class WebcamTimelineComponent implements OnDestroy {
  readonly history = input<WebcamHistory | null>(null);
  readonly availableWebcams = input<WebcamItem[]>([]);
  readonly dateChange = output<string>();
  readonly webcamChange = output<string>();

  readonly currentWebcamId = computed(() => this.history()?.webcamId || "");
  readonly currentIndex = signal(0);
  readonly isPlaying = signal(false);
  readonly playbackSpeed = signal(1);
  readonly thumbnailOffset = signal(0);
  readonly selectedDate = signal(this.getTodayDate());
  readonly maxVisibleThumbnails = 8;
  readonly maxDate = this.getTodayDate();

  private playbackInterval: ReturnType<typeof setInterval> | null = null;

  readonly totalSnapshots = computed(() => {
    return this.history()?.snapshots.length || 0;
  });

  readonly currentSnapshot = computed<WebcamSnapshot | null>(() => {
    const hist = this.history();
    if (!hist || hist.snapshots.length === 0) return null;
    return hist.snapshots[this.currentIndex()] || null;
  });

  readonly progressPercent = computed(() => {
    const total = this.totalSnapshots();
    if (total <= 1) return 0;
    return (this.currentIndex() / (total - 1)) * 100;
  });

  readonly visibleThumbnails = computed(() => {
    const hist = this.history();
    if (!hist) return [];
    const offset = this.thumbnailOffset();
    return hist.snapshots.slice(offset, offset + this.maxVisibleThumbnails);
  });

  constructor() {
    // Auto-stop playback when reaching the end
    effect(() => {
      if (
        this.currentIndex() >= this.totalSnapshots() - 1 &&
        this.isPlaying()
      ) {
        this.stopPlayback();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPlayback();
  }

  togglePlayback(): void {
    if (this.isPlaying()) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback(): void {
    if (this.currentIndex() >= this.totalSnapshots() - 1) {
      this.currentIndex.set(0);
    }

    this.isPlaying.set(true);
    const interval = 1000 / this.playbackSpeed();

    this.playbackInterval = setInterval(() => {
      if (this.currentIndex() < this.totalSnapshots() - 1) {
        this.nextSnapshot();
      } else {
        this.stopPlayback();
      }
    }, interval);
  }

  stopPlayback(): void {
    this.isPlaying.set(false);
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  increaseSpeed(): void {
    const currentSpeed = this.playbackSpeed();
    if (currentSpeed < 4) {
      this.playbackSpeed.set(currentSpeed * 2);
      if (this.isPlaying()) {
        this.stopPlayback();
        this.startPlayback();
      }
    }
  }

  decreaseSpeed(): void {
    const currentSpeed = this.playbackSpeed();
    if (currentSpeed > 0.5) {
      this.playbackSpeed.set(currentSpeed / 2);
      if (this.isPlaying()) {
        this.stopPlayback();
        this.startPlayback();
      }
    }
  }

  nextSnapshot(): void {
    if (this.currentIndex() < this.totalSnapshots() - 1) {
      this.currentIndex.update((i) => i + 1);
      this.ensureThumbnailVisible();
    }
  }

  previousSnapshot(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
      this.ensureThumbnailVisible();
    }
  }

  goToSnapshot(index: number): void {
    this.currentIndex.set(index);
    this.ensureThumbnailVisible();
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentIndex.set(parseInt(input.value, 10));
    this.ensureThumbnailVisible();
  }

  getMarkerPosition(index: number): number {
    const total = this.totalSnapshots();
    if (total <= 1) return 0;
    return (index / (total - 1)) * 100;
  }

  getThumbnailIndex(visibleIndex: number): number {
    return this.thumbnailOffset() + visibleIndex;
  }

  scrollThumbnailsLeft(): void {
    this.thumbnailOffset.update((offset) => Math.max(0, offset - 1));
  }

  scrollThumbnailsRight(): void {
    const maxOffset = this.totalSnapshots() - this.maxVisibleThumbnails;
    this.thumbnailOffset.update((offset) => Math.min(maxOffset, offset + 1));
  }

  private ensureThumbnailVisible(): void {
    const currentIdx = this.currentIndex();
    const offset = this.thumbnailOffset();

    if (currentIdx < offset) {
      this.thumbnailOffset.set(currentIdx);
    } else if (currentIdx >= offset + this.maxVisibleThumbnails) {
      this.thumbnailOffset.set(currentIdx - this.maxVisibleThumbnails + 1);
    }
  }

  formatDateTime(iso: string): string {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatDate(iso: string): string {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  }

  formatTime(iso: string): string {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getVisibilityLabel(visibility: string): string {
    const labels: Record<string, string> = {
      excellent: "Excelente",
      good: "Buena",
      moderate: "Moderada",
      poor: "Pobre",
    };
    return labels[visibility] || visibility;
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newDate = input.value;
    this.selectedDate.set(newDate);

    // Emitir evento al componente padre para que cargue el histórico de esa fecha
    this.dateChange.emit(newDate);
  }

  onWebcamChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const webcamId = select.value;

    // Emitir evento al componente padre para que cargue el histórico de esa cámara
    this.webcamChange.emit(webcamId);
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Formato YYYY-MM-DD
  }
}
