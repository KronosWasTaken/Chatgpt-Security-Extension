#!/usr/bin/env python3
"""
Test script for file scanning integration between extension and backend
"""

import asyncio
import json
from pathlib import Path
import tempfile
import os

# Mock test files
def create_test_files():
    """Create test files for scanning"""
    test_files = {}
    
    # Test 1: Sensitive file (.env)
    env_content = """
DATABASE_URL=postgresql://user:password@localhost:5432/db
API_KEY=sk-1234567890abcdef
SECRET_TOKEN=super_secret_token_123
"""
    test_files['test.env'] = env_content
    
    # Test 2: Malicious file (.exe)
    test_files['malware.exe'] = b"MZ\x90\x00\x03\x00\x00\x00"  # Fake PE header
    
    # Test 3: File with PII
    pii_content = """
John Doe
SSN: 123-45-6789
Email: john.doe@example.com
Phone: (555) 123-4567
Credit Card: 4532-1234-5678-9012
"""
    test_files['personal_info.txt'] = pii_content
    
    # Test 4: Safe file
    safe_content = """
This is a safe document.
It contains no sensitive information.
Just regular text content.
"""
    test_files['safe_document.txt'] = safe_content
    
    return test_files

async def test_file_analysis_service():
    """Test the FileAnalysisService directly"""
    print(" Testing FileAnalysisService...")
    
    try:
        from app.services.file_analysis_service import FileAnalysisService
        
        test_files = create_test_files()
        
        for filename, content in test_files.items():
            print(f"\n Testing file: {filename}")
            
            if isinstance(content, str):
                content_bytes = content.encode('utf-8')
            else:
                content_bytes = content
            
            result = await FileAnalysisService.analyze_file(content_bytes, filename)
            
            print(f"   Success: {result['success']}")
            print(f"   Risk Level: {result['riskLevel']}")
            print(f"   Should Block: {result['shouldBlock']}")
            print(f"   Summary: {result['summary']}")
            
            if result['shouldBlock']:
                print(f"    Block Reason: {result['blockReason']}")
            
            if result['piiDetection']['hasPII']:
                print(f"   PII Detected: {result['piiDetection']['count']} patterns")
            
            if result['isSensitiveFile']:
                print(f"   Sensitive File: Yes")
            
            if result['isMaliciousFile']:
                print(f"   Malicious File: Yes")
    
    except ImportError as e:
        print(f" Import error: {e}")
        print("Make sure you're running this from the backend directory")
    except Exception as e:
        print(f" Test failed: {e}")

async def test_pattern_service():
    """Test the PatternService functions"""
    print("\n Testing PatternService...")
    
    try:
        from app.services.pattern_service import (
            is_sensitive_file, is_malicious_file, detect_pii
        )
        
        test_cases = [
            (".env", "sensitive"),
            ("config.json", "sensitive"),
            ("malware.exe", "malicious"),
            ("document.pdf", "safe"),
            ("id_rsa", "sensitive"),
            ("script.js", "malicious"),
        ]
        
        for filename, expected in test_cases:
            sensitive = is_sensitive_file(filename)
            malicious = is_malicious_file(filename)
            
            print(f"   {filename}:")
            print(f"    Sensitive: {sensitive}")
            print(f"    Malicious: {malicious}")
            
            # Test PII detection
            pii_text = "My SSN is 123-45-6789 and email is test@example.com"
            pii_result = detect_pii(pii_text)
            print(f"    PII Detection: {pii_result['hasPII']} ({pii_result['count']} patterns)")
    
    except ImportError as e:
        print(f" Import error: {e}")
    except Exception as e:
        print(f" Test failed: {e}")

def test_extension_integration():
    """Test extension integration (simulated)"""
    print("\n Testing Extension Integration (Backend-Only)...")
    
    # Simulate extension calling backend
    test_files = create_test_files()
    
    for filename, content in test_files.items():
        print(f"\n Simulating backend-only scan for: {filename}")
        
        # Simulate file size check
        if isinstance(content, str):
            file_size = len(content.encode('utf-8'))
        else:
            file_size = len(content)
        
        file_size_mb = file_size / (1024 * 1024)
        
        if file_size_mb > 32:
            print(f"   File too large: {file_size_mb:.2f}MB")
            continue
        
        print(f"   File size OK: {file_size_mb:.2f}MB")
        
        # Simulate backend API call (no local fallback)
        print(f"   Calling backend API (required)...")
        print(f"   POST /api/v1/scan/file")
        print(f"   Response: {{'success': True, 'riskLevel': 'medium', 'shouldBlock': True}}")
        print(f"   No local fallback - backend is mandatory")

async def main():
    """Run all tests"""
    print(" Starting File Scanning Integration Tests")
    print("=" * 50)
    
    # Test pattern service
    await test_pattern_service()
    
    # Test file analysis service
    await test_file_analysis_service()
    
    # Test extension integration
    test_extension_integration()
    
    print("\n" + "=" * 50)
    print(" All tests completed!")
    print("\n Summary:")
    print("  • Pattern matching:  Backend-only")
    print("  • PII detection:  Backend-only") 
    print("  • File analysis:  Backend-only")
    print("  • Extension integration:  Backend-only")
    print("  • Audit logging:  Backend-only")
    
    print("\n Next steps:")
    print("  1. Start the backend server")
    print("  2. Extension will automatically use backend API")
    print("  3. Test with real files in browser")
    print("  4. All file security logic is now centralized in backend")

if __name__ == "__main__":
    asyncio.run(main())
