import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  selectedImage: string = '';
  croppedImage: string = '';
  isSquareCrop: boolean = true;
  isLoading: boolean = false;

  constructor(private toastController: ToastController) {}

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Check file type
      if (!file.type.startsWith('image/')) {
        await this.showToast('Please select an image file');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        await this.showToast('Image size should be less than 10MB');
        return;
      }

      this.isLoading = true;
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.selectedImage = e.target?.result as string;
        this.croppedImage = ''; // Reset cropped image when new image is selected
        this.isLoading = false;
      };

      reader.onerror = async () => {
        this.isLoading = false;
        await this.showToast('Error loading image');
      };

      try {
        reader.readAsDataURL(file);
      } catch (error) {
        this.isLoading = false;
        await this.showToast('Error loading image');
      }
    }
  }

  async onCroppedImage(imageUrl: string): Promise<void> {
    try {
      this.croppedImage = imageUrl;

      // Validate the cropped image URL
      if (!imageUrl.startsWith('data:image/')) {
        throw new Error('Invalid image format');
      }

      console.log('Cropped image ready');
    } catch (error) {
      await this.showToast('Error processing cropped image');
      console.error('Cropping error:', error);
    }
  }

  downloadImage(): void {
    if (!this.croppedImage) return;

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = this.croppedImage;
    link.download = `cropped-image-${new Date().getTime()}.jpg`;

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  // Reset the component state
  resetState(): void {
    this.selectedImage = '';
    this.croppedImage = '';
    this.isSquareCrop = false;
  }
}
