<?php
/**
 * AI Agent API
 * Handle file uploads and AI chat interactions with MCP-style tool calling
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../services/ai-service.php';

class AIAgentAPI {
    private $db;
    private $uploadDir;
    private $aiService;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->aiService = new AIService();
        $this->uploadDir = Env::get('UPLOAD_PATH', '../uploads/');
        
        // Create upload directory if it doesn't exist
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
        
        session_start();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'upload':
                if ($method === 'POST') {
                    $this->handleFileUpload();
                }
                break;
            case 'chat':
                if ($method === 'POST') {
                    $this->handleChatMessage();
                }
                break;
            case 'get-session':
                if ($method === 'GET') {
                    $this->getChatSession();
                }
                break;
            case 'execute-tool':
                if ($method === 'POST') {
                    $this->executeToolCall();
                }
                break;
            default:
                $this->sendError('Invalid action', 400);
        }
    }
    
    private function handleFileUpload() {
        $user_id = $_SESSION['user_id'] ?? null;
        
        if (!isset($_FILES['files'])) {
            $this->sendError('No files uploaded', 400);
            return;
        }
        
        $uploadedFiles = [];
        $files = $_FILES['files'];
        
        // Handle multiple files
        if (is_array($files['name'])) {
            for ($i = 0; $i < count($files['name']); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $fileInfo = $this->processUploadedFile([
                        'name' => $files['name'][$i],
                        'tmp_name' => $files['tmp_name'][$i],
                        'size' => $files['size'][$i],
                        'type' => $files['type'][$i]
                    ], $user_id);
                    
                    if ($fileInfo) {
                        $uploadedFiles[] = $fileInfo;
                    }
                }
            }
        } else {
            // Single file
            if ($files['error'] === UPLOAD_ERR_OK) {
                $fileInfo = $this->processUploadedFile($files, $user_id);
                if ($fileInfo) {
                    $uploadedFiles[] = $fileInfo;
                }
            }
        }
        
        $this->sendSuccess([
            'message' => 'Files uploaded successfully',
            'files' => $uploadedFiles
        ]);
    }
    
    private function processUploadedFile($file, $user_id) {
        $originalName = $file['name'];
        $tmpName = $file['tmp_name'];
        $fileSize = $file['size'];
        $mimeType = $file['type'];
        
        // Generate unique filename
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $storedName = uniqid() . '_' . time() . '.' . $extension;
        $filePath = $this->uploadDir . $storedName;
        
        // Calculate file hash
        $fileHash = hash_file('sha256', $tmpName);
        
        // Move uploaded file
        if (move_uploaded_file($tmpName, $filePath)) {
            try {
                // Store file info in database
                $stmt = $this->db->prepare("
                    INSERT INTO uploaded_files 
                    (user_id, original_filename, stored_filename, file_path, file_size, mime_type, file_hash, expires_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
                $stmt->execute([
                    $user_id,
                    $originalName,
                    $storedName,
                    $filePath,
                    $fileSize,
                    $mimeType,
                    $fileHash,
                    $expiresAt
                ]);
                
                $fileId = $this->db->lastInsertId();
                
                return [
                    'id' => $fileId,
                    'name' => $originalName,
                    'size' => $fileSize,
                    'type' => $mimeType,
                    'hash' => $fileHash
                ];
            } catch (Exception $e) {
                // Clean up file if database insert fails
                unlink($filePath);
                error_log("File upload database error: " . $e->getMessage());
                return null;
            }
        }
        
        return null;
    }
    
    private function handleChatMessage() {
        $input = json_decode(file_get_contents('php://input'), true);
        $message = $input['message'] ?? '';
        $fileIds = $input['file_ids'] ?? [];
        $sessionId = $input['session_id'] ?? null;
        $user_id = $_SESSION['user_id'] ?? null;
        
        if (empty($message)) {
            $this->sendError('Message is required', 400);
            return;
        }
        
        // Get or create chat session
        if (!$sessionId) {
            $sessionId = $this->createChatSession($user_id, $fileIds);
        }
        
        // Add user message to session
        $this->addMessageToSession($sessionId, 'user', $message);
        
        // Process message with AI (simulate AI response with tool calling)
        $aiResponse = $this->processAIMessage($message, $fileIds, $sessionId);
        
        // Add AI response to session
        $this->addMessageToSession($sessionId, 'assistant', $aiResponse['message'], $aiResponse['tool_calls'] ?? null);
        
        $this->sendSuccess([
            'session_id' => $sessionId,
            'response' => $aiResponse
        ]);
    }
    
    private function processAIMessage($message, $fileIds, $sessionId) {
        // Simple AI logic - in real implementation, this would call OpenAI/Claude API
        $message_lower = strtolower($message);
        
        // Detect intent and suggest tool calls
        $toolCalls = [];
        $response = "";
        
        if (strpos($message_lower, 'convert') !== false && strpos($message_lower, 'pdf') !== false && strpos($message_lower, 'image') !== false) {
            $toolCalls[] = [
                'id' => 'call_' . uniqid(),
                'type' => 'function',
                'function' => [
                    'name' => 'convert_pdf_to_images',
                    'arguments' => json_encode([
                        'file_ids' => $fileIds,
                        'format' => 'png',
                        'quality' => 'high'
                    ])
                ]
            ];
            $response = "I'll convert your PDF files to images. Let me process them now...";
        } 
        elseif (strpos($message_lower, 'convert') !== false && strpos($message_lower, 'image') !== false && strpos($message_lower, 'pdf') !== false) {
            $toolCalls[] = [
                'id' => 'call_' . uniqid(),
                'type' => 'function',
                'function' => [
                    'name' => 'convert_images_to_pdf',
                    'arguments' => json_encode([
                        'file_ids' => $fileIds
                    ])
                ]
            ];
            $response = "I'll convert your images to a PDF file. Processing now...";
        }
        elseif (strpos($message_lower, 'remove background') !== false || strpos($message_lower, 'background remov') !== false) {
            $toolCalls[] = [
                'id' => 'call_' . uniqid(),
                'type' => 'function',
                'function' => [
                    'name' => 'remove_background',
                    'arguments' => json_encode([
                        'file_ids' => $fileIds
                    ])
                ]
            ];
            $response = "I'll remove the background from your images. This might take a moment...";
        }
        elseif (strpos($message_lower, 'compress') !== false || strpos($message_lower, 'resize') !== false) {
            $toolCalls[] = [
                'id' => 'call_' . uniqid(),
                'type' => 'function',
                'function' => [
                    'name' => 'compress_images',
                    'arguments' => json_encode([
                        'file_ids' => $fileIds,
                        'quality' => 80
                    ])
                ]
            ];
            $response = "I'll compress your images to reduce file size while maintaining good quality.";
        }
        else {
            $response = "I understand you want to work with your files. Could you be more specific? I can help you:\n\n" .
                      "• Convert PDFs to images\n" .
                      "• Convert images to PDF\n" .
                      "• Remove backgrounds from images\n" .
                      "• Compress or resize images\n" .
                      "• Merge or split PDFs\n\n" .
                      "Just tell me what you'd like to do!";
        }
        
        return [
            'message' => $response,
            'tool_calls' => $toolCalls
        ];
    }
    
    private function createChatSession($user_id, $fileIds) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO ai_chat_sessions (user_id, title, file_ids, messages) 
                VALUES (?, ?, ?, ?)
            ");
            
            $title = "File Processing Session " . date('Y-m-d H:i');
            $stmt->execute([
                $user_id,
                $title,
                '{' . implode(',', $fileIds) . '}',
                '[]'
            ]);
            
            return $this->db->lastInsertId();
        } catch (Exception $e) {
            error_log("Create chat session error: " . $e->getMessage());
            return null;
        }
    }
    
    private function addMessageToSession($sessionId, $role, $content, $toolCalls = null) {
        try {
            // Get current messages
            $stmt = $this->db->prepare("SELECT messages FROM ai_chat_sessions WHERE id = ?");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $messages = json_decode($session['messages'], true) ?: [];
            
            $newMessage = [
                'role' => $role,
                'content' => $content,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            if ($toolCalls) {
                $newMessage['tool_calls'] = $toolCalls;
            }
            
            $messages[] = $newMessage;
            
            // Update session
            $stmt = $this->db->prepare("UPDATE ai_chat_sessions SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([json_encode($messages), $sessionId]);
            
        } catch (Exception $e) {
            error_log("Add message error: " . $e->getMessage());
        }
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
$api = new AIAgentAPI();
$api->handleRequest();
?>
