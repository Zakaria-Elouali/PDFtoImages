<?php
/**
 * Environment Configuration Loader
 * Loads environment variables from .env file
 */

class Env {
    private static $loaded = false;
    private static $variables = [];

    /**
     * Load environment variables from .env file
     */
    public static function load($path = null) {
        if (self::$loaded) {
            return;
        }

        if ($path === null) {
            $path = __DIR__ . '/../.env';
        }

        if (!file_exists($path)) {
            // Try to load from .env.example if .env doesn't exist
            $examplePath = __DIR__ . '/../.env.example';
            if (file_exists($examplePath)) {
                error_log("Warning: .env file not found, using .env.example");
                $path = $examplePath;
            } else {
                error_log("Warning: No .env file found at: " . $path);
                self::$loaded = true;
                return;
            }
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse key=value pairs
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Remove quotes if present
                if (preg_match('/^"(.*)"$/', $value, $matches)) {
                    $value = $matches[1];
                } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
                    $value = $matches[1];
                }

                // Set environment variable
                $_ENV[$key] = $value;
                putenv("$key=$value");
                self::$variables[$key] = $value;
            }
        }

        self::$loaded = true;
    }

    /**
     * Get environment variable value
     */
    public static function get($key, $default = null) {
        self::load();

        // Check $_ENV first
        if (isset($_ENV[$key])) {
            return self::parseValue($_ENV[$key]);
        }

        // Check getenv()
        $value = getenv($key);
        if ($value !== false) {
            return self::parseValue($value);
        }

        // Check our loaded variables
        if (isset(self::$variables[$key])) {
            return self::parseValue(self::$variables[$key]);
        }

        return $default;
    }

    /**
     * Parse environment variable value to appropriate type
     */
    private static function parseValue($value) {
        // Handle boolean values
        if (in_array(strtolower($value), ['true', 'false'])) {
            return strtolower($value) === 'true';
        }

        // Handle numeric values
        if (is_numeric($value)) {
            return strpos($value, '.') !== false ? (float)$value : (int)$value;
        }

        // Handle null
        if (strtolower($value) === 'null') {
            return null;
        }

        return $value;
    }

    /**
     * Check if environment variable exists
     */
    public static function has($key) {
        self::load();
        return isset($_ENV[$key]) || getenv($key) !== false || isset(self::$variables[$key]);
    }

    /**
     * Get all environment variables
     */
    public static function all() {
        self::load();
        return array_merge(self::$variables, $_ENV);
    }

    /**
     * Set environment variable (for testing)
     */
    public static function set($key, $value) {
        $_ENV[$key] = $value;
        putenv("$key=$value");
        self::$variables[$key] = $value;
    }

    /**
     * Get database configuration from environment
     */
    public static function getDatabaseConfig() {
        return [
            'host' => self::get('DB_HOST', 'localhost'),
            'port' => self::get('DB_PORT', 5432),
            'dbname' => self::get('DB_NAME', 'converter_db'),
            'username' => self::get('DB_USERNAME', 'postgres'),
            'password' => self::get('DB_PASSWORD', ''),
        ];
    }

    /**
     * Get AI API configuration from environment
     */
    public static function getAIConfig() {
        return [
            'provider' => self::get('AI_PROVIDER', 'openai'),
            'openai' => [
                'api_key' => self::get('OPENAI_API_KEY'),
                'model' => self::get('OPENAI_MODEL', 'gpt-4'),
                'max_tokens' => self::get('OPENAI_MAX_TOKENS', 2000),
            ],
            'claude' => [
                'api_key' => self::get('CLAUDE_API_KEY'),
                'model' => self::get('CLAUDE_MODEL', 'claude-3-sonnet-20240229'),
                'max_tokens' => self::get('CLAUDE_MAX_TOKENS', 2000),
            ],
            'temperature' => self::get('AI_TEMPERATURE', 0.7),
            'system_prompt' => self::get('AI_SYSTEM_PROMPT', 'You are a helpful AI assistant.'),
        ];
    }

    /**
     * Get application configuration from environment
     */
    public static function getAppConfig() {
        return [
            'name' => self::get('APP_NAME', 'File Converter Suite'),
            'url' => self::get('APP_URL', 'http://localhost:8080'),
            'env' => self::get('APP_ENV', 'development'),
            'debug' => self::get('DEBUG', true),
            'jwt_secret' => self::get('JWT_SECRET'),
            'max_file_size' => self::get('MAX_FILE_SIZE', 52428800),
        ];
    }

    /**
     * Check if we're in development mode
     */
    public static function isDevelopment() {
        return self::get('APP_ENV', 'development') === 'development';
    }

    /**
     * Check if debug mode is enabled
     */
    public static function isDebug() {
        return self::get('DEBUG', false);
    }

    /**
     * Check if a feature is enabled
     */
    public static function isFeatureEnabled($feature) {
        return self::get("ENABLE_" . strtoupper($feature), false);
    }
}

// Auto-load environment variables when this file is included
Env::load();
?>
