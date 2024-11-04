import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ImageCropperComponent } from '../components/image-cropper/image-cropper.component';

@NgModule({
  declarations: [
    ImageCropperComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    ImageCropperComponent
  ]
})
export class SharedModule { }
