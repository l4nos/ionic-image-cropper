import { Injectable, ElementRef } from '@angular/core';
import { ResizeHandle } from '../types/ResizeHandle';
import {star} from "ionicons/icons";

@Injectable({
  providedIn: 'root'
})
export class ImageCropperService {
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

      case "se": // DONE
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
    let proposedWidth = touchX - startPoint.boxLeft
    let proposedHeight = touchY - startPoint.boxTop
    let maximumWidth = imageBounds.width - startPoint.boxLeft;
    let maximumHeight = imageBounds.height - startPoint.boxTop;

    if(forceSquare){
      let HighestDimension = Math.max(proposedWidth, proposedHeight);

      if(HighestDimension >= maximumHeight){
        HighestDimension = maximumHeight;
      }

      if(HighestDimension >= maximumWidth){
        HighestDimension = maximumWidth;
      }

      proposedHeight = HighestDimension;
      proposedWidth = HighestDimension;

    }else{
      if(proposedWidth >= maximumWidth){
        proposedWidth = maximumWidth;
      }

      if(proposedHeight >= maximumHeight){
        proposedHeight = maximumHeight;
      }
    }

    cropBox.width = proposedWidth;
    cropBox.height = proposedHeight;
  }

  cropImage(
    cropperImage: ElementRef<HTMLImageElement>,
    imageWrapper: ElementRef<HTMLDivElement>,
    cropBox: { left: number; top: number; width: number; height: number }
  ): string | undefined {
    if (!cropperImage?.nativeElement || !imageWrapper?.nativeElement) return;

    const img = cropperImage.nativeElement;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual image dimensions
    const imageRect = img.getBoundingClientRect();
    const wrapperRect = imageWrapper.nativeElement.getBoundingClientRect();

    // Calculate the actual displayed image position and size
    const displayedWidth = imageRect.width;
    const displayedHeight = imageRect.height;
    const displayedLeft = imageRect.left - wrapperRect.left;
    const displayedTop = imageRect.top - wrapperRect.top;

    // Convert crop box percentages to pixels relative to the image
    const cropLeft = ((cropBox.left / 100) * wrapperRect.width) - displayedLeft;
    const cropTop = ((cropBox.top / 100) * wrapperRect.height) - displayedTop;
    const cropWidth = (cropBox.width / 100) * wrapperRect.width;
    const cropHeight = (cropBox.height / 100) * wrapperRect.height;

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

    return canvas.toDataURL('image/jpeg', 0.95);
  }
}
