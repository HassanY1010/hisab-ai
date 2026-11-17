import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export class ImagePreprocessor {
  private static tempDir = path.resolve(process.cwd(), 'temp', 'preprocessed');

  /**
   * Preprocesses a mobile bank notification screenshot:
   * 1. Grayscale conversion to eliminate color noise.
   * 2. Negate colors so white text on dark green turns to black text on white background (optimal for Tesseract).
   * 3. Normalize contrast and sharpen edges.
   */
  public static async preprocess(inputPath: string, outputPath?: string): Promise<string> {
    if (!fs.existsSync(ImagePreprocessor.tempDir)) {
      fs.mkdirSync(ImagePreprocessor.tempDir, { recursive: true });
    }

    const uniqueName = `prep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const targetPath = outputPath || path.join(ImagePreprocessor.tempDir, uniqueName);

    await sharp(inputPath)
      .grayscale()
      .negate()
      .normalize()
      .sharpen()
      .toFile(targetPath);

    return targetPath;
  }

  /**
   * Preprocesses directly into memory buffer
   */
  public static async preprocessBuffer(inputBuffer: Buffer): Promise<Buffer> {
    return sharp(inputBuffer)
      .grayscale()
      .negate()
      .normalize()
      .sharpen()
      .toBuffer();
  }
}
