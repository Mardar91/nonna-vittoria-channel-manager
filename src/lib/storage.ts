import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Simulazione storage locale
// In produzione useresti S3, Cloudinary, Vercel Blob, etc.
export async function uploadToStorage(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    // In produzione, useresti un servizio di storage cloud:
    /*
    // Esempio con AWS S3:
    import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
    
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    });
    
    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${fileName}`;
    */
    
    // Per sviluppo locale, salva nella cartella public
    const publicDir = join(process.cwd(), 'public');
    const storageDir = join(publicDir, 'storage');
    const fileDir = join(storageDir, fileName.substring(0, fileName.lastIndexOf('/')));
    
    // Crea le directory se non esistono
    if (!existsSync(fileDir)) {
      await mkdir(fileDir, { recursive: true });
    }
    
    // Salva il file
    const filePath = join(storageDir, fileName);
    await writeFile(filePath, buffer);
    
    // Restituisci l'URL pubblico
    const publicUrl = `/storage/${fileName}`;
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    throw new Error('Errore nel caricamento del file');
  }
}

// Elimina un file dallo storage
export async function deleteFromStorage(fileUrl: string): Promise<void> {
  try {
    // In produzione con S3:
    /*
    import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
    
    const fileName = fileUrl.split('/').pop();
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
    });
    
    await s3Client.send(command);
    */
    
    // Per sviluppo locale
    if (fileUrl.startsWith('/storage/')) {
      const filePath = join(process.cwd(), 'public', fileUrl);
      if (existsSync(filePath)) {
        const { unlink } = await import('fs/promises');
        await unlink(filePath);
      }
    }
  } catch (error) {
    console.error('Error deleting from storage:', error);
    // Non lanciare errore per eliminazioni fallite
  }
}

// Ottieni URL temporaneo con scadenza (per storage privati)
export async function getSignedUrl(
  fileName: string,
  expiresIn: number = 3600 // 1 ora default
): Promise<string> {
  // In produzione con S3:
  /*
  import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: fileName,
  });
  
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
  */
  
  // Per sviluppo locale, restituisci URL normale
  return `/storage/${fileName}`;
}

// Verifica se un file esiste
export async function fileExists(fileUrl: string): Promise<boolean> {
  try {
    // In produzione con S3:
    /*
    import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
    
    const fileName = fileUrl.split('/').pop();
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const command = new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
    });
    
    await s3Client.send(command);
    return true;
    */
    
    // Per sviluppo locale
    if (fileUrl.startsWith('/storage/')) {
      const filePath = join(process.cwd(), 'public', fileUrl);
      return existsSync(filePath);
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Copia un file
export async function copyFile(
  sourceUrl: string,
  destinationFileName: string
): Promise<string> {
  try {
    // In produzione con S3:
    /*
    import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';
    
    const sourceKey = sourceUrl.split('/').pop();
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const command = new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET,
      CopySource: `${process.env.S3_BUCKET}/${sourceKey}`,
      Key: destinationFileName,
    });
    
    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${destinationFileName}`;
    */
    
    // Per sviluppo locale
    if (sourceUrl.startsWith('/storage/')) {
      const sourcePath = join(process.cwd(), 'public', sourceUrl);
      const destPath = join(process.cwd(), 'public', 'storage', destinationFileName);
      
      if (existsSync(sourcePath)) {
        const { copyFile: fsCopyFile } = await import('fs/promises');
        const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
        
        if (!existsSync(destDir)) {
          await mkdir(destDir, { recursive: true });
        }
        
        await fsCopyFile(sourcePath, destPath);
        return `/storage/${destinationFileName}`;
      }
    }
    
    throw new Error('File sorgente non trovato');
  } catch (error) {
    console.error('Error copying file:', error);
    throw new Error('Errore nella copia del file');
  }
}
