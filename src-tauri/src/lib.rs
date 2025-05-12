use reqwest::Client;
use serde_json::Value;
use tauri_plugin_store;

#[tauri::command]
async fn get_models(llm_address: String) -> Result<String, String> {
    println!("get_models called with address: {}", llm_address);
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };
    let url = format!("{}/api/tags", address.trim_end_matches('/'));
    println!("Full URL: {}", url);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch: {}", e))?;

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    Ok(body.to_string())
}

#[tauri::command]
async fn send_prompt(llm_address: String, model: String, prompt: String) -> Result<String, String> {
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };

    let url = format!("{}/api/chat", address.trim_end_matches('/'));

    let client = Client::new();
    let response = client
        .post(&url)
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

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
