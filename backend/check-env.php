<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Environment Configuration Check</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin: 20px 0;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #007bff;
            background: #f8f9fa;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9em;
        }
        .status.ok { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
        .config-item {
            margin: 10px 0;
            padding: 8px;
            background: white;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .instructions {
            background: #e3f2fd;
            border-left-color: #2196f3;
            margin-top: 30px;
        }
        code {
            background: #f1f1f1;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .copy-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.8em;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .config-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
            h1 {
                font-size: 1.5rem;
            }
            code {
                word-break: break-all;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Environment Configuration Check</h1>

        <?php
        require_once 'config/env.php';

        // Check if .env file exists
        $envExists = file_exists(__DIR__ . '/.env');
        $exampleExists = file_exists(__DIR__ . '/.env.example');
        ?>

        <div class="section">
            <h3>📁 Environment Files</h3>
            <div class="config-item">
                <span>.env file</span>
                <span class="status <?php echo $envExists ? 'ok' : 'error'; ?>">
                    <?php echo $envExists ? '✅ Found' : '❌ Missing'; ?>
                </span>
            </div>
            <div class="config-item">
                <span>.env.example file</span>
                <span class="status <?php echo $exampleExists ? 'ok' : 'warning'; ?>">
                    <?php echo $exampleExists ? '✅ Found' : '⚠️ Missing'; ?>
                </span>
            </div>
        </div>

        <div class="section">
            <h3>🗄️ Database Configuration</h3>
            <?php
            $dbConfig = Env::getDatabaseConfig();
            $dbConfigured = !empty($dbConfig['host']) && !empty($dbConfig['dbname']);
            ?>
            <div class="config-item">
                <span>Database Host</span>
                <span><?php echo $dbConfig['host'] ?: 'Not set'; ?></span>
            </div>
            <div class="config-item">
                <span>Database Name</span>
                <span><?php echo $dbConfig['dbname'] ?: 'Not set'; ?></span>
            </div>
            <div class="config-item">
                <span>Database Username</span>
                <span><?php echo $dbConfig['username'] ?: 'Not set'; ?></span>
            </div>
            <div class="config-item">
                <span>Database Password</span>
                <span class="status <?php echo !empty($dbConfig['password']) ? 'ok' : 'warning'; ?>">
                    <?php echo !empty($dbConfig['password']) ? '✅ Set' : '⚠️ Empty'; ?>
                </span>
            </div>
        </div>

        <div class="section">
            <h3>🤖 AI Configuration</h3>
            <?php
            $aiConfig = Env::getAIConfig();
            $openaiConfigured = !empty($aiConfig['openai']['api_key']);
            $claudeConfigured = !empty($aiConfig['claude']['api_key']);
            ?>
            <div class="config-item">
                <span>AI Provider</span>
                <span><?php echo $aiConfig['provider']; ?></span>
            </div>
            <div class="config-item">
                <span>OpenAI API Key</span>
                <span class="status <?php echo $openaiConfigured ? 'ok' : 'warning'; ?>">
                    <?php echo $openaiConfigured ? '✅ Configured' : '⚠️ Not set'; ?>
                </span>
            </div>
            <div class="config-item">
                <span>Claude API Key</span>
                <span class="status <?php echo $claudeConfigured ? 'ok' : 'warning'; ?>">
                    <?php echo $claudeConfigured ? '✅ Configured' : '⚠️ Not set'; ?>
                </span>
            </div>
            <div class="config-item">
                <span>AI Chat Enabled</span>
                <span class="status <?php echo Env::isFeatureEnabled('AI_CHAT') ? 'ok' : 'warning'; ?>">
                    <?php echo Env::isFeatureEnabled('AI_CHAT') ? '✅ Enabled' : '⚠️ Disabled'; ?>
                </span>
            </div>
        </div>

        <div class="section">
            <h3>⚙️ Application Configuration</h3>
            <?php
            $appConfig = Env::getAppConfig();
            ?>
            <div class="config-item">
                <span>App Name</span>
                <span><?php echo $appConfig['name']; ?></span>
            </div>
            <div class="config-item">
                <span>App URL</span>
                <span><?php echo $appConfig['url']; ?></span>
            </div>
            <div class="config-item">
                <span>Environment</span>
                <span><?php echo $appConfig['env']; ?></span>
            </div>
            <div class="config-item">
                <span>Debug Mode</span>
                <span class="status <?php echo $appConfig['debug'] ? 'warning' : 'ok'; ?>">
                    <?php echo $appConfig['debug'] ? '⚠️ Enabled' : '✅ Disabled'; ?>
                </span>
            </div>
            <div class="config-item">
                <span>JWT Secret</span>
                <span class="status <?php echo !empty($appConfig['jwt_secret']) ? 'ok' : 'error'; ?>">
                    <?php echo !empty($appConfig['jwt_secret']) ? '✅ Set' : '❌ Missing'; ?>
                </span>
            </div>
        </div>

        <div class="section">
            <h3>🔧 Feature Flags</h3>
            <?php
            $features = ['AI_CHAT', 'CLOUD_STORAGE', 'API_ACCESS', 'WEBHOOKS', 'ANALYTICS'];
            foreach ($features as $feature) {
                $enabled = Env::isFeatureEnabled($feature);
                echo "<div class='config-item'>";
                echo "<span>" . str_replace('_', ' ', $feature) . "</span>";
                echo "<span class='status " . ($enabled ? 'ok' : 'warning') . "'>";
                echo $enabled ? '✅ Enabled' : '⚠️ Disabled';
                echo "</span>";
                echo "</div>";
            }
            ?>
        </div>

        <?php if (!$envExists): ?>
        <div class="section instructions">
            <h3>📝 Setup Instructions</h3>
            <p><strong>Step 1:</strong> Copy the example environment file:</p>
            <code>cp backend/.env.example backend/.env</code>
            <button class="copy-button" onclick="copyToClipboard('cp backend/.env.example backend/.env')">Copy</button>
            
            <p><strong>Step 2:</strong> Edit the .env file with your configuration:</p>
            <ul>
                <li>Set your database credentials</li>
                <li>Add your AI API keys (OpenAI or Claude)</li>
                <li>Configure other settings as needed</li>
            </ul>
            
            <p><strong>Step 3:</strong> Refresh this page to check your configuration</p>
        </div>
        <?php endif; ?>

        <?php if (!$openaiConfigured && !$claudeConfigured && Env::isFeatureEnabled('AI_CHAT')): ?>
        <div class="section instructions">
            <h3>🤖 AI Setup Instructions</h3>
            <p>To enable AI chat functionality, you need to configure at least one AI provider:</p>
            
            <p><strong>Option 1: OpenAI</strong></p>
            <ol>
                <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI</a></li>
                <li>Add to your .env file: <code>OPENAI_API_KEY=sk-your_key_here</code></li>
            </ol>
            
            <p><strong>Option 2: Claude (Anthropic)</strong></p>
            <ol>
                <li>Get an API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic</a></li>
                <li>Add to your .env file: <code>CLAUDE_API_KEY=sk-ant-your_key_here</code></li>
            </ol>
        </div>
        <?php endif; ?>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
                alert('Copied to clipboard!');
            });
        }
    </script>
</body>
</html>
