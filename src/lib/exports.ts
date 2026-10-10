export async function saveFileWithTarget(blob: Blob, filename: string) {
  try {
    const cap = (window as any).Capacitor;
    const isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (!res || !res.includes(',')) {
          reject(new Error('تبدیل فایل ناموفق بود'));
          return;
        }
        resolve(res.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsDataURL(blob);
    });

    if (isNative) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });

        const { uri } = await Filesystem.getUri({
          directory: Directory.Cache,
          path: filename
        });

        await Share.share({
          title: 'ذخیره فایل',
          text: filename,
          url: uri,
          dialogTitle: 'فایل را ذخیره یا اشتراک‌گذاری کنید'
        });

        return;
      } catch (nativeErr: any) {
        alert('خطا در ذخیره روی گوشی:\n' + (nativeErr?.message || String(nativeErr)));
        return;
      }
    }

    // حالت وب
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);

  } catch (err: any) {
    alert('خطا در ذخیره فایل:\n' + (err?.message || String(err)));
  }
}
