<?php
/**
 * Authentication API
 * Simple PHP authentication for File Converter SaaS
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    require_once __DIR__ . '/../config/database.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load database config: ' . $e->getMessage(),
        'file' => __FILE__,
        'line' => __LINE__
    ]);
    exit;
}

class AuthAPI {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        session_start();

        // Check if database is available
        if (!$this->db) {
            $this->databaseAvailable = false;
        } else {
            $this->databaseAvailable = true;

            // Check if tables exist
            try {
                $stmt = $this->db->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");
                $tableExists = $stmt->fetchColumn() > 0;
                if (!$tableExists) {
                    $this->databaseAvailable = false;
                    error_log("Database tables not found. Please run setup.php");
                }
            } catch (Exception $e) {
                $this->databaseAvailable = false;
                error_log("Database table check failed: " . $e->getMessage());
            }
        }
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'login':
                if ($method === 'POST') {
                    $this->login();
                }
                break;
            case 'register':
                if ($method === 'POST') {
                    $this->register();
                }
                break;
            case 'logout':
                if ($method === 'POST') {
                    $this->logout();
                }
                break;
            case 'me':
                if ($method === 'GET') {
                    $this->getCurrentUser();
                }
                break;
            case 'upgrade':
                if ($method === 'POST') {
                    $this->upgradePlan();
                }
                break;
            default:
                $this->sendError('Invalid action', 400);
        }
    }
    
    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            $this->sendError('Email and password required', 400);
            return;
        }

        if (!$this->databaseAvailable) {
            $this->sendError('Database not available. Please run setup.php to initialize the database.', 503);
            return;
        }

        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user && password_verify($password, $user['password_hash'])) {
                // Create session
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_email'] = $user['email'];
                
                // Remove sensitive data
                unset($user['password_hash']);
                
                $this->sendSuccess([
                    'message' => 'Login successful',
                    'user' => $user
                ]);
            } else {
                $this->sendError('Invalid credentials', 401);
            }
        } catch (Exception $e) {
            $this->sendError('Login failed: ' . $e->getMessage(), 500);
        }
    }
    
    private function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            $this->sendError('Name, email and password required', 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->sendError('Invalid email format', 400);
            return;
        }

        if (strlen($password) < 6) {
            $this->sendError('Password must be at least 6 characters', 400);
            return;
        }

        if (!$this->databaseAvailable) {
            $this->sendError('Database not available. Please run setup.php to initialize the database.', 503);
            return;
        }
        
        try {
            // Check if user exists
            $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $this->sendError('User already exists', 409);
                return;
            }
            
            // Create user
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $this->db->prepare("
                INSERT INTO users (name, email, password_hash, plan_type, conversions_used, conversions_limit, max_file_size) 
                VALUES (?, ?, ?, 'free', 0, 10, 5242880)
            ");
            $stmt->execute([$name, $email, $password_hash]);
            
            $user_id = $this->db->lastInsertId();
            
            // Get created user
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            unset($user['password_hash']);
            
            // Create session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            
            $this->sendSuccess([
                'message' => 'Registration successful',
                'user' => $user
            ]);
        } catch (Exception $e) {
            $this->sendError('Registration failed: ' . $e->getMessage(), 500);
        }
    }
    
    private function logout() {
        session_destroy();
        $this->sendSuccess(['message' => 'Logout successful']);
    }
    
    private function getCurrentUser() {
        if (!isset($_SESSION['user_id'])) {
            $this->sendError('Not authenticated', 401);
            return;
        }

        if (!$this->databaseAvailable) {
            $this->sendError('Database not available', 503);
            return;
        }

        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                unset($user['password_hash']);
                $this->sendSuccess(['user' => $user]);
            } else {
                $this->sendError('User not found', 404);
            }
        } catch (Exception $e) {
            $this->sendError('Failed to get user: ' . $e->getMessage(), 500);
        }
    }
    
    private function upgradePlan() {
        if (!isset($_SESSION['user_id'])) {
            $this->sendError('Not authenticated', 401);
            return;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $plan = $input['plan'] ?? '';
        
        $plans = [
            'pro' => ['limit' => 100, 'size' => 52428800], // 50MB
            'enterprise' => ['limit' => -1, 'size' => 524288000] // 500MB
        ];
        
        if (!isset($plans[$plan])) {
            $this->sendError('Invalid plan', 400);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                UPDATE users 
                SET plan_type = ?, conversions_limit = ?, max_file_size = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $plan,
                $plans[$plan]['limit'],
                $plans[$plan]['size'],
                $_SESSION['user_id']
            ]);
            
            $this->sendSuccess(['message' => "Upgraded to $plan plan successfully"]);
        } catch (Exception $e) {
            $this->sendError('Upgrade failed: ' . $e->getMessage(), 500);
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
try {
    $api = new AuthAPI();
    $api->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'API Error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
