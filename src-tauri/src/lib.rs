use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use serde_json::Value;
use tauri_plugin_store;
use tokio::time::timeout;
use std::time::Duration;

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
async fn get_models(llm_address: String, auth: Option<Auth>) -> Result<String, String> {
    println!("get_models called with address: {}", llm_address);

    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };
    let url = format!("{}/api/tags", address.trim_end_matches('/'));
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
    model: String,
    prompt: String,
    auth: Option<Auth>,
) -> Result<String, String> {
    let address = if llm_address.starts_with("http://") || llm_address.starts_with("https://") {
        llm_address
    } else {
        format!("http://{}", llm_address)
    };

    let url = format!("{}/v1/chat/completions", address.trim_end_matches('/'));

    let client = Client::new();
    let mut request = client.post(&url).json(&serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
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
    Ok(answer)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_models,
            send_prompt,
            wake_on_lan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
