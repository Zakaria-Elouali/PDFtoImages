<?php
/**
 * MCP-Style Tool Execution API
 * Execute file processing tools called by AI agent
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

class ToolsAPI {
    private $db;
    private $uploadDir;
    private $outputDir;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->uploadDir = '../uploads/';
        $this->outputDir = '../output/';
        
        // Create output directory if it doesn't exist
        if (!file_exists($this->outputDir)) {
            mkdir($this->outputDir, 0755, true);
        }
        
        session_start();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if ($method !== 'POST') {
            $this->sendError('Only POST method allowed', 405);
            return;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $toolName = $input['tool_name'] ?? '';
        $arguments = $input['arguments'] ?? [];
        $callId = $input['call_id'] ?? '';
        
        switch ($toolName) {
            case 'convert_pdf_to_images':
                $this->convertPdfToImages($arguments, $callId);
                break;
            case 'convert_images_to_pdf':
                $this->convertImagesToPdf($arguments, $callId);
                break;
            case 'remove_background':
                $this->removeBackground($arguments, $callId);
                break;
            case 'compress_images':
                $this->compressImages($arguments, $callId);
                break;
            case 'merge_pdfs':
                $this->mergePdfs($arguments, $callId);
                break;
            default:
                $this->sendError('Unknown tool: ' . $toolName, 400);
        }
    }
    
    private function convertPdfToImages($args, $callId) {
        $fileIds = $args['file_ids'] ?? [];
        $format = $args['format'] ?? 'png';
        $quality = $args['quality'] ?? 'high';
        
        if (empty($fileIds)) {
            $this->sendError('No file IDs provided', 400);
            return;
        }
        
        $results = [];
        
        foreach ($fileIds as $fileId) {
            $file = $this->getFileById($fileId);
            if (!$file) {
                continue;
            }
            
            // Simulate PDF to image conversion
            // In real implementation, you'd use libraries like Imagick or pdf2pic
            $outputFiles = $this->simulatePdfToImageConversion($file, $format, $quality);
            $results = array_merge($results, $outputFiles);
        }
        
        $this->sendSuccess([
            'call_id' => $callId,
            'tool_name' => 'convert_pdf_to_images',
            'result' => [
                'message' => 'Successfully converted ' . count($results) . ' pages to images',
                'files' => $results
            ]
        ]);
    }
    
    private function convertImagesToPdf($args, $callId) {
        $fileIds = $args['file_ids'] ?? [];
        
        if (empty($fileIds)) {
            $this->sendError('No file IDs provided', 400);
            return;
        }
        
        $files = [];
        foreach ($fileIds as $fileId) {
            $file = $this->getFileById($fileId);
            if ($file) {
                $files[] = $file;
            }
        }
        
        if (empty($files)) {
            $this->sendError('No valid files found', 400);
            return;
        }
        
        // Simulate images to PDF conversion
        $outputFile = $this->simulateImagesToPdfConversion($files);
        
        $this->sendSuccess([
            'call_id' => $callId,
            'tool_name' => 'convert_images_to_pdf',
            'result' => [
                'message' => 'Successfully converted ' . count($files) . ' images to PDF',
                'file' => $outputFile
            ]
        ]);
    }
    
    private function removeBackground($args, $callId) {
        $fileIds = $args['file_ids'] ?? [];
        
        if (empty($fileIds)) {
            $this->sendError('No file IDs provided', 400);
            return;
        }
        
        $results = [];
        
        foreach ($fileIds as $fileId) {
            $file = $this->getFileById($fileId);
            if (!$file) {
                continue;
            }
            
            // Simulate background removal
            // In real implementation, you'd use AI services like remove.bg API
            $outputFile = $this->simulateBackgroundRemoval($file);
            if ($outputFile) {
                $results[] = $outputFile;
            }
        }
        
        $this->sendSuccess([
            'call_id' => $callId,
            'tool_name' => 'remove_background',
            'result' => [
                'message' => 'Successfully removed background from ' . count($results) . ' images',
                'files' => $results
            ]
        ]);
    }
    
    private function compressImages($args, $callId) {
        $fileIds = $args['file_ids'] ?? [];
        $quality = $args['quality'] ?? 80;
        
        if (empty($fileIds)) {
            $this->sendError('No file IDs provided', 400);
            return;
        }
        
        $results = [];
        
        foreach ($fileIds as $fileId) {
            $file = $this->getFileById($fileId);
            if (!$file) {
                continue;
            }
            
            // Simulate image compression
            $outputFile = $this->simulateImageCompression($file, $quality);
            if ($outputFile) {
                $results[] = $outputFile;
            }
        }
        
        $this->sendSuccess([
            'call_id' => $callId,
            'tool_name' => 'compress_images',
            'result' => [
                'message' => 'Successfully compressed ' . count($results) . ' images',
                'files' => $results
            ]
        ]);
    }
    
    private function getFileById($fileId) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM uploaded_files WHERE id = ?");
            $stmt->execute([$fileId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Get file error: " . $e->getMessage());
            return null;
        }
    }
    
    // Simulation functions (replace with real implementations)
    private function simulatePdfToImageConversion($file, $format, $quality) {
        // Simulate creating multiple image files from PDF
        $outputFiles = [];
        $baseFilename = pathinfo($file['original_filename'], PATHINFO_FILENAME);
        
        // Simulate 3 pages
        for ($i = 1; $i <= 3; $i++) {
            $outputFilename = $baseFilename . "_page_{$i}." . $format;
            $outputPath = $this->outputDir . uniqid() . '_' . $outputFilename;
            
            // Create a dummy file (in real implementation, this would be the actual conversion)
            file_put_contents($outputPath, "Simulated {$format} image data for page {$i}");
            
            $outputFiles[] = [
                'filename' => $outputFilename,
                'path' => $outputPath,
                'size' => filesize($outputPath),
                'page' => $i,
                'download_url' => '/download/' . basename($outputPath)
            ];
        }
        
        return $outputFiles;
    }
    
    private function simulateImagesToPdfConversion($files) {
        $outputFilename = 'converted_images_' . date('Y-m-d_H-i-s') . '.pdf';
        $outputPath = $this->outputDir . uniqid() . '_' . $outputFilename;
        
        // Create a dummy PDF file
        file_put_contents($outputPath, "Simulated PDF data from " . count($files) . " images");
        
        return [
            'filename' => $outputFilename,
            'path' => $outputPath,
            'size' => filesize($outputPath),
            'download_url' => '/download/' . basename($outputPath)
        ];
    }
    
    private function simulateBackgroundRemoval($file) {
        $baseFilename = pathinfo($file['original_filename'], PATHINFO_FILENAME);
        $extension = pathinfo($file['original_filename'], PATHINFO_EXTENSION);
        $outputFilename = $baseFilename . '_no_bg.' . $extension;
        $outputPath = $this->outputDir . uniqid() . '_' . $outputFilename;
        
        // Create a dummy file
        file_put_contents($outputPath, "Simulated image with background removed");
        
        return [
            'filename' => $outputFilename,
            'path' => $outputPath,
            'size' => filesize($outputPath),
            'download_url' => '/download/' . basename($outputPath)
        ];
    }
    
    private function simulateImageCompression($file, $quality) {
        $baseFilename = pathinfo($file['original_filename'], PATHINFO_FILENAME);
        $extension = pathinfo($file['original_filename'], PATHINFO_EXTENSION);
        $outputFilename = $baseFilename . '_compressed.' . $extension;
        $outputPath = $this->outputDir . uniqid() . '_' . $outputFilename;
        
        // Create a dummy compressed file
        $originalSize = $file['file_size'];
        $compressedSize = intval($originalSize * ($quality / 100));
        file_put_contents($outputPath, str_repeat("compressed_data", $compressedSize / 15));
        
        return [
            'filename' => $outputFilename,
            'path' => $outputPath,
            'size' => filesize($outputPath),
            'original_size' => $originalSize,
            'compression_ratio' => round((1 - filesize($outputPath) / $originalSize) * 100, 1) . '%',
            'download_url' => '/download/' . basename($outputPath)
        ];
    }
    
    private function sendSuccess($data) {
        echo json_encode(['success' => true] + $data);
    }
    
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message]);
    }
}

// Handle the request
$api = new ToolsAPI();
$api->handleRequest();
?>
