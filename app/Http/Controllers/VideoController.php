<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class VideoController extends Controller
{
    public function index()
    {
        $videos = Video::latest()->get();
        return response()->json($videos);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video' => 'required|file|mimetypes:video/mp4,video/quicktime,video/x-msvideo,video/x-flv,video/x-ms-wmv|max:102400', // 100MB max
        ]);

        try {
            $videoFile = $request->file('video');
            $originalName = $videoFile->getClientOriginalName();
            $filename = Str::slug(pathinfo($originalName, PATHINFO_FILENAME)) . '_' . time() . '.' . $videoFile->getClientOriginalExtension();
            
            // Store the file
            $path = $videoFile->storeAs('videos', $filename, 'public');
            
            // Create the database record
            $video = Video::create([
                'title' => $request->title,
                'description' => $request->description,
                'filename' => $filename,
                'path' => $path,
                'mime_type' => $videoFile->getMimeType(),
                'size' => $videoFile->getSize(),
                'status' => 'processing',
            ]);

            // Dispatch video processing job (if you want to generate thumbnail, etc.)
            // ProcessVideo::dispatch($video);
            
            return response()->json([
                'message' => 'Video uploaded successfully',
                'video' => $video
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload video',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function show(Video $video)
    {
        return response()->json($video);
    }

    public function update(Request $request, Video $video)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $video->update($request->only(['title', 'description']));

        return response()->json([
            'message' => 'Video updated successfully',
            'video' => $video
        ]);
    }

    public function destroy(Video $video)
    {
        try {
            // Delete the physical file
            if (Storage::disk('public')->exists($video->path)) {
                Storage::disk('public')->delete($video->path);
            }
            
            // Delete thumbnail if exists
            if ($video->thumbnail_path && Storage::disk('public')->exists($video->thumbnail_path)) {
                Storage::disk('public')->delete($video->thumbnail_path);
            }
            
            // Delete the database record
            $video->delete();
            
            return response()->json([
                'message' => 'Video deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete video',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    
    // Upload chunks for large files
    public function uploadChunk(Request $request)
    {
        $request->validate([
            'file' => 'required',
            'index' => 'required|integer',
            'totalChunks' => 'required|integer',
            'filename' => 'required|string',
            'identifier' => 'required|string',
        ]);

        try {
            $chunk = $request->file('file');
            $chunkIndex = $request->index;
            $totalChunks = $request->totalChunks;
            $originalFilename = $request->filename;
            $identifier = $request->identifier;
            
            // Store chunk in a temporary location
            $chunkPath = "chunks/{$identifier}";
            if (!Storage::disk('local')->exists($chunkPath)) {
                Storage::disk('local')->makeDirectory($chunkPath);
            }
            
            // Save this chunk
            $chunk->storeAs($chunkPath, "chunk-{$chunkIndex}");
            
            // Check if all chunks have been uploaded
            if ($this->allChunksUploaded($chunkPath, $totalChunks)) {
                // Merge chunks and create the video
                $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)) . '_' . time() . '.' . pathinfo($originalFilename, PATHINFO_EXTENSION);
                $finalPath = "videos/{$filename}";
                
                $this->mergeChunks($chunkPath, $totalChunks, $finalPath);
                
                // Clean up chunks
                Storage::disk('local')->deleteDirectory($chunkPath);
                
                // At this point, you can create a Video record, but without metadata
                // You might want to return the filename so the frontend can complete the process
                return response()->json([
                    'message' => 'All chunks uploaded successfully',
                    'filename' => $filename,
                    'completed' => true
                ]);
            }
            
            return response()->json([
                'message' => 'Chunk uploaded successfully',
                'index' => $chunkIndex,
                'completed' => false
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload chunk',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    
    private function allChunksUploaded($chunkPath, $totalChunks)
    {
        $uploadedChunks = count(Storage::disk('local')->files($chunkPath));
        return $uploadedChunks == $totalChunks;
    }
    
    private function mergeChunks($chunkPath, $totalChunks, $finalPath)
    {
        $targetPath = Storage::disk('public')->path($finalPath);
        $targetDir = dirname($targetPath);
        
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
        
        // Create/open the output file
        $out = fopen($targetPath, 'wb');
        
        // Append chunks to the output file
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkFile = Storage::disk('local')->path("{$chunkPath}/chunk-{$i}");
            $in = fopen($chunkFile, 'rb');
            stream_copy_to_stream($in, $out);
            fclose($in);
        }
        
        fclose($out);
        
        return $targetPath;
    }
    
    // Method to complete upload after chunks are merged
    public function completeChunkedUpload(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'filename' => 'required|string',
        ]);
        
        $filename = $request->filename;
        $path = "videos/{$filename}";
        
        if (!Storage::disk('public')->exists($path)) {
            // Move the file from local storage to public storage
            $tempPath = Storage::disk('local')->path($path);
            Storage::disk('public')->put($path, file_get_contents($tempPath));
            Storage::disk('local')->delete($path);
        }
        
        // Get file info
        $fullPath = Storage::disk('public')->path($path);
        $mimeType = mime_content_type($fullPath);
        $size = filesize($fullPath);
        
        // Create the video record
        $video = Video::create([
            'title' => $request->title,
            'description' => $request->description,
            'filename' => $filename,
            'path' => $path,
            'mime_type' => $mimeType,
            'size' => $size,
            'status' => 'processing',
        ]);
        
        // Dispatch processing job
        // ProcessVideo::dispatch($video);
        
        return response()->json([
            'message' => 'Video upload completed',
            'video' => $video
        ], Response::HTTP_CREATED);
    }
}