<?php
/**
 * AI Configuration
 * Configure external AI APIs for document chat and processing
 */

class AIConfig {
    // OpenAI Configuration
    const OPENAI_API_KEY = 'your-openai-api-key-here';
    const OPENAI_MODEL = 'gpt-4-turbo-preview';
    const OPENAI_BASE_URL = 'https://api.openai.com/v1';
    
    // Claude Configuration (Anthropic)
    const CLAUDE_API_KEY = 'your-claude-api-key-here';
    const CLAUDE_MODEL = 'claude-3-sonnet-20240229';
    const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1';
    
    // Document Processing APIs
    const DOCUMENT_AI_PROVIDER = 'openai'; // 'openai', 'claude', or 'local'
    
    // File Processing APIs
    const REMOVE_BG_API_KEY = 'your-remove-bg-api-key';
    const TINIFY_API_KEY = 'your-tinify-api-key'; // For image compression
    
    public static function getAIProvider() {
        return self::DOCUMENT_AI_PROVIDER;
    }
    
    public static function getOpenAIConfig() {
        return [
            'api_key' => self::OPENAI_API_KEY,
            'model' => self::OPENAI_MODEL,
            'base_url' => self::OPENAI_BASE_URL
        ];
    }
    
    public static function getClaudeConfig() {
        return [
            'api_key' => self::CLAUDE_API_KEY,
            'model' => self::CLAUDE_MODEL,
            'base_url' => self::CLAUDE_BASE_URL
        ];
    }
    
    public static function getSystemPrompt() {
        return "You are an AI assistant specialized in file processing and document analysis. You can:

1. Convert PDFs to images with various quality settings
2. Convert images to PDFs
3. Remove backgrounds from images
4. Compress and resize images
5. Merge and split PDFs
6. Analyze document contents and answer questions about them
7. Extract text and data from documents

When users ask you to perform file operations, you should:
- Understand their intent clearly
- Call the appropriate tools using the MCP protocol
- Provide helpful feedback about the process
- Offer suggestions for optimization

For document chat:
- Read and analyze uploaded documents
- Answer questions about document contents
- Summarize documents when requested
- Extract specific information as needed

Always be helpful, accurate, and efficient in your responses.";
    }
    
    public static function getToolDefinitions() {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'convert_pdf_to_images',
                    'description' => 'Convert PDF pages to image files',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'file_ids' => [
                                'type' => 'array',
                                'items' => ['type' => 'integer'],
                                'description' => 'Array of file IDs to convert'
                            ],
                            'format' => [
                                'type' => 'string',
                                'enum' => ['png', 'jpeg'],
                                'description' => 'Output image format'
                            ],
                            'quality' => [
                                'type' => 'string',
                                'enum' => ['low', 'medium', 'high', 'ultra'],
                                'description' => 'Image quality setting'
                            ]
                        ],
                        'required' => ['file_ids']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'convert_images_to_pdf',
                    'description' => 'Convert multiple images into a single PDF',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'file_ids' => [
                                'type' => 'array',
                                'items' => ['type' => 'integer'],
                                'description' => 'Array of image file IDs'
                            ]
                        ],
                        'required' => ['file_ids']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'remove_background',
                    'description' => 'Remove background from images',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'file_ids' => [
                                'type' => 'array',
                                'items' => ['type' => 'integer'],
                                'description' => 'Array of image file IDs'
                            ]
                        ],
                        'required' => ['file_ids']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'compress_images',
                    'description' => 'Compress images to reduce file size',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'file_ids' => [
                                'type' => 'array',
                                'items' => ['type' => 'integer'],
                                'description' => 'Array of image file IDs'
                            ],
                            'quality' => [
                                'type' => 'integer',
                                'minimum' => 10,
                                'maximum' => 100,
                                'description' => 'Compression quality (10-100)'
                            ]
                        ],
                        'required' => ['file_ids']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'analyze_document',
                    'description' => 'Analyze document content and answer questions',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'file_ids' => [
                                'type' => 'array',
                                'items' => ['type' => 'integer'],
                                'description' => 'Array of document file IDs'
                            ],
                            'question' => [
                                'type' => 'string',
                                'description' => 'Question about the document'
                            ]
                        ],
                        'required' => ['file_ids']
                    ]
                ]
            ]
        ];
    }
}

/**
 * AI Service Interface
 */
class AIService {
    private $provider;
    private $config;
    
    public function __construct($provider = null) {
        $this->provider = $provider ?: AIConfig::getAIProvider();
        $this->config = $this->getProviderConfig();
    }
    
    private function getProviderConfig() {
        switch ($this->provider) {
            case 'openai':
                return AIConfig::getOpenAIConfig();
            case 'claude':
                return AIConfig::getClaudeConfig();
            default:
                throw new Exception('Unsupported AI provider: ' . $this->provider);
        }
    }
    
    public async function chatCompletion($messages, $tools = null) {
        switch ($this->provider) {
            case 'openai':
                return $this->openAIChatCompletion($messages, $tools);
            case 'claude':
                return $this->claudeChatCompletion($messages, $tools);
            default:
                throw new Exception('Unsupported provider for chat completion');
        }
    }
    
    private function openAIChatCompletion($messages, $tools) {
        $data = [
            'model' => $this->config['model'],
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 2000
        ];
        
        if ($tools) {
            $data['tools'] = $tools;
            $data['tool_choice'] = 'auto';
        }
        
        return $this->makeAPIRequest(
            $this->config['base_url'] . '/chat/completions',
            $data,
            [
                'Authorization: Bearer ' . $this->config['api_key'],
                'Content-Type: application/json'
            ]
        );
    }
    
    private function claudeChatCompletion($messages, $tools) {
        // Convert OpenAI format to Claude format
        $systemMessage = '';
        $userMessages = [];
        
        foreach ($messages as $message) {
            if ($message['role'] === 'system') {
                $systemMessage = $message['content'];
            } else {
                $userMessages[] = $message;
            }
        }
        
        $data = [
            'model' => $this->config['model'],
            'max_tokens' => 2000,
            'messages' => $userMessages
        ];
        
        if ($systemMessage) {
            $data['system'] = $systemMessage;
        }
        
        if ($tools) {
            $data['tools'] = $this->convertToolsToClaudeFormat($tools);
        }
        
        return $this->makeAPIRequest(
            $this->config['base_url'] . '/messages',
            $data,
            [
                'x-api-key: ' . $this->config['api_key'],
                'Content-Type: application/json',
                'anthropic-version: 2023-06-01'
            ]
        );
    }
    
    private function makeAPIRequest($url, $data, $headers) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('API request failed with code: ' . $httpCode);
        }
        
        return json_decode($response, true);
    }
    
    private function convertToolsToClaudeFormat($tools) {
        // Convert OpenAI tool format to Claude format
        $claudeTools = [];
        foreach ($tools as $tool) {
            $claudeTools[] = [
                'name' => $tool['function']['name'],
                'description' => $tool['function']['description'],
                'input_schema' => $tool['function']['parameters']
            ];
        }
        return $claudeTools;
    }
}
?>
