import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getSession } from '@/lib/auth-session';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

/**
 * Validate image magic bytes to prevent spoofed MIME type file execution
 */
function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 8) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  if (mimeType === 'image/avif') {
    if (buffer.length < 12) return false;
    const ftyp = buffer.toString('ascii', 4, 8);
    return ftyp === 'ftyp';
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized. Only logged-in cafe operators can upload menu media assets.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. Validate file size and MIME type
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only JPEG, PNG, WebP, and AVIF images are allowed.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Validate magic bytes (prevent executable/script files disguised as images)
    if (!validateImageMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'Invalid or corrupted image content. Magic byte verification failed.' },
        { status: 400 }
      );
    }

    // Ensure extension is strictly derived from validated MIME type, never from client-controlled file.name
    const safeExt = MIME_TO_EXT[file.type] || '.jpg';

    // 3. Check if Cloudinary credentials are configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = 'paros_menu';
        
        // Generate Cloudinary SHA-1 signature
        const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

        const uploadFormData = new FormData();
        const blob = new Blob([buffer], { type: file.type });
        uploadFormData.append('file', blob, `upload_${Date.now()}${safeExt}`);
        uploadFormData.append('api_key', apiKey);
        uploadFormData.append('timestamp', String(timestamp));
        uploadFormData.append('folder', folder);
        uploadFormData.append('signature', signature);

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          return NextResponse.json({
            success: true,
            url: cloudData.secure_url || cloudData.url,
            provider: 'cloudinary',
          });
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back:', cloudErr);
      }
    }

    // 4. Vercel Serverless Safe Fallback (Base64 Data URI)
    // On Vercel, the local filesystem is read-only (EROFS). Base64 Data URI stores cleanly in PostgreSQL text column.
    if (process.env.NODE_ENV === 'production') {
      const base64Uri = `data:${file.type};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        url: base64Uri,
        provider: 'inline_data_uri',
      });
    }

    // 5. Local Development Fallback: write to public/uploads/menu with cryptographically safe filename & extension
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'menu');
      await mkdir(uploadDir, { recursive: true });

      const filename = `${crypto.randomUUID()}${safeExt}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/menu/${filename}`,
        provider: 'local',
      });
    } catch {
      // If local write fails, fall back to Base64
      const base64Uri = `data:${file.type};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        url: base64Uri,
        provider: 'inline_data_uri',
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
