<?php
/**
 * AI Service for Chat with PDF functionality
 * Supports OpenAI and Claude APIs
 */

require_once __DIR__ . '/../config/env.php';

class AIService {
    private $config;
    private $provider;

    public function __construct() {
        $this->config = Env::getAIConfig();
        $this->provider = $this->config['provider'];
    }

    /**
     * Chat with PDF content
     */
    public function chatWithPDF($message, $pdfContent = '', $conversationHistory = []) {
        if (!Env::isFeatureEnabled('AI_CHAT')) {
            throw new Exception('AI Chat feature is disabled');
        }

        // Check if we should mock responses for development
        if (Env::get('MOCK_AI_RESPONSES', false)) {
            return $this->getMockResponse($message);
        }

        switch ($this->provider) {
            case 'openai':
                return $this->chatWithOpenAI($message, $pdfContent, $conversationHistory);
            case 'claude':
                return $this->chatWithClaude($message, $pdfContent, $conversationHistory);
            default:
                throw new Exception('Unsupported AI provider: ' . $this->provider);
        }
    }

    /**
     * Chat with OpenAI API
     */
    private function chatWithOpenAI($message, $pdfContent, $conversationHistory) {
        $apiKey = $this->config['openai']['api_key'];
        if (!$apiKey) {
            throw new Exception('OpenAI API key not configured');
        }

        $messages = [];
        
        // Add system prompt
        $systemPrompt = $this->config['system_prompt'];
        if ($pdfContent) {
            $systemPrompt .= "\n\nPDF Content:\n" . substr($pdfContent, 0, 8000); // Limit content size
        }
        
        $messages[] = [
            'role' => 'system',
            'content' => $systemPrompt
        ];

        // Add conversation history
        foreach ($conversationHistory as $msg) {
            $messages[] = [
                'role' => $msg['role'],
                'content' => $msg['content']
            ];
        }

        // Add current message
        $messages[] = [
            'role' => 'user',
            'content' => $message
        ];

        $data = [
            'model' => $this->config['openai']['model'],
            'messages' => $messages,
            'max_tokens' => $this->config['openai']['max_tokens'],
            'temperature' => $this->config['temperature']
        ];

        $response = $this->makeOpenAIRequest('https://api.openai.com/v1/chat/completions', $data, $apiKey);
        
        if (isset($response['choices'][0]['message']['content'])) {
            return [
                'success' => true,
                'response' => $response['choices'][0]['message']['content'],
                'usage' => $response['usage'] ?? null
            ];
        } else {
            throw new Exception('Invalid response from OpenAI API');
        }
    }

    /**
     * Chat with Claude API
     */
    private function chatWithClaude($message, $pdfContent, $conversationHistory) {
        $apiKey = $this->config['claude']['api_key'];
        if (!$apiKey) {
            throw new Exception('Claude API key not configured');
        }

        $systemPrompt = $this->config['system_prompt'];
        if ($pdfContent) {
            $systemPrompt .= "\n\nPDF Content:\n" . substr($pdfContent, 0, 8000);
        }

        $messages = [];
        
        // Add conversation history
        foreach ($conversationHistory as $msg) {
            $messages[] = [
                'role' => $msg['role'],
                'content' => $msg['content']
            ];
        }

        // Add current message
        $messages[] = [
            'role' => 'user',
            'content' => $message
        ];

        $data = [
            'model' => $this->config['claude']['model'],
            'max_tokens' => $this->config['claude']['max_tokens'],
            'temperature' => $this->config['temperature'],
            'system' => $systemPrompt,
            'messages' => $messages
        ];

        $response = $this->makeClaudeRequest('https://api.anthropic.com/v1/messages', $data, $apiKey);
        
        if (isset($response['content'][0]['text'])) {
            return [
                'success' => true,
                'response' => $response['content'][0]['text'],
                'usage' => $response['usage'] ?? null
            ];
        } else {
            throw new Exception('Invalid response from Claude API');
        }
    }

    /**
     * Make request to OpenAI API
     */
    private function makeOpenAIRequest($url, $data, $apiKey) {
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ];

        return $this->makeHTTPRequest($url, $data, $headers);
    }

    /**
     * Make request to Claude API
     */
    private function makeClaudeRequest($url, $data, $apiKey) {
        $headers = [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ];

        return $this->makeHTTPRequest($url, $data, $headers);
    }

    /**
     * Make HTTP request
     */
    private function makeHTTPRequest($url, $data, $headers) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);

        if ($error) {
            throw new Exception('cURL error: ' . $error);
        }

        if ($httpCode !== 200) {
            $errorData = json_decode($response, true);
            $errorMessage = $errorData['error']['message'] ?? 'HTTP error: ' . $httpCode;
            throw new Exception($errorMessage);
        }

        $decodedResponse = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response');
        }

        return $decodedResponse;
    }

    /**
     * Get mock response for development
     */
    private function getMockResponse($message) {
        $mockResponses = [
            'What is this document about?' => 'This appears to be a PDF document. I can help you analyze its content once you upload it.',
            'Summarize the content' => 'Here\'s a summary of the document: This is a mock response for development purposes. The actual AI will analyze your PDF content.',
            'What are the key points?' => 'Key points from the document:\n1. This is a development mock response\n2. Real AI will analyze actual PDF content\n3. Multiple AI providers are supported',
            'default' => 'I\'m ready to help you analyze your PDF document. This is a mock response for development. Please upload a PDF and ask your question!'
        ];

        $response = $mockResponses[strtolower($message)] ?? $mockResponses['default'];

        return [
            'success' => true,
            'response' => $response,
            'usage' => [
                'prompt_tokens' => 50,
                'completion_tokens' => 30,
                'total_tokens' => 80
            ],
            'mock' => true
        ];
    }

    /**
     * Extract text from PDF (placeholder - would need actual PDF parsing)
     */
    public function extractPDFText($filePath) {
        // This is a placeholder. In a real implementation, you would use:
        // - pdfparser library
        // - Smalot\PdfParser
        // - Or external service like AWS Textract
        
        if (!file_exists($filePath)) {
            throw new Exception('PDF file not found');
        }

        // Mock text extraction for development
        return "This is mock extracted text from the PDF. In production, this would contain the actual PDF content extracted using a PDF parsing library.";
    }

    /**
     * Get available AI providers
     */
    public function getAvailableProviders() {
        $providers = [];
        
        if ($this->config['openai']['api_key']) {
            $providers[] = 'openai';
        }
        
        if ($this->config['claude']['api_key']) {
            $providers[] = 'claude';
        }

        return $providers;
    }

    /**
     * Switch AI provider
     */
    public function setProvider($provider) {
        $available = $this->getAvailableProviders();
        if (!in_array($provider, $available)) {
            throw new Exception('Provider not available or not configured: ' . $provider);
        }
        
        $this->provider = $provider;
        return true;
    }

    /**
     * Get current provider
     */
    public function getProvider() {
        return $this->provider;
    }

    /**
     * Get provider configuration
     */
    public function getProviderConfig() {
        return [
            'current_provider' => $this->provider,
            'available_providers' => $this->getAvailableProviders(),
            'features_enabled' => [
                'ai_chat' => Env::isFeatureEnabled('AI_CHAT'),
                'mock_responses' => Env::get('MOCK_AI_RESPONSES', false)
            ]
        ];
    }
}
?>
