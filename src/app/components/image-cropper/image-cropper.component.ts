import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, NgZone } from '@angular/core';
import { GestureController } from '@ionic/angular';
import { ImageCropperService } from '../../services/image-cropper.service';
import { ResizeHandle } from 'src/app/types/ResizeHandle';


@Component({
  selector: 'app-image-cropper',
  templateUrl: './image-cropper.component.html',
  styleUrls: ['./image-cropper.component.scss'],
})
export class ImageCropperComponent {
  @Input() imageUrl: string = '';
  @Input() forceSquare: boolean = true;
  @Output() croppedImage = new EventEmitter<string>();

  @ViewChild('cropperImage') cropperImage!: ElementRef<HTMLImageElement>;
  @ViewChild('cropArea') cropArea!: ElementRef<HTMLDivElement>;
  @ViewChild('imageWrapper') imageWrapper!: ElementRef<HTMLDivElement>;

  private cropBox = {
    left: 20,
    top: 20,
    width: 60,
    height: 60
  };

  private startPoint = {
    x: 0,
    y: 0,
    boxLeft: 0,
    boxTop: 0,
    boxWidth: 0,
    boxHeight: 0
  };

  private currentHandle: ResizeHandle = '';
  private imageRect: DOMRect | null = null;
  private imageBounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };

  private resizeObserver: ResizeObserver;
  private previousWrapperWidth = 0;
  private previousWrapperHeight = 0;

  constructor(
    private gestureCtrl: GestureController,
    private ngZone: NgZone,
    private imageCropperService: ImageCropperService
  ) {
    this.resizeObserver = new ResizeObserver((entries) => {
      this.ngZone.run(() => {
        for (const entry of entries) {
          if (entry.target === this.imageWrapper?.nativeElement) {
            const newWidth = entry.contentRect.width;
            const newHeight = entry.contentRect.height;

            if (newWidth !== this.previousWrapperWidth ||
                newHeight !== this.previousWrapperHeight) {
              this.previousWrapperWidth = newWidth;
              this.previousWrapperHeight = newHeight;
              this.updateCropperOnResize();
            }
          }
        }
      });
    });
  }

  ngAfterViewInit() {
    if (!this.cropperImage?.nativeElement) return;

    this.cropperImage.nativeElement.onload = () => {
      setTimeout(() => this.initializeCropper(), 100);
    };

    if (this.imageWrapper?.nativeElement) {
      this.resizeObserver.observe(this.imageWrapper.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
  }

  private updateCropperOnResize() {
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    const oldImageBounds = { ...this.imageBounds };
    const oldCropBox = { ...this.cropBox };

    this.imageCropperService.updateImageBounds(
      this.cropperImage,
      this.imageWrapper,
      this.imageBounds
    );

    // Calculate relative position within old bounds
    const relativeLeft = (oldCropBox.left - oldImageBounds.left) / oldImageBounds.width;
    const relativeTop = (oldCropBox.top - oldImageBounds.top) / oldImageBounds.height;
    const relativeWidth = oldCropBox.width / oldImageBounds.width;
    const relativeHeight = oldCropBox.height / oldImageBounds.height;

    // Apply relative position to new bounds
    this.cropBox = {
      left: this.imageBounds.left + (relativeLeft * this.imageBounds.width),
      top: this.imageBounds.top + (relativeTop * this.imageBounds.height),
      width: relativeWidth * this.imageBounds.width,
      height: relativeHeight * this.imageBounds.height
    };

    this.updateCropBox();
  }

  private initializeCropper() {
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();
    this.previousWrapperWidth = wrapperRect.width;
    this.previousWrapperHeight = wrapperRect.height;

    this.imageCropperService.updateImageBounds(
      this.cropperImage,
      this.imageWrapper,
      this.imageBounds
    );

    if(this.forceSquare){
      const fixedSize = Math.min(this.imageBounds.height, this.imageBounds.width);
      this.cropBox = {
        width: fixedSize,
        height: fixedSize,
        left: (this.imageBounds.width - fixedSize) / 2,
        top: (this.imageBounds.height - fixedSize) / 2
      };
    }else{
      this.cropBox = {
        width: this.imageBounds.width,
        height: this.imageBounds.height,
        left:0,
        top: 0
      };
    }


    this.setupGestures();
    this.updateCropBox();
  }

  private setupGestures() {
    if (!this.cropArea?.nativeElement) return;

    const gesture = this.gestureCtrl.create({
      el: this.cropArea.nativeElement,
      threshold: 0,
      gestureName: 'crop-gesture',
      onStart: ev => this.onGestureStart(ev),
      onMove: ev => this.onGestureMove(ev),
      onEnd: () => this.onGestureEnd()
    });

    gesture.enable();
  }

  private onGestureStart(ev: any) {
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    this.imageCropperService.updateImageBounds(
      this.cropperImage,
      this.imageWrapper,
      this.imageBounds
    );

    const touch = ev.event.touches[0];
    const target = ev.event.target as HTMLElement;
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();

    // Calculate touch position relative to wrapper
    const touchX = ((touch.clientX - wrapperRect.left));
    const touchY = ((touch.clientY - wrapperRect.top));

    this.startPoint = {
      x: touchX,
      y: touchY,
      boxLeft: this.cropBox.left,
      boxTop: this.cropBox.top,
      boxWidth: this.cropBox.width,
      boxHeight: this.cropBox.height
    };

    this.currentHandle = target.classList.contains('resize-handle') ?
      target.dataset['handle'] as ResizeHandle || '' : '' as ResizeHandle;
  }

  private onGestureMove(ev: any) {
    if (!this.imageWrapper?.nativeElement) return;

    const touch = ev.event.touches[0];
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();

    // Calculate touch position relative to wrapper
    const touchX = ((touch.clientX - wrapperRect.left));
    const touchY = ((touch.clientY - wrapperRect.top));

    if (this.currentHandle) {
      this.imageCropperService.handleResize(
        touchX,
        touchY,
        wrapperRect,
        this.startPoint,
        this.cropBox,
        this.imageBounds,
        this.forceSquare,
        this.currentHandle
      );
    } else {
      this.imageCropperService.handleDrag(
        touchX,
        touchY,
        this.startPoint,
        this.cropBox,
        this.imageBounds
      );
    }

    this.updateCropBox();
  }

  private onGestureEnd() {
    this.currentHandle = '';
  }

  private updateCropBox() {
    if (!this.cropArea?.nativeElement) return;

    const el = this.cropArea.nativeElement;
    el.style.left = `${this.cropBox.left}px`;
    el.style.top = `${this.cropBox.top}px`;
    el.style.width = `${this.cropBox.width}px`;
    el.style.height = `${this.cropBox.height}px`;
  }

  cropImage() {
    const croppedImageData = this.imageCropperService.cropImage(
      this.cropperImage,
      this.imageWrapper,
      this.cropBox
    );

    if (croppedImageData) {
      this.croppedImage.emit(croppedImageData);
    }
  }
}
