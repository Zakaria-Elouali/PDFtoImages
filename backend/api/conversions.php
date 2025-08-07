<?php
/**
 * Conversions API
 * Track usage and enforce limits for File Converter SaaS
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

class ConversionsAPI {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        session_start();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'check-limits':
                if ($method === 'GET') {
                    $this->checkLimits();
                }
                break;
            case 'track':
                if ($method === 'POST') {
                    $this->trackConversion();
                }
                break;
            case 'history':
                if ($method === 'GET') {
                    $this->getHistory();
                }
                break;
            case 'stats':
                if ($method === 'GET') {
                    $this->getStats();
                }
                break;
            default:
                $this->sendError('Invalid action', 400);
        }
    }
    
    private function checkLimits() {
        $user_id = $_SESSION['user_id'] ?? null;
        $file_size = $_GET['file_size'] ?? 0;
        
        if (!$user_id) {
            // Guest user limits
            $guest_conversions = $_SESSION['guest_conversions'] ?? 0;
            if ($guest_conversions >= 3) {
                $this->sendError('Guest limit reached. Please sign up for a free account.', 429);
                return;
            }
            
            if ($file_size > 5242880) { // 5MB
                $this->sendError('File too large for guest users. Maximum: 5MB', 413);
                return;
            }
            
            $this->sendSuccess([
                'allowed' => true,
                'remaining' => 3 - $guest_conversions,
                'plan' => 'guest'
            ]);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                $this->sendError('User not found', 404);
                return;
            }
            
            // Check conversion limits
            if ($user['conversions_limit'] > 0 && $user['conversions_used'] >= $user['conversions_limit']) {
                $this->sendError('Monthly conversion limit reached. Please upgrade your plan.', 429);
                return;
            }
            
            // Check file size limits
            if ($file_size > $user['max_file_size']) {
                $max_mb = round($user['max_file_size'] / 1024 / 1024);
                $this->sendError("File too large. Maximum size for {$user['plan_type']} plan: {$max_mb}MB", 413);
                return;
            }
            
            $remaining = $user['conversions_limit'] > 0 ? 
                $user['conversions_limit'] - $user['conversions_used'] : -1;
            
            $this->sendSuccess([
                'allowed' => true,
                'remaining' => $remaining,
                'plan' => $user['plan_type'],
                'max_file_size' => $user['max_file_size']
            ]);
        } catch (Exception $e) {
            $this->sendError('Failed to check limits: ' . $e->getMessage(), 500);
        }
    }
    
    private function trackConversion() {
        $input = json_decode(file_get_contents('php://input'), true);
        $user_id = $_SESSION['user_id'] ?? null;
        
        $conversion_type = $input['conversion_type'] ?? '';
        $filename = $input['filename'] ?? '';
        $file_size = $input['file_size'] ?? 0;
        $pages_converted = $input['pages_converted'] ?? 1;
        $output_format = $input['output_format'] ?? '';
        $quality_setting = $input['quality_setting'] ?? '';
        
        if (!$user_id) {
            // Track guest conversions
            $_SESSION['guest_conversions'] = ($_SESSION['guest_conversions'] ?? 0) + 1;
            $this->sendSuccess(['message' => 'Conversion tracked for guest']);
            return;
        }
        
        try {
            // Record conversion
            $stmt = $this->db->prepare("
                INSERT INTO conversions 
                (user_id, conversion_type, original_filename, file_size, pages_converted, output_format, quality_setting, ip_address) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $user_id,
                $conversion_type,
                $filename,
                $file_size,
                $pages_converted,
                $output_format,
                $quality_setting,
                $_SERVER['REMOTE_ADDR'] ?? ''
            ]);
            
            // Update user conversion count
            $stmt = $this->db->prepare("UPDATE users SET conversions_used = conversions_used + 1 WHERE id = ?");
            $stmt->execute([$user_id]);
            
            $this->sendSuccess(['message' => 'Conversion tracked successfully']);
        } catch (Exception $e) {
            $this->sendError('Failed to track conversion: ' . $e->getMessage(), 500);
        }
    }
    
    private function getHistory() {
        $user_id = $_SESSION['user_id'] ?? null;
        
        if (!$user_id) {
            $this->sendError('Not authenticated', 401);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                SELECT conversion_type, original_filename, file_size, pages_converted, 
                       output_format, quality_setting, created_at 
                FROM conversions 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 50
            ");
            $stmt->execute([$user_id]);
            $conversions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess(['conversions' => $conversions]);
        } catch (Exception $e) {
            $this->sendError('Failed to get history: ' . $e->getMessage(), 500);
        }
    }
    
    private function getStats() {
        $user_id = $_SESSION['user_id'] ?? null;
        
        if (!$user_id) {
            $this->sendError('Not authenticated', 401);
            return;
        }
        
        try {
            // Get user info
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get monthly stats
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as monthly_conversions 
                FROM conversions 
                WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $stmt->execute([$user_id]);
            $monthly = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get total conversions
            $stmt = $this->db->prepare("SELECT COUNT(*) as total_conversions FROM conversions WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $total = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $remaining = $user['conversions_limit'] > 0 ? 
                max(0, $user['conversions_limit'] - $user['conversions_used']) : -1;
            
            $this->sendSuccess([
                'stats' => [
                    'total_conversions' => $total['total_conversions'],
                    'monthly_conversions' => $monthly['monthly_conversions'],
                    'conversions_used' => $user['conversions_used'],
                    'conversions_limit' => $user['conversions_limit'],
                    'remaining_conversions' => $remaining,
                    'plan_type' => $user['plan_type'],
                    'max_file_size' => $user['max_file_size']
                ]
            ]);
        } catch (Exception $e) {
            $this->sendError('Failed to get stats: ' . $e->getMessage(), 500);
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
$api = new ConversionsAPI();
$api->handleRequest();
?>
