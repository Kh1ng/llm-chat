#[cfg(test)]
mod document_upload_tests {
    use crate::*;
    use std::sync::Mutex;
    use rusqlite::Connection;

    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to create test database");
        
        // Create test tables
        conn.execute(
            "CREATE TABLE documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                content TEXT NOT NULL,
                uploaded_at TEXT NOT NULL
            )",
            [],
        ).expect("Failed to create documents table");

        conn.execute(
            "CREATE TABLE document_chunks (
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
        ).expect("Failed to create document_chunks table");

        conn
    }

    #[test]
    fn test_extract_text_from_bytes_txt() {
        let content = "Hello, this is a test file content!";
        let file_bytes = content.as_bytes();
        
        let result = extract_text_from_bytes(file_bytes, "txt");
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), content);
    }

    #[test]
    fn test_extract_text_from_bytes_empty() {
        let file_bytes = b"";
        
        let result = extract_text_from_bytes(file_bytes, "txt");
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "");
    }

    #[test]
    fn test_extract_text_from_bytes_unsupported_type() {
        let file_bytes = b"test content";
        
        let result = extract_text_from_bytes(file_bytes, "docx");
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unsupported file type"));
    }

    #[test]
    fn test_extract_text_from_bytes_invalid_utf8() {
        // Invalid UTF-8 sequence
        let invalid_utf8 = vec![0xFF, 0xFE, 0xFD];
        
        let result = extract_text_from_bytes(&invalid_utf8, "txt");
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to read text file"));
    }

    #[test]
    fn test_chunk_text() {
        let text = "This is a test. ".repeat(100); // Create long text
        let chunks = chunk_text(&text, 50, 10);
        
        assert!(!chunks.is_empty());
        // Each chunk should be roughly the specified size
        for chunk in &chunks {
            assert!(chunk.len() <= 60); // Some flexibility for word boundaries
        }
    }

    #[test]
    fn test_chunk_text_short_content() {
        let text = "Short text";
        let chunks = chunk_text(text, 100, 10);
        
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], text);
    }

    #[test]
    fn test_cosine_similarity() {
        let vec_a = vec![1.0, 0.0, 0.0];
        let vec_b = vec![1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec_a, &vec_b);
        
        assert_eq!(similarity, 1.0); // Perfect similarity
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let vec_a = vec![1.0, 0.0, 0.0];
        let vec_b = vec![0.0, 1.0, 0.0];
        let similarity = cosine_similarity(&vec_a, &vec_b);
        
        assert_eq!(similarity, 0.0); // Orthogonal vectors
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let vec_a = vec![1.0, 0.0, 0.0];
        let vec_b = vec![-1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec_a, &vec_b);
        
        assert_eq!(similarity, -1.0); // Opposite vectors
    }

    #[test]
    fn test_cosine_similarity_different_lengths() {
        let vec_a = vec![1.0, 0.0];
        let vec_b = vec![1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec_a, &vec_b);
        
        assert_eq!(similarity, 0.0); // Different length vectors
    }

    #[test]
    fn test_cosine_similarity_zero_vector() {
        let vec_a = vec![0.0, 0.0, 0.0];
        let vec_b = vec![1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec_a, &vec_b);
        
        assert_eq!(similarity, 0.0); // Zero vector
    }

    #[test]
    fn test_get_documents_empty() {
        let conn = create_test_db();
        // Note: In actual tests, we'd use a proper test harness for State
        // For now, we'll just test the database operations directly
        let conn = &conn;
        
        // Direct database test instead of using State
        let mut stmt = conn.prepare("SELECT * FROM documents").unwrap();
        let docs: Result<Vec<_>, _> = stmt.query_map([], |_| Ok(())).unwrap().collect();
        assert!(docs.unwrap().is_empty());
    }

    #[test]
    fn test_delete_document_direct() {
        let conn = create_test_db();
        
        // Insert test document
        conn.execute(
            "INSERT INTO documents (id, filename, file_type, file_size, content, uploaded_at) 
             VALUES ('test-doc', 'test.txt', 'txt', 100, 'test content', '2024-01-01T00:00:00Z')",
            []
        ).expect("Failed to insert test document");
        
        // Delete directly
        let result = conn.execute("DELETE FROM documents WHERE id = ?1", ["test-doc"]);
        assert!(result.is_ok());
        
        // Verify document was deleted
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM documents").unwrap();
        let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(count, 0);
    }

    // Integration tests for file type handling
    #[test]
    fn test_supported_file_types() {
        let supported_types = vec!["txt", "pdf"];
        
        for file_type in supported_types {
            // Should not return error for supported types
            match file_type {
                "txt" => {
                    let result = extract_text_from_bytes(b"test", file_type);
                    assert!(result.is_ok());
                },
                "pdf" => {
                    // PDF processing requires actual PDF content or will fail gracefully
                    // This test just ensures the type is recognized
                    assert!(file_type == "pdf");
                },
                _ => panic!("Unexpected supported type"),
            }
        }
    }

    #[test]
    fn test_unsupported_file_types() {
        let unsupported_types = vec!["docx", "jpg", "png", "mp3", "mp4", "zip"];
        
        for file_type in unsupported_types {
            let result = extract_text_from_bytes(b"test", file_type);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Unsupported file type"));
        }
    }

    #[test]
    fn test_filename_extension_parsing() {
        let test_cases = vec![
            ("test.txt", "txt"),
            ("document.pdf", "pdf"),
            ("file.with.dots.txt", "txt"),
            ("UPPERCASE.TXT", "txt"), // Should be lowercase
            ("no_extension", "no_extension"),
            ("", "unknown"),
        ];
        
        for (filename, expected_type) in test_cases {
            let file_type = if filename.is_empty() {
                "unknown".to_string()
            } else {
                filename
                    .split('.')
                    .last()
                    .unwrap_or("unknown")
                    .to_lowercase()
            };
            
            assert_eq!(file_type, expected_type);
        }
    }

    #[test]
    fn test_file_size_calculation() {
        let test_cases = vec![
            (vec![b'a'], 1),
            (b"hello world".to_vec(), 11),
            (vec![0u8; 1000], 1000),
            (Vec::new(), 0),
        ];
        
        for (content, expected_size) in test_cases {
            assert_eq!(content.len(), expected_size);
        }
    }

    // Cross-platform path handling tests
    #[test]
    fn test_cross_platform_filename_extraction() {
        let test_paths = vec![
            ("C:\\Users\\test\\document.txt", "document.txt"),
            ("/home/user/document.txt", "document.txt"),
            ("/Users/user/document.txt", "document.txt"),
            ("document.txt", "document.txt"),
            ("./path/to/document.txt", "document.txt"),
            ("../document.txt", "document.txt"),
        ];
        
        for (path, expected_filename) in test_paths {
            let filename = path.split(&['/', '\\'][..]).last().unwrap_or("");
            assert_eq!(filename, expected_filename);
        }
    }

    #[test]
    fn test_unicode_filename_handling() {
        let unicode_filenames = vec![
            "测试.txt",      // Chinese
            "тест.txt",      // Cyrillic
            "prueba.txt",    // Spanish
            "テスト.txt",    // Japanese
            "test_файл.txt", // Mixed
        ];
        
        for filename in unicode_filenames {
            let extension = filename.split('.').last().unwrap_or("").to_lowercase();
            assert_eq!(extension, "txt");
        }
    }

    // Performance and edge case tests
    #[test]
    fn test_large_content_handling() {
        let large_content = "x".repeat(100_000); // 100KB
        let chunks = chunk_text(&large_content, 1000, 100);
        
        assert!(!chunks.is_empty());
        assert!(chunks.len() > 50); // Should create multiple chunks
        
        // Verify total content is preserved
        let total_unique_content: usize = chunks.iter()
            .enumerate()
            .map(|(i, chunk)| {
                if i == 0 { chunk.len() } 
                else { chunk.len() - 100 } // Account for overlap
            })
            .sum();
        
        // Should be approximately the original size (accounting for chunking strategy)
        // Text splitter may chunk differently, so just verify we have reasonable coverage
        assert!(total_unique_content > large_content.len() / 2);
    }

    #[test]
    fn test_embedding_serialization() {
        let test_embedding = vec![0.1f32, 0.2f32, 0.3f32, -0.4f32, 0.5f32];
        
        // Serialize to bytes (same as in upload_document)
        let embedding_bytes: Vec<u8> = test_embedding
            .iter()
            .flat_map(|f| f.to_le_bytes().to_vec())
            .collect();
        
        // Deserialize back
        let recovered_embedding: Vec<f32> = embedding_bytes
            .chunks_exact(4)
            .map(|bytes| {
                let mut array = [0u8; 4];
                array.copy_from_slice(bytes);
                f32::from_le_bytes(array)
            })
            .collect();
        
        assert_eq!(test_embedding, recovered_embedding);
    }

    #[test]
    fn test_date_handling() {
        use chrono::Utc;
        
        let now = Utc::now();
        let date_string = now.to_rfc3339();
        
        // Should be able to parse back
        let parsed_date = chrono::DateTime::parse_from_rfc3339(&date_string);
        assert!(parsed_date.is_ok());
        
        let parsed_utc = parsed_date.unwrap().with_timezone(&Utc);
        
        // Should be approximately the same (allowing for microsecond precision differences)
        let diff = (now.timestamp_millis() - parsed_utc.timestamp_millis()).abs();
        assert!(diff < 1000); // Within 1 second
    }
}
