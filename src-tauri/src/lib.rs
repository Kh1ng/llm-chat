use reqwest::Client;
use serde_json::Value;
use tauri_plugin_store;
use base64::{engine::general_purpose, Engine as _};

#[derive(serde::Deserialize)]
struct Auth {
    #[serde(default = "default_type")]
    r#type: String,
    value: String,
    header_name: Option<String>,
}

fn default_type() -> String {
    "bearer".to_string()
}

#[tauri::command]
async fn get_models(llm_address: String, auth: Option<Auth>) -> Result<String, String> {
    println!("get_models called with address: {}", llm_address);
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };
    let url = format!("{}/api/tags", address.trim_end_matches('/'));
    println!("Full URL: {}", url);
    let client = Client::new();
    let mut request = client.get(&url);

    if let Some(auth) = auth {
        let header_name = auth.header_name.unwrap_or_else(|| "Authorization".to_string());
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

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    Ok(body.to_string())
}

#[tauri::command]
async fn send_prompt(llm_address: String, model: String, prompt: String, auth: Option<Auth>) -> Result<String, String> {
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };

    let url = format!("{}/api/chat", address.trim_end_matches('/'));

    let client = Client::new();
    let mut request = client
        .post(&url)
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "stream": false
        }));

    if let Some(auth) = auth {
        let header_name = auth.header_name.unwrap_or_else(|| "Authorization".to_string());
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

    let answer = json["message"].as_str().unwrap_or("No message found").to_string();
    Ok(answer)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_models, send_prompt])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
