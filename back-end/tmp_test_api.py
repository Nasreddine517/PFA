import httpx, json, io
from PIL import Image

base = "http://127.0.0.1:8000/api"

# Register
r = httpx.post(f"{base}/auth/register", json={"email":"test@test.com","password":"Test1234!","firstName":"Test","lastName":"User"})
print("Register:", r.status_code, r.text[:200])

# Login
r = httpx.post(f"{base}/auth/login", data={"username":"test@test.com","password":"Test1234!"})
print("Login:", r.status_code)
token = r.json().get("access_token","")
print("Token:", token[:40], "...")

# Upload
buf = io.BytesIO()
Image.new("RGB", (224, 224), color=(128, 128, 128)).save(buf, format="PNG")
buf.seek(0)

r = httpx.post(
    f"{base}/scans/upload",
    headers={"Authorization": f"Bearer {token}"},
    files={"file": ("test.png", buf, "image/png")},
    timeout=120,
)
print("Upload:", r.status_code, r.text[:500])
