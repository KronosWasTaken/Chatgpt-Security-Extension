"""Test CORS for /api/v1/analyze/prompt endpoint"""
import pytest
from httpx import AsyncClient
from app.main import create_app


@pytest.mark.asyncio
async def test_preflight_options():
    """Test OPTIONS request returns 200/204 with CORS headers"""
    app = create_app()
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.options(
            "/api/v1/analyze/prompt",
            headers={
                "Origin": "chrome-extension://test",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        assert response.status_code in [200, 204]
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers


@pytest.mark.asyncio
async def test_post_valid_request():
    """Test POST with valid JSON"""
    app = create_app()
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/prompt",
            json={"text": "test prompt"},
            headers={"Origin": "chrome-extension://test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "isThreats" in data
        assert "threats" in data
        assert "riskLevel" in data


@pytest.mark.asyncio
async def test_post_invalid_schema():
    """Test POST with invalid JSON (missing text field)"""
    app = create_app()
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/prompt",
            json={"invalid": "field"},
            headers={"Origin": "http://localhost:3000"}
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        assert "text" in data["error"].lower()


@pytest.mark.asyncio
async def test_post_empty_text():
    """Test POST with empty text"""
    app = create_app()
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/prompt",
            json={"text": ""},
            headers={"Origin": "chrome-extension://test"}
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data


@pytest.mark.asyncio
async def test_cors_headers_chrome_extension():
    """Test CORS headers for Chrome extension origin"""
    app = create_app()
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/prompt",
            json={"text": "test"},
            headers={"Origin": "chrome-extension://mlpdekljhjogeahcnphfdmafdmjpdgkd"}
        )
        
        assert response.status_code == 200
        # Check CORS headers
        assert "access-control-allow-origin" in response.headers
        # Chrome extensions should get their origin back
        assert "chrome-extension://" in response.headers["access-control-allow-origin"]


@pytest.mark.asyncio
async def test_cors_headers_localhost():
    """Test CORS headers for localhost"""
    app = create_app()
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze/prompt",
            json={"text": "test"},
            headers={"Origin": "http://localhost:3000"}
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert "localhost:3000" in response.headers["access-control-allow-origin"]

