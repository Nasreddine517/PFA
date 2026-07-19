import asyncio
import sys
sys.path.insert(0, r'c:\ESISA\Projet-PFA\PFA\back-end')
import httpx
from app.main import app

async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://testserver') as client:
        response = await client.get('/api/health')
        print(response.status_code)
        print(response.text)

asyncio.run(main())
