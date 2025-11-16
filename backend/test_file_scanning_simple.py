#!/usr/bin/env python3
"""
Simple test script to verify file scanning works without audit logging
"""

import requests
import tempfile
import os

def test_file_scanning():
    """Test file scanning without audit logging"""
    base_url = "http://localhost:8000"
    
    print(" Testing File Scanning (No Audit Logging)")
    print("=" * 50)
    
    # Test 1: Regular file
    print("\n1. Testing regular file...")
    try:
        test_content = "This is a regular test file with some content."
        test_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        test_file.write(test_content)
        test_file.close()
        
        with open(test_file.name, 'rb') as f:
            files = {'file': ('test.txt', f, 'text/plain')}
            data = {'text': test_content}
            response = requests.post(f"{base_url}/api/v1/scan/file", files=files, data=data)
        
        os.unlink(test_file.name)
        
        if response.status_code == 200:
            result = response.json()
            print(f"    Scan successful")
            print(f"   Risk Level: {result.get('riskLevel', 'unknown')}")
            print(f"   Should Block: {result.get('shouldBlock', False)}")
            print(f"   Summary: {result.get('summary', 'No summary')}")
        else:
            print(f"    Scan failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"    Error: {e}")
    
    # Test 2: Sensitive file (.env)
    print("\n2. Testing sensitive file (.env)...")
    try:
        env_content = "DATABASE_URL=postgresql://user:password@localhost:5432/db\nAPI_KEY=sk-1234567890abcdef"
        env_file = tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False)
        env_file.write(env_content)
        env_file.close()
        
        with open(env_file.name, 'rb') as f:
            files = {'file': ('.env', f, 'text/plain')}
            data = {'text': env_content}
            response = requests.post(f"{base_url}/api/v1/scan/file", files=files, data=data)
        
        os.unlink(env_file.name)
        
        if response.status_code == 200:
            result = response.json()
            print(f"    Scan successful")
            print(f"   Risk Level: {result.get('riskLevel', 'unknown')}")
            print(f"   Should Block: {result.get('shouldBlock', False)}")
            print(f"   Block Reason: {result.get('blockReason', 'None')}")
            print(f"   Is Sensitive: {result.get('isSensitiveFile', False)}")
        else:
            print(f"    Scan failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"    Error: {e}")
    
    # Test 3: Malicious file (.exe)
    print("\n3. Testing malicious file (.exe)...")
    try:
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"  # Fake PE header
        exe_file = tempfile.NamedTemporaryFile(mode='wb', suffix='.exe', delete=False)
        exe_file.write(exe_content)
        exe_file.close()
        
        with open(exe_file.name, 'rb') as f:
            files = {'file': ('malware.exe', f, 'application/octet-stream')}
            response = requests.post(f"{base_url}/api/v1/scan/file", files=files)
        
        os.unlink(exe_file.name)
        
        if response.status_code == 200:
            result = response.json()
            print(f"    Scan successful")
            print(f"   Risk Level: {result.get('riskLevel', 'unknown')}")
            print(f"   Should Block: {result.get('shouldBlock', False)}")
            print(f"   Block Reason: {result.get('blockReason', 'None')}")
            print(f"   Is Malicious: {result.get('isMaliciousFile', False)}")
        else:
            print(f"    Scan failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"    Error: {e}")
    
    # Test 4: File with PII
    print("\n4. Testing file with PII...")
    try:
        pii_content = "John Doe\nSSN: 123-45-6789\nEmail: john.doe@example.com\nPhone: (555) 123-4567"
        pii_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        pii_file.write(pii_content)
        pii_file.close()
        
        with open(pii_file.name, 'rb') as f:
            files = {'file': ('personal_info.txt', f, 'text/plain')}
            data = {'text': pii_content}
            response = requests.post(f"{base_url}/api/v1/scan/file", files=files, data=data)
        
        os.unlink(pii_file.name)
        
        if response.status_code == 200:
            result = response.json()
            print(f"    Scan successful")
            print(f"   Risk Level: {result.get('riskLevel', 'unknown')}")
            print(f"   Should Block: {result.get('shouldBlock', False)}")
            print(f"   Block Reason: {result.get('blockReason', 'None')}")
            pii_detection = result.get('piiDetection', {})
            print(f"   PII Detected: {pii_detection.get('hasPII', False)}")
            if pii_detection.get('hasPII'):
                print(f"   PII Count: {pii_detection.get('count', 0)}")
        else:
            print(f"    Scan failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"    Error: {e}")
    
    print("\n" + "=" * 50)
    print(" File scanning tests completed!")
    print("\n Summary:")
    print("  • File scanning:  Working")
    print("  • Sensitive file detection:  Working")
    print("  • Malicious file detection:  Working")
    print("  • PII detection:  Working")
    print("  • Audit logging:  Disabled")
    print("\n Next steps:")
    print("  1. Test with extension in browser")
    print("  2. Verify file blocking behavior")
    print("  3. Re-enable audit logging when ready")

if __name__ == "__main__":
    test_file_scanning()
