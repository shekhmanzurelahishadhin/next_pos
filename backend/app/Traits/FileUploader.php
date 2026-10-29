<?php

namespace App\Traits;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

trait FileUploader
{
    public function unlink(?string $filePath, string $disk = 'public'): bool
    {
        if ($filePath && Storage::disk($disk)->exists($filePath)) {
            return Storage::disk($disk)->delete($filePath);
        }
        return false;
    }

    public function fileUpload(UploadedFile $file, string $folder = 'uploads', ?string $oldFilePath = null, string $disk = 'public'): string
    {
        // delete old file if provided
        if ($oldFilePath) {
            $this->unlink($oldFilePath, $disk);
        }

        // build unique name
        $currentDate = Carbon::now()->toDateString();
        $prefix = $currentDate.'-'.substr(uniqid(), 7, 10);
        $fileName = $prefix.'_'.pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $ext = strtolower($file->getClientOriginalExtension());
        $fileFullName = $fileName.'.'.$ext;

        // store file
        $path = $file->storeAs($folder, $fileFullName, $disk);

        return $path; // returns relative path like "logos/xxxx.jpg"
    }

    public function fileUrl(?string $filePath, string $disk = 'public'): ?string
    {
        return $filePath ? Storage::disk($disk)->url($filePath) : null;
    }
}
