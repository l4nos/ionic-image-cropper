import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { GestureController } from '@ionic/angular';

@Component({
  selector: 'app-image-cropper',
  templateUrl: './image-cropper.component.html',
  styleUrls: ['./image-cropper.component.scss'],
})
export class ImageCropperComponent {
  @Input() imageUrl: string = '';
  @Input() forceSquare: boolean = false;
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

  private currentHandle = '';
  private imageRect: DOMRect | null = null;
  private imageBounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };

  constructor(private gestureCtrl: GestureController) {}

  ngAfterViewInit() {
    if (!this.cropperImage?.nativeElement) return;

    this.cropperImage.nativeElement.onload = () => {
      setTimeout(() => this.initializeCropper(), 100);
    };
  }

  private initializeCropper() {
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    this.imageRect = this.cropperImage.nativeElement.getBoundingClientRect();
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();

    // Calculate actual image bounds within wrapper
    const imageAspect = this.imageRect.width / this.imageRect.height;
    const wrapperAspect = wrapperRect.width / wrapperRect.height;

    if (imageAspect > wrapperAspect) {
      // Image is wider than wrapper
      this.imageBounds.width = 100;
      this.imageBounds.height = (wrapperRect.width / imageAspect) / wrapperRect.height * 100;
      this.imageBounds.left = 0;
      this.imageBounds.top = (100 - this.imageBounds.height) / 2;
    } else {
      // Image is taller than wrapper
      this.imageBounds.height = 100;
      this.imageBounds.width = (wrapperRect.height * imageAspect) / wrapperRect.width * 100;
      this.imageBounds.top = 0;
      this.imageBounds.left = (100 - this.imageBounds.width) / 2;
    }

    // Initialize crop box within image bounds
    const size = Math.min(this.imageBounds.width, this.imageBounds.height) * 0.6;
    this.cropBox = {
      width: size,
      height: size,
      left: this.imageBounds.left + (this.imageBounds.width - size) / 2,
      top: this.imageBounds.top + (this.imageBounds.height - size) / 2
    };

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

    this.imageRect = this.cropperImage.nativeElement.getBoundingClientRect();
    const touch = ev.event.touches[0];
    const target = ev.event.target as HTMLElement;

    this.startPoint = {
      x: touch.clientX,
      y: touch.clientY,
      boxLeft: this.cropBox.left,
      boxTop: this.cropBox.top,
      boxWidth: this.cropBox.width,
      boxHeight: this.cropBox.height
    };

    this.currentHandle = target.classList.contains('resize-handle') ? 
      target.dataset['handle'] || '' : '';
  }

  private onGestureMove(ev: any) {
    if (!this.imageRect || !this.imageWrapper?.nativeElement) return;

    const touch = ev.event.touches[0];
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();
    
    if (this.currentHandle) {
      this.handleResize(touch, wrapperRect);
    } else {
      this.handleDrag(touch, wrapperRect);
    }

    this.updateCropBox();
  }

  private handleDrag(touch: Touch, wrapperRect: DOMRect) {
    const deltaXPercent = ((touch.clientX - this.startPoint.x) / wrapperRect.width) * 100;
    const deltaYPercent = ((touch.clientY - this.startPoint.y) / wrapperRect.height) * 100;

    let newLeft = this.startPoint.boxLeft + deltaXPercent;
    let newTop = this.startPoint.boxTop + deltaYPercent;

    // Constrain to image bounds
    newLeft = Math.max(
      this.imageBounds.left,
      Math.min(newLeft, this.imageBounds.left + this.imageBounds.width - this.cropBox.width)
    );
    newTop = Math.max(
      this.imageBounds.top,
      Math.min(newTop, this.imageBounds.top + this.imageBounds.height - this.cropBox.height)
    );

    this.cropBox.left = newLeft;
    this.cropBox.top = newTop;
  }

  private handleResize(touch: Touch, wrapperRect: DOMRect) {
    const touchXPercent = (touch.clientX - wrapperRect.left) / wrapperRect.width * 100;
    const touchYPercent = (touch.clientY - wrapperRect.top) / wrapperRect.height * 100;

    const minSize = 10; // Minimum size in percentage
    let newBox = { ...this.cropBox };

    switch (this.currentHandle) {
      case 'nw':
        newBox.width = this.startPoint.boxLeft + this.startPoint.boxWidth - touchXPercent;
        newBox.height = this.startPoint.boxTop + this.startPoint.boxHeight - touchYPercent;
        newBox.left = touchXPercent;
        newBox.top = touchYPercent;
        break;
      case 'ne':
        newBox.width = touchXPercent - this.startPoint.boxLeft;
        newBox.height = this.startPoint.boxTop + this.startPoint.boxHeight - touchYPercent;
        newBox.top = touchYPercent;
        break;
      case 'sw':
        newBox.width = this.startPoint.boxLeft + this.startPoint.boxWidth - touchXPercent;
        newBox.height = touchYPercent - this.startPoint.boxTop;
        newBox.left = touchXPercent;
        break;
      case 'se':
        newBox.width = touchXPercent - this.startPoint.boxLeft;
        newBox.height = touchYPercent - this.startPoint.boxTop;
        break;
    }

    // Enforce minimum size
    newBox.width = Math.max(minSize, newBox.width);
    newBox.height = Math.max(minSize, newBox.height);

    // Enforce square if needed
    if (this.forceSquare) {
      const size = Math.max(newBox.width, newBox.height);
      newBox.width = size;
      newBox.height = size;
    }

    // Constrain to image bounds
    if (newBox.left < this.imageBounds.left) {
      newBox.width += newBox.left - this.imageBounds.left;
      newBox.left = this.imageBounds.left;
    }
    if (newBox.top < this.imageBounds.top) {
      newBox.height += newBox.top - this.imageBounds.top;
      newBox.top = this.imageBounds.top;
    }
    if (newBox.left + newBox.width > this.imageBounds.left + this.imageBounds.width) {
      newBox.width = this.imageBounds.left + this.imageBounds.width - newBox.left;
    }
    if (newBox.top + newBox.height > this.imageBounds.top + this.imageBounds.height) {
      newBox.height = this.imageBounds.top + this.imageBounds.height - newBox.top;
    }

    this.cropBox = newBox;
  }

  private onGestureEnd() {
    this.currentHandle = '';
  }

  private updateCropBox() {
    if (!this.cropArea?.nativeElement) return;
    
    const el = this.cropArea.nativeElement;
    el.style.left = `${this.cropBox.left}%`;
    el.style.top = `${this.cropBox.top}%`;
    el.style.width = `${this.cropBox.width}%`;
    el.style.height = `${this.cropBox.height}%`;
  }

  cropImage() {
    if (!this.cropperImage?.nativeElement || !this.imageRect || !this.imageWrapper?.nativeElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();
    const imageWidth = this.imageRect.width;
    const imageHeight = this.imageRect.height;

    // Calculate the actual crop coordinates relative to the image
    const scaleX = this.cropperImage.nativeElement.naturalWidth / imageWidth;
    const scaleY = this.cropperImage.nativeElement.naturalHeight / imageHeight;

    const cropLeft = ((this.cropBox.left - this.imageBounds.left) / this.imageBounds.width) * imageWidth;
    const cropTop = ((this.cropBox.top - this.imageBounds.top) / this.imageBounds.height) * imageHeight;
    const cropWidth = (this.cropBox.width / this.imageBounds.width) * imageWidth;
    const cropHeight = (this.cropBox.height / this.imageBounds.height) * imageHeight;

    // Set output size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.drawImage(
      this.cropperImage.nativeElement,
      cropLeft * scaleX,
      cropTop * scaleY,
      cropWidth * scaleX,
      cropHeight * scaleY,
      0,
      0,
      cropWidth,
      cropHeight
    );

    this.croppedImage.emit(canvas.toDataURL('image/jpeg', 0.95));
  }
}
