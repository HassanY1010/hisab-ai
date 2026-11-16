import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import ws from 'ws';

export class SupabaseStorageService {
  private static client: SupabaseClient | null = null;
  private static bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'receipts';

  public static getClient(): SupabaseClient | null {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        this.client = createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            transport: ws,
          },
        });
        return this.client;
      } catch (err) {
        console.warn('[Storage] Failed to initialize Supabase client:', err);
      }
    }
    return null;
  }

  /**
   * Uploads an image buffer or file to Supabase Storage, with fallback to local storage
   */
  public static async uploadReceipt(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string = 'image/jpeg'
  ): Promise<{ url: string; storageKey: string; isRemote: boolean }> {
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const uniqueName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const storageKey = `bank-notifications/${uniqueName}`;

    const client = this.getClient();

    if (client) {
      try {
        const { data, error } = await client.storage
          .from(this.bucketName)
          .upload(storageKey, fileBuffer, {
            contentType: mimeType,
            upsert: false
          });

        if (error) {
          console.error('[Supabase Storage] Upload error:', error.message);
          throw error;
        }

        // Generate public URL or signed URL
        const { data: publicData } = client.storage
          .from(this.bucketName)
          .getPublicUrl(storageKey);

        return {
          url: publicData.publicUrl,
          storageKey,
          isRemote: true
        };
      } catch (err: any) {
        console.warn(`[Storage] Falling back to local storage due to remote error: ${err.message}`);
      }
    }

    // Local storage fallback
    const uploadsDir = path.resolve(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFilePath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(localFilePath, fileBuffer);

    return {
      url: `/uploads/${uniqueName}`,
      storageKey: uniqueName,
      isRemote: false
    };
  }

  /**
   * Retrieves URL for a stored receipt
   */
  public static async getReceiptUrl(storageKey: string): Promise<string> {
    if (!storageKey) return '';
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }

    const client = this.getClient();
    if (client && storageKey.startsWith('bank-notifications/')) {
      const { data } = client.storage.from(this.bucketName).getPublicUrl(storageKey);
      return data.publicUrl;
    }

    return `/uploads/${storageKey}`;
  }
}
