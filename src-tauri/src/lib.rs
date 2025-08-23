use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tauri_plugin_store;
use tokio::time::timeout;
use rusqlite::{Connection, Result as SqliteResult};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::sync::Mutex;
use std::fs;
use tauri::State;
#[cfg(feature = "desktop-features")]
use text_splitter::TextSplitter;

#[derive(serde::Deserialize, Clone)]
struct Auth {
    #[serde(default = "default_type")]
    r#type: String,
    value: String,
    header_name: Option<String>,
}

fn default_type() -> String {
    "bearer".to_string()
}

// Database structures
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct Message {
    id: i64,
    conversation_id: String,
    role: String, // "user" or "assistant"
    content: String,
    timestamp: DateTime<Utc>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct Conversation {
    id: String,
    title: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct Document {
    id: String,
    filename: String,
    file_type: String, // "pdf", "txt", "docx", etc.
    file_size: i64,
    content: String, // Full extracted text
    uploaded_at: DateTime<Utc>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct DocumentChunk {
    id: String,
    document_id: String,
    chunk_index: i32,
    content: String,
    embedding: Vec<f32>, // Vector embedding
    token_count: i32,
    created_at: DateTime<Utc>,
}

// Database connection type
type DbConnection = Mutex<Connection>;

// Initialize database with mobile-compatible path
fn init_database() -> SqliteResult<Connection> {
    // Use app data directory for database on mobile platforms
    let db_path = if cfg!(target_os = "android") {
        // On Android, try to use the app's internal storage directory
        // If not available, use in-memory database as fallback
        match std::env::var("ANDROID_DATA") {
            Ok(data_dir) => format!("{}/data/tech.coltonspurgin.llmchat/llm_chat.db", data_dir),
            Err(_) => ":memory:".to_string(), // Use in-memory DB as fallback
        }
    } else if cfg!(target_os = "ios") {
        // On iOS, use the app's documents directory
        match std::env::var("HOME") {
            Ok(home) => format!("{}/Documents/llm_chat.db", home),
            Err(_) => "llm_chat.db".to_string(), // fallback
        }
    } else {
        "llm_chat.db".to_string()
    };
    
    let conn = Connection::open(&db_path)?;
    
    // Create conversations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    
    // Create messages table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id)
        )",
        [],
    )?;
    
    // Create documents table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            content TEXT NOT NULL,
            uploaded_at TEXT NOT NULL
        )",
        [],
    )?;
    
    // Create document_chunks table with vector embeddings
    conn.execute(
        "CREATE TABLE IF NOT EXISTS document_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding BLOB NOT NULL,
            token_count INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // Create index for chunk searches
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id)",
        [],
    )?;
    
    Ok(conn)
}

// Database operations
#[tauri::command]
fn create_conversation(
    db: State<DbConnection>
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let conversation_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    conn.execute(
        "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        [
            &conversation_id,
            "New Conversation",
            &now.to_rfc3339(),
            &now.to_rfc3339(),
        ],
    )
    .map_err(|e| format!("Failed to create conversation: {}", e))?;
    
    Ok(conversation_id)
}

#[tauri::command]
fn save_message(
    conversation_id: String,
    role: String,
    content: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    let now = Utc::now();
    
    conn.execute(
        "INSERT INTO messages (conversation_id, role, content, timestamp) VALUES (?1, ?2, ?3, ?4)",
        [
            &conversation_id,
            &role,
            &content,
            &now.to_rfc3339(),
        ],
    )
    .map_err(|e| format!("Failed to save message: {}", e))?;
    
    // Update conversation timestamp
    conn.execute(
        "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
        [&now.to_rfc3339(), &conversation_id],
    )
    .map_err(|e| format!("Failed to update conversation timestamp: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn get_conversation_history(
    conversation_id: String,
    limit: Option<i32>,
    db: State<DbConnection>,
) -> Result<Vec<Message>, String> {
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    let limit_value = limit.unwrap_or(50);
    
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, content, timestamp 
             FROM messages 
             WHERE conversation_id = ?1 
             ORDER BY timestamp ASC 
             LIMIT ?2"
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let messages = stmt
        .query_map([&conversation_id, &limit_value.to_string()], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;
    
    Ok(messages)
}

// RAG Document Processing Functions

// Extract text from different file types
fn extract_text_from_file(file_path: &str, file_type: &str) -> Result<String, String> {
    match file_type.to_lowercase().as_str() {
        "txt" => {
            fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read text file: {}", e))
        }
        "pdf" => {
            #[cfg(feature = "desktop-features")]
            {
                pdf_extract::extract_text(file_path)
                    .map_err(|e| format!("Failed to extract PDF text: {}", e))
            }
            #[cfg(not(feature = "desktop-features"))]
            {
                Err("PDF extraction not available on this platform".to_string())
            }
        }
        _ => Err(format!("Unsupported file type: {}", file_type))
    }
}

// Extract text from file bytes (for web/mobile upload)
fn extract_text_from_bytes(file_content: &[u8], file_type: &str) -> Result<String, String> {
    match file_type.to_lowercase().as_str() {
        "txt" => {
            String::from_utf8(file_content.to_vec())
                .map_err(|e| format!("Failed to read text file: {}", e))
        }
        "pdf" => {
            #[cfg(feature = "desktop-features")]
            {
                // For PDF, we need to write to a temp file and use pdf_extract
                // This is a temporary workaround until we find a pure bytes-based PDF parser
                use std::io::Write;
                
                // Choose appropriate temp directory based on platform
                let temp_dir = if cfg!(target_os = "ios") {
                    // On iOS, use the app's temp directory
                    match std::env::var("TMPDIR").or_else(|_| std::env::var("HOME")) {
                        Ok(dir) => std::path::PathBuf::from(dir).join("tmp"),
                        Err(_) => std::env::temp_dir(),
                    }
                } else {
                    std::env::temp_dir()
                };
                
                // Ensure temp directory exists
                if let Err(e) = fs::create_dir_all(&temp_dir) {
                    eprintln!("Warning: Failed to create temp directory: {}", e);
                }
                
                let temp_file = temp_dir.join(format!("temp_pdf_{}.pdf", uuid::Uuid::new_v4()));
                
                // Write bytes to temp file
                {
                    let mut file = fs::File::create(&temp_file)
                        .map_err(|e| format!("Failed to create temp file: {}", e))?;
                    file.write_all(file_content)
                        .map_err(|e| format!("Failed to write temp file: {}", e))?;
                }
                
                // Extract text from temp file with better error handling
                let extraction_result = pdf_extract::extract_text(&temp_file);
                
                // Clean up temp file
                if let Err(e) = fs::remove_file(&temp_file) {
                    eprintln!("Warning: Failed to clean up temp file: {}", e);
                }
                
                match extraction_result {
                    Ok(text) => {
                        let trimmed_text = text.trim();
                        println!("PDF extraction successful: {} characters", trimmed_text.len());
                        
                        if trimmed_text.is_empty() {
                            Ok("[PDF appears to be empty or contains no extractable text - this may be a scanned document]".to_string())
                        } else if trimmed_text.len() < 50 {
                            println!("Warning: PDF extraction yielded very little text: '{}'", trimmed_text);
                            Ok(format!("[PDF extraction yielded minimal text]: {}", trimmed_text))
                        } else {
                            Ok(trimmed_text.to_string())
                        }
                    }
                    Err(e) => {
                        println!("PDF extraction failed with error: {}", e);
                        Ok(format!("[PDF content could not be extracted - {}. This may be a complex PDF, scanned document, or contain primarily images]", e))
                    }
                }
            }
            #[cfg(not(feature = "desktop-features"))]
            {
                Err("PDF extraction not available on this platform".to_string())
            }
        }
        _ => Err(format!("Unsupported file type: {}", file_type))
    }
}

// Chunk text into smaller pieces for embeddings
fn chunk_text(text: &str, chunk_size: usize, _overlap: usize) -> Vec<String> {
    #[cfg(feature = "desktop-features")]
    {
        let splitter = TextSplitter::new(chunk_size);
        splitter.chunks(text).map(|s| s.to_string()).collect()
    }
    #[cfg(not(feature = "desktop-features"))]
    {
        // Fallback simple text chunking for mobile platforms
        let chars: Vec<char> = text.chars().collect();
        let mut chunks = Vec::new();
        let mut start = 0;
        
        while start < chars.len() {
            let end = std::cmp::min(start + chunk_size, chars.len());
            let chunk: String = chars[start..end].iter().collect();
            chunks.push(chunk);
            start = end;
        }
        
        chunks
    }
}

// Generate embeddings using the LLM server's embedding endpoint (with fallbacks)
async fn generate_embeddings(
    text: &str,
    llm_address: &str,
    llm_port: u16,
    auth: &Option<Auth>,
) -> Result<Vec<f32>, String> {
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address.to_string()
    } else {
        format!("http://{}", llm_address)
    };

    let has_port = address
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .contains(':');

    let base_url = if has_port {
        address.trim_end_matches('/').to_string()
    } else {
        format!("{}:{}", address.trim_end_matches('/'), llm_port)
    };

    // Try multiple embedding endpoints and models in order of preference
    let attempts = vec![
        // Try dedicated embedding models first (if available)
        (format!("{}/api/embed", base_url), serde_json::json!({
            "model": "nomic-embed-text",
            "input": text
        })),
        (format!("{}/api/embed", base_url), serde_json::json!({
            "model": "all-minilm",
            "input": text
        })),
        // Use available language models for embeddings (most Ollama setups support this)
        (format!("{}/api/embed", base_url), serde_json::json!({
            "model": "llama3:latest",
            "input": text
        })),
        (format!("{}/api/embed", base_url), serde_json::json!({
            "model": "mistral-nemo:12b",
            "input": text
        })),
        (format!("{}/api/embed", base_url), serde_json::json!({
            "model": "qwen2.5-coder:32b",
            "input": text
        })),
        // OpenAI compatible embedding endpoint
        (format!("{}/v1/embeddings", base_url), serde_json::json!({
            "model": "text-embedding-ada-002",
            "input": text
        })),
        // Legacy embeddings endpoint
        (format!("{}/api/embeddings", base_url), serde_json::json!({
            "model": "llama3:latest",
            "prompt": text
        })),
    ];

    let client = Client::builder()
        .timeout(Duration::from_secs(30)) // 30 second timeout for embeddings
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    for (url, body) in attempts {
        println!("Trying embedding endpoint: {} with model: {}", url, body["model"].as_str().unwrap_or("unknown"));
        
        let mut request = client.post(&url).json(&body);

        if let Some(auth) = auth {
            let header_name = auth.header_name.as_deref().unwrap_or("Authorization");
            let header_value = match auth.r#type.as_str() {
                "basic" => format!("Basic {}", general_purpose::STANDARD.encode(&auth.value)),
                "bearer" => format!("Bearer {}", auth.value),
                _ => auth.value.clone(),
            };
            if let (Ok(name), Ok(value)) = (
                reqwest::header::HeaderName::from_bytes(header_name.as_bytes()),
                reqwest::header::HeaderValue::from_str(&header_value)
            ) {
                request = request.header(name, value);
            }
        }

        match timeout(Duration::from_secs(30), request.send()).await {
            Ok(Ok(response)) if response.status().is_success() => {
                match timeout(Duration::from_secs(10), response.json::<Value>()).await {
                    Ok(Ok(json)) => {
                        // Try different response formats
                        if let Some(embedding) = json["embedding"].as_array() {
                            let vec: Result<Vec<f32>, _> = embedding
                                .iter()
                                .map(|v| v.as_f64().map(|f| f as f32).ok_or("Invalid embedding value"))
                                .collect();
                            if let Ok(embedding_vec) = vec {
                                println!("Successfully generated embedding with {} dimensions", embedding_vec.len());
                                return Ok(embedding_vec);
                            }
                        }
                        // Try OpenAI format
                        if let Some(data) = json["data"].as_array() {
                            if let Some(first) = data.get(0) {
                                if let Some(embedding) = first["embedding"].as_array() {
                                    let vec: Result<Vec<f32>, _> = embedding
                                        .iter()
                                        .map(|v| v.as_f64().map(|f| f as f32).ok_or("Invalid embedding value"))
                                        .collect();
                                    if let Ok(embedding_vec) = vec {
                                        println!("Successfully generated embedding with {} dimensions", embedding_vec.len());
                                        return Ok(embedding_vec);
                                    }
                                }
                            }
                        }

                        // Try Ollama format: { "embeddings": [[...]] }
                        if let Some(embeddings) = json["embeddings"].as_array() {
                            if let Some(first) = embeddings.get(0) {
                                if let Some(arr) = first.as_array() {
                                    let vec: Result<Vec<f32>, _> = arr
                                        .iter()
                                        .map(|v| v.as_f64().map(|f| f as f32).ok_or("Invalid embedding value"))
                                        .collect();
                                    if let Ok(embedding_vec) = vec {
                                        println!("Successfully generated embedding with {} dimensions (ollama)", embedding_vec.len());
                                        return Ok(embedding_vec);
                                    }
                                }
                            }
                        }

                        println!("Response format not recognized: {}", json);
                    }
                    Ok(Err(e)) => println!("Failed to parse JSON response: {}", e),
                    Err(_) => println!("Timeout parsing JSON response"),
                }
            }
            Ok(Ok(response)) => {
                let status = response.status();
                match timeout(Duration::from_secs(5), response.text()).await {
                    Ok(Ok(error_text)) => println!("HTTP {} Error: {}", status, error_text),
                    _ => println!("HTTP {} Error (could not read response)", status),
                }
            }
            Ok(Err(e)) => println!("Request failed: {}", e),
            Err(_) => println!("Request timeout"),
        }
    }
    
    // If all embedding attempts fail, return an error that can be handled gracefully
    Err("No embedding service available - document will be uploaded without vector search capability".to_string())
}

// Generate a simple hash-based "embedding" as fallback
fn generate_simple_embedding(text: &str) -> Vec<f32> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut embedding = vec![0.0f32; 384]; // Standard embedding dimension
    
    // Create a simple hash-based embedding
    for (i, word) in text.split_whitespace().take(384).enumerate() {
        let mut hasher = DefaultHasher::new();
        word.hash(&mut hasher);
        let hash = hasher.finish();
        embedding[i % 384] = (hash % 1000) as f32 / 1000.0; // Normalize to 0-1
    }
    
    embedding
}

// Calculate cosine similarity between two vectors
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }
    
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

// Simple text-based search fallback when embeddings are not available
fn simple_text_search(
    query: String,
    limit: Option<i32>,
    db: State<'_, DbConnection>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Get all chunks from database
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.document_id, c.chunk_index, c.content, d.filename 
             FROM document_chunks c 
             JOIN documents d ON c.document_id = d.id"
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let chunks = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?, // id
                row.get::<_, String>(1)?, // document_id
                row.get::<_, i32>(2)?,    // chunk_index
                row.get::<_, String>(3)?, // content
                row.get::<_, String>(4)?, // filename
            ))
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect chunks: {}", e))?;
    
    // Simple text matching based on word overlap
    let query_words: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .map(|w| w.to_string())
        .collect();
    
    let mut scored_chunks: Vec<(f32, String, String, i32, String, String)> = chunks
        .into_iter()
        .map(|(id, doc_id, chunk_idx, content, filename)| {
            let content_lower = content.to_lowercase();
            
            // Calculate simple word overlap score
            let mut score = 0.0f32;
            let mut matches = 0;
            
            for word in &query_words {
                if content_lower.contains(word) {
                    matches += 1;
                    // Boost score for exact word matches
                    score += 1.0;
                    
                    // Additional boost for multiple occurrences
                    let occurrences = content_lower.matches(word).count();
                    if occurrences > 1 {
                        score += (occurrences - 1) as f32 * 0.5;
                    }
                }
            }
            
            // Normalize by query length
            if !query_words.is_empty() {
                score = matches as f32 / query_words.len() as f32;
            }
            
            (score, id, doc_id, chunk_idx, content, filename)
        })
        .filter(|(score, _, _, _, _, _)| *score > 0.0) // Only include chunks with some matches
        .collect();
    
    // Sort by score (highest first)
    scored_chunks.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    
    // Return top results
    let limit = limit.unwrap_or(5) as usize;
    let results: Vec<serde_json::Value> = scored_chunks
        .into_iter()
        .take(limit)
        .map(|(score, id, doc_id, chunk_idx, content, filename)| {
            serde_json::json!({
                "id": id,
                "document_id": doc_id,
                "chunk_index": chunk_idx,
                "content": content,
                "filename": filename,
                "similarity": score // Use text match score as "similarity"
            })
        })
        .collect();
    
    Ok(results)
}

#[tauri::command]
async fn upload_document(
    file_content: Vec<u8>,
    filename: String,
    llm_address: String,
    llm_port: u16,
    auth: Option<Auth>,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    // Determine file type from filename
    let file_type = filename
        .split('.')
        .last()
        .unwrap_or("unknown")
        .to_lowercase();

    // Get file size from content
    let file_size = file_content.len() as i64;

    // Extract text content from file bytes
    let content = extract_text_from_bytes(&file_content, &file_type)?;
    
    // Create document record
    let document_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    // Save document to database
    {
        let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        conn.execute(
            "INSERT INTO documents (id, filename, file_type, file_size, content, uploaded_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            [
                &document_id,
                &filename,
                &file_type,
                &file_size.to_string(),
                &content,
                &now.to_rfc3339(),
            ],
        )
        .map_err(|e| format!("Failed to save document: {}", e))?;
    }

    // Chunk the document
    let chunks = chunk_text(&content, 1000, 200); // 1000 chars with 200 char overlap
    
    let mut embedding_success = true;
    let mut embedding_error: Option<String> = None;
    
    // Process each chunk
    for (index, chunk) in chunks.iter().enumerate() {
        // Try to generate embedding, but continue if it fails
        let embedding = match generate_embeddings(chunk, &llm_address, llm_port, &auth).await {
            Ok(emb) => emb,
            Err(e) => {
                // Log the error and use fallback embedding
                if embedding_success {
                    embedding_error = Some(e.clone());
                    embedding_success = false;
                    println!("Warning: Embedding generation failed, using fallback: {}", e);
                }
                generate_simple_embedding(chunk)
            }
        };
        
        // Serialize embedding to bytes
        let embedding_bytes: Vec<u8> = embedding
            .iter()
            .flat_map(|f| f.to_le_bytes().to_vec())
            .collect();
        
        let chunk_id = Uuid::new_v4().to_string();
        
        // Save chunk to database
        {
            let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
            conn.execute(
                "INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding, token_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    &chunk_id,
                    &document_id,
                    index as i32,
                    chunk,
                    &embedding_bytes,
                    chunk.len() as i32, // Rough token count
                    &now.to_rfc3339(),
                ],
            )
            .map_err(|e| format!("Failed to save chunk {}: {}", index, e))?;
        }
    }
    
    // If embeddings failed, return a warning message instead of success message
    if !embedding_success {
        if let Some(error) = embedding_error {
            return Ok(format!("{} (Warning: {})", document_id, error));
        }
    }
    
    Ok(document_id)
}

#[tauri::command]
async fn search_documents(
    query: String,
    limit: Option<i32>,
    llm_address: String,
    llm_port: u16,
    auth: Option<Auth>,
    db: State<'_, DbConnection>,
) -> Result<Vec<serde_json::Value>, String> {
    // Generate embedding for the query, with fallback
    let query_embedding = match generate_embeddings(&query, &llm_address, llm_port, &auth).await {
        Ok(emb) => emb,
        Err(e) => {
            println!("Warning: Query embedding generation failed, using simple text search: {}", e);
            // Fall back to simple text matching instead of semantic search
            return simple_text_search(query, limit, db);
        }
    };
    
    // Get all chunks from database
    let chunks = {
        let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
        let mut stmt = conn
            .prepare(
                "SELECT c.id, c.document_id, c.chunk_index, c.content, c.embedding, d.filename 
                 FROM document_chunks c 
                 JOIN documents d ON c.document_id = d.id"
            )
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        
        let chunk_iter = stmt
            .query_map([], |row| {
                let embedding_bytes: Vec<u8> = row.get(4)?;
                let embedding: Vec<f32> = embedding_bytes
                    .chunks_exact(4)
                    .map(|bytes| {
                        let mut array = [0u8; 4];
                        array.copy_from_slice(bytes);
                        f32::from_le_bytes(array)
                    })
                    .collect();
                
                Ok((
                    row.get::<_, String>(0)?, // id
                    row.get::<_, String>(1)?, // document_id
                    row.get::<_, i32>(2)?,    // chunk_index
                    row.get::<_, String>(3)?, // content
                    embedding,                 // embedding
                    row.get::<_, String>(5)?, // filename
                ))
            })
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect chunks: {}", e))?;
        
        chunk_iter
    };
    
    // Calculate similarities and rank chunks
    let mut similarities: Vec<_> = chunks
        .into_iter()
        .map(|(id, doc_id, chunk_idx, content, embedding, filename)| {
            let similarity = cosine_similarity(&query_embedding, &embedding);
            (similarity, id, doc_id, chunk_idx, content, filename)
        })
        .collect();
    
    // Sort by similarity (highest first)
    similarities.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    
    // Return top results
    let limit = limit.unwrap_or(5) as usize;
    let results: Vec<serde_json::Value> = similarities
        .into_iter()
        .take(limit)
        .map(|(similarity, id, doc_id, chunk_idx, content, filename)| {
            serde_json::json!({
                "id": id,
                "document_id": doc_id,
                "chunk_index": chunk_idx,
                "content": content,
                "filename": filename,
                "similarity": similarity
            })
        })
        .collect();
    
    Ok(results)
}

#[tauri::command]
fn get_documents(db: State<DbConnection>) -> Result<Vec<Document>, String> {
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, filename, file_type, file_size, content, uploaded_at 
             FROM documents 
             ORDER BY uploaded_at DESC"
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let documents = stmt
        .query_map([], |row| {
            Ok(Document {
                id: row.get(0)?,
                filename: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                content: row.get(4)?,
                uploaded_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;
    
    Ok(documents)
}

#[tauri::command]
fn test_delete() -> Result<String, String> {
    println!("test_delete called successfully!");
    Ok("Test delete command works!".to_string())
}

#[tauri::command]
fn delete_document(
    document_id: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    println!("delete_document called with document_id: {}", document_id);
    
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    // Delete document (chunks will be deleted via CASCADE)
    let rows_affected = conn.execute(
        "DELETE FROM documents WHERE id = ?1",
        [&document_id],
    )
    .map_err(|e| format!("Failed to delete document: {}", e))?;
    
    println!("Deleted {} rows for document_id: {}", rows_affected, document_id);
    
    if rows_affected == 0 {
        return Err(format!("No document found with id: {}", document_id));
    }
    
    Ok(())
}

#[tauri::command]
fn get_recent_messages(
    conversation_id: String,
    count: i32,
    db: State<DbConnection>,
) -> Result<Vec<Message>, String> {
    let conn = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, content, timestamp 
             FROM messages 
             WHERE conversation_id = ?1 
             ORDER BY timestamp DESC 
             LIMIT ?2"
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let mut messages = stmt
        .query_map([&conversation_id, &count.to_string()], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .unwrap()
                    .with_timezone(&Utc),
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;
    
    // Reverse to get chronological order
    messages.reverse();
    Ok(messages)
}

#[tauri::command]
fn wake_on_lan(profile: serde_json::Value) -> Result<(), String> {
    use std::net::UdpSocket;
    use std::{thread, time};

    let mac_address = profile["macAddress"]
        .as_str()
        .ok_or("Profile does not contain a valid macAddress")?;

    let broadcast_ip = profile["broadcastAddress"]
        .as_str()
        .unwrap_or("255.255.255.255")
        .trim_start_matches("http://")
        .trim_start_matches("https://");

    // Default WoL port is 9
    let port = 9u16;
    // Always bind to 0.0.0.0 (all interfaces)
    let bind_address = "0.0.0.0";

    // Parse MAC address
    let mac_bytes: Vec<u8> = mac_address
        .split(|c| c == ':' || c == '-')
        .map(|b| u8::from_str_radix(b, 16))
        .collect::<Result<_, _>>()
        .map_err(|_| "Invalid MAC format")?;

    if mac_bytes.len() != 6 {
        return Err("MAC must have 6 bytes".into());
    }

    // Build magic packet
    let mut packet = vec![0xFF; 6];
    for _ in 0..16 {
        packet.extend(&mac_bytes);
    }

    let socket = UdpSocket::bind(format!("{bind_address}:0"))
        .map_err(|e| format!("Socket bind failed: {}", e))?;
    socket
        .set_broadcast(true)
        .map_err(|e| format!("Failed to enable broadcast: {}", e))?;

    let target = format!("{broadcast_ip}:{port}");
    println!("Sending magic packet to: {}", target);
    for _ in 0..3 {
        socket
            .send_to(&packet, &target)
            .map_err(|e| format!("Failed to send magic packet: {}", e))?;
        thread::sleep(time::Duration::from_millis(100));
    }

    Ok(())
}

#[tauri::command]
async fn get_models(
    llm_address: String,
    llm_port: u16,
    auth: Option<Auth>,
) -> Result<String, String> {
    println!("get_models called with address: {}", llm_address);

    // TODO: Clean up the input validation, probably need to be when users enters the info

    // Add http:// or https:// if not already included
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };

    // Check if the address already has a port
    let has_port = address
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .contains(':');

    let url = if has_port {
        format!("{}/api/tags", address.trim_end_matches('/'))
    } else {
        format!(
            "{}:{}/api/tags",
            address.trim_end_matches('/'),
            llm_port.to_string()
        )
    };

    println!("Full URL: {}", url);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Client creation error: {}", e))?;

    for attempt in 1..=3 {
        println!("Attempt {} to fetch models from {}", attempt, url);

        let mut request = client.get(&url);

        // Optional auth header
        if let Some(ref auth) = auth {
            let header_name = auth.header_name.as_deref().unwrap_or("Authorization");
            let header_value = match auth.r#type.as_str() {
                "basic" => format!("Basic {}", general_purpose::STANDARD.encode(&auth.value)),
                "bearer" => format!("Bearer {}", auth.value),
                _ => auth.value.clone(),
            };

            request = request.header(
                reqwest::header::HeaderName::from_bytes(header_name.as_bytes())
                    .map_err(|e| format!("Invalid header name: {}", e))?,
                reqwest::header::HeaderValue::from_str(&header_value)
                    .map_err(|e| format!("Invalid header value: {}", e))?,
            );
        }

        match timeout(Duration::from_secs(3), request.send()).await {
            Ok(Ok(response)) => {
                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    println!(
                        "HTTP {} Error: {}\n{}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    );
                } else {
                    // Only parse JSON if status is OK
                    match response.json::<Value>().await {
                        Ok(body) => return Ok(body.to_string()),
                        Err(e) => println!("Invalid JSON: {}", e),
                    }
                }
            }
            Ok(Err(e)) => {
                println!("Request failed: {}", e);
            }
            Err(_) => {
                println!("Timeout occurred on attempt {}", attempt);
            }
        }

        if attempt < 3 {
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }

    Err("Failed to fetch models after 3 attempts.".to_string())
}

#[tauri::command]
async fn send_prompt(
    llm_address: String,
    llm_port: u16,
    model: String,
    prompt: String,
    conversation_id: Option<String>,
    use_rag: Option<bool>,
    auth: Option<Auth>,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };

    // Check if the address already has a port
    let has_port = address
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .contains(':');

    let url = if has_port {
        format!("{}/v1/chat/completions", address.trim_end_matches('/'))
    } else {
        format!(
            "{}:{}/v1/chat/completions",
            address.trim_end_matches('/'),
            llm_port
        )
    };

    // Build messages array with conversation history
    let mut messages = Vec::new();
    
    // If we have a conversation ID, load recent messages for context
    if let Some(conv_id) = &conversation_id {
        match get_recent_messages(conv_id.clone(), 5, db.clone()) {
            Ok(history) => {
                for msg in history {
                    messages.push(serde_json::json!({
                        "role": msg.role,
                        "content": msg.content
                    }));
                }
            }
            Err(e) => {
                println!("Warning: Failed to load conversation history: {}", e);
                // Continue without history
            }
        }
    }
    
    // Build the final prompt with RAG context if enabled
    let final_prompt = if use_rag.unwrap_or(false) {
        // Search for relevant documents
        match search_documents(
            prompt.clone(),
            Some(3), // Get top 3 relevant chunks
            address.clone(),
            llm_port,
            auth.clone(),
            db.clone()
        ).await {
            Ok(search_results) => {
                if !search_results.is_empty() {
                    // Build context from search results
                    let mut context_parts = Vec::new();
                    for result in search_results {
                        let content = result["content"].as_str().unwrap_or("");
                        let filename = result["filename"].as_str().unwrap_or("unknown");
                        let similarity = result["similarity"].as_f64().unwrap_or(0.0);
                        
                        // Only include chunks with some similarity (> 0.1 for vector, any positive for text search)
                        if similarity > 0.1 {
                            context_parts.push(format!("[From {}]: {}", filename, content));
                            println!("RAG: Including chunk with similarity {:.3}: {}", similarity, content.chars().take(100).collect::<String>());
                        } else {
                            println!("RAG: Excluding chunk with low similarity {:.3}: {}", similarity, content.chars().take(50).collect::<String>());
                        }
                    }
                    
                    if !context_parts.is_empty() {
                        let context = context_parts.join("\n\n");
                        format!(
                            "Based on the following context from your documents, please answer the question. If the context doesn't contain relevant information, say so and answer based on your general knowledge.\n\nContext:\n{}\n\nQuestion: {}",
                            context,
                            prompt
                        )
                    } else {
                        format!("No relevant documents found. Question: {}", prompt)
                    }
                } else {
                    format!("No documents available. Question: {}", prompt)
                }
            }
            Err(e) => {
                println!("Warning: RAG search failed: {}", e);
                format!("(RAG search failed) Question: {}", prompt)
            }
        }
    } else {
        prompt.clone()
    };
    
    // Add the current user prompt (with or without RAG context)
    messages.push(serde_json::json!({
        "role": "user",
        "content": final_prompt
    }));

    let client = Client::new();
    let mut request = client.post(&url).json(&serde_json::json!({
        "model": model,
        "messages": messages
    }));

    if let Some(auth) = auth {
        let header_name = auth
            .header_name
            .unwrap_or_else(|| "Authorization".to_string());
        let header_value = match auth.r#type.as_str() {
            "basic" => format!("Basic {}", general_purpose::STANDARD.encode(auth.value)),
            "bearer" => format!("Bearer {}", auth.value),
            _ => auth.value,
        };
        request = request.header(
            reqwest::header::HeaderName::from_bytes(header_name.as_bytes()).unwrap(),
            reqwest::header::HeaderValue::from_str(&header_value).unwrap(),
        );
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "HTTP {} Error: {}\n{}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown"),
            error_text
        ));
    }

    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    println!("LLM raw response: {}", json);
    let answer = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No message found")
        .to_string();
    
    // Save both user prompt and assistant response to database if we have a conversation ID
    if let Some(conv_id) = conversation_id {
        // Save user message
        if let Err(e) = save_message(conv_id.clone(), "user".to_string(), prompt, db.clone()) {
            println!("Warning: Failed to save user message: {}", e);
        }
        
        // Save assistant response
        if let Err(e) = save_message(conv_id, "assistant".to_string(), answer.clone(), db) {
            println!("Warning: Failed to save assistant message: {}", e);
        }
    }
    
    Ok(answer)
}

// Tests module
mod tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let connection = init_database().expect("Failed to initialize database");
    let db = Mutex::new(connection);
    
    tauri::Builder::default()
        .manage(db)
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_models,
            send_prompt,
            wake_on_lan,
            create_conversation,
            save_message,
            get_conversation_history,
            get_recent_messages,
            upload_document,
            search_documents,
            get_documents,
            delete_document,
            test_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
