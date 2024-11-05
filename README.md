# Image Cropper

Image Cropper is an Ionic Angular component that allows users to crop images by selecting a specific area of the image using a resizable crop box. It provides a user-friendly interface for cropping images and obtaining the cropped result.

## Features

- Select an image from the device's gallery or camera
- Display the selected image in a cropping area
- Resize the crop box by dragging the handles on the corners and edges
- Constrain the crop box to maintain a square aspect ratio (optional)
- Crop the image based on the selected area
- Preview the cropped image result
- Download the cropped image

## Usage

1. Install the necessary dependencies:
   ```
   npm install
   ```

2. Run the Ionic app:
   ```
   ionic serve
   ```

3. In the app, click on the "Select Image" button to choose an image from your device.

4. Once the image is loaded, you will see a crop box overlaid on the image.

5. Resize the crop box by dragging the handles on the corners and edges to select the desired area of the image.

6. If the "Force Square" option is enabled, the crop box will maintain a square aspect ratio while resizing.

7. After selecting the desired crop area, click on the "Crop" button to crop the image.

8. The cropped image will be displayed in the preview section.

9. To crop a new image, click on the "Crop New Image" button.

10. To download the cropped image, click on the "Download" button.

## Implementation Details

The image cropper component is implemented in the `src/app/components/image-cropper` directory. The main files are:

- `image-cropper.component.html`: The template file that defines the structure of the image cropper component.
- `image-cropper.component.ts`: The TypeScript file that contains the logic for the image cropper component.
- `image-cropper.component.scss`: The stylesheet file for styling the image cropper component.

The image cropper service, located in `src/app/services/image-cropper.service.ts`, provides utility functions for updating the image bounds, handling drag and resize events, and cropping the image.

The usage of the image cropper component can be seen in the `src/app/home/home.page.html` file. It demonstrates how to integrate the image cropper component into a page, handle file selection, and display the cropped result.

## Dependencies

The image cropper component relies on the following dependencies:

- Ionic Angular
- Angular
- GestureController from `@ionic/angular`
- ResizeObserver API

Make sure to have these dependencies installed and properly configured in your project.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

The image cropper component was developed using Ionic Angular and utilizes various web technologies and APIs. Special thanks to the Ionic and Angular communities for their excellent frameworks and resources.
