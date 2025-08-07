<?php
/**
 * PostgreSQL Setup Script
 * Run this once to create database and tables
 */

require_once 'config/database.php';

echo "<h1>File Converter SaaS - PostgreSQL Setup</h1>";

try {
    // Create database connection (connect to postgres database first)
    $pdo = new PDO("pgsql:host=localhost;dbname=postgres", "postgres", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create database
    $pdo->exec("CREATE DATABASE file_converter_saas");
    echo "<p>✅ Database 'file_converter_saas' created successfully</p>";

    // Connect to the new database
    $pdo = new PDO("pgsql:host=localhost;dbname=file_converter_saas", "postgres", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Enable UUID extension
    $pdo->exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"");
    echo "<p>✅ UUID extension enabled</p>";

    // Create custom types
    $pdo->exec("
        DO \$\$ BEGIN
            CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END \$\$;
    ");
    echo "<p>✅ Plan type enum created</p>";

    $pdo->exec("
        DO \$\$ BEGIN
            CREATE TYPE conversion_type AS ENUM ('pdf-to-images', 'images-to-pdf', 'image-tools', 'pdf-tools', 'ai-chat');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END \$\$;
    ");
    echo "<p>✅ Conversion type enum created</p>";

    // Create users table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            plan_type plan_type DEFAULT 'free',
            conversions_used INTEGER DEFAULT 0,
            conversions_limit INTEGER DEFAULT 10,
            max_file_size BIGINT DEFAULT 5242880,
            stripe_customer_id VARCHAR(255),
            preferences JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ");
    echo "<p>✅ Users table created successfully</p>";
    
    // Create conversions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS conversions (
            id SERIAL PRIMARY KEY,
            uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            conversion_type conversion_type NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            file_size BIGINT NOT NULL,
            pages_converted INTEGER DEFAULT 1,
            output_format VARCHAR(20) NOT NULL,
            quality_setting VARCHAR(20) NOT NULL,
            ip_address INET,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ");
    echo "<p>✅ Conversions table created successfully</p>";
    
    // Create sessions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(128) PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            data JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
    ");
    echo "<p>✅ Sessions table created successfully</p>";
    
    // Create API keys table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,
            uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            api_key VARCHAR(64) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            calls_made INTEGER DEFAULT 0,
            calls_limit INTEGER DEFAULT 1000,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ");
    echo "<p>✅ API keys table created successfully</p>";
    
    // Insert demo users
    $demo_password = password_hash('demo123', PASSWORD_DEFAULT);
    $pro_password = password_hash('pro123', PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password_hash, plan_type, conversions_used, conversions_limit, max_file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (email) DO NOTHING
    ");
    
    // Demo free user
    $stmt->execute(['Demo User', 'demo@example.com', $demo_password, 'free', 3, 10, 5242880]);
    echo "<p>✅ Demo free user created (demo@example.com / demo123)</p>";
    
    // Demo pro user
    $stmt->execute(['Pro User', 'pro@example.com', $pro_password, 'pro', 25, 100, 52428800]);
    echo "<p>✅ Demo pro user created (pro@example.com / pro123)</p>";
    
    echo "<h2>🎉 Setup Complete!</h2>";
    echo "<p><strong>Next Steps:</strong></p>";
    echo "<ul>";
    echo "<li>Update database credentials in <code>config/database.php</code> if needed</li>";
    echo "<li>Test the API endpoints:</li>";
    echo "<ul>";
    echo "<li><code>backend/api/auth.php?action=login</code></li>";
    echo "<li><code>backend/api/conversions.php?action=check-limits</code></li>";
    echo "</ul>";
    echo "<li>Update frontend JavaScript to use PHP API</li>";
    echo "</ul>";
    
    echo "<h3>Demo Accounts:</h3>";
    echo "<table border='1' style='border-collapse: collapse; margin: 20px 0;'>";
    echo "<tr><th>Type</th><th>Email</th><th>Password</th><th>Limits</th></tr>";
    echo "<tr><td>Free</td><td>demo@example.com</td><td>demo123</td><td>10 conversions/month, 5MB files</td></tr>";
    echo "<tr><td>Pro</td><td>pro@example.com</td><td>pro123</td><td>100 conversions/month, 50MB files</td></tr>";
    echo "</table>";
    
} catch (PDOException $e) {
    echo "<p>❌ Error: " . $e->getMessage() . "</p>";
}
?>
