import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export class ImagePreprocessor {
  /**
   * Preprocesses a mobile bank notification screenshot:
   * 1. Grayscale conversion to eliminate color noise.
   * 2. Negate colors so white text on dark green turns to black text on white background (optimal for Tesseract).
   * 3. Normalize contrast and sharpen edges.
   */
  public static async preprocess(inputPath: string, outputPath?: string): Promise<string> {
    const targetPath = outputPath || path.join(
      path.dirname(inputPath),
      `preprocessed_${path.basename(inputPath, path.extname(inputPath))}.png`
    );

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
