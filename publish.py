import subprocess
import time
import re
import sys

def get_cloudflare_url(port):
    print(f"Starting tunnel for port {port}...")
    p = subprocess.Popen(
        f"npx --yes cloudflared tunnel --url http://127.0.0.1:{port}",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    
    url = None
    for _ in range(300):
        line = p.stdout.readline()
        if not line:
            time.sleep(0.1)
            continue
        match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line)
        if match:
            url = match.group(1)
            break
    
    if not url:
        print(f"Failed to get URL for port {port}")
        p.terminate()
        sys.exit(1)
        
    return url, p

def main():
    print("Preparing your public links...")
    backend_url, back_p = get_cloudflare_url(8000)
    print("Backend connected to:", backend_url)
    
    api_path = "src/lib/api.ts"
    with open(api_path, "r", encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(r'const API_URL = ".*";', f'const API_URL = "{backend_url}/api";', content)
    with open(api_path, "w", encoding='utf-8') as f:
        f.write(content)
    
    print("Vite hot-reloading frontend with new public backend link...")
    
    frontend_url, front_p = get_cloudflare_url(5173)
    with open("published_link.txt", "w") as f:
        f.write(frontend_url)
        
    print("\n" + "="*55)
    print("SUCCESS! Your application is live on the internet!")
    print("👉", frontend_url)
    print("="*55)
    print("Keep this terminal running. To close the connection, stop this script.")
    
    try:
        front_p.wait()
    except BaseException:
        back_p.terminate()
        front_p.terminate()

if __name__ == "__main__":
    main()
