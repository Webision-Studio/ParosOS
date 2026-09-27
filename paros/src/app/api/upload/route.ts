import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
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
        { error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Check if Cloudinary credentials are configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = 'paros_menu';
        
        // Generate Cloudinary SHA-1 signature: folder=...&timestamp=...<secret>
        const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

        const uploadFormData = new FormData();
        const blob = new Blob([buffer], { type: file.type });
        uploadFormData.append('file', blob, file.name);
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

    // 3. Vercel Serverless Safe Fallback (Base64 Data URI)
    // On Vercel, the local filesystem is read-only (EROFS). Base64 Data URI stores cleanly in PostgreSQL text column.
    if (process.env.NODE_ENV === 'production') {
      const base64Uri = `data:${file.type};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        url: base64Uri,
        provider: 'inline_data_uri',
      });
    }

    // 4. Local Development Fallback: write to public/uploads/menu
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'menu');
      await mkdir(uploadDir, { recursive: true });

      const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : '.jpg');
      const filename = `${crypto.randomUUID()}${ext}`;
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
