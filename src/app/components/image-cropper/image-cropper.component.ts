import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, NgZone } from '@angular/core';
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

  private resizeObserver: ResizeObserver;
  private previousWrapperWidth = 0;
  private previousWrapperHeight = 0;

  constructor(
    private gestureCtrl: GestureController,
    private ngZone: NgZone
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

    this.updateImageBounds();

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

  private updateImageBounds() {
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    this.imageRect = this.cropperImage.nativeElement.getBoundingClientRect();
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();

    const imageAspect = this.imageRect.width / this.imageRect.height;
    const wrapperAspect = wrapperRect.width / wrapperRect.height;

    if (imageAspect > wrapperAspect) {
      this.imageBounds.width = 100;
      this.imageBounds.height = (wrapperRect.width / imageAspect) / wrapperRect.height * 100;
      this.imageBounds.left = 0;
      this.imageBounds.top = (100 - this.imageBounds.height) / 2;
    } else {
      this.imageBounds.height = 100;
      this.imageBounds.width = (wrapperRect.height * imageAspect) / wrapperRect.width * 100;
      this.imageBounds.top = 0;
      this.imageBounds.left = (100 - this.imageBounds.width) / 2;
    }
  }

  private initializeCropper() {
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();
    this.previousWrapperWidth = wrapperRect.width;
    this.previousWrapperHeight = wrapperRect.height;

    this.updateImageBounds();

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

    this.updateImageBounds();
    const touch = ev.event.touches[0];
    const target = ev.event.target as HTMLElement;
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();

    // Calculate touch position relative to wrapper
    const touchX = ((touch.clientX - wrapperRect.left) / wrapperRect.width) * 100;
    const touchY = ((touch.clientY - wrapperRect.top) / wrapperRect.height) * 100;

    this.startPoint = {
      x: touchX,
      y: touchY,
      boxLeft: this.cropBox.left,
      boxTop: this.cropBox.top,
      boxWidth: this.cropBox.width,
      boxHeight: this.cropBox.height
    };

    this.currentHandle = target.classList.contains('resize-handle') ? 
      target.dataset['handle'] || '' : '';
  }

  private onGestureMove(ev: any) {
    if (!this.imageWrapper?.nativeElement) return;

    const touch = ev.event.touches[0];
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();
    
    // Calculate touch position relative to wrapper
    const touchX = ((touch.clientX - wrapperRect.left) / wrapperRect.width) * 100;
    const touchY = ((touch.clientY - wrapperRect.top) / wrapperRect.height) * 100;
    
    if (this.currentHandle) {
      this.handleResize(touchX, touchY);
    } else {
      this.handleDrag(touchX, touchY);
    }

    this.updateCropBox();
  }

  private handleDrag(touchX: number, touchY: number) {
    const deltaX = touchX - this.startPoint.x;
    const deltaY = touchY - this.startPoint.y;

    let newLeft = this.startPoint.boxLeft + deltaX;
    let newTop = this.startPoint.boxTop + deltaY;

    // Only apply changes if they don't exceed bounds
    if (newLeft >= this.imageBounds.left && 
        newLeft + this.cropBox.width <= this.imageBounds.left + this.imageBounds.width) {
      this.cropBox.left = newLeft;
    }
    
    if (newTop >= this.imageBounds.top && 
        newTop + this.cropBox.height <= this.imageBounds.top + this.imageBounds.height) {
      this.cropBox.top = newTop;
    }
  }

  private handleResize(touchX: number, touchY: number) {
    const minSize = 10;
    let newLeft = this.cropBox.left;
    let newTop = this.cropBox.top;
    let newWidth = this.cropBox.width;
    let newHeight = this.cropBox.height;

    // Calculate potential new dimensions
    switch (this.currentHandle) {
      case 'nw':
        if (touchX <= newLeft + newWidth - minSize && touchY <= newTop + newHeight - minSize) {
          const widthChange = this.startPoint.boxLeft + this.startPoint.boxWidth - touchX;
          const heightChange = this.startPoint.boxTop + this.startPoint.boxHeight - touchY;
          
          if (this.forceSquare) {
            const change = Math.min(widthChange, heightChange);
            if (touchX >= this.imageBounds.left && 
                touchY >= this.imageBounds.top) {
              newLeft = this.startPoint.boxLeft + this.startPoint.boxWidth - change;
              newTop = this.startPoint.boxTop + this.startPoint.boxHeight - change;
              newWidth = change;
              newHeight = change;
            }
          } else {
            if (touchX >= this.imageBounds.left) {
              newLeft = touchX;
              newWidth = widthChange;
            }
            if (touchY >= this.imageBounds.top) {
              newTop = touchY;
              newHeight = heightChange;
            }
          }
        }
        break;

      case 'ne':
        if (touchX >= newLeft + minSize && touchY <= newTop + newHeight - minSize) {
          const widthChange = touchX - this.startPoint.boxLeft;
          const heightChange = this.startPoint.boxTop + this.startPoint.boxHeight - touchY;
          
          if (this.forceSquare) {
            const change = Math.min(widthChange, heightChange);
            if (newLeft + change <= this.imageBounds.left + this.imageBounds.width && 
                touchY >= this.imageBounds.top) {
              newTop = this.startPoint.boxTop + this.startPoint.boxHeight - change;
              newWidth = change;
              newHeight = change;
            }
          } else {
            if (newLeft + widthChange <= this.imageBounds.left + this.imageBounds.width) {
              newWidth = widthChange;
            }
            if (touchY >= this.imageBounds.top) {
              newTop = touchY;
              newHeight = heightChange;
            }
          }
        }
        break;

      case 'sw':
        if (touchX <= newLeft + newWidth - minSize && touchY >= newTop + minSize) {
          const widthChange = this.startPoint.boxLeft + this.startPoint.boxWidth - touchX;
          const heightChange = touchY - this.startPoint.boxTop;
          
          if (this.forceSquare) {
            const change = Math.min(widthChange, heightChange);
            if (touchX >= this.imageBounds.left && 
                newTop + change <= this.imageBounds.top + this.imageBounds.height) {
              newLeft = this.startPoint.boxLeft + this.startPoint.boxWidth - change;
              newWidth = change;
              newHeight = change;
            }
          } else {
            if (touchX >= this.imageBounds.left) {
              newLeft = touchX;
              newWidth = widthChange;
            }
            if (newTop + heightChange <= this.imageBounds.top + this.imageBounds.height) {
              newHeight = heightChange;
            }
          }
        }
        break;

      case 'se':
        if (touchX >= newLeft + minSize && touchY >= newTop + minSize) {
          const widthChange = touchX - this.startPoint.boxLeft;
          const heightChange = touchY - this.startPoint.boxTop;
          
          if (this.forceSquare) {
            const change = Math.min(widthChange, heightChange);
            if (newLeft + change <= this.imageBounds.left + this.imageBounds.width && 
                newTop + change <= this.imageBounds.top + this.imageBounds.height) {
              newWidth = change;
              newHeight = change;
            }
          } else {
            if (newLeft + widthChange <= this.imageBounds.left + this.imageBounds.width) {
              newWidth = widthChange;
            }
            if (newTop + heightChange <= this.imageBounds.top + this.imageBounds.height) {
              newHeight = heightChange;
            }
          }
        }
        break;
    }

    // Apply the changes
    this.cropBox.left = newLeft;
    this.cropBox.top = newTop;
    this.cropBox.width = newWidth;
    this.cropBox.height = newHeight;
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
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    const img = this.cropperImage.nativeElement;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual image dimensions
    const imageRect = img.getBoundingClientRect();
    const wrapperRect = this.imageWrapper.nativeElement.getBoundingClientRect();

    // Calculate the actual displayed image position and size
    const displayedWidth = imageRect.width;
    const displayedHeight = imageRect.height;
    const displayedLeft = imageRect.left - wrapperRect.left;
    const displayedTop = imageRect.top - wrapperRect.top;

    // Convert crop box percentages to pixels relative to the image
    const cropLeft = ((this.cropBox.left / 100) * wrapperRect.width) - displayedLeft;
    const cropTop = ((this.cropBox.top / 100) * wrapperRect.height) - displayedTop;
    const cropWidth = (this.cropBox.width / 100) * wrapperRect.width;
    const cropHeight = (this.cropBox.height / 100) * wrapperRect.height;

    // Calculate scaling between displayed size and natural size
    const scaleX = img.naturalWidth / displayedWidth;
    const scaleY = img.naturalHeight / displayedHeight;

    // Set output size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Calculate source coordinates in the natural image
    const sourceX = cropLeft * scaleX;
    const sourceY = cropTop * scaleY;
    const sourceWidth = cropWidth * scaleX;
    const sourceHeight = cropHeight * scaleY;

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    this.croppedImage.emit(canvas.toDataURL('image/jpeg', 0.95));
  }
}
