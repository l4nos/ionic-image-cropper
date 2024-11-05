import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, NgZone } from '@angular/core';
import { GestureController } from '@ionic/angular';
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
  @ViewChild('cropperContainer') cropperContainer!: ElementRef<HTMLDivElement>;

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
    private ngZone: NgZone
  ) {
    this.resizeObserver = new ResizeObserver((entries) => {
      this.ngZone.run(() => {
        for (const entry of entries) {
          if (entry.target === this.imageWrapper?.nativeElement) {

            // TODO APPLY A FIXED HEIGHT TO THE IMAGE WRAPPER BASED ON ITS PARENT CURRENT HEIGHT
            const parentHeight = this.cropperContainer.nativeElement.getBoundingClientRect().height;
            this.imageWrapper.nativeElement.style.height = `${parentHeight}px`;

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

    this.updateImageBounds(
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

    this.updateImageBounds(
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

    this.updateImageBounds(
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
      this.handleResize(
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
      this.handleDrag(
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

  updateImageBounds(
    cropperImage: ElementRef<HTMLImageElement>,
    imageWrapper: ElementRef<HTMLDivElement>,
    imageBounds: { left: number; top: number; width: number; height: number }
  ) {
    if (!cropperImage?.nativeElement || !imageWrapper?.nativeElement) return;

    const imageRect = cropperImage.nativeElement.getBoundingClientRect();
    const wrapperRect = imageWrapper.nativeElement.getBoundingClientRect();

    const imageAspect = imageRect.width / imageRect.height;
    const wrapperAspect = wrapperRect.width / wrapperRect.height;

    imageBounds.top = 0;
    imageBounds.left = 0;
    imageBounds.width = wrapperRect.width;
    imageBounds.height = wrapperRect.height;
  }

  handleDrag(
    touchX: number,
    touchY: number,
    startPoint: { x: number; y: number; boxLeft: number; boxTop: number },
    cropBox: { left: number; top: number; width: number; height: number },
    imageBounds: { left: number; top: number; width: number; height: number }
  ) {
    const leftBounds = imageBounds.left;
    const rightBounds = imageBounds.left + imageBounds.width;
    const topBounds = imageBounds.top;
    const bottomBounds = imageBounds.top + imageBounds.height;

    const deltaX = touchX - startPoint.x;
    const deltaY = touchY - startPoint.y;

    let proposedNewLeft = startPoint.boxLeft + deltaX;
    let proposedNewTop = startPoint.boxTop + deltaY;

    // Check if the proposed position is within the valid bounds
    if (proposedNewLeft < leftBounds) {
      proposedNewLeft = leftBounds;
    } else if (proposedNewLeft + cropBox.width > rightBounds) {
      proposedNewLeft = rightBounds - cropBox.width;
    }

    if (proposedNewTop < topBounds) {
      proposedNewTop = topBounds;
    } else if (proposedNewTop + cropBox.height > bottomBounds) {
      proposedNewTop = bottomBounds - cropBox.height;
    }

    cropBox.left = proposedNewLeft;
    cropBox.top = proposedNewTop;
  }

  handleResize(
    touchX: number,
    touchY: number,
    wrapperRect: DOMRect,
    startPoint: { boxLeft: number; boxTop: number; boxWidth: number; boxHeight: number, x: number, y: number },
    cropBox: { left: number; top: number; width: number; height: number },
    imageBounds: { left: number; top: number; width: number; height: number },
    forceSquare: boolean,
    handle: ResizeHandle
  ) {
    const minSize = 10;

    switch(handle){

      case "ne":
        this.topRightHandle(touchX, touchY, wrapperRect, startPoint, cropBox, imageBounds, forceSquare)
        break;

      case "nw":
        this.topLeftHandle(touchX, touchY, wrapperRect, startPoint, cropBox, imageBounds, forceSquare)
        break;

      case "se":
        this.bottomRightHandle(touchX, touchY, wrapperRect, startPoint, cropBox, imageBounds, forceSquare);
        break;

      case "sw":
        this.bottomLeftHandle(touchX, touchY, wrapperRect, startPoint, cropBox, imageBounds, forceSquare)
        break;

    }

  }

  topLeftHandle(
    touchX: number,
    touchY: number,
    wrapperRect: DOMRect,
    startPoint: { boxLeft: number; boxTop: number; boxWidth: number; boxHeight: number, x: number, y: number },
    cropBox: { left: number; top: number; width: number; height: number },
    imageBounds: { left: number; top: number; width: number; height: number },
    forceSquare: boolean
  ){
    const minSize = 10;
    let proposedWidth = startPoint.boxWidth - (touchX - startPoint.boxLeft);
    let proposedHeight = startPoint.boxHeight - (touchY - startPoint.boxTop);
    let proposedLeft = touchX;
    let proposedTop = touchY;

    if (proposedLeft < imageBounds.left) {
      proposedLeft = imageBounds.left;
      proposedWidth = startPoint.boxLeft + startPoint.boxWidth - imageBounds.left;
    }

    if (proposedTop < imageBounds.top) {
      proposedTop = imageBounds.top;
      proposedHeight = startPoint.boxTop + startPoint.boxHeight - imageBounds.top;
    }

    if (proposedWidth < minSize) {
      proposedWidth = minSize;
      proposedLeft = startPoint.boxLeft + startPoint.boxWidth - minSize;
    }

    if (proposedHeight < minSize) {
      proposedHeight = minSize;
      proposedTop = startPoint.boxTop + startPoint.boxHeight - minSize;
    }

    if (forceSquare) {
      const smallestDimension = Math.min(proposedWidth, proposedHeight);
      proposedWidth = smallestDimension;
      proposedHeight = smallestDimension;

      if (touchX < startPoint.boxLeft + startPoint.boxWidth - smallestDimension) {
        proposedLeft = startPoint.boxLeft + startPoint.boxWidth - smallestDimension;
      }

      if (touchY < startPoint.boxTop + startPoint.boxHeight - smallestDimension) {
        proposedTop = startPoint.boxTop + startPoint.boxHeight - smallestDimension;
      }
    }

    cropBox.left = proposedLeft;
    cropBox.top = proposedTop;
    cropBox.width = proposedWidth;
    cropBox.height = proposedHeight;
  }

  topRightHandle(
    touchX: number,
    touchY: number,
    wrapperRect: DOMRect,
    startPoint: { boxLeft: number; boxTop: number; boxWidth: number; boxHeight: number, x: number, y: number },
    cropBox: { left: number; top: number; width: number; height: number },
    imageBounds: { left: number; top: number; width: number; height: number },
    forceSquare: boolean
  ){
    const minSize = 10;
    let proposedWidth = touchX - startPoint.boxLeft;
    let proposedHeight = startPoint.boxHeight - (touchY - startPoint.boxTop);
    let proposedTop = touchY;
    const maximumWidth = imageBounds.width - startPoint.boxLeft;

    if (proposedWidth > maximumWidth) {
      proposedWidth = maximumWidth;
    }

    if (proposedTop < imageBounds.top) {
      proposedTop = imageBounds.top;
      proposedHeight = startPoint.boxTop + startPoint.boxHeight - imageBounds.top;
    }

    if (proposedWidth < minSize) {
      proposedWidth = minSize;
    }

    if (proposedHeight < minSize) {
      proposedHeight = minSize;
      proposedTop = startPoint.boxTop + startPoint.boxHeight - minSize;
    }

    if (forceSquare) {
      const smallestDimension = Math.min(proposedWidth, proposedHeight);
      proposedWidth = smallestDimension;
      proposedHeight = smallestDimension;

      if (touchY < startPoint.boxTop + startPoint.boxHeight - smallestDimension) {
        proposedTop = startPoint.boxTop + startPoint.boxHeight - smallestDimension;
      }
    }

    cropBox.top = proposedTop;
    cropBox.width = proposedWidth;
    cropBox.height = proposedHeight;
  }

  bottomLeftHandle(
    touchX: number,
    touchY: number,
    wrapperRect: DOMRect,
    startPoint: { boxLeft: number; boxTop: number; boxWidth: number; boxHeight: number, x: number, y: number },
    cropBox: { left: number; top: number; width: number; height: number },
    imageBounds: { left: number; top: number; width: number; height: number },
    forceSquare: boolean
  ){
    const minSize = 10;
    let proposedWidth = startPoint.boxWidth - (touchX - startPoint.boxLeft);
    let proposedHeight = touchY - startPoint.boxTop;
    let proposedLeft = touchX;
    const maximumHeight = imageBounds.height - startPoint.boxTop;

    if (proposedLeft < imageBounds.left) {
      proposedLeft = imageBounds.left;
      proposedWidth = startPoint.boxLeft + startPoint.boxWidth - imageBounds.left;
    }

    if (proposedHeight > maximumHeight) {
      proposedHeight = maximumHeight;
    }

    if (proposedWidth < minSize) {
      proposedWidth = minSize;
      proposedLeft = startPoint.boxLeft + startPoint.boxWidth - minSize;
    }

    if (proposedHeight < minSize) {
      proposedHeight = minSize;
    }

    if (forceSquare) {
      const smallestDimension = Math.min(proposedWidth, proposedHeight);
      proposedWidth = smallestDimension;
      proposedHeight = smallestDimension;

      if (touchX < startPoint.boxLeft + startPoint.boxWidth - smallestDimension) {
        proposedLeft = startPoint.boxLeft + startPoint.boxWidth - smallestDimension;
      }
    }

    cropBox.left = proposedLeft;
    cropBox.width = proposedWidth;
    cropBox.height = proposedHeight;
  }

  bottomRightHandle(
    touchX: number,
    touchY: number,
    wrapperRect: DOMRect,
    startPoint: { boxLeft: number; boxTop: number; boxWidth: number; boxHeight: number, x: number, y: number },
    cropBox: { left: number; top: number; width: number; height: number },
    imageBounds: { left: number; top: number; width: number; height: number },
    forceSquare: boolean,
  ){
    const minSize = 10;
    let proposedWidth = touchX - startPoint.boxLeft
    let proposedHeight = touchY - startPoint.boxTop
    let maximumWidth = imageBounds.width - startPoint.boxLeft;
    let maximumHeight = imageBounds.height - startPoint.boxTop;

    if(forceSquare){
      let largestDimension = Math.max(proposedWidth, proposedHeight);

      if(largestDimension > maximumHeight){
        largestDimension = maximumHeight;
      }

      if(largestDimension > maximumWidth){
        largestDimension = maximumWidth;
      }

      proposedHeight = largestDimension;
      proposedWidth = largestDimension;

    }else{
      if(proposedWidth > maximumWidth){
        proposedWidth = maximumWidth;
      }

      if(proposedHeight > maximumHeight){
        proposedHeight = maximumHeight;
      }
    }

    if (proposedWidth < minSize) {
      proposedWidth = minSize;
    }

    if (proposedHeight < minSize) {
      proposedHeight = minSize;
    }

    cropBox.width = proposedWidth;
    cropBox.height = proposedHeight;
  }

  cropImage(): void{
    if (!this.cropperImage?.nativeElement || !this.imageWrapper?.nativeElement) return;

    const img = this.cropperImage.nativeElement;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // GET NATURAL HEIGHT OF IMAGE
    const intrinsicHeight = img.naturalHeight;
    const intrinsicWidth = img.naturalWidth;

    // Convert crop box percentages to pixels relative to the image
    const cropLeftPercentage = ((this.cropBox.left / this.imageBounds.width) * 100);
    const cropTopPercentage = ((this.cropBox.top / this.imageBounds.height) * 100);
    const cropWidthPercentage = ((this.cropBox.width / this.imageBounds.width) * 100);
    const cropHeightPercentage = ((this.cropBox.height / this.imageBounds.height) * 100)

    const sourceLeft = (cropLeftPercentage / 100) * intrinsicWidth;
    const sourceTop = (cropTopPercentage / 100) * intrinsicHeight;
    const sourceWidth = (cropWidthPercentage / 100) * intrinsicWidth;
    const sourceHeight = (cropHeightPercentage / 100) * intrinsicHeight;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    ctx.drawImage(
      img,
      sourceLeft,
      sourceTop,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );
    this.croppedImage.emit(canvas.toDataURL('image/jpeg', 0.95));
  }

}
